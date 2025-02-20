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

  // Swapped icons: dark theme now shows a moon and light theme shows a sun.
  const iconName =
    theme === 'dark'
      ? 'i-ph-moon-stars-duotone'
      : theme === 'light'
        ? 'i-ph-sun-dim-duotone'
        : 'i-ph-lightbulb-filament'; // Neon theme icon

  return (
    domLoaded && (
      <IconButton
        className={className}
        icon={iconName}
        size="xl"
        title={`Toggle Theme (current: ${theme})`}
        onClick={toggleTheme}
      />
    )
  );
});
