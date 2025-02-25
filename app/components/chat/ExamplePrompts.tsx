import React from 'react';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';

const EXAMPLE_PROMPTS = [
  {
    text: 'Build a Vite, React, and TypeScript dashboard that loads Coingecko data and renders interactive charts using TradingView Lightweight Charts—no external API keys required.',
  },
  {
    text: 'Create a Vite, React, and TypeScript to-do-list app with Tailwind CSS, in a neo brutalist theme, that lets users add, update, and delete tasks stored locally.',
  },
  {
    text: 'Develop a weather app using Vite, React, and TypeScript with Tailwind CSS that displays local weather data using an external API for current conditions and forecasts.',
  },
  {
    text: 'Develop a real-time chat interface that resembles Discord using Vite, React, and TypeScript with Tailwind CSS and Socket.IO to simulate message exchanges without external APIs.',
  },
  {
    text: 'Create a neon Tic Tac Toe game using Vite, React, and TypeScript with Tailwind CSS, focusing on clean component architecture and responsive design.',
  },
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  // Retrieve the current theme to apply conditional styling.
  const currentTheme = useStore(themeStore);

  // Base classes common to all themes.
  const baseClasses = 'border rounded-full px-3 py-1 text-xs transition-theme';

  // Classes for Light/Dark themes.
  const standardClasses =
    'bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary';

  /*
   * Neon-specific classes.
   * Directly use Tailwind's text-cyan-300 to avoid unresolved theme tokens.
   */
  const neonClasses = 'bg-[rgba(0,255,255,0.15)] hover:bg-[rgba(0,255,255,0.25)] text-cyan-300';

  // Dynamically choose the class based on the current theme.
  const buttonClasses = currentTheme === 'neon' ? `${baseClasses} ${neonClasses}` : `${baseClasses} ${standardClasses}`;

  return (
    <div id="examples" className="relative flex flex-col gap-9 w-full max-w-3xl mx-auto justify-center mt-6">
      <div
        className="flex flex-wrap justify-center gap-2"
        style={{
          animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
        }}
      >
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => (
          <button
            key={index}
            onClick={(event) => {
              sendMessage?.(event, examplePrompt.text);
            }}
            className={buttonClasses}
          >
            {examplePrompt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
