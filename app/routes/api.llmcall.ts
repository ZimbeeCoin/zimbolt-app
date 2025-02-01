import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import type { IProviderSetting, ProviderInfo } from '~/types/model';
import { generateText } from 'ai';
import { PROVIDER_LIST } from '~/utils/constants';
import { MAX_TOKENS } from '~/lib/.server/llm/constants';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ModelInfo } from '~/lib/modules/llm/types';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';

export async function action(args: ActionFunctionArgs) {
  return llmCallAction(args);
}

async function getModelList(options: {
  apiKeys?: Record<string, string>;
  providerSettings?: Record<string, IProviderSetting>;
  serverEnv?: Record<string, string>;
}) {
  const llmManager = LLMManager.getInstance(import.meta.env);
  return llmManager.updateModelList(options);
}

/**
 * Helper function to handle errors and return appropriate Response objects.
 */
function handleLLMError(error: unknown): Response {
  console.error(error);

  if (error instanceof Error && error.message.toLowerCase().includes('api key')) {
    return new Response('Invalid or missing API key', {
      status: 401,
      statusText: 'Unauthorized',
    });
  }

  return new Response(null, {
    status: 500,
    statusText: 'Internal Server Error',
  });
}

async function llmCallAction({ context, request }: ActionFunctionArgs) {
  // Parse the incoming JSON body.
  const { system, message, model, provider, streamOutput } = await request.json<{
    system: string;
    message: string;
    model: string;
    provider: ProviderInfo;
    streamOutput?: boolean;
  }>();

  // Validate essential fields.
  if (!model || typeof model !== 'string') {
    throw new Response('Invalid or missing model', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  if (!provider?.name || typeof provider.name !== 'string') {
    throw new Response('Invalid or missing provider', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  // Retrieve API keys and provider settings from the Cookie header.
  const cookieHeader = request.headers.get('Cookie') || '';
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  // Cache the Cloudflare environment to avoid repeated lookups.
  const cfEnv = context.cloudflare?.env as any;

  if (streamOutput) {
    // Handle streaming output.
    try {
      const result = await streamText({
        options: { system },
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
        env: cfEnv,
        apiKeys,
        providerSettings,
      });

      return new Response(result.textStream, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch (error: unknown) {
      throw handleLLMError(error);
    }
  } else {
    // Handle non-streaming output.
    try {
      const models = await getModelList({ apiKeys, providerSettings, serverEnv: cfEnv });
      const modelDetails = models.find((m: ModelInfo) => m.name === model);

      if (!modelDetails) {
        throw new Error('Model not found');
      }

      const dynamicMaxTokens = modelDetails.maxTokenAllowed ?? MAX_TOKENS;

      const providerInfo = PROVIDER_LIST.find((p) => p.name === provider.name);

      if (!providerInfo) {
        throw new Error('Provider not found');
      }

      const textResult = await generateText({
        system,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
        model: providerInfo.getModelInstance({
          model: modelDetails.name,
          serverEnv: cfEnv,
          apiKeys,
          providerSettings,
        }),
        maxTokens: dynamicMaxTokens,
        toolChoice: 'none',
      });

      return new Response(JSON.stringify(textResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      throw handleLLMError(error);
    }
  }
}
