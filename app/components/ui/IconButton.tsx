import { memo, forwardRef, type ForwardedRef, useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';
import { classNames } from '~/utils/classNames';

type IconSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface BaseIconButtonProps {
  size?: IconSize;
  className?: string;
  iconClassName?: string;
  disabledClassName?: string;
  title?: string;
  disabled?: boolean;
  isActive?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

type IconButtonWithoutChildrenProps = {
  icon: string;
  children?: undefined;
} & BaseIconButtonProps;

type IconButtonWithChildrenProps = {
  icon?: undefined;
  children: string | JSX.Element | JSX.Element[];
} & BaseIconButtonProps;

type IconButtonProps = IconButtonWithoutChildrenProps | IconButtonWithChildrenProps;

export const IconButton = memo(
  forwardRef(
    (
      {
        icon,
        size = 'xl',
        className,
        iconClassName,
        disabledClassName,
        disabled = false,
        title,
        isActive = false,
        onClick,
        children,
      }: IconButtonProps,
      ref: ForwardedRef<HTMLButtonElement>,
    ) => {
      const [isClient, setIsClient] = useState(false);
      const theme = useStore(themeStore); // Unconditional hook call

      useEffect(() => {
        console.log('IconButton mounted, setting isClient to true');
        setIsClient(true);
      }, []);

      const baseClass = 'border rounded-full px-3 py-1 text-xs transition-theme flex items-center';
      const defaultThemeClass =
        'bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary';
      const neonThemeClass = 'bg-[rgba(0,255,255,0.15)] hover:bg-[rgba(0,255,255,0.25)] text-cyan-300 button-neon-glow';
      const themeClass = isClient && theme === 'neon' ? neonThemeClass : defaultThemeClass;

      console.log('Rendering IconButton, isClient:', isClient, 'theme:', theme, 'themeClass:', themeClass);

      return (
        <button
          ref={ref}
          className={classNames(
            baseClass,
            themeClass,
            isActive ? 'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent' : '',
            { [classNames('opacity-30', disabledClassName)]: disabled },
            className,
          )}
          title={title}
          disabled={disabled}
          onClick={(event) => {
            if (disabled) {
              return;
            }

            onClick?.(event);
          }}
        >
          {children ? children : <div className={classNames(icon, getIconSize(size), iconClassName)} />}
        </button>
      );
    },
  ),
);

function getIconSize(size: IconSize) {
  if (size === 'sm') {
    return 'text-sm';
  }

  if (size === 'md') {
    return 'text-md';
  }

  if (size === 'lg') {
    return 'text-lg';
  }

  if (size === 'xl') {
    return 'text-xl';
  }

  return 'text-2xl';
}
