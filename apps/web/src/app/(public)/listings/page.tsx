import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{
    kategori?: string;
    platform?: string;
  }>;
}

const PLATFORM_BY_PATH: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
  macos: 'macOS',
  saas: 'SaaS',
};

export default async function LegacyListingsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params.kategori) {
    redirect(`/browse/${encodeURIComponent(params.kategori)}`);
  }

  if (params.platform) {
    const platform = PLATFORM_BY_PATH[params.platform.toLocaleLowerCase('en-US')];
    if (platform) redirect(`/browse/platform/${platform}`);
  }

  redirect('/browse');
}
