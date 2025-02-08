import React from 'react';

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
  return (
    <div id="examples" className="relative flex flex-col gap-9 w-full max-w-3xl mx-auto flex justify-center mt-6">
      <div
        className="flex flex-wrap justify-center gap-2"
        style={{
          animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
        }}
      >
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="border border-bolt-elements-borderColor rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary px-3 py-1 text-xs transition-theme"
            >
              {examplePrompt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
