import { RemixBrowser } from '@remix-run/react';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

const container = document.getElementById('root');

if (container) {
  startTransition(() => {
    hydrateRoot(
      container,
      <StrictMode>
        <RemixBrowser />
      </StrictMode>,
    );
  });
} else {
  console.error('Root container not found');
}
