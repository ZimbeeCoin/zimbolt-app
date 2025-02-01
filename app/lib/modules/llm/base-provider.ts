import type { LanguageModelV1 } from 'ai';
import type { ProviderInfo, ProviderConfig, ModelInfo } from './types';
import type { IProviderSetting } from '~/types/model';
import { createOpenAI } from '@ai-sdk/openai';
import { LLMManager } from './manager';

export abstract class BaseProvider implements ProviderInfo {
  abstract name: string;
  abstract staticModels: ModelInfo[];
  abstract config: ProviderConfig;
  cachedDynamicModels?: {
    cacheId: string;
    models: ModelInfo[];
  };

  getApiKeyLink?: string;
  labelForGetApiKey?: string;
  icon?: string;

  /**
   * Returns the base URL and API key for the provider by checking, in order,
   * provider settings (provider-specific), server environment, process environment,
   * and the LLMManager environment.
   */
  getProviderBaseUrlAndKey(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    serverEnv?: Record<string, string>;
    defaultBaseUrlKey: string;
    defaultApiTokenKey: string;
  }): { baseUrl?: string; apiKey?: string } {
    const { apiKeys, providerSettings, serverEnv, defaultBaseUrlKey, defaultApiTokenKey } = options;

    // Get provider-specific base URL if available.
    const settingsBaseUrl = providerSettings ? providerSettings[this.name]?.baseUrl : undefined;

    const manager = LLMManager.getInstance();
    const { env } = manager;

    const baseUrlKey = this.config.baseUrlKey || defaultBaseUrlKey;
    let baseUrl =
      settingsBaseUrl ||
      serverEnv?.[baseUrlKey] ||
      process.env?.[baseUrlKey] ||
      env?.[baseUrlKey] ||
      this.config.baseUrl;

    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const apiTokenKey = this.config.apiTokenKey || defaultApiTokenKey;
    const apiKey = apiKeys?.[this.name] || serverEnv?.[apiTokenKey] || process.env?.[apiTokenKey] || env?.[apiTokenKey];

    return { baseUrl, apiKey };
  }

  /**
   * Retrieves cached dynamic models if the current cache key matches the generated key.
   */
  getModelsFromCache(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    serverEnv?: Record<string, string>;
  }): ModelInfo[] | null {
    if (!this.cachedDynamicModels) {
      return null;
    }

    const cacheKey = this.cachedDynamicModels.cacheId;
    const generatedCacheKey = this.getDynamicModelsCacheKey(options);

    if (cacheKey !== generatedCacheKey) {
      this.cachedDynamicModels = undefined;
      return null;
    }

    return this.cachedDynamicModels.models;
  }

  /**
   * Generates a cache key based on the provider-specific API key, settings, and server environment.
   */
  getDynamicModelsCacheKey(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    serverEnv?: Record<string, string>;
  }): string {
    return JSON.stringify({
      apiKeys: options.apiKeys?.[this.name],
      providerSettings: options.providerSettings ? options.providerSettings[this.name] : undefined,
      serverEnv: options.serverEnv,
    });
  }

  /**
   * Caches dynamic models along with a cache key derived from the current options.
   */
  storeDynamicModels(
    options: {
      apiKeys?: Record<string, string>;
      providerSettings?: Record<string, IProviderSetting>;
      serverEnv?: Record<string, string>;
    },
    models: ModelInfo[],
  ): void {
    const cacheId = this.getDynamicModelsCacheKey(options);
    this.cachedDynamicModels = { cacheId, models };
  }

  // Optional method to retrieve dynamic models.
  getDynamicModels?(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]>;

  /**
   * Abstract method to return a language model instance for the given model name.
   */
  abstract getModelInstance(options: {
    model: string;
    serverEnv?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1;
}

type OptionalApiKey = string | undefined;

/**
 * Utility function to create and return an OpenAI-like language model instance.
 */
export function getOpenAILikeModel(baseURL: string, apiKey: OptionalApiKey, model: string) {
  const openai = createOpenAI({ baseURL, apiKey });
  return openai(model);
}
