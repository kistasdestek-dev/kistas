import { z } from 'zod';

export const createListingSchema = z.object({
  title: z.string().trim().min(2, 'Başlık en az 2 karakter olmalıdır').max(200, 'Başlık en fazla 200 karakter olabilir'),
  tagline: z.string().trim().max(160, 'Slogan en fazla 160 karakter olabilir').optional().nullable(),
  description: z.string().trim().min(10, 'Açıklama en az 10 karakter olmalıdır').max(6000, 'Açıklama en fazla 6000 karakter olabilir'),
  categoryId: z.string().uuid('Geçerli bir kategori seçilmelidir'),
  price: z.number().min(0, 'Fiyat 0 veya üzeri olmalıdır').max(999999, 'Geçersiz fiyat tutarı'),
  pricingModel: z.enum(['free', 'freemium', 'subscription', 'paid']).default('freemium'),
  platforms: z.array(z.string()).optional(),
  websiteUrl: z.string().url('Geçerli bir web adresi giriniz').optional().nullable().or(z.literal('')),
  appStoreUrl: z.string().url('Geçerli bir App Store adresi giriniz').optional().nullable().or(z.literal('')),
  playStoreUrl: z.string().url('Geçerli bir Play Store adresi giriniz').optional().nullable().or(z.literal('')),
  promoCode: z.string().trim().max(50).optional().nullable(),
  logoUrl: z.string().url('Geçerli bir logo adresi giriniz').optional().nullable().or(z.literal('')),
  coverUrl: z.string().url('Geçerli bir vitrin kapağı adresi giriniz').optional().nullable().or(z.literal('')),
  screenshots: z.array(z.string().url()).optional(),
});

export const createOrderSchema = z.object({
  listingId: z.string().uuid('Geçersiz ilan ID'),
  sellerId: z.string().uuid('Geçersiz satıcı ID'),
  amount: z.number().positive('Tutar pozitif olmalıdır').max(999999),
  requestId: z.string().uuid('Geçersiz işlem istek ID'),
});

export const boostListingSchema = z.object({
  listingId: z.string().uuid('Geçersiz ilan ID'),
  credits: z.number().int().positive('Kredi miktarı pozitif bir tamsayı olmalıdır').max(1000),
  requestId: z.string().uuid('Geçersiz istek ID'),
});

export const openDisputeSchema = z.object({
  orderId: z.string().uuid('Geçersiz sipariş ID'),
  reason: z.string().trim().min(10, 'Uyuşmazlık nedeni en az 10 karakter olmalıdır').max(2000),
  evidenceUrls: z.array(z.string().url()).optional(),
});

export const addCommentSchema = z.object({
  listingId: z.string().uuid('Geçersiz ilan ID'),
  content: z.string().trim().min(1, 'Yorum boş olamaz').max(1000, 'Yorum en fazla 1000 karakter olabilir'),
  parentId: z.string().uuid().optional().nullable(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('Geçersiz konuşma ID'),
  content: z.string().trim().min(1, 'Mesaj boş olamaz').max(2000, 'Mesaj en fazla 2000 karakter olabilir'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Ad Soyad en az 2 karakter olmalıdır').max(100, 'Ad Soyad en fazla 100 karakter olabilir'),
  bio: z.string().trim().max(500, 'Biyografi en fazla 500 karakter olabilir').optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().regex(/^(\+90|0)?[1-9][0-9]{9}$/, 'Geçerli bir telefon numarası giriniz').optional().nullable().or(z.literal('')),
});
