'use server';

import { createClient } from '@/lib/supabase/server';
import { createAnonClient, getListingComments } from '@kistas/supabase';
import { createListingSchema } from '@kistas/shared';
import type { CommentReaction, ProfilePublic, ProjectComment } from '@kistas/shared';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function launchError(message: string): string {
  if (message.includes('DRAFT_EXPIRED')) return 'Arşivin son düzenlemeden itibaren 72 saatlik saklama süresi doldu. Yeni bir lansman oluşturun.';
  if (message.includes('EDIT_CONFLICT')) return 'Proje başka bir sekmede değişti. Arşiviniz korunuyor; güncel projeyi açıp değişiklikleri karşılaştırın.';
  if (message.includes('MEDIA_NOT_OWNED')) return 'Görseller hesabınıza ait depolamadan seçilmelidir.';
  if (message.includes('EMAIL_NOT_CONFIRMED')) return 'Lansman paylaşmak için e-posta adresinizi doğrulayın.';
  if (message.includes('FORBIDDEN') || message.includes('INVALID_STATUS')) return 'Bu projeyi düzenleme yetkiniz yok veya proje düzenlemeye kapalı.';
  return 'Lansman kaydedilemedi. Arşiviniz korunuyor; bağlantınızı kontrol edin.';
}

async function submitLaunch(formData: FormData, editing: boolean) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const listingId = editing ? String(formData.get('listingId') || '') : null;
  const expectedRevision = editing ? Number(formData.get('expectedRevision')) : null;
  const archiveId = String(formData.get('archiveId') || '') || null;
  if (editing && (!listingId || !UUID_PATTERN.test(listingId) || !formData.has('expectedRevision')
    || !Number.isSafeInteger(expectedRevision) || (expectedRevision ?? -1) < 0)) throw new Error('Geçersiz proje sürümü.');
  if (archiveId && !UUID_PATTERN.test(archiveId)) throw new Error('Geçersiz arşiv kimliği.');
  const validation = createListingSchema.safeParse({
    title: formData.get('title'), tagline: formData.get('tagline') || null,
    categoryId: formData.get('categoryId'), description: formData.get('description'),
    price: Number(formData.get('price') || 0), pricingModel: formData.get('pricingModel') || 'freemium',
    platforms: formData.getAll('platforms').map(String), websiteUrl: formData.get('webUrl') || null,
    appStoreUrl: formData.get('appStoreUrl') || null, playStoreUrl: formData.get('playStoreUrl') || null,
    promoCode: formData.get('promoCode') || null, logoUrl: formData.get('logoUrl') || null,
    coverUrl: formData.get('coverUrl') || null, screenshots: formData.getAll('screenshots').map(String),
  });
  if (!validation.success) throw new Error('Lütfen zorunlu alanları ve bağlantıları kontrol edin.');
  const valid = validation.data;
  if (valid.title.length > 150 || (valid.screenshots?.length ?? 0) > 6
    || !valid.platforms?.length || valid.platforms.length > 5
    || valid.platforms.some(platform => !['iOS','Android','Web','macOS','SaaS'].includes(platform))) {
    throw new Error('Başlık, görsel veya platform sınırları geçersiz.');
  }
  const { data, error } = await supabase.rpc('submit_launch', {
    p_payload: valid, p_listing_id: listingId, p_expected_revision: expectedRevision, p_draft_id: archiveId,
  });
  if (error || !data?.success || !UUID_PATTERN.test(data.listingId || '')) {
    throw new Error(launchError(error?.message || 'INVALID_RESPONSE'));
  }
  revalidatePath('/browse', 'layout');
  revalidatePath('/profile');
  revalidatePath('/launch-archive');
  if (listingId) revalidatePath(`/listings/${listingId}`);
  return { id: data.listingId as string };
}

export async function createListingAction(formData: FormData) {
  const data = await submitLaunch(formData, false);
  return { success: true as const, listingId: data.id, status: 'draft' as const };
}

export async function updateListingAction(formData: FormData) {
  const data = await submitLaunch(formData, true);
  const listingId = data.id;
  return { success: true as const, listingId, status: 'draft' as const };
}

/**
 * Server Action: Toggle Project Upvote (Permanent support)
 */
export async function toggleProjectUpvoteAction(projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Destek vermek için lütfen giriş yapınız.' };
  }

  const { data, error } = await supabase.rpc('toggle_project_upvote', {
    p_project_id: projectId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/listings/${projectId}`);
  revalidatePath('/browse', 'layout');
  revalidatePath('/');
  return { success: true, ...(data as object) };
}

/**
 * Server Action: Record Listing View (Increment view count)
 */
export async function recordProjectViewAction(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    await supabase.rpc('record_listing_view', {
      p_listing_id: projectId,
      p_user_id: user?.id || null,
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

interface ProjectCommentRow {
  id: string;
  listing_id: string;
  author_id: string;
  body: string;
  parent_id?: string | null;
  created_at: string;
  likes_count?: number;
  dislikes_count?: number;
  user?: ProfilePublic;
}

/**
 * Faz 6 sertleştirmesi gereği doğrudan INSERT mühürlüdür; yorum yazımı yalnızca
 * `create_project_comment` RPC'si üzerinden yapılır ve RPC hata kodları çevrilir.
 */
function mapProjectCommentRpcError(message: string): string {
  if (message.includes('AUTH_REQUIRED')) return 'Tepki vermek için giriş yapmalısınız.';
  if (message.includes('VERIFICATION_REQUIRED')) return 'Yorum yapmak için hesabınızı doğrulamalısınız.';
  if (message.includes('COMMENT_MUTED')) return 'Yorum yapma yetkiniz 3 gün süreyle durduruldu.';
  if (message.includes('RATE_LIMITED')) return 'Çok sık yorum yapıyorsunuz. Lütfen 10 saniye bekleyin.';
  if (message.includes('OWNER_REPLY_ONLY')) return 'Yorumları yalnızca proje sahibi yanıtlayabilir.';
  if (message.includes('PARENT_NOT_FOUND')) return 'Yanıtlanacak yorum bulunamadı.';
  if (message.includes('LISTING_NOT_FOUND')) return 'Proje yorumlara açık değil.';
  if (message.includes('INVALID_COMMENT')) return 'Yorum 2 ile 1200 karakter arasında olmalıdır.';
  if (message.includes('UNAUTHORIZED')) return 'Yorum yapmak için giriş yapmalısınız.';
  return message.replace(/^[A-Z_]+:\s*/, '');
}

/** getListingComments (packages/supabase) ile birebir aynı okuma şemasına eşler. */
function mapProjectCommentRow(row: ProjectCommentRow): ProjectComment {
  return {
    id: row.id,
    listing_id: row.listing_id,
    user_id: row.author_id,
    content: row.body,
    parent_id: row.parent_id ?? null,
    created_at: row.created_at,
    likes_count: row.likes_count ?? 0,
    dislikes_count: row.dislikes_count ?? 0,
    my_reaction: null,
    user: row.user,
  };
}

/**
 * Public comment reader used only after explicit user intent. The anonymous
 * client keeps the response inside the existing public RLS boundary.
 */
export async function loadProjectCommentsAction(projectId: string) {
  if (!UUID_PATTERN.test(projectId)) {
    return { success: false as const, error: 'Geçersiz proje kimliği.', comments: [] as ProjectComment[] };
  }

  try {
    const comments = await getListingComments(createAnonClient(), projectId);
    return { success: true as const, comments };
  } catch {
    return { success: false as const, error: 'Yorumlar şu anda yüklenemiyor.', comments: [] as ProjectComment[] };
  }
}

/**
 * Server Action: Add Project Comment or Reply
 */
export async function addProjectCommentAction(
  projectId: string,
  content: string,
  parentId?: string | null
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Yorum yapmak için giriş yapmalısınız.' };
  }

  const trimmed = content.trim();
  if (!trimmed || trimmed.length < 2) {
    return { success: false, error: 'Yorum en az 2 karakter olmalıdır.' };
  }

  // 1. YAZMA: Yetki, doğrulama, hız limiti ve moderasyon denetimli RPC üzerinden.
  const { data: created, error: writeError } = await supabase.rpc('create_project_comment', {
    p_listing_id: projectId,
    p_body: trimmed,
    p_parent_id: parentId || null,
  });

  if (writeError) {
    return { success: false, error: mapProjectCommentRpcError(writeError.message) };
  }

  const createdRow = (Array.isArray(created) ? created[0] : created) as ProjectCommentRow | null;

  if (!createdRow?.id) {
    return { success: false, error: 'Yorum kaydedilemedi.' };
  }

  // 2. OKUMA: Yazar bilgisiyle birlikte projenin standart yorum şemasında tek kayıt çekilir.
  const { data, error: readError } = await supabase
    .from('project_comments')
    .select('*, user:profiles(id, full_name, avatar_url, is_verified)')
    .eq('id', createdRow.id)
    .single();

  if (readError || !data) {
    return { success: false, error: readError?.message || 'Yorum kaydedilemedi.' };
  }

  revalidatePath(`/listings/${projectId}`);
  return { success: true, comment: mapProjectCommentRow(data as ProjectCommentRow) };
}

/**
 * Server Action: Toggle Project Comment Reaction (beğeni / beğenmeme)
 *
 * Tepki yazımları yalnızca atomik `toggle_project_comment_reaction` RPC'si üzerinden
 * yapılır; `project_comment_reactions` tablosuna doğrudan yazma mühürlüdür.
 */
export async function toggleProjectCommentReactionAction(
  commentId: string,
  reaction: CommentReaction
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Tepki vermek için giriş yapmalısınız.' };
  }

  if (reaction !== 1 && reaction !== -1) {
    return { success: false, error: 'Geçersiz tepki türü.' };
  }

  const { data, error } = await supabase.rpc('toggle_project_comment_reaction', {
    p_comment_id: commentId,
    p_reaction: reaction,
  });

  if (error) {
    return { success: false, error: mapProjectCommentRpcError(error.message) };
  }

  const payload = (Array.isArray(data) ? data[0] : data) as {
    success?: boolean;
    action?: 'reacted' | 'removed' | 'switched';
    my_reaction?: 1 | -1 | null;
    likes_count?: number;
    dislikes_count?: number;
    code?: string;
    error?: string;
  } | null;

  if (!payload?.success) {
    return {
      success: false,
      error: mapProjectCommentRpcError(payload?.code || payload?.error || 'Tepki kaydedilemedi.'),
    };
  }

  return {
    success: true,
    action: payload.action || 'reacted',
    my_reaction: payload.my_reaction ?? null,
    likes_count: payload.likes_count ?? 0,
    dislikes_count: payload.dislikes_count ?? 0,
  };
}
