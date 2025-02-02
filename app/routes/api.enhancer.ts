// app/routes/api.enhancer.ts

import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';
import { z } from 'zod';
import type { ProviderInfo } from '~/types/model';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';

/**
 * Define a type alias for the expected request payload.
 */
export type EnhancerRequest = {
  message: string;
  model: string;
  provider: ProviderInfo;
  apiKeys?: Record<string, string>;
};

/**
 * Request validation schema using Zod.
 * Note: The schema here covers the minimum required properties.
 */
const enhancerRequestSchema = z.object({
  message: z.string().min(1, { message: 'Message is required.' }),
  model: z.string().min(1, { message: 'Model is required.' }),
  provider: z.object({
    name: z.string().min(1, { message: 'Provider name is required.' }),

    // Include additional fields here if ProviderInfo defines more properties.
  }),
  apiKeys: z.record(z.string()).optional(),
});

/**
 * Constructs the enhanced prompt for streamText.
 *
 * @param message - The original user prompt.
 * @param model - The model identifier.
 * @param providerName - The provider name.
 * @returns The full prompt text.
 */
function buildEnhancedPrompt(message: string, model: string, providerName: string): string {
  return (
    `[Model: ${model}]\n\n[Provider: ${providerName}]\n\n` +
    stripIndents`
      You are a professional prompt engineer specializing in crafting precise, effective prompts.
      Your task is to enhance prompts by making them more specific, actionable, and effective.

      I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.

      For valid prompts:
      - Make instructions explicit and unambiguous
      - Add relevant context and constraints
      - Remove redundant information
      - Maintain the core intent
      - Ensure the prompt is self-contained
      - Use professional language

      For invalid or unclear prompts:
      - Respond with clear, professional guidance
      - Keep responses concise and actionable
      - Maintain a helpful, constructive tone
      - Focus on what the user should provide
      - Use a standard template for consistency

      IMPORTANT: Your response must ONLY contain the enhanced prompt text.
      Do not include any explanations, metadata, or wrapper tags.

      <original_prompt>
        ${message}
      </original_prompt>
    `
  );
}

/**
 * Remix action that delegates to enhancerAction.
 */
export async function action(args: ActionFunctionArgs) {
  return enhancerAction(args);
}

/**
 * Processes the enhancer API request.
 *
 * @param context - Remix context including Cloudflare environment.
 * @param request - The incoming HTTP request.
 * @returns A streaming response or an error response.
 */
async function enhancerAction({ context, request }: ActionFunctionArgs) {
  try {
    // Parse and validate incoming JSON using Zod.
    const json = await request.json();
    const parsed = enhancerRequestSchema.safeParse(json);

    if (!parsed.success) {
      return new Response(JSON.stringify({ errors: parsed.error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cast parsed data to EnhancerRequest.
    const { message, model, provider } = parsed.data as EnhancerRequest;

    // Retaining ProviderInfo usage by ensuring provider is typed correctly.
    const { name: providerName } = provider;

    // Retrieve cookies for API keys and provider settings.
    const cookieHeader = request.headers.get('Cookie');
    const apiKeys = getApiKeysFromCookie(cookieHeader);
    const providerSettings = getProviderSettingsFromCookie(cookieHeader);

    // Construct the prompt content.
    const promptContent = buildEnhancedPrompt(message, model, providerName);

    // Call streamText to process the prompt.
    const result = await streamText({
      messages: [
        {
          role: 'user',
          content: promptContent,
        },
      ],
      env: context.cloudflare?.env as any,
      apiKeys,
      providerSettings,
    });

    // Return a streaming response with appropriate headers.
    return new Response(result.textStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Text-Encoding': 'chunked',
      },
    });
  } catch (error: unknown) {
    console.error('Error in enhancerAction:', error);

    // Check for API key-specific errors and respond accordingly.
    if (error instanceof Error && error.message?.includes('API key')) {
      return new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    return new Response('Internal Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
