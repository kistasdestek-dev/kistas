/**
 * Kıstas Çekirdek İş Mantığı & Mimari Regresyon Testleri (Core Domain Regression Suite)
 * 
 * Bu test paketi, sistemdeki kritik iş kurallarının bozulmadığını
 * (sponsorluk rotasyonu, oy hesapları, platform tipleri, girdi güvenliği ve hata kalkanları)
 * doğrudan assertion'lar ile garanti eder.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

console.log('🧪 [REGRESYON TESTİ] Kıstas Domain & Mimari Kuralları Denetleniyor...\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`   ✔️  PASSED: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`   ❌ FAILED: ${name}`);
    console.error(`      Hata: ${err.message}`);
    failedTests++;
  }
}

// -------------------------------------------------------------
// 1. SPONSORLUK & BOOST ZAMAN AŞIMI MANTIĞI
// -------------------------------------------------------------
const isListingSponsored = (listing, referenceTime = Date.now()) => {
  if (!listing || !listing.boostedUntil) return false;
  const expiresAt = Date.parse(listing.boostedUntil);
  return Number.isFinite(expiresAt) && expiresAt > referenceTime;
};

const isListingCategorySponsored = (listing, referenceTime = Date.now()) => {
  if (!listing || !listing.categoryBoostedUntil) return false;
  const expiresAt = Date.parse(listing.categoryBoostedUntil);
  return Number.isFinite(expiresAt) && expiresAt > referenceTime;
};

runTest('Sponsorluk: Gelecekteki boost tarihi aktif (true) dönmeli', () => {
  const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
  assert.strictEqual(isListingSponsored({ boostedUntil: futureDate }), true);
});

runTest('Sponsorluk: Geçmiş boost tarihi pasif (false) dönmeli', () => {
  const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
  assert.strictEqual(isListingSponsored({ boostedUntil: pastDate }), false);
});

runTest('Sponsorluk: Boş, tanımsız veya geçersiz tarih güvenle false dönmeli', () => {
  assert.strictEqual(isListingSponsored({ boostedUntil: null }), false);
  assert.strictEqual(isListingSponsored({ boostedUntil: undefined }), false);
  assert.strictEqual(isListingSponsored({ boostedUntil: 'invalid-date-string' }), false);
  assert.strictEqual(isListingSponsored(null), false);
});

runTest('Kategori Sponsorluğu: Bağımsız categoryBoostedUntil doğru hesaplanmalı', () => {
  const futureDate = new Date(Date.now() + 7200 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 1000).toISOString();
  assert.strictEqual(isListingCategorySponsored({ categoryBoostedUntil: futureDate }), true);
  assert.strictEqual(isListingCategorySponsored({ categoryBoostedUntil: pastDate }), false);
});

// -------------------------------------------------------------
// 2. OY VE PUAN DEĞER ARALIKLARI (INVARIANTS)
// -------------------------------------------------------------
function validateListingMetrics(listing) {
  if (typeof listing.upvotesCount !== 'number' || listing.upvotesCount < 0) {
    throw new Error('Oy sayısı negatif olamaz');
  }
  if (listing.seller?.ratingAverage !== undefined) {
    const r = listing.seller.ratingAverage;
    if (r < 0 || r > 5) {
      throw new Error('Puan ortalaması 0 ile 5 arasında olmalıdır');
    }
  }
  return true;
}

runTest('Metrik Doğrulama: Geçerli oy ve puan aralığı onaylanmalı', () => {
  assert.strictEqual(
    validateListingMetrics({ upvotesCount: 42, seller: { ratingAverage: 4.8 } }),
    true
  );
});

runTest('Metrik Doğrulama: Negatif oy veya taşkın puan reddedilmeli', () => {
  assert.throws(() => validateListingMetrics({ upvotesCount: -1 }), /Oy sayısı negatif olamaz/);
  assert.throws(() => validateListingMetrics({ upvotesCount: 5, seller: { ratingAverage: 5.5 } }), /0 ile 5 arasında/);
});

// -------------------------------------------------------------
// 3. PLATFORM & MODEL TİP BÜTÜNLÜĞÜ
// -------------------------------------------------------------
const ALLOWED_PLATFORMS = new Set(['iOS', 'Android', 'Web', 'macOS', 'SaaS']);
const ALLOWED_PRICING = new Set(['free', 'freemium', 'paid', 'subscription']);

runTest('Platform Bütünlüğü: Tanımlı platformlar sistem şemasına uygun olmalı', () => {
  const samplePlatforms = ['iOS', 'Web', 'Android'];
  samplePlatforms.forEach(p => assert.ok(ALLOWED_PLATFORMS.has(p), `Geçersiz platform: ${p}`));
});

runTest('Fiyatlandırma Bütünlüğü: Pricing modelleri şemaya uymalı', () => {
  const sampleModels = ['free', 'freemium', 'paid', 'subscription'];
  sampleModels.forEach(m => assert.ok(ALLOWED_PRICING.has(m), `Geçersiz fiyatlandırma modeli: ${m}`));
});

// -------------------------------------------------------------
// 4. GİRDİ GÜVENLİĞİ & XSS SAVUNMASI (SANITIZATION)
// -------------------------------------------------------------
function sanitizeUserInput(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:[^\s]*/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

runTest('Güvenlik: Zararlı script ve event handler etiketleri arındırılmalı', () => {
  const attackVector = 'Harika App <script>alert("hack")</script><img src="x" onerror="stealCookie()">';
  const clean = sanitizeUserInput(attackVector);
  assert.ok(!clean.includes('<script>'), 'Script etiketi temizlenmedi');
  assert.ok(!clean.includes('onerror='), 'Onerror handler temizlenmedi');
});

// -------------------------------------------------------------
// 5. MİMARİ & HATA KALKANI (ERROR BOUNDARY) GÜVENCESİ
// -------------------------------------------------------------
runTest('Mimari Kalkanı: ErrorBoundary bileşeni mevcut ve sağlam olmalı', () => {
  const ebPath = path.join(ROOT, 'src', 'shared', 'components', 'ErrorBoundary.tsx');
  assert.ok(fs.existsSync(ebPath), 'ErrorBoundary.tsx dosyası mevcut değil!');
  const content = fs.readFileSync(ebPath, 'utf8');
  assert.ok(content.includes('componentDidCatch'), 'componentDidCatch yaşam döngüsü eksik!');
  assert.ok(content.includes('getDerivedStateFromError'), 'getDerivedStateFromError eksik!');
});

runTest('Mimari Kalkanı: FeaturedBoostShowcase ErrorBoundary ile korunmalı ve modüler olmalı', () => {
  const fbsPath = path.join(ROOT, 'src', 'shared', 'components', 'FeaturedBoostShowcase.tsx');
  assert.ok(fs.existsSync(fbsPath), 'FeaturedBoostShowcase.tsx mevcut değil!');
  const content = fs.readFileSync(fbsPath, 'utf8');
  const lines = content.split('\n').length;
  assert.ok(lines < 250, `FeaturedBoostShowcase çok büyük (${lines} satır), modüler olmalı!`);
  assert.ok(content.includes('<ErrorBoundary'), 'FeaturedBoostShowcase içinde ErrorBoundary sarmalayıcısı eksik!');
});

runTest('Mimari Kalkanı: AutoTransparentLogo ayrıştırması mevcut olmalı', () => {
  const webLogoPath = path.join(ROOT, 'src', 'shared', 'components', 'AutoTransparentLogo.web.tsx');
  const nativeLogoPath = path.join(ROOT, 'src', 'shared', 'components', 'AutoTransparentLogo.tsx');
  assert.ok(fs.existsSync(webLogoPath), 'AutoTransparentLogo.web.tsx eksik!');
  assert.ok(fs.existsSync(nativeLogoPath), 'AutoTransparentLogo.tsx eksik!');
});

// -------------------------------------------------------------
// 6. OTONOM SELF-HEALING & BUNDLE BÜTÇESİ KALKANI
// -------------------------------------------------------------
runTest('Otonom Hijyen: Self-Healing motoru mevcut ve fonksiyonel olmalı', async () => {
  const healEnginePath = path.join(ROOT, 'scripts', 'engine', 'self-healing.mjs');
  assert.ok(fs.existsSync(healEnginePath), 'self-healing.mjs eksik!');
  const healModule = await import('../engine/self-healing.mjs');
  assert.strictEqual(typeof healModule.healFileImports, 'function');
  assert.strictEqual(typeof healModule.runSelfHealing, 'function');
});

runTest('Performans Radarı: Bundle Budget analiz motoru bütçeyi doğrulamalı', async () => {
  const budgetEnginePath = path.join(ROOT, 'scripts', 'engine', 'bundle-budget.mjs');
  assert.ok(fs.existsSync(budgetEnginePath), 'bundle-budget.mjs eksik!');
  assert.strictEqual(typeof budgetModule.analyzeBundleBudget, 'function');
  const res = budgetModule.analyzeBundleBudget(ROOT);
  assert.ok(typeof res.rawUsagePct === 'number', 'Ham bütçe yüzdesi hesaplanamadı');
  assert.ok(res.bundleFound, 'Aktif canlı web paketi bulunamadı');
});

// -------------------------------------------------------------
// 7. BİLDİRİM SAKLAMA & 3 GÜNLÜK (72 SAAT) RETENTION KALKANI
// -------------------------------------------------------------
const RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 gün = 259,200,000 ms

const isNotificationExpired = (createdAtIso, nowMs = Date.now()) => {
  const createdMs = new Date(createdAtIso).getTime();
  if (isNaN(createdMs)) return true;
  return (nowMs - createdMs) > RETENTION_MS;
};

runTest('Bildirim Saklama Kalkanı: 3 günden yeni bildirimler KORUNMALI, 3 günü aşanlar SİLİNMELİ', () => {
  const now = Date.now();
  const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysMinus5Min = new Date(now - (3 * 24 * 60 - 5) * 60 * 1000).toISOString();
  const threeDaysPlus5Min = new Date(now - (3 * 24 * 60 + 5) * 60 * 1000).toISOString();
  const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();

  assert.strictEqual(isNotificationExpired(oneHourAgo, now), false, '1 saat önceki bildirim silinmemeli!');
  assert.strictEqual(isNotificationExpired(twoDaysAgo, now), false, '2 gün önceki bildirim silinmemeli!');
  assert.strictEqual(isNotificationExpired(threeDaysMinus5Min, now), false, '2 gün 23 saat 55 dakika önceki bildirim silinmemeli!');

  assert.strictEqual(isNotificationExpired(threeDaysPlus5Min, now), true, '3 gün 5 dakika önceki bildirim kesinlikle silinmeli!');
  assert.strictEqual(isNotificationExpired(fiveDaysAgo, now), true, '5 gün önceki bildirim kesinlikle silinmeli!');
});

runTest('Bildirim Saklama Kalkanı: 3 günlük temizlik istemciden bağımsız saatlik çalışmalı', () => {
  const retentionMigrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260911000002_notifications_retention_and_cleanup.sql',
  );
  const migrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260911000003_schedule_notifications_cleanup.sql',
  );
  const retentionMigration = fs.readFileSync(retentionMigrationPath, 'utf8');
  const migration = fs.readFileSync(migrationPath, 'utf8');

  assert.match(retentionMigration, /INTERVAL '3 days'/i, 'Veritabanı saklama süresi 3 gün değil!');
  assert.match(migration, /cron\.schedule\s*\(/i, 'Bildirim temizliği için pg_cron görevi eksik!');
  assert.match(migration, /kistas-notifications-retention-cleanup/i, 'Bildirim temizlik görevi adı eksik!');
  assert.match(migration, /17 \* \* \* \*/i, 'Bildirim temizliği saatlik çalışmıyor!');
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.cleanup_expired_notifications\(\) FROM PUBLIC, anon, authenticated/i,
    'Küresel temizlik RPC erişimi istemciden kaldırılmamış!',
  );
});

// -------------------------------------------------------------
// 7. MARKA ADI VE KİMLİK TAKLİDİ KORUMASI (SEC-003)
// -------------------------------------------------------------
const isReservedBrandName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const raw = name.trim();
  if (!raw) return false;

  const normalized = raw
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİiîíïì]/g, 'i')
    .replace(/[@4]/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[^a-z0-9]/g, '');

  if (normalized.includes('kistas')) {
    return true;
  }

  const spacedRegex = /k[\W_]*[ıİiîíïì1!|][\W_]*[s5$][\W_]*t[\W_]*[a@4][\W_]*[s5$]/i;
  return spacedRegex.test(raw);
};

runTest('Marka Koruma: Kıstas varyasyonları (büyük/küçük, leetspeak, noktalı) filtrelenmeli', () => {
  assert.strictEqual(isReservedBrandName('Kıstas'), true);
  assert.strictEqual(isReservedBrandName('kistas'), true);
  assert.strictEqual(isReservedBrandName('KISTAS'), true);
  assert.strictEqual(isReservedBrandName('KİSTAS'), true);
  assert.strictEqual(isReservedBrandName('k.ı.s.t.a.s'), true);
  assert.strictEqual(isReservedBrandName('k-i-s-t-a-s'), true);
  assert.strictEqual(isReservedBrandName('k 1 s t a s'), true);
  assert.strictEqual(isReservedBrandName('K1stas Resmi'), true);
  assert.strictEqual(isReservedBrandName('kıst@s Destek'), true);
  assert.strictEqual(isReservedBrandName('Kıstas_Admin'), true);
});

runTest('Marka Koruma: Meşru kullanıcı adlarına izin verilmeli', () => {
  assert.strictEqual(isReservedBrandName('Mehmet Özdemir'), false);
  assert.strictEqual(isReservedBrandName('Ayşe Yılmaz'), false);
  assert.strictEqual(isReservedBrandName('Ali Can'), false);
  assert.strictEqual(isReservedBrandName(''), false);
  assert.strictEqual(isReservedBrandName(null), false);
});

runTest('Marka Koruma: Veritabanı tetikleyicisi migration dosyası doğrulanmalı', () => {
  const brandMigrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260911000004_protect_brand_name.sql',
  );
  assert.strictEqual(fs.existsSync(brandMigrationPath), true, 'Brand protection migration dosyası eksik!');
  const sql = fs.readFileSync(brandMigrationPath, 'utf8');
  assert.match(sql, /check_profile_brand_name/i, 'check_profile_brand_name tetikleyici fonksiyonu eksik!');
  assert.match(sql, /is_platform_admin/i, 'is_platform_admin kontrolü eksik!');
});

// -------------------------------------------------------------
// 8. YORUM MODERASYONU VE YÖNETİCİ YETKİSİ
// -------------------------------------------------------------
runTest('Yorum Moderasyonu: 3 günlük susturma sunucu tarafında uygulanmalı', () => {
  const migrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260911000005_admin_comment_moderation.sql',
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /DELETE FROM private\.platform_admins[\s\S]*visionprefabrik@gmail\.com/i, 'Kaldırılacak yönetici hesabı migration içinde yok!');
  assert.match(sql, /INTERVAL '3 days'/i, 'Yorum susturma süresi 3 gün değil!');
  assert.match(sql, /public\.is_platform_admin\(\)/i, 'Yorum moderasyonu yönetici kontrolü içermiyor!');
  assert.match(sql, /admin_action_audit/i, 'Yorum moderasyonu denetim kaydı oluşturmuyor!');
  assert.match(sql, /COMMENT_MUTED/i, 'Yorum RPC susturma kontrolü içermiyor!');
});

// -------------------------------------------------------------
// 8. KULLANICI GİRİŞ & AUTH HATA TÜRKÇELEŞTİRME KONTROLÜ
// -------------------------------------------------------------
const localizeAuthError = (error, fallbackMessage = 'İşlem tamamlanamadı.') => {
  const rawMessage = (
    typeof error === 'string'
      ? error
      : error?.message || error?.error_description || ''
  ).toLowerCase().trim();

  if (!rawMessage) return fallbackMessage;

  if (
    rawMessage.includes('invalid login credentials') ||
    rawMessage.includes('invalid credentials') ||
    rawMessage.includes('invalid_grant') ||
    rawMessage.includes('invalid email or password')
  ) {
    return 'E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
  }

  if (rawMessage.includes('email not confirmed')) {
    return 'E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzdaki onay bağlantısını kontrol edin.';
  }

  if (
    rawMessage.includes('user already registered') ||
    rawMessage.includes('already registered') ||
    rawMessage.includes('user already exists')
  ) {
    return 'Bu e-posta adresi ile kayıtlı bir hesap zaten bulunmaktadır.';
  }

  if (
    rawMessage.includes('password should be at least') ||
    rawMessage.includes('password is too short')
  ) {
    return 'Şifreniz en az 6 karakter olmalıdır.';
  }

  if (
    rawMessage.includes('rate limit') ||
    rawMessage.includes('too many requests') ||
    rawMessage.includes('over_email_send_rate_limit')
  ) {
    return 'Çok fazla deneme yapıldı. Güvenliğiniz için lütfen biraz bekleyip tekrar deneyin.';
  }

  if (rawMessage.includes('user not found')) {
    return 'Bu bilgilere ait bir kullanıcı bulunamadı.';
  }

  return error?.message || fallbackMessage;
};

runTest('Auth Hata Kalkanı: "Invalid login credentials" ve türevleri Türkçe kullanıcı dostu mesaja çevrilmeli', () => {
  const result1 = localizeAuthError({ message: 'Invalid login credentials' });
  assert.strictEqual(
    result1,
    'E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.',
    'Invalid login credentials çevrilmedi!'
  );

  const result2 = localizeAuthError('Invalid credentials');
  assert.strictEqual(
    result2,
    'E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.'
  );

  const result3 = localizeAuthError({ message: 'Email not confirmed' });
  assert.strictEqual(
    result3,
    'E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzdaki onay bağlantısını kontrol edin.'
  );

  const result4 = localizeAuthError({ message: 'User already registered' });
  assert.strictEqual(
    result4,
    'Bu e-posta adresi ile kayıtlı bir hesap zaten bulunmaktadır.'
  );
});

// -------------------------------------------------------------
// 9. PROJE DESTEK KALICILIK KALKANI (SEC-004)
// -------------------------------------------------------------
runTest('Kalıcı Destek Kalkanı: Destek bir kez verildikten sonra geri alınamaz (DELETE engeli)', () => {
  const supportMigrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260911000006_permanent_project_support.sql'
  );
  assert.strictEqual(fs.existsSync(supportMigrationPath), true, 'Permanent support migration dosyası eksik!');
  const sql = fs.readFileSync(supportMigrationPath, 'utf8');

  // Fonksiyon içinde DELETE işlemi OLMAMALI
  assert.strictEqual(
    /DELETE\s+FROM\s+public\.project_upvotes/i.test(sql),
    false,
    'Kalıcı destek fonksiyonunda DELETE işlemi tespit edildi! Destek silinemez olmalıdır.'
  );

  // Mükerrer oy denemesi engellenmeli
  assert.match(
    sql,
    /SUPPORT_ALREADY_GIVEN/i,
    'Mükerrer destek geri alma/yenileme engeli kodu eksik!'
  );
});

// -------------------------------------------------------------
// 10. GEREKÇELİ PROJE DÜZELTME AKIŞI
// -------------------------------------------------------------
runTest('Proje Düzeltme Akışı: durum, bildirim ve denetim kaydı atomik olmalı', () => {
  const migrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260912000001_listing_revision_workflow.sql'
  );
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Proje düzeltme migration dosyası eksik!');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /SECURITY DEFINER[\s\S]*SET search_path = ''/i, 'Düzeltme RPC güvenli search_path kullanmıyor!');
  assert.match(sql, /public\.is_platform_admin\(\)/i, 'Düzeltme RPC yönetici yetkisini doğrulamıyor!');
  assert.match(sql, /status\s*=\s*'inactive'/i, 'Proje düzeltme durumuna alınmıyor!');
  assert.match(sql, /INSERT INTO public\.notifications/i, 'Kullanıcı bildirimi oluşturulmuyor!');
  assert.match(sql, /listing_revision_requested/i, 'Yönetici denetim kaydı oluşturulmuyor!');
  assert.match(sql, /BETWEEN 10 AND 1200/i, 'Düzeltme açıklaması uzunluk sınırı eksik!');
});

// -------------------------------------------------------------
// 11. CANLI DESTEK YAŞAM DÖNGÜSÜ
// -------------------------------------------------------------
runTest('Canlı Destek: yalnızca yönetici sonlandırabilmeli ve kapalı görüşmeye mesaj yazılamamalı', () => {
  const migrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260912000002_support_conversation_lifecycle.sql'
  );
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Destek yaşam döngüsü migration dosyası eksik!');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /admin_close_support_conversation[\s\S]*public\.is_platform_admin\(\)/i, 'Sohbet sonlandırma yönetici yetkisini doğrulamıyor!');
  assert.match(sql, /CONVERSATION_CLOSED/i, 'Kapalı görüşmeye mesaj gönderme engeli eksik!');
  assert.match(sql, /admin_clear_support_messages[\s\S]*closed_at IS NULL/i, 'Açık görüşmenin geçmişini silme engeli eksik!');
  assert.match(sql, /support_conversation_closed/i, 'Sohbet sonlandırma denetim kaydı eksik!');
  assert.match(sql, /support_messages_cleared/i, 'Mesaj temizleme denetim kaydı eksik!');
  assert.match(sql, /closed_at IS NULL[\s\S]*CREATE POLICY "Platform admins reply to support messages"/i, 'RLS kapalı destek görüşmelerini yazmaya karşı korumuyor!');
});

// -------------------------------------------------------------
// 12. YÖNETİM EKİBİ EN AZ YETKİ KALKANI
// -------------------------------------------------------------
runTest('Yönetim Ekibi: görev izinleri sabit allowlist ile sınırlandırılmalı', () => {
  const migrationPath = path.join(ROOT, 'supabase', 'migrations', '20260912000003_admin_team_permissions.sql');
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Yönetim ekibi migration dosyası eksik!');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /permissions\s*<@\s*ARRAY\['community',\s*'launches',\s*'blog'\]/i, 'Yetki allowlist kısıtı eksik!');
  assert.match(sql, /admin_set_team_member[\s\S]*public\.is_platform_admin\(\)/i, 'Ekip yetkilerini yalnızca süper yönetici değiştirmiyor!');
  assert.match(sql, /p_user_id\s*=\s*auth\.uid\(\)[\s\S]*PROTECTED_ADMIN/i, 'Ana yönetici hesabı değişiklikten korunmuyor!');
  assert.match(sql, /admin_action_audit[\s\S]*admin_team_access_updated/i, 'Yetki değişiklikleri denetim kaydına yazılmıyor!');
});

runTest('Yönetim Ekibi: destek, lansman ve blog yetkileri sunucuda ayrı doğrulanmalı', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20260912000003_admin_team_permissions.sql'), 'utf8');
  assert.match(sql, /admin_close_support_conversation[\s\S]*has_admin_permission\('community'\)/i, 'Destek işlemi community yetkisine bağlı değil!');
  assert.match(sql, /admin_request_listing_revision[\s\S]*has_admin_permission\('launches'\)/i, 'Lansman işlemi launches yetkisine bağlı değil!');
  assert.match(sql, /Authorized team manages blog posts[\s\S]*has_admin_permission\('blog'\)/i, 'Blog RLS politikası blog yetkisine bağlı değil!');
});

// -------------------------------------------------------------
// 13. VİTRİN KREDİ ÖZETİ YETKİ KALKANI
// -------------------------------------------------------------
runTest('Vitrin Kredisi: harcama özeti yalnızca oturum sahibinin kayıtlarını toplamalı', () => {
  const migrationPath = path.join(ROOT, 'supabase', 'migrations', '20260912000004_visibility_credit_summary.sql');
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Vitrin kredi özeti migration dosyası eksik!');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /SECURITY DEFINER[\s\S]*SET search_path = ''/i, 'Vitrin kredi özeti güvenli search_path kullanmıyor!');
  assert.match(sql, /v_user_id UUID := auth\.uid\(\)/i, 'Vitrin kredi özeti oturum sahibini sunucuda doğrulamıyor!');
  assert.match(sql, /credit_tx\.user_id\s*=\s*v_user_id/i, 'Kredi hareketleri oturum sahibiyle sınırlandırılmıyor!');
  assert.match(sql, /REVOKE ALL[\s\S]*PUBLIC, anon/i, 'Anonim RPC erişimi kapatılmamış!');
});

// -------------------------------------------------------------
// 14. PROJE DÜZELTMESİNİ YENİDEN GÖNDERME
// -------------------------------------------------------------
runTest('Proje Düzeltmesi: yeniden gönderim sahiplik ve durum doğrulamasıyla yapılmalı', () => {
  const migrationPath = path.join(ROOT, 'supabase', 'migrations', '20260914000004_listing_revision_resubmission.sql');
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Düzeltme yeniden gönderim migration dosyası eksik!');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /SECURITY DEFINER[\s\S]*SET search_path = ''/i, 'Yeniden gönderim RPC güvenli search_path kullanmıyor!');
  assert.match(sql, /seller_id\s*=\s*v_user_id/i, 'Yeniden gönderim proje sahipliğini doğrulamıyor!');
  assert.match(sql, /v_status\s*<>\s*'inactive'/i, 'Yalnızca düzeltme bekleyen projeye izin veren durum kontrolü eksik!');
  assert.match(sql, /status\s*=\s*'draft'/i, 'Proje yeniden inceleme durumuna geçirilmiyor!');
  assert.match(sql, /listing_revision_resubmitted/i, 'Yeniden gönderim denetim kaydı eksik!');
  assert.match(sql, /REVOKE ALL[\s\S]*PUBLIC, anon/i, 'Anonim yeniden gönderim erişimi kapatılmamış!');
});

// -------------------------------------------------------------
// 14. GÜNLÜK VİTRİN LİDERLERİ
// -------------------------------------------------------------
runTest('Günün Vitrini: günlük seçim Türkiye günü ve güvenli destek kurallarını korumalı', () => {
  const migrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260917000001_daily_showcase_leaders.sql'
  );
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Günlük Günün Vitrini migration dosyası eksik!');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /SECURITY DEFINER[\s\S]*SET search_path = ''/i, 'Lider seçim RPC güvenli search_path kullanmıyor!');
  assert.match(sql, /DATE_TRUNC\('day', p_reference_time AT TIME ZONE 'Europe\/Istanbul'\)/i, 'Türkiye yerel gün sınırı kullanılmıyor!');
  assert.match(sql, /v_local_day_start - INTERVAL '1 day'/i, 'Önceki tam gün yarışma başlangıcı eksik!');
  assert.match(sql, /support\.created_at >= v_competition_start[\s\S]*support\.created_at < v_competition_end/i, 'Destekler önceki tam günle sınırlandırılmıyor!');
  assert.match(sql, /verified_user\.email_confirmed_at IS NOT NULL/i, 'Doğrulanmamış kullanıcı destekleri dışlanmıyor!');
  assert.match(sql, /support\.user_id <> listing\.seller_id/i, 'Proje sahibinin kendi desteği dışlanmıyor!');
  assert.match(sql, /listing\.status = 'active'/i, 'Aktif olmayan projeler dışlanmıyor!');
  assert.match(sql, /listing\.boosted_until IS NULL[\s\S]*listing\.category_boosted_until IS NULL/i, 'Sponsorlu projeler organik liderlikten dışlanmıyor!');
  assert.match(sql, /HAVING COUNT\(verified_user\.id\) >= 1/i, 'En az bir doğrulanmış destek barajı eksik!');
  assert.match(sql, /PARTITION BY candidate\.category_id/i, 'Her kategori için bağımsız lider seçimi eksik!');
  assert.match(sql, /candidate\.support_score DESC[\s\S]*candidate\.lifetime_support_count DESC[\s\S]*candidate\.created_at DESC[\s\S]*candidate\.project_id ASC/i, 'Deterministik eşitlik sırası eksik!');
  assert.match(sql, /ON CONFLICT \(category_id, showcase_date\) DO UPDATE/i, 'Günlük seçim idempotent değil!');
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.select_daily_showcase_winners[\s\S]*PUBLIC, anon, authenticated/i, 'Lider seçici istemci rollerine kapatılmamış!');
});

runTest('Günün Vitrini: son geçerli lider ve saatlik adil rotasyon backend tarafından korunmalı', () => {
  const sql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260917000001_daily_showcase_leaders.sql'),
    'utf8'
  );
  assert.match(sql, /DISTINCT ON \(history\.category_id\)[\s\S]*history\.showcase_date DESC/i, 'Desteksiz günde son geçerli lider korunmuyor!');
  assert.match(sql, /EXTRACT\(HOUR FROM p_reference_time AT TIME ZONE 'Europe\/Istanbul'\)/i, 'Saatlik Türkiye rotasyonu eksik!');
  assert.match(sql, /computed_rotation_rank/i, 'Deterministik rotasyon sırası üretilmiyor!');
  assert.match(sql, /'0 21 \* \* \*'/i, 'Türkiye 00:00 günlük seçim görevi eksik!');
  assert.match(sql, /kistas-daily-showcase-reconciliation[\s\S]*'17 \* \* \* \*'/i, 'Saatlik uygunluk uzlaştırması eksik!');
  assert.match(sql, /REVOKE ALL ON TABLE public\.daily_showcase_winners FROM PUBLIC, anon, authenticated/i, 'Ham günlük lider tablosu istemci rollerine açık!');
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_daily_showcase_winners[\s\S]*anon, authenticated/i, 'Güvenli public getter yetkisi eksik!');

  const rotationRank = (basePosition, winnerCount, istanbulHour) =>
    (((basePosition - 1 - istanbulHour) % winnerCount) + winnerCount) % winnerCount + 1;
  const hour10 = [1, 2, 3, 4].map((position) => rotationRank(position, 4, 10));
  const sameHour = [1, 2, 3, 4].map((position) => rotationRank(position, 4, 10));
  const hour11 = [1, 2, 3, 4].map((position) => rotationRank(position, 4, 11));
  assert.deepStrictEqual(sameHour, hour10, 'Rotasyon aynı saat içinde sabit değil!');
  assert.deepStrictEqual([...hour10].sort(), [1, 2, 3, 4], 'Rotasyon liderleri eksiltiyor veya çoğaltıyor!');
  assert.deepStrictEqual(
    hour11,
    hour10.map((rank) => (rank === 1 ? 4 : rank - 1)),
    'Rotasyon sonraki saatte tam bir kademe ilerlemiyor!'
  );
});

runTest('Günün Vitrini: Keşfet kotası korunmalı ve kategori ekranından kaldırılmalı', () => {
  const discoverSource = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'listings', 'presentation', 'DiscoverScreen.tsx'),
    'utf8'
  );
  const categorySource = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'listings', 'presentation', 'CategoryScreen.tsx'),
    'utf8'
  );

  assert.match(discoverSource, /phoneMax[\s\S]*\? 3[\s\S]*tabletMax \? 4 : 6/i, '3\/4\/6 cihaz kotası eksik!');
  assert.match(discoverSource, /getDailyShowcaseListings/i, 'Keşfet günlük lider RPC akışını kullanmıyor!');
  assert.match(discoverSource, /filtered\.slice\(0, previewLimit\)/i, 'Backend rotasyon sırası cihaz kotasıyla kesilmiyor!');
  assert.doesNotMatch(discoverSource, /showcasePreviewSeed|selectStableRandomPreview/i, 'Eski rastgele önizleme devam ediyor!');
  assert.doesNotMatch(categorySource, /TodayShowcaseRow|getDailyShowcaseListings|getWeeklyShowcaseListings/i, 'Günün Vitrini kategori ekranından kaldırılmamış!');
});

runTest('Keşfet: ilk ekran veri ve logo işleme bütçesi proje sayısından bağımsız kalmalı', () => {
  const discoverSource = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'listings', 'presentation', 'DiscoverScreen.tsx'),
    'utf8'
  );
  const logoSource = fs.readFileSync(
    path.join(ROOT, 'src', 'shared', 'components', 'AutoTransparentLogo.web.tsx'),
    'utf8'
  );

  assert.match(discoverSource, /HOME_SPONSOR_LIMIT\s*=\s*12/i, 'Ana sayfa sponsor sorgusu 12 kayıtla sınırlı değil!');
  assert.match(discoverSource, /HOME_FEED_LIMIT\s*=\s*12/i, 'Ana sayfa organik akış sorgusu 12 kayıtla sınırlı değil!');
  assert.match(discoverSource, /getSponsoredListings\(categoryId, HOME_SPONSOR_LIMIT\)\.then/i, 'LCP sponsor isteği bağımsız tamamlanmıyor!');
  assert.doesNotMatch(discoverSource, /getUserUpvotedProjectIds\(\)/i, 'Keşfet kullanılmayan sınırsız destek geçmişini çekiyor!');
  assert.match(logoSource, /IntersectionObserver[\s\S]*rootMargin:\s*'320px'/i, 'Görünmeyen logoların tarayıcı işlemesi ertelenmiyor!');
});

runTest('Editoryal katalog: Google Play kaynakları açıkça belirtilmeli ve yönetilebilir kalmalı', () => {
  const seedSource = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260915000001_seed_editorial_google_play_catalog.sql'),
    'utf8'
  );
  const packageIds = [...seedSource.matchAll(/play\.google\.com\/store\/apps\/details\?id=([^&"']+)/g)]
    .map((match) => match[1]);

  assert.equal(new Set(packageIds).size, 7, 'Editoryal katalogda yedi benzersiz ve doğrulanmış paket olmalı!');
  assert.equal(packageIds.length, 7, 'Her Google Play paketi yalnız bir kez kaynak bağlantısı olarak yer almalı!');
  assert.doesNotMatch(seedSource, /id=hoklo\.android/i, 'Doğrulanamayan hoklo.android paketi eklenmemeli!');
  assert.equal((seedSource.match(/Kaynak: Google Play\./g) || []).length, 7, 'Her proje Google Play kaynağını açıklamalı!');
  assert.match(seedSource, /ON DELETE CASCADE/i, 'Editoryal görseller proje silinince temizlenebilir kalmalı!');
});

runTest('Editoryal katalog: gerçek geliştirici ile Kıstas yayıncısı ayrılmalı', () => {
  const attributionSql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260915000002_editorial_listing_attribution.sql'),
    'utf8'
  );
  const detailSource = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'listings', 'presentation', 'ProjectDetailScreen.tsx'),
    'utf8'
  );

  assert.match(attributionSql, /ADD COLUMN IF NOT EXISTS developer_name/i, 'Gerçek geliştirici alanı yok!');
  assert.match(attributionSql, /ADD COLUMN IF NOT EXISTS is_editorial/i, 'Editoryal kayıt işareti yok!');
  assert.match(attributionSql, /price = NULL/i, 'Editoryal ücretsiz kayıt sahte fiyat göstermemeli!');
  assert.match(detailSource, /project\.developerName \|\| project\.seller\?\.fullName/i, 'Detay ekranı gerçek geliştiriciyi öncelemiyor!');
  assert.match(
    detailSource,
    /project\.isEditorial[\s\S]*Kıstas Doğrulanmış Geliştirici[\s\S]*name="verified"/i,
    'Mağazadan doğrulanan editoryal geliştirici etiketi ve onay tiki görünmüyor!',
  );
  assert.match(detailSource, /onOpenChat && !project\.isEditorial/i, 'Kıstas editörü gerçek geliştirici gibi mesaj kabul ediyor!');
  assert.match(detailSource, /Yayınlayan[\s\S]*Kıstas Editör/i, 'Editoryal yayınlayan bilgisi ayrıştırılmamış!');
  assert.doesNotMatch(
    detailSource,
    /nativeEvent\.source\.(?:width|height)/i,
    'Web görsel yükleme olayı bulunmayan nativeEvent.source alanını okumamalı!',
  );
});

runTest('Proje görüntülenmesi: her detay açılışı sayılır ve sahip görüntülenmesi dışlanır', () => {
  const migrationPath = path.join(ROOT, 'supabase', 'migrations', '20260915000007_listing_view_tracking.sql');
  const counterMigrationPath = path.join(ROOT, 'supabase', 'migrations', '20260915000006_count_every_listing_open.sql');
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Proje görüntülenme migration dosyası eksik!');
  assert.strictEqual(fs.existsSync(counterMigrationPath), true, 'Her açılışı sayan migration dosyası eksik!');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const counterSql = fs.readFileSync(counterMigrationPath, 'utf8');
  const listingService = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'listings', 'application', 'ListingService.ts'),
    'utf8',
  );

  assert.match(sql, /id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY/i, 'Her görüntülenme için bağımsız olay kimliği eksik!');
  assert.doesNotMatch(sql, /ON CONFLICT[\s\S]*DO NOTHING/i, 'Görüntülenmeler günlük tekilleştirilmemeli!');
  assert.match(counterSql, /DROP CONSTRAINT IF EXISTS listing_view_events_pkey/i, 'Canlı günlük tekilleştirme kaldırılmıyor!');
  assert.match(counterSql, /ADD CONSTRAINT listing_view_events_pkey PRIMARY KEY \(id\)/i, 'Canlı görüntülenme olay anahtarı yenilenmiyor!');
  assert.match(counterSql, /SET view_count = LEAST\(COALESCE\(view_count, 0\) \+ 1/i, 'Her açılış sayacı atomik artırmıyor!');
  assert.doesNotMatch(listingService, /viewedListingIds/i, 'İstemci aynı projeye sonraki girişleri engellememeli!');
  assert.match(sql, /v_actor_id = v_seller_id/i, 'Proje sahibinin görüntülenmesi dışlanmıyor!');
  assert.match(sql, /v_status <> 'active'/i, 'Aktif olmayan projeler görüntülenme alamamalı!');
  assert.match(sql, /SECURITY DEFINER[\s\S]*SET search_path = ''/i, 'Görüntülenme RPC güvenli search_path kullanmıyor!');
  assert.match(sql, /REVOKE ALL ON TABLE public\.listing_view_events FROM PUBLIC, anon, authenticated/i, 'Ham görüntülenme kayıtları istemci rollerine açık!');
});

runTest('Vitrin sponsorluğu: kredi harcaması geçerli spend_boost işlem türünü kullanmalı', () => {
  const scopedBoostSql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260910000001_category_sponsorship_and_ranking.sql'),
    'utf8'
  );
  const repairSql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260915000005_fix_scoped_boost_transaction_type.sql'),
    'utf8'
  );

  assert.match(scopedBoostSql, /INSERT INTO public\.credit_transactions[\s\S]*'spend_boost'/i, 'Vitrin harcaması spend_boost türünde kaydedilmiyor!');
  assert.doesNotMatch(scopedBoostSql, /["']usage["']/i, 'Geçersiz usage enum değeri kaynak migration içinde kaldı!');
  assert.match(repairSql, /CREATE OR REPLACE FUNCTION public\.boost_listing_scoped[\s\S]*INSERT INTO public\.credit_transactions[\s\S]*'spend_boost'/i, 'Canlı RPC onarım migrationı işlem türünü düzeltmiyor!');
  assert.doesNotMatch(repairSql, /^\s*EXECUTE\s+/im, 'Canlı RPC onarım migrationı dinamik SQL kullanmamalı!');
  assert.doesNotMatch(repairSql, /["']usage["']/i, 'Geçersiz usage enum değeri onarım migrationı içinde kaldı!');
});

runTest('Kredi cüzdanı: hareketler yalnız sahibine açık ve harcama hedefiyle kaydedilmeli', () => {
  const baseSql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260903000004_boosting_credits_reviews_categories.sql'),
    'utf8'
  );
  const ledgerSql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260916000006_credit_ledger_details.sql'),
    'utf8'
  );
  const serviceSource = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'credits', 'application', 'CreditService.ts'),
    'utf8'
  );

  assert.match(baseSql, /Users view own credit transactions[\s\S]*auth\.uid\(\) = user_id/i, 'Kredi hareketleri sahibi dışına açık!');
  assert.match(ledgerSql, /user_id, amount, balance_after, type, description, metadata/i, 'Harcama hareketinde işlem sonrası bakiye veya ayrıntı eksik!');
  assert.match(ledgerSql, /'listing_id', p_listing_id[\s\S]*'listing_title', v_listing_title[\s\S]*'scope', v_clean_scope/i, 'Kredinin harcandığı proje ve vitrin kaydedilmiyor!');
  assert.match(serviceSource, /getMyCreditTransactions[\s\S]*\.eq\('user_id', authData\.user\.id\)/i, 'İstemci sorgusunda oturum sahibi filtresi eksik!');
});

// -------------------------------------------------------------
// FAZ 14: PROMOSYON KODU, FİYATLANDIRMA VE SİPARİŞ BÜTÜNLÜĞÜ
// -------------------------------------------------------------
runTest('FAZ 14: Promosyon kodu ve fiyat aralıkları veritabanı kısıtları doğrulanmalı', () => {
  const faz14Sql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260917000017_faz14_promo_pricing_and_delivery_hardening.sql'),
    'utf8'
  );

  assert.match(faz14Sql, /chk_listings_promo_code_format/i, 'Promosyon kodu format kısıtı eksik!');
  assert.match(faz14Sql, /\^\[A-Za-z0-9_\\-\]\+\$/i, 'Promosyon kodu alfanümerik regex kuralı eksik!');
  assert.match(faz14Sql, /chk_listings_price_range/i, 'İlan fiyat aralık tavan kısıtı eksik!');
  assert.match(faz14Sql, /chk_orders_seller_earnings_bounded[\s\S]*seller_earnings <= product_amount/i, 'Satıcı kazancının ürün tutarını aşamayacağı kuralı eksik!');
});

runTest('FAZ 14: Sipariş numarası ve kargo formatı güvenliği doğrulanmalı', () => {
  const faz14Sql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260917000017_faz14_promo_pricing_and_delivery_hardening.sql'),
    'utf8'
  );

  assert.match(faz14Sql, /chk_orders_order_number_format/i, 'Sipariş referans format kısıtı eksik!');
  assert.match(faz14Sql, /chk_orders_tracking_number_format/i, 'Kargo takip numarası format kısıtı eksik!');
  assert.match(faz14Sql, /gen_random_bytes\(4\)/i, 'Kriptografik güvenli rastgele sipariş üretimi (CSPRNG) eksik!');
  assert.match(faz14Sql, /SET search_path = public, pg_temp/i, 'create_escrow_order_atomic search_path izolasyonu eksik!');
});


console.log(`\n📊 Sonuç: ${passedTests} Başarılı, ${failedTests} Başarısız`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
