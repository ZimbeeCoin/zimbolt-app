import type { IProviderSetting } from '~/types/model';
import { BaseProvider } from './base-provider';
import type { ModelInfo, ProviderInfo } from './types';
import * as providers from './registry';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('LLMManager');

export class LLMManager {
  private static _instance: LLMManager;
  private _providers: Map<string, BaseProvider> = new Map();
  private _modelList: ModelInfo[] = [];
  private readonly _env: Record<string, string>;

  // Private constructor ensures instance is created only via getInstance/createInstance.
  private constructor(env: Record<string, string>) {
    this._env = env;

    // Call the asynchronous provider registration and log any errors.
    this._registerProvidersFromDirectory().catch((error) =>
      logger.error('Error during provider registration in constructor:', error),
    );
  }

  /**
   * Asynchronous initialization method.
   * Recommended when you need to ensure that providers are fully registered before use.
   */
  static async createInstance(env: Record<string, string> = {}): Promise<LLMManager> {
    if (!LLMManager._instance) {
      LLMManager._instance = new LLMManager(env);
      await LLMManager._instance._registerProvidersFromDirectory();
    }

    return LLMManager._instance;
  }

  /**
   * Synchronous accessor.
   * Note: The registration process is invoked asynchronously in the constructor.
   */
  static getInstance(env: Record<string, string> = {}): LLMManager {
    if (!LLMManager._instance) {
      LLMManager._instance = new LLMManager(env);
    }

    return LLMManager._instance;
  }

  get env(): Record<string, string> {
    return this._env;
  }

  // Asynchronously register all providers from the registry.
  private async _registerProvidersFromDirectory(): Promise<void> {
    try {
      /*
       * If you want to use dynamic imports, e.g.,
       * const providerModules = import.meta.glob('./providers/*.ts', { eager: true });
       * you can integrate that here.
       */
      for (const exportedItem of Object.values(providers)) {
        if (typeof exportedItem === 'function' && exportedItem.prototype instanceof BaseProvider) {
          const provider = new exportedItem();

          try {
            this.registerProvider(provider);
          } catch (error: any) {
            logger.warn(`Failed to register provider: ${provider.name}. Error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error registering providers:', error);
    }
  }

  registerProvider(provider: BaseProvider): void {
    if (this._providers.has(provider.name)) {
      logger.warn(`Provider ${provider.name} is already registered. Skipping.`);
      return;
    }

    logger.info(`Registering Provider: ${provider.name}`);
    this._providers.set(provider.name, provider);
    this._modelList = [...this._modelList, ...(provider.staticModels || [])];
  }

  getProvider(name: string): BaseProvider | undefined {
    return this._providers.get(name);
  }

  getAllProviders(): BaseProvider[] {
    return Array.from(this._providers.values());
  }

  getModelList(): ModelInfo[] {
    return this._modelList;
  }

  async updateModelList(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    serverEnv?: Record<string, string>;
  }): Promise<ModelInfo[]> {
    const { apiKeys, providerSettings, serverEnv } = options;
    const providersArray = Array.from(this._providers.values());
    let enabledProviders = providersArray.map((p) => p.name);

    if (providerSettings && Object.keys(providerSettings).length > 0) {
      enabledProviders = enabledProviders.filter((p) => providerSettings[p]?.enabled);
    }

    // Get dynamic models from all providers that support them.
    const dynamicModels = await Promise.all(
      providersArray
        .filter((provider) => enabledProviders.includes(provider.name))
        .filter(
          (provider): provider is BaseProvider & Required<Pick<ProviderInfo, 'getDynamicModels'>> =>
            !!provider.getDynamicModels,
        )
        .map(async (provider) => {
          const cachedModels = provider.getModelsFromCache(options);

          if (cachedModels) {
            return cachedModels;
          }

          try {
            const models = await provider.getDynamicModels(apiKeys, providerSettings?.[provider.name], serverEnv);
            logger.info(`Caching ${models.length} dynamic models for ${provider.name}`);
            provider.storeDynamicModels(options, models);

            return models;
          } catch (err) {
            logger.error(`Error getting dynamic models for ${provider.name}:`, err);
            return [];
          }
        }),
    );

    const staticModels = providersArray.flatMap((p) => p.staticModels || []);
    const dynamicModelsFlat = dynamicModels.flat();
    const dynamicModelKeys = new Set(dynamicModelsFlat.map((d) => `${d.name}-${d.provider}`));
    const filteredStaticModels = staticModels.filter((m) => !dynamicModelKeys.has(`${m.name}-${m.provider}`));

    // Combine and sort models.
    const modelList = [...dynamicModelsFlat, ...filteredStaticModels];
    modelList.sort((a, b) => a.name.localeCompare(b.name));
    this._modelList = modelList;

    return modelList;
  }

  getStaticModelList(): ModelInfo[] {
    return Array.from(this._providers.values()).flatMap((p) => p.staticModels || []);
  }

  async getModelListFromProvider(
    providerArg: BaseProvider,
    options: {
      apiKeys?: Record<string, string>;
      providerSettings?: Record<string, IProviderSetting>;
      serverEnv?: Record<string, string>;
    },
  ): Promise<ModelInfo[]> {
    const provider = this._providers.get(providerArg.name);

    if (!provider) {
      throw new Error(`Provider ${providerArg.name} not found`);
    }

    const staticModels = provider.staticModels || [];

    if (!provider.getDynamicModels) {
      return staticModels;
    }

    const { apiKeys, providerSettings, serverEnv } = options;
    const cachedModels = provider.getModelsFromCache({ apiKeys, providerSettings, serverEnv });

    if (cachedModels) {
      logger.info(`Found ${cachedModels.length} cached models for ${provider.name}`);
      return [...cachedModels, ...staticModels];
    }

    logger.info(`Getting dynamic models for ${provider.name}`);

    let dynamicModels: ModelInfo[] = [];

    try {
      dynamicModels = await provider.getDynamicModels(apiKeys, providerSettings?.[provider.name], serverEnv);
      logger.info(`Got ${dynamicModels.length} dynamic models for ${provider.name}`);
      provider.storeDynamicModels(options, dynamicModels);
    } catch (err) {
      logger.error(`Error getting dynamic models for ${provider.name}:`, err);
    }

    const dynamicModelNames = dynamicModels.map((d) => d.name);
    const filteredStaticList = staticModels.filter((m) => !dynamicModelNames.includes(m.name));
    const modelList = [...dynamicModels, ...filteredStaticList];
    modelList.sort((a, b) => a.name.localeCompare(b.name));

    return modelList;
  }

  getStaticModelListFromProvider(providerArg: BaseProvider): ModelInfo[] {
    const provider = this._providers.get(providerArg.name);

    if (!provider) {
      throw new Error(`Provider ${providerArg.name} not found`);
    }

    return [...(provider.staticModels || [])];
  }

  getDefaultProvider(): BaseProvider {
    const firstProvider = this._providers.values().next().value;

    if (!firstProvider) {
      throw new Error('No providers registered');
    }

    return firstProvider;
  }
}
