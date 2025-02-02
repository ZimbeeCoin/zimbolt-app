import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

export const links: LinksFunction = () => [
  // Primary favicon (ICO format for universal browser support)
  {
    rel: 'icon',
    href: '/zimbee_favicon.ico',
    type: 'image/x-icon',
  },

  // PNG Favicon fallback for modern browsers
  {
    rel: 'icon',
    href: '/zimbee_favicon.png',
    type: 'image/png',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setZimboltTheme();
  
  function setZimboltTheme() {
    let theme = localStorage.getItem('zimbolt_theme');
    
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }

  // Force favicon reload
  function reloadFavicon() {
    let favicon = document.querySelector("link[rel='icon']");
    if (favicon) {
      favicon.href = "/zimbee_favicon.ico" + "?v=" + Date.now();
    }
  }

  document.addEventListener("DOMContentLoaded", reloadFavicon);
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Zimbolt ⚡ AI-Powered Developer</title>
    <meta
      name="description"
      content="Zimbolt is the ultimate AI-powered DeFi development platform, integrated with ZimbeeCoin 🦝 and Zimbot 🤖. Build, automate, and deploy Web3 solutions with ease."
    />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      {children}
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

import { logStore } from './lib/stores/logs';

export default function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    logStore.logSystem('🔹 Zimbolt Initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
