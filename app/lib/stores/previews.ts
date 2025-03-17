import type { WebContainer } from '@webcontainer/api';
import { atom } from 'nanostores';

declare global {
  interface Window {
    _tabId?: string;
  }
}

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

interface BroadcastMessage {
  type: 'file-change' | 'state-change' | 'storage-sync';
  previewId?: string;
  timestamp: number;
  storage?: Record<string, string>;
  source?: string;
}

const PREVIEW_CHANNEL = 'preview-updates';
const STORAGE_CHANNEL = 'storage-sync-channel';
const REFRESH_DELAY = 300;

export class PreviewsStore {
  private readonly _availablePreviews = new Map<number, PreviewInfo>();
  private readonly _webcontainer: Promise<WebContainer>;
  private readonly _previewChannel: BroadcastChannel;
  private readonly _storageChannel: BroadcastChannel;
  private readonly _lastUpdate = new Map<string, number>();
  private readonly _watchedFiles = new Set<string>();
  private readonly _refreshTimeouts = new Map<string, NodeJS.Timeout>();
  private _fileWatcher?: any;

  readonly previews = atom<PreviewInfo[]>([]);

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this._webcontainer = webcontainerPromise;
    this._previewChannel = new BroadcastChannel(PREVIEW_CHANNEL);
    this._storageChannel = new BroadcastChannel(STORAGE_CHANNEL);

    this._setupBroadcastListeners();
    this._setupStorageInterception();
    this._initialize().catch((error) => console.error('[Preview] Initialization failed:', error));
  }

  private _setupBroadcastListeners(): void {
    this._previewChannel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const { type, previewId, timestamp } = event.data;

      if (!previewId || type !== 'file-change') {
        return;
      }

      const lastUpdate = this._lastUpdate.get(previewId) || 0;

      if (timestamp > lastUpdate) {
        this._lastUpdate.set(previewId, timestamp);
        this.refreshPreview(previewId);
      }
    };

    this._storageChannel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const { storage, source } = event.data;

      if (storage && source !== this._getTabId()) {
        this._syncStorage(storage);
      }
    };
  }

  private _setupStorageInterception(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const originalSetItem = localStorage.setItem;

    localStorage.setItem = (key: string, value: string): void => {
      originalSetItem.call(localStorage, key, value);
      this._broadcastStorageSync();
    };
  }

  private _getTabId(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    window._tabId = window._tabId || Math.random().toString(36).substring(2, 15);

    return window._tabId;
  }

  private async _initialize(): Promise<void> {
    const webcontainer = await this._webcontainer;

    webcontainer.on('server-ready', (port: number, url: string) => {
      console.log('[Preview] Server ready on port:', port, url);
      this.broadcastUpdate(url);
      this._broadcastStorageSync();
    });

    this._setupFileWatcher(webcontainer);
    this._setupPortListener(webcontainer);

    if (typeof window !== 'undefined') {
      this._setupDOMObserver();
    }
  }

  private async _setupFileWatcher(webcontainer: WebContainer): Promise<void> {
    try {
      this._fileWatcher = await webcontainer.fs.watch('**/*', { persistent: true });
      this._fileWatcher.on('change', () => {
        this.previews.get().forEach((preview) => {
          const previewId = this.getPreviewId(preview.baseUrl);

          if (previewId) {
            this.broadcastFileChange(previewId);
          }
        });
      });
    } catch (error: any) {
      this._handleWatcherError(error);
    }
  }

  private _handleWatcherError(error: any): void {
    if (error.code === 'ENOENT') {
      console.warn('[Preview] Watcher error: Directory not found. No files to watch.');
    } else {
      console.error('[Preview] Error setting up watchers:', error);
    }
  }

  private _setupPortListener(webcontainer: WebContainer): void {
    webcontainer.on('port', (port: number, type: 'open' | 'close', url: string) => {
      if (type === 'close') {
        this._handlePortClose(port);
        return;
      }

      this._handlePortOpen(port, url);
    });
  }

  private _handlePortClose(port: number): void {
    this._availablePreviews.delete(port);
    this.previews.set(this.previews.get().filter((p) => p.port !== port));
  }

  private _handlePortOpen(port: number, url: string): void {
    const previews = this.previews.get();
    let previewInfo = this._availablePreviews.get(port);

    if (!previewInfo) {
      previewInfo = { port, ready: true, baseUrl: url };
      this._availablePreviews.set(port, previewInfo);
      previews.push(previewInfo);
    } else {
      previewInfo.ready = true;
      previewInfo.baseUrl = url;
    }

    this.previews.set([...previews]);
    this.broadcastUpdate(url);
  }

  private _setupDOMObserver(): void {
    const observer = new MutationObserver(() => this._broadcastStorageSync());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
  }

  private _syncStorage(storage: Record<string, string>): void {
    if (typeof window === 'undefined') {
      return;
    }

    Object.entries(storage).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('[Preview] Error syncing storage:', error);
      }
    });

    this.previews.get().forEach((preview) => {
      const previewId = this.getPreviewId(preview.baseUrl);

      if (previewId) {
        this.refreshPreview(previewId);
      }
    });

    const iframe = document.querySelector('iframe');

    if (iframe?.src) {
      iframe.src = iframe.src;
    }
  }

  private _broadcastStorageSync(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const storage: Record<string, string> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key) {
        storage[key] = localStorage.getItem(key) || '';
      }
    }

    this._storageChannel.postMessage({
      type: 'storage-sync',
      storage,
      source: this._getTabId(),
      timestamp: Date.now(),
    });
  }

  getPreviewId(url: string): string | null {
    const match = url.match(/^https?:\/\/([^.]+)\.local-credentialless\.webcontainer-api\.io/);
    return match ? match[1] : null;
  }

  broadcastStateChange(previewId: string): void {
    const timestamp = Date.now();
    this._lastUpdate.set(previewId, timestamp);
    this._previewChannel.postMessage({ type: 'state-change', previewId, timestamp });
  }

  broadcastFileChange(previewId: string): void {
    const timestamp = Date.now();
    this._lastUpdate.set(previewId, timestamp);
    this._previewChannel.postMessage({ type: 'file-change', previewId, timestamp });
  }

  broadcastUpdate(url: string): void {
    const previewId = this.getPreviewId(url);

    if (previewId) {
      this.broadcastFileChange(previewId);
    }
  }

  refreshPreview(previewId: string): void {
    const existingTimeout = this._refreshTimeouts.get(previewId);

    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      const previews = this.previews.get();
      const preview = previews.find((p) => this.getPreviewId(p.baseUrl) === previewId);

      if (preview) {
        preview.ready = false;
        this.previews.set([...previews]);
        requestAnimationFrame(() => {
          preview.ready = true;
          this.previews.set([...previews]);
        });
      }

      this._refreshTimeouts.delete(previewId);
    }, REFRESH_DELAY);

    this._refreshTimeouts.set(previewId, timeout);
  }
}

let previewsStore: PreviewsStore | null = null;

export function usePreviewStore(webcontainerPromise?: Promise<WebContainer>): PreviewsStore {
  if (!previewsStore) {
    previewsStore = new PreviewsStore(webcontainerPromise || Promise.resolve({} as WebContainer));
  }

  return previewsStore;
}
