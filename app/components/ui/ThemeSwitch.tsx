import { useStore } from '@nanostores/react';
import { memo, useEffect, useState } from 'react';
import { themeStore, toggleTheme } from '~/lib/stores/theme';
import { IconButton } from './IconButton';

interface ThemeSwitchProps {
  className?: string;
}

export const ThemeSwitch = memo(({ className }: ThemeSwitchProps) => {
  const theme = useStore(themeStore);
  const [domLoaded, setDomLoaded] = useState(false);

  useEffect(() => {
    setDomLoaded(true);
  }, []);

  // Icon selection based on theme, with descriptive tooltips
  const iconName =
    theme === 'dark'
      ? 'i-ph-moon-stars-duotone' // Moon for dark mode
      : theme === 'light'
        ? 'i-ph-sun-horizon-duotone' // Horizon sun for warm, inviting light mode
        : 'i-ph-lightbulb-filament'; // Lightbulb for neon mode

  // Enhanced tooltip with theme descriptions
  const title =
    theme === 'dark'
      ? 'Switch to Light Theme (warm and vibrant)'
      : theme === 'light'
        ? 'Switch to Dark Theme (cool and restful)'
        : 'Switch to Neon Theme (futuristic and bold)';

  /*
   * Instead of conditionally returning the component inline,
   * return null if DOM isn't loaded to maintain a consistent hook tree.
   */
  if (!domLoaded) {
    return null;
  }

  return <IconButton className={className} icon={iconName} size="xl" title={title} onClick={toggleTheme} />;
});
