import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createDataStream, generateId } from 'ai';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS, type FileMap } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/common/prompts/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import type { IProviderSetting } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';
import { getFilePaths, selectContext } from '~/lib/.server/llm/select-context';
import type { ContextAnnotation, ProgressAnnotation } from '~/types/context';
import { WORK_DIR } from '~/utils/constants';
import { createSummary } from '~/lib/.server/llm/create-summary';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

const logger = createScopedLogger('api.chat');

/**
 * Parses a cookie header string into an object mapping cookie names to values.
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .forEach((item) => {
      const [name, ...rest] = item.split('=');

      if (name && rest.length) {
        cookies[decodeURIComponent(name.trim())] = decodeURIComponent(rest.join('=').trim());
      }
    });

  return cookies;
}

/**
 * Helper to update cumulative token usage.
 */
function updateUsage(
  usage: { completionTokens?: number; promptTokens?: number; totalTokens?: number } | undefined,
  cumulativeUsage: { completionTokens: number; promptTokens: number; totalTokens: number },
): void {
  if (!usage) {
    return;
  }

  cumulativeUsage.completionTokens += usage.completionTokens ?? 0;
  cumulativeUsage.promptTokens += usage.promptTokens ?? 0;
  cumulativeUsage.totalTokens += usage.totalTokens ?? 0;
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  // Parse request JSON.
  const { messages, files, promptId, contextOptimization } = await request.json<{
    messages: Messages;
    files: any;
    promptId?: string;
    contextOptimization: boolean;
  }>();

  // Parse cookies once and extract apiKeys and providerSettings.
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const apiKeys = JSON.parse(cookies.apiKeys || '{}');
  const providerSettings: Record<string, IProviderSetting> = JSON.parse(cookies.providers || '{}');

  // Create a switchable stream instance.
  const stream = new SwitchableStream();

  // Initialize token usage tracking.
  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
  };
  const encoder = new TextEncoder();
  let progressCounter = 1;
  let lastChunk: string | undefined = undefined;

  // Cache Cloudflare environment to avoid repeated lookups.
  const cfEnv = context.cloudflare?.env as any;

  try {
    const totalMessageContent = messages.reduce((acc, message) => acc + message.content, '');
    logger.debug(`Total message length: ${totalMessageContent.split(' ').length} words`);

    const dataStream = createDataStream({
      async execute(dataStream) {
        const filePaths = getFilePaths(files || {});
        let filteredFiles: FileMap | undefined;
        let summary: string | undefined;

        // If there are files and context optimization is enabled, generate a chat summary and update context.
        if (filePaths.length > 0 && contextOptimization) {
          dataStream.writeData('HI ');
          logger.debug('Generating Chat Summary');
          dataStream.writeMessageAnnotation({
            type: 'progress',
            value: progressCounter++,
            message: 'Generating Chat Summary',
          } as ProgressAnnotation);

          summary = await createSummary({
            messages: [...messages],
            env: cfEnv,
            apiKeys,
            providerSettings,
            promptId,
            contextOptimization,
            onFinish(resp) {
              logger.debug('createSummary token usage', JSON.stringify(resp.usage));
              updateUsage(resp.usage, cumulativeUsage);
            },
          });

          dataStream.writeMessageAnnotation({
            type: 'chatSummary',
            summary,
            chatId: messages.slice(-1)[0]?.id,
          } as ContextAnnotation);

          logger.debug('Updating Context Buffer');
          dataStream.writeMessageAnnotation({
            type: 'progress',
            value: progressCounter++,
            message: 'Updating Context Buffer',
          } as ProgressAnnotation);

          filteredFiles = await selectContext({
            messages: [...messages],
            env: cfEnv,
            apiKeys,
            files,
            providerSettings,
            promptId,
            contextOptimization,
            summary,
            onFinish(resp) {
              logger.debug('selectContext token usage', JSON.stringify(resp.usage));
              updateUsage(resp.usage, cumulativeUsage);
            },
          });

          if (filteredFiles) {
            logger.debug(`files in context: ${JSON.stringify(Object.keys(filteredFiles))}`);
          }

          dataStream.writeMessageAnnotation({
            type: 'codeContext',
            files: Object.keys(filteredFiles || {}).map((key) => {
              let path = key;

              if (path.startsWith(WORK_DIR)) {
                path = path.replace(WORK_DIR, '');
              }

              return path;
            }),
          } as ContextAnnotation);

          dataStream.writeMessageAnnotation({
            type: 'progress',
            value: progressCounter++,
            message: 'Context Buffer Updated',
          } as ProgressAnnotation);
          logger.debug('Context Buffer Updated');
        }

        // Define streaming options with an onFinish callback.
        const options: StreamingOptions = {
          toolChoice: 'none',
          onFinish: async ({ text: content, finishReason, usage }) => {
            logger.debug('usage', JSON.stringify(usage));
            updateUsage(usage, cumulativeUsage);

            if (finishReason !== 'length') {
              dataStream.writeMessageAnnotation({
                type: 'usage',
                value: { ...cumulativeUsage },
              });
              await new Promise((resolve) => setTimeout(resolve, 0));

              return;
            }

            if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
              throw new Error('Cannot continue message: Maximum segments reached');
            }

            const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;
            logger.info(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

            messages.push({ id: generateId(), role: 'assistant', content });
            messages.push({ id: generateId(), role: 'user', content: CONTINUE_PROMPT });

            const result = await streamText({
              messages,
              env: cfEnv,
              options,
              apiKeys,
              files,
              providerSettings,
              promptId,
              contextOptimization,
            });

            result.mergeIntoDataStream(dataStream);

            (async () => {
              for await (const part of result.fullStream) {
                if (part.type === 'error') {
                  logger.error(`${part.error}`);
                  return;
                }
              }
            })();

            return;
          },
        };

        const result = await streamText({
          messages,
          env: cfEnv,
          options,
          apiKeys,
          files,
          providerSettings,
          promptId,
          contextOptimization,
          contextFiles: filteredFiles,
          summary,
        });

        (async () => {
          for await (const part of result.fullStream) {
            if (part.type === 'error') {
              logger.error(`${part.error}`);
              return;
            }
          }
        })();
        result.mergeIntoDataStream(dataStream);
      },
      onError: (error: any) => `Custom error: ${error.message}`,
    }).pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const chunkStr = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);

          if (!lastChunk) {
            lastChunk = ' ';
          }

          // Insert HTML markers based on whether the chunk starts with "g"
          if (chunkStr.startsWith('g') && !lastChunk.startsWith('g')) {
            controller.enqueue(encoder.encode(`0: "<div class=\\"__boltThought__\\">"\n`));
          }

          if (lastChunk.startsWith('g') && !chunkStr.startsWith('g')) {
            controller.enqueue(encoder.encode(`0: "</div>\\n"\n`));
          }

          lastChunk = chunkStr;

          let transformedChunk = chunkStr;

          if (chunkStr.startsWith('g')) {
            const content = chunkStr.split(':').slice(1).join(':').trimEnd();
            transformedChunk = `0:${content}\n`;
          }

          controller.enqueue(encoder.encode(transformedChunk));
        },
      }),
    );

    return new Response(dataStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Text-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    logger.error(error);

    if (error.message?.includes('API key')) {
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
