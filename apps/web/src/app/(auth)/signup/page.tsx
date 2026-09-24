import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthExperienceClient } from '@/components/AuthExperienceClient';

export const metadata: Metadata = {
  title: 'Kayıt Ol — Kıstas',
  description: 'Kıstas ekosistemine katılın, dijital projelerinizi vitrine taşıyın ve toplulukla buluşun.',
};

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/profile');
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Yükleniyor...</div>}>
      <AuthExperienceClient mode="register" />
    </Suspense>
  );
}
