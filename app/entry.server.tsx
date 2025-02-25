import type { AppLoadContext } from '@remix-run/cloudflare';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  _loadContext: AppLoadContext,
) {
  // Render the application to a stream.
  const readable = await renderToReadableStream(<RemixServer context={remixContext} url={request.url} />, {
    signal: request.signal,
    onError(error: unknown) {
      console.error(error);
      responseStatusCode = 500;
    },
  });

  // Precompute head markup and cache static header/footer portions.
  const headMarkup = renderHeadToString({ request, remixContext, Head });
  const staticHeader = `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${headMarkup}</head><body><div id="root" class="w-full h-full">`;
  const staticFooter = '</div></body></html>';
  const encoder = new TextEncoder();

  const body = new ReadableStream({
    async start(controller) {
      // Enqueue static header.
      controller.enqueue(encoder.encode(staticHeader));

      // Stream the rendered content.
      const reader = readable.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          controller.enqueue(value);
        }
      } catch (error) {
        console.error(error);
        controller.error(error);
        readable.cancel();

        return;
      }

      // Enqueue static footer and close the stream.
      controller.enqueue(encoder.encode(staticFooter));
      controller.close();
    },
    cancel() {
      readable.cancel();
    },
  });

  // If the request comes from a bot, wait for the stream to be ready.
  if (isbot(request.headers.get('user-agent') || '')) {
    await readable.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
