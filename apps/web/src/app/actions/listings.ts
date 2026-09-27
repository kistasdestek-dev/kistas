'use server';

import { createClient } from '@/lib/supabase/server';
import { createAnonClient, getListingComments } from '@kistas/supabase';
import { createListingSchema } from '@kistas/shared';
import type { CommentReaction, ProfilePublic, ProjectComment } from '@kistas/shared';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Server Action to create a new project listing
 * Validates with Zod and enforces server-side user authentication.
 */
export async function createListingAction(formData: FormData) {
  const supabase = await createClient();

  // 1. Auth Guard (getUser strictly server-side)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Zod Input Validation
  const platforms = formData.getAll('platforms').map(String);
  const screenshots = formData.getAll('screenshots').map(String);

  const rawData = {
    title: formData.get('title'),
    tagline: formData.get('tagline') || null,
    categoryId: formData.get('categoryId'),
    description: formData.get('description'),
    price: Number(formData.get('price') || 0),
    pricingModel: formData.get('pricingModel') || 'freemium',
    platforms: platforms.length > 0 ? platforms : ['iOS'],
    websiteUrl: formData.get('webUrl') || null,
    appStoreUrl: formData.get('appStoreUrl') || null,
    playStoreUrl: formData.get('playStoreUrl') || null,
    promoCode: formData.get('promoCode') || null,
    logoUrl: formData.get('logoUrl') || null,
    coverUrl: formData.get('coverUrl') || null,
    screenshots: screenshots.length > 0 ? screenshots : undefined,
  };

  const validation = createListingSchema.safeParse(rawData);

  if (!validation.success) {
    throw new Error(`Validasyon Hatası: ${validation.error.errors.map((e) => e.message).join(', ')}`);
  }

  const valid = validation.data;

  // 3. Database Insert via Server Supabase Client (RLS enforces user_id)
  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      category_id: valid.categoryId,
      title: valid.title,
      tagline: valid.tagline,
      description: valid.description,
      price: valid.price,
      pricing_model: valid.pricingModel,
      platforms: valid.platforms || ['iOS'],
      logo_url: valid.logoUrl,
      web_url: valid.websiteUrl,
      app_store_url: valid.appStoreUrl,
      play_store_url: valid.playStoreUrl,
      promo_code: valid.promoCode,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Kayıt oluşturulamadı: ${error.message}`);
  }

  // 4. Listing Images Insert (Cover / Screenshots)
  const allImages = Array.from(
    new Set(
      [valid.coverUrl, ...(valid.screenshots || [])].filter(
        (url): url is string => typeof url === 'string' && url.length > 0
      )
    )
  );

  if (allImages.length > 0) {
    const imageRecords = allImages.map((imageUrl, idx) => ({
      listing_id: data.id,
      image_url: imageUrl,
      display_order: idx,
      is_cover: idx === 0,
    }));

    const { error: imgError } = await supabase
      .from('listing_images')
      .insert(imageRecords);

    if (imgError) {
      console.warn('Listing images insert warning:', imgError.message);
    }
  }

  revalidatePath('/browse', 'layout');
  revalidatePath('/profile');
  return { success: true as const, listingId: data.id, status: 'draft' as const };
}

/**
 * Server Action to update an existing project owned by the authenticated user.
 * Ownership is checked explicitly in addition to the database RLS/BOLA guards.
 */
export async function updateListingAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect('/login');

  const listingId = String(formData.get('listingId') || '');
  if (!UUID_PATTERN.test(listingId)) throw new Error('Geçersiz proje kimliği.');

  const platforms = formData.getAll('platforms').map(String);
  const screenshots = formData.getAll('screenshots').map(String);
  const validation = createListingSchema.safeParse({
    title: formData.get('title'),
    tagline: formData.get('tagline') || null,
    categoryId: formData.get('categoryId'),
    description: formData.get('description'),
    price: Number(formData.get('price') || 0),
    pricingModel: formData.get('pricingModel') || 'freemium',
    platforms: platforms.length > 0 ? platforms : ['iOS'],
    websiteUrl: formData.get('webUrl') || null,
    appStoreUrl: formData.get('appStoreUrl') || null,
    playStoreUrl: formData.get('playStoreUrl') || null,
    logoUrl: formData.get('logoUrl') || null,
    coverUrl: formData.get('coverUrl') || null,
    screenshots: screenshots.length > 0 ? screenshots : undefined,
  });

  if (!validation.success) {
    throw new Error(`Validasyon Hatası: ${validation.error.errors.map((e) => e.message).join(', ')}`);
  }

  const { data: currentListing, error: currentError } = await supabase
    .from('listings')
    .select('id, status')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .maybeSingle();

  if (currentError || !currentListing) {
    throw new Error('Proje bulunamadı veya güncelleme yetkiniz yok.');
  }
  if (currentListing.status === 'banned' || currentListing.status === 'suspended') {
    throw new Error('Askıya alınan proje düzenlenemez.');
  }

  const valid = validation.data;
  const isRevisionResubmission = currentListing.status === 'inactive';
  const { data: updatedListing, error: updateError } = await supabase
    .from('listings')
    .update({
      category_id: valid.categoryId,
      title: valid.title,
      tagline: valid.tagline,
      description: valid.description,
      price: valid.price,
      pricing_model: valid.pricingModel,
      platforms: valid.platforms || ['iOS'],
      logo_url: valid.logoUrl,
      web_url: valid.websiteUrl,
      app_store_url: valid.appStoreUrl,
      play_store_url: valid.playStoreUrl,
      ...(isRevisionResubmission ? {} : { status: 'draft' }),
    })
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .select('id')
    .maybeSingle();

  if (updateError || !updatedListing) {
    throw new Error(updateError?.message || 'Proje güncellenemedi.');
  }

  const imageUrls = Array.from(
    new Set(
      [valid.coverUrl, ...(valid.screenshots || [])].filter(
        (url): url is string => typeof url === 'string' && url.length > 0
      )
    )
  );
  const { error: deleteImagesError } = await supabase
    .from('listing_images')
    .delete()
    .eq('listing_id', listingId);

  if (deleteImagesError) throw new Error(`Proje görselleri güncellenemedi: ${deleteImagesError.message}`);

  if (imageUrls.length > 0) {
    const { error: insertImagesError } = await supabase.from('listing_images').insert(
      imageUrls.map((imageUrl, index) => ({
        listing_id: listingId,
        image_url: imageUrl,
        display_order: index,
        is_cover: index === 0,
      }))
    );
    if (insertImagesError) {
      throw new Error(`Proje görselleri güncellenemedi: ${insertImagesError.message}`);
    }
  }

  if (isRevisionResubmission) {
    const { data: resubmission, error: resubmissionError } = await supabase.rpc(
      'resubmit_listing_for_review',
      { p_listing_id: listingId }
    );
    if (resubmissionError || !resubmission?.success) {
      throw new Error(resubmissionError?.message || 'Düzeltmeler yeniden incelemeye gönderilemedi.');
    }
  }

  revalidatePath('/browse', 'layout');
  revalidatePath('/profile');
  revalidatePath(`/listings/${listingId}`);
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
