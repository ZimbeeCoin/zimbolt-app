import { atom } from 'nanostores';
import { logStore } from './logs';

// Available themes for Zimbolt: 'dark', 'light', and 'neon'
export type Theme = 'dark' | 'light' | 'neon';

export const kTheme = 'bolt_theme';

/**
 * Helper function to check if the current theme is dark.
 */
export function themeIsDark(): boolean {
  return themeStore.get() === 'dark';
}

/**
 * Default theme is set to 'light', described as a warm, vibrant, and refined mode.
 */
export const DEFAULT_THEME: Theme = 'light';

/**
 * Initialize the theme store based on localStorage or the current HTML attribute.
 */
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
 * Toggle between themes in the order: light → dark → neon → light...
 * Theme descriptions:
 * - Light: A warm, vibrant, and refined mode with soft pastel tones.
 * - Dark: A cool, restful mode with high contrast.
 * - Neon: A futuristic, bold mode with glowing accents.
 *
 * When the theme changes, update:
 *  - The nanostore (themeStore)
 *  - The localStorage value (kTheme)
 *  - The `data-theme` attribute on the <html> element
 */
export function toggleTheme(): void {
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

/**
 * Future-proofing note:
 * To add more themes (e.g., 'solar', 'retro'), consider refactoring toggleTheme
 * into a lookup table or array-based cycle:
 * const themes: Theme[] = ['light', 'dark', 'neon', 'solar'];
 * const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
 * newTheme = themes[nextIndex];
 */
