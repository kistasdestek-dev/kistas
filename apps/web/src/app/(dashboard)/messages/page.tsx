import { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { ChatService } from '@/lib/services/chat';
import { MessagesExperienceClient } from '@/components/chat/MessagesExperienceClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mesajlar | Kıstas',
  description: 'Geliştiriciler ve Kıstas Destek ile güvenli, anlık mesajlaşma.',
  robots: {
    index: false,
    follow: false,
  },
};

interface MessagesPageProps {
  searchParams: Promise<{
    conversationId?: string;
    listingId?: string;
  }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  // 1. Sunucu Tarafı Güvenlik ve Oturum Kontrolü (requireUser)
  const { user, supabase } = await requireUser();
  const params = await searchParams;

  let initialSelectedId = params.conversationId || null;

  // 2. Eğer URL'de bir listingId gelmişse, konuşmayı bul veya oluştur
  if (!initialSelectedId && params.listingId) {
    const res = await ChatService.getOrCreateListingConversation(supabase, params.listingId);
    if (res.success && res.conversationId) {
      initialSelectedId = res.conversationId;
    }
  }

  // 3. Destek ekibi yetkisini sunucuda çöz; yetkili ekip tüm destek taleplerini görebilir.
  const { data: rawAdminAccess } = await supabase.rpc('get_current_admin_access');
  const adminAccess = rawAdminAccess as {
    is_admin?: boolean;
    is_owner?: boolean;
    permissions?: string[];
  } | null;
  const canManageSupport = Boolean(
    adminAccess?.is_admin && (
      adminAccess.is_owner || adminAccess.permissions?.includes('community')
    )
  );

  // 4. Kullanıcının konuşmalarını ve sohbet avatarını paralel olarak çek.
  const [conversations, profileResult] = await Promise.all([
    ChatService.getConversations(supabase, user.id, canManageSupport),
    supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  return (
    <MessagesExperienceClient
      initialConversations={conversations}
      currentUserId={user.id}
      currentUserName={profileResult.data?.full_name || 'Siz'}
      currentUserAvatarUrl={profileResult.data?.avatar_url || null}
      initialSelectedId={initialSelectedId}
      canManageSupport={canManageSupport}
    />
  );
}
