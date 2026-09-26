'use client';

import dynamic from 'next/dynamic';

const MessageNotificationProvider = dynamic(
  () => import('./MessageNotificationProvider').then((module) => module.MessageNotificationProvider),
  { ssr: false },
);

export function GlobalClientRuntime() {
  return <MessageNotificationProvider />;
}
