import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export default class GoogleProvider extends BaseProvider {
  name = 'Google';
  getApiKeyLink = 'https://aistudio.google.com/app/apikey';

  config = {
    apiTokenKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
  };

  staticModels: ModelInfo[] = [
    { name: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash', provider: 'Google', maxTokenAllowed: 8192 },
    {
      name: 'gemini-2.0-flash-thinking-exp-01-21',
      label: 'Gemini 2.0 Flash-thinking-exp-01-21',
      provider: 'Google',
      maxTokenAllowed: 65536,
    },
    { name: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash', provider: 'Google', maxTokenAllowed: 8192 },
    { name: 'gemini-1.5-flash-002', label: 'Gemini 1.5 Flash-002', provider: 'Google', maxTokenAllowed: 8192 },
    { name: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8b', provider: 'Google', maxTokenAllowed: 8192 },
    { name: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro', provider: 'Google', maxTokenAllowed: 8192 },
    { name: 'gemini-1.5-pro-002', label: 'Gemini 1.5 Pro-002', provider: 'Google', maxTokenAllowed: 8192 },
    { name: 'gemini-exp-1206', label: 'Gemini exp-1206', provider: 'Google', maxTokenAllowed: 8192 },
  ];

  /**
   * Fetches dynamic models from the Google Generative Language API.
   *
   * Filters out models with an outputTokenLimit of 8000 or less.
   *
   * @param apiKeys - A record of API keys.
   * @param settings - Provider-specific settings.
   * @param serverEnv - Server environment variables.
   * @returns A promise that resolves to an array of ModelInfo objects.
   * @throws Error if the API key is missing or the fetch fails.
   */
  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    // Wrap the single provider setting into a record if it exists.
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings ? { [this.name]: settings } : undefined,
      serverEnv,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key configuration for ${this.name} provider`);
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models from Google: ${response.statusText}`);
    }

    // Explicitly cast the JSON response to an object with a 'models' array.
    const res = (await response.json()) as { models: any[] };

    if (!res.models) {
      throw new Error('No models found in the response from Google');
    }

    const data = res.models.filter((model: any) => model.outputTokenLimit > 8000);

    return data.map((m: any) => {
      const inputTokenLimit = m.inputTokenLimit ?? 0;
      const outputTokenLimit = m.outputTokenLimit ?? 0;

      return {
        name: m.name.replace('models/', ''),
        label: `${m.displayName} - context ${Math.floor((inputTokenLimit + outputTokenLimit) / 1000)}k`,
        provider: this.name,
        maxTokenAllowed: inputTokenLimit + outputTokenLimit || 8000,
      };
    });
  }

  /**
   * Returns a language model instance for the given model name using Google Generative AI.
   *
   * @param options - An object containing the model name, server environment,
   *                  API keys, and provider-specific settings.
   * @returns A LanguageModelV1 instance.
   * @throws Error if the API key is missing.
   */
  getModelInstance(options: {
    model: string;
    serverEnv?: any; // Made optional to match the base-provider's signature.
    apiKeys?: Record<string, string>;
    providerSettings?: IProviderSetting;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    // Wrap the single provider setting into a record.
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings ? { [this.name]: providerSettings } : undefined,
      serverEnv,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const google = createGoogleGenerativeAI({
      apiKey,
    });

    return google(model);
  }
}
