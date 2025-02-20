import { atom } from 'nanostores';
import { logStore } from './logs';

// Available themes for Zimbolt now include 'dark', 'light', and 'neon'
export type Theme = 'dark' | 'light' | 'neon';

export const kTheme = 'bolt_theme';

// Helper to check if the current theme is dark
export function themeIsDark() {
  return themeStore.get() === 'dark';
}

export const DEFAULT_THEME: Theme = 'light';

// Initialize the theme store based on localStorage or the current HTML attribute
export const themeStore = atom<Theme>(initStore());

function initStore(): Theme {
  if (!import.meta.env.SSR) {
    const persistedTheme = localStorage.getItem(kTheme) as Theme | null;
    const themeAttribute = document.querySelector('html')?.getAttribute('data-theme') as Theme | null;

    return persistedTheme ?? themeAttribute ?? DEFAULT_THEME;
  }

  return DEFAULT_THEME;
}

/**
 * Toggle between themes in the order: light -> dark -> neon -> light...
 * When the theme changes, update:
 *  - The nanostore (themeStore)
 *  - The localStorage value (kTheme)
 *  - The `data-theme` attribute on the <html> element
 */
export function toggleTheme() {
  const currentTheme = themeStore.get();
  let newTheme: Theme;

  if (currentTheme === 'light') {
    newTheme = 'dark';
  } else if (currentTheme === 'dark') {
    newTheme = 'neon';
  } else {
    newTheme = 'light';
  }

  themeStore.set(newTheme);
  logStore.logSystem(`Theme changed to ${newTheme} mode`);
  localStorage.setItem(kTheme, newTheme);
  document.querySelector('html')?.setAttribute('data-theme', newTheme);
}
