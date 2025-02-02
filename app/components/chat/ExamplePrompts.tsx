import React from 'react';

const EXAMPLE_PROMPTS = [
  {
    text: 'Write a Solidity smart contract for an ERC-20 token with minting, burning, and transfer functions. Use OpenZeppelin libraries for security best practices.',
  },
  { text: 'Create a modern themed token swap interface using Web3.js and Uniswap API' },
  { text: 'Create a neo-brutalist live cryptocurrency price app using CoinGecko API and React.' },
  { text: 'create a space invaders game that fully emulates the classic arcade' },
  { text: 'Create a neon themed Tic Tac Toe game in HTML, CSS, and JavaScript' },
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
