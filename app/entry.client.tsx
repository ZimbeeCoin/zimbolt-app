import { RemixBrowser } from '@remix-run/react';
import { startTransition, StrictMode, Fragment } from 'react';
import { hydrateRoot } from 'react-dom/client';

const container = document.getElementById('root');

// Use StrictMode only in development to avoid double renders in production.
const Wrapper = import.meta.env.DEV ? StrictMode : Fragment;

if (container) {
  startTransition(() => {
    hydrateRoot(
      container,
      <Wrapper>
        <RemixBrowser />
      </Wrapper>,
    );
  });
} else {
  console.error('Root container not found');
}
