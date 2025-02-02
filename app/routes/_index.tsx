import { type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

/**
 * Meta tags for the page.
 * This meta function returns an array of meta objects for the document head,
 * updating the title and description to match the Zimbolt branding.
 */
export const meta: MetaFunction = () => [
  { title: 'Zimbolt' },
  {
    name: 'description',
    content:
      'Manage your cryptocurrency workflows and integrations with Zimbolt, an advanced AI chatbot for the Zimbee ecosystem.',
  },
];

/**
 * Loader function returning an empty JSON response.
 * Uses Response.json() to avoid the deprecated json() utility.
 * Remove or update this loader if no data is required on page load.
 */
export const loader = () => Response.json({});

/**
 * The main index component.
 * This component renders the full-page layout with background effects, header,
 * and the chat interface. The ClientOnly component ensures that the Chat component
 * is rendered only on the client, with BaseChat as a fallback during server-side rendering.
 */
export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
