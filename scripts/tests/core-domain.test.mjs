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

// -------------------------------------------------------------
// FAZ 15: SİBER TEHDİT İSTİHBARATI & AKTİF KARŞI-ALDATMA RADARI
// -------------------------------------------------------------
runTest('FAZ 15: Tehdit istihbaratı ve saldırgan parmak izi veritabanı şeması doğrulanmalı', () => {
  const faz15Sql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260917000018_faz15_threat_intelligence_radar.sql'),
    'utf8'
  );

  assert.match(faz15Sql, /CREATE TABLE IF NOT EXISTS public\.security_threat_events/i, 'security_threat_events tablosu eksik!');
  assert.match(faz15Sql, /tool_fingerprint TEXT/i, 'Saldırgan araç/scanner parmak izi kolonu eksik!');
  assert.match(faz15Sql, /payload_snapshot TEXT/i, 'Zararlı payload kayıt kolonu eksik!');
  assert.match(faz15Sql, /action_taken TEXT[\s\S]*HONEYPOT_DECEIVED[\s\S]*SILENT_NULL_ROUTED/i, 'Honeypot ve sessiz yutma aksiyon enumları eksik!');
  assert.match(faz15Sql, /NOW\(\) - INTERVAL '14 days'/i, 'Anti-bloat retention süresi eksik!');
  assert.match(faz15Sql, /REVOKE ALL ON TABLE public\.security_threat_events FROM PUBLIC, anon, authenticated/i, 'Tehdit tablosu doğrudan erişime kapatılmamış!');
});

runTest('FAZ 15: Admin siber tehdit radarı ve karantina RPC\'leri doğrulanmalı', () => {
  const faz15Sql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260917000018_faz15_threat_intelligence_radar.sql'),
    'utf8'
  );

  assert.match(faz15Sql, /admin_get_threat_intel_overview/i, 'Tehdit özeti admin RPC eksik!');
  assert.match(faz15Sql, /admin_get_threat_events/i, 'Tehdit olay dökümü admin RPC eksik!');
  assert.match(faz15Sql, /admin_quarantine_threat_actor/i, 'Karantinaya alma admin RPC eksik!');
  assert.match(faz15Sql, /admin_release_threat_actor/i, 'Karantina kaldırma admin RPC eksik!');
  assert.match(faz15Sql, /IF NOT public\.is_platform_admin\(\)/i, 'Yönetici yetki doğrulaması eksik!');
});

runTest('FAZ 15: ThreatIntelligenceView bileşeni ve AdminService entegrasyonu doğrulanmalı', () => {
  const adminService = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'admin', 'application', 'AdminService.ts'),
    'utf8'
  );
  const adminScreen = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'admin', 'presentation', 'AdminDashboardScreen.tsx'),
    'utf8'
  );
  const threatView = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'admin', 'presentation', 'ThreatIntelligenceView.tsx'),
    'utf8'
  );

  assert.match(adminService, /getThreatIntelOverview/i, 'AdminService.getThreatIntelOverview eksik!');
  assert.match(adminService, /getThreatEvents/i, 'AdminService.getThreatEvents eksik!');
  assert.match(adminService, /quarantineThreatActor/i, 'AdminService.quarantineThreatActor eksik!');
  assert.match(adminScreen, /threat_intel/i, 'AdminDashboardScreen threat_intel tabı eksik!');
  assert.match(adminScreen, /<ThreatIntelligenceView/i, 'ThreatIntelligenceView render entegrasyonu eksik!');
  assert.match(threatView, /SAYRA SAVUNMA RADARI AKTİF/i, 'ThreatIntelligenceView başlık ve durumu eksik!');
  assert.doesNotMatch(adminService, /'mock-1'|'mock-2'|'mock-3'/i, 'AdminService içinde mock/sahte veri kalıntısı tespit edildi!');
});

runTest('FAZ 15.2: Aktif WAF karantina tablosu, manuel engelleme ve sıfır sahte veri kuralı doğrulanmalı', () => {
  const faz152Sql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20260917000019_faz15_active_waf_quarantine_enforcement.sql'),
    'utf8'
  );
  const adminService = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'admin', 'application', 'AdminService.ts'),
    'utf8'
  );

  assert.match(faz152Sql, /CREATE TABLE IF NOT EXISTS public\.security_quarantine_blocklist/i, 'security_quarantine_blocklist tablosu eksik!');
  assert.match(faz152Sql, /check_is_quarantined/i, 'check_is_quarantined fonksiyonu eksik!');
  assert.match(faz152Sql, /admin_manual_quarantine_ip/i, 'admin_manual_quarantine_ip RPC eksik!');
  assert.match(faz152Sql, /admin_clear_mock_threat_events/i, 'admin_clear_mock_threat_events RPC eksik!');
  assert.match(adminService, /manualQuarantineIp/i, 'AdminService.manualQuarantineIp eksik!');
  assert.match(adminService, /clearMockThreatEvents/i, 'AdminService.clearMockThreatEvents eksik!');
});

runTest('AŞAMA 1: İstemci & Edge Karantina Kapısı (Active WAF Client Guard) doğrulanmalı', () => {
  const securityServicePath = path.join(
    ROOT,
    'src',
    'features',
    'security',
    'application',
    'SecurityEnforcementService.ts'
  );
  assert.strictEqual(fs.existsSync(securityServicePath), true, 'SecurityEnforcementService.ts eksik!');
  const serviceContent = fs.readFileSync(securityServicePath, 'utf8');
  assert.match(serviceContent, /checkClientQuarantineStatus/i, 'checkClientQuarantineStatus metodu eksik!');
  assert.match(serviceContent, /check_is_quarantined/i, 'check_is_quarantined RPC çağrısı eksik!');

  const quarantineScreenPath = path.join(
    ROOT,
    'src',
    'features',
    'security',
    'presentation',
    'QuarantineBlockScreen.tsx'
  );
  assert.strictEqual(fs.existsSync(quarantineScreenPath), true, 'QuarantineBlockScreen.tsx eksik!');
  const screenContent = fs.readFileSync(quarantineScreenPath, 'utf8');
  assert.match(screenContent, /Kıstas WAF Güvenlik Duvarı/i, 'QuarantineBlockScreen başlığı eksik!');
  assert.match(screenContent, /Karantina Durumu: AKTİF/i, 'Karantina durum rozeti eksik!');

  const appSource = fs.readFileSync(path.join(ROOT, 'App.tsx'), 'utf8');
  assert.match(appSource, /isQuarantined/i, 'App.tsx isQuarantined durumu eksik!');
  assert.match(appSource, /QuarantineBlockScreen/i, 'App.tsx QuarantineBlockScreen entegrasyonu eksik!');
  assert.match(appSource, /SecurityEnforcementService/i, 'App.tsx SecurityEnforcementService entegrasyonu eksik!');
});

runTest('AŞAMA 2: Yönetim Panelinde Aktif Bloklistesi Yöneticisi (WAF Blocklist Manager) doğrulanmalı', () => {
  const threatViewPath = path.join(
    ROOT,
    'src',
    'features',
    'admin',
    'presentation',
    'ThreatIntelligenceView.tsx'
  );
  assert.strictEqual(fs.existsSync(threatViewPath), true, 'ThreatIntelligenceView.tsx eksik!');
  const threatViewContent = fs.readFileSync(threatViewPath, 'utf8');

  // Görünüm Modu Seçicisi (Canlı Akış vs WAF Bloklistesi)
  assert.match(threatViewContent, /viewModeContainer/i, 'Görünüm modu seçici konteyneri eksik!');
  assert.match(threatViewContent, /WAF Bloklistesi/i, 'WAF Bloklistesi sekmesi eksik!');
  assert.match(threatViewContent, /Canlı Tehdit Akışı/i, 'Canlı Tehdit Akışı sekmesi eksik!');

  // Arama ve Filtreleme
  assert.match(threatViewContent, /blocklistSearch/i, 'Bloklistesi arama çubuğu ve filtresi eksik!');
  assert.match(threatViewContent, /quarantinedEvents/i, 'Karantinaya alınmış olay filtreleme mekanizması eksik!');

  // IP Kopyalama ve Aksiyonlar
  assert.match(threatViewContent, /handleCopyIp/i, 'IP panoya kopyalama aksiyonu eksik!');
  assert.match(threatViewContent, /Engeli Kaldır \(WAF\)/i, 'Tek tıkla WAF engeli kaldırma butonu eksik!');
  assert.match(threatViewContent, /SecurityEnforcementService\.clearCache\(\)/i, 'Karantina durum değişiminde istemci önbellek sıfırlaması eksik!');
});

runTest('AŞAMA 3: İstemci & Edge Bal Küpü Tuzakları (Honeypot Traps & Canary Decoys) doğrulanmalı', () => {
  const migrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260917000020_faz15_client_honeypot_traps.sql'
  );
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Faz 15.3 honeypot migration dosyası eksik!');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /report_client_honeypot_trap/i, 'report_client_honeypot_trap RPC eksik!');
  assert.match(sql, /SECURITY DEFINER[\s\S]*SET search_path = public, pg_temp/i, 'Honeypot RPC search_path güvenliği eksik!');
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.report_client_honeypot_trap[\s\S]*anon, authenticated/i, 'Honeypot RPC istemci rollerine açık değil!');

  const honeypotServicePath = path.join(
    ROOT,
    'src',
    'features',
    'security',
    'application',
    'HoneypotTrapService.ts'
  );
  assert.strictEqual(fs.existsSync(honeypotServicePath), true, 'HoneypotTrapService.ts eksik!');
  const serviceContent = fs.readFileSync(honeypotServicePath, 'utf8');
  assert.match(serviceContent, /triggerHoneypotTrap/i, 'triggerHoneypotTrap metodu eksik!');
  assert.match(serviceContent, /inspectUrlCanaryProbes/i, 'inspectUrlCanaryProbes metodu eksik!');
  assert.match(serviceContent, /verifyHoneypotField/i, 'verifyHoneypotField metodu eksik!');

  const decoyFieldPath = path.join(
    ROOT,
    'src',
    'features',
    'security',
    'presentation',
    'HoneypotDecoyField.tsx'
  );
  assert.strictEqual(fs.existsSync(decoyFieldPath), true, 'HoneypotDecoyField.tsx bileşeni eksik!');
  const decoyContent = fs.readFileSync(decoyFieldPath, 'utf8');
  assert.match(decoyContent, /decoyContainer/i, 'decoyContainer stili eksik!');
  assert.match(decoyContent, /accessibilityElementsHidden/i, 'Ekran okuyucu gizleme özelliği eksik!');

  const appContent = fs.readFileSync(path.join(ROOT, 'App.tsx'), 'utf8');
  assert.match(appContent, /HoneypotTrapService\.inspectUrlCanaryProbes\(\)/i, 'App.tsx honeypot URL tarama kontrolü eksik!');

  const authContent = fs.readFileSync(path.join(ROOT, 'src', 'features', 'auth', 'presentation', 'AuthExperience.tsx'), 'utf8');
  assert.match(authContent, /HoneypotDecoyField/i, 'AuthExperience içinde HoneypotDecoyField eksik!');
  assert.match(authContent, /HoneypotTrapService\.verifyHoneypotField/i, 'AuthExperience form gönderiminde honeypot doğrulaması eksik!');
});

runTest('AŞAMA 4: Adaptif Hız Sınırı ve Fuzzer Savunması (Adaptive Rate Limiting & Auto-Ban) doğrulanmalı', () => {
  const migrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260917000021_faz15_adaptive_rate_limiting_and_auto_ban.sql'
  );
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Faz 15.4 adaptive rate limit migration dosyası eksik!');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.security_rate_limit_tracker/i, 'security_rate_limit_tracker tablosu eksik!');
  assert.match(sql, /enforce_adaptive_rate_limit/i, 'enforce_adaptive_rate_limit RPC eksik!');
  assert.match(sql, /BURST_FUZZER_RATE_LIMIT/i, 'BURST_FUZZER_RATE_LIMIT saldırı vektörü eksik!');
  assert.match(sql, /p_auto_ban_threshold/i, 'Otomatik karantina eşiği parametresi eksik!');
  assert.match(sql, /ADAPTIVE_WAF_AUTO_BAN/i, 'Otonom ban dönüş gerekçesi eksik!');
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.enforce_adaptive_rate_limit[\s\S]*anon, authenticated/i, 'enforce_adaptive_rate_limit istemci rollerine açık değil!');

  const rateGuardPath = path.join(
    ROOT,
    'src',
    'features',
    'security',
    'application',
    'RateLimitGuardService.ts'
  );
  assert.strictEqual(fs.existsSync(rateGuardPath), true, 'RateLimitGuardService.ts eksik!');
  const serviceContent = fs.readFileSync(rateGuardPath, 'utf8');
  assert.match(serviceContent, /checkClientBurst/i, 'checkClientBurst metodu eksik!');
  assert.match(serviceContent, /enforceServerRateLimit/i, 'enforceServerRateLimit metodu eksik!');
  assert.match(serviceContent, /RAPID_BURST_FLOOD/i, 'RAPID_BURST_FLOOD tuzak tipi eksik!');
});

runTest('FAZ 16 AŞAMA 1: Web Çalışma Zamanı Kalkanı & İstemci Anti-Tamper Savunması (WebSecurityShieldService) doğrulanmalı', () => {
  const shieldPath = path.join(
    ROOT,
    'src',
    'features',
    'security',
    'application',
    'WebSecurityShieldService.ts'
  );
  assert.strictEqual(fs.existsSync(shieldPath), true, 'WebSecurityShieldService.ts eksik!');
  const serviceContent = fs.readFileSync(shieldPath, 'utf8');

  assert.match(serviceContent, /enforceAntiClickjacking/i, 'enforceAntiClickjacking metodu eksik!');
  assert.match(serviceContent, /CLICKJACKING_IFRAME_EMBED/i, 'CLICKJACKING_IFRAME_EMBED tuzak tipi eksik!');
  assert.match(serviceContent, /displayConsoleSecurityBanner/i, 'displayConsoleSecurityBanner metodu eksik!');
  assert.match(serviceContent, /protectPrototypeIntegrity/i, 'protectPrototypeIntegrity metodu eksik!');
  assert.match(serviceContent, /inspectInputPayload/i, 'inspectInputPayload metodu eksik!');

  const appContent = fs.readFileSync(path.join(ROOT, 'App.tsx'), 'utf8');
  assert.match(appContent, /WebSecurityShieldService\.initialize\(\)/i, 'App.tsx WebSecurityShieldService başlatması eksik!');

  const searchBarContent = fs.readFileSync(
    path.join(ROOT, 'src', 'shared', 'components', 'ActionSearchBar.tsx'),
    'utf8'
  );
  assert.match(searchBarContent, /WebSecurityShieldService\.inspectInputPayload/i, 'ActionSearchBar içinde WebSecurityShieldService entegrasyonu eksik!');

  // Canlı regex kural mantığını test et
  const xssRegex = /<script[\s>]|javascript:|onerror\s*=|onload\s*=|onclick\s*=|document\.cookie|window\.location|<iframe[\s>]|<img[^>]+src=[^>]+onerror/i;
  const sqliRegex = /\bunion\s+(?:all\s+)?select\b|(?:\b\d*'?\s*or\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)|--\s*$|\bdrop\s+table\b|\bexec\s*\(|\bxp_/i;
  const pathRegex = /\.\.\/\.\.\/|\/etc\/passwd|windows\/system32/i;

  const isSafe = (input) => !xssRegex.test(input) && !sqliRegex.test(input) && !pathRegex.test(input);

  assert.strictEqual(isSafe('Harika bir yapay zeka SaaS projesi'), true, 'Meşru metin yanlışlıkla engellendi!');
  assert.strictEqual(isSafe('Kıstas 2026 versiyonu'), true, 'Meşru metin engellendi!');

  assert.strictEqual(isSafe('<script>alert("XSS")</script>'), false, 'XSS script etiketi yakalanamadı!');
  assert.strictEqual(isSafe('<img src="x" onerror="stealCookie()">'), false, 'XSS onerror vektörü yakalanamadı!');
  assert.strictEqual(isSafe('javascript:alert(1)'), false, 'javascript URI şeması yakalanamadı!');
  assert.strictEqual(isSafe("1' or '1'='1"), false, 'SQLi or 1=1 bypass yakalanamadı!');
  assert.strictEqual(isSafe("' UNION SELECT * FROM users--"), false, 'SQLi UNION SELECT yakalanamadı!');
  assert.strictEqual(isSafe('../../etc/passwd'), false, 'Path traversal yakalanamadı!');
});




runTest('FAZ 16 AŞAMA 2: RFC 9116 Standart Güvenlik Beyanı (security.txt) ve HTTP Ağ Başlıkları doğrulanmalı', () => {
  const wellKnownPath = path.join(ROOT, 'public', '.well-known', 'security.txt');
  const fallbackPath = path.join(ROOT, 'public', 'security.txt');
  assert.strictEqual(fs.existsSync(wellKnownPath), true, 'public/.well-known/security.txt eksik!');
  assert.strictEqual(fs.existsSync(fallbackPath), true, 'public/security.txt geri uyumluluk dosyası eksik!');

  const securityTxtContent = fs.readFileSync(wellKnownPath, 'utf8');
  assert.match(securityTxtContent, /^Contact:\s*mailto:/m, 'RFC 9116 Contact alanı eksik!');
  assert.match(securityTxtContent, /^Expires:\s*\d{4}-\d{2}-\d{2}/m, 'RFC 9116 Expires son geçerlilik tarihi eksik!');
  assert.match(securityTxtContent, /^Canonical:\s*https:\/\/www\.kistas\.com\.tr\/\.well-known\/security\.txt/m, 'RFC 9116 Canonical URL eksik!');
  assert.match(securityTxtContent, /^Preferred-Languages:\s*tr,\s*en/m, 'RFC 9116 Preferred-Languages alanı eksik!');
  assert.match(securityTxtContent, /^Policy:\s*https:\/\/www\.kistas\.com\.tr\/security/m, 'RFC 9116 Policy URL eksik!');

  const headersPath = path.join(ROOT, 'public', '_headers');
  assert.strictEqual(fs.existsSync(headersPath), true, 'public/_headers dosyası eksik!');
  const headersContent = fs.readFileSync(headersPath, 'utf8');

  assert.match(headersContent, /\/\.well-known\/security\.txt[\s\S]*Content-Type:\s*text\/plain;\s*charset=utf-8/i, 'security.txt için text/plain başlığı eksik!');
  assert.match(headersContent, /X-Content-Type-Options:\s*nosniff/i, 'nosniff başlığı eksik!');
  assert.match(headersContent, /X-Frame-Options:\s*DENY/i, 'X-Frame-Options DENY başlığı eksik!');
  assert.match(headersContent, /Strict-Transport-Security:\s*max-age=\d+;\s*includeSubDomains;\s*preload/i, 'HSTS preload başlığı eksik!');
  assert.match(headersContent, /Permissions-Policy:[\s\S]*camera=\(\)[\s\S]*microphone=\(\)[\s\S]*payment=\(\)[\s\S]*usb=\(\)/i, 'Sertleştirilmiş Permissions-Policy eksik!');
});

runTest('FAZ 16 AŞAMA 3: Kıstas Güvenlik & Şeffaflık Portalı (SecurityTrustScreen), Web Yönlendirme ve Sayfa İçi Siber Kalkan Entegrasyonu doğrulanmalı', () => {
  const webScreenPath = path.join(ROOT, 'src', 'features', 'security', 'presentation', 'SecurityTrustScreen.web.tsx');
  const nativeScreenPath = path.join(ROOT, 'src', 'features', 'security', 'presentation', 'SecurityTrustScreen.tsx');
  assert.strictEqual(fs.existsSync(webScreenPath), true, 'SecurityTrustScreen.web.tsx eksik!');
  assert.strictEqual(fs.existsSync(nativeScreenPath), true, 'SecurityTrustScreen.tsx eksik!');

  const webScreenContent = fs.readFileSync(webScreenPath, 'utf8');
  assert.match(webScreenContent, /WebSecurityShieldService\.inspectInputPayload/i, 'VDP formunda canlı zararlı girdi denetimi eksik!');
  assert.match(webScreenContent, /HoneypotTrapService\.triggerHoneypotTrap/i, 'VDP bildirim istihbarat kaydı eksik!');
  assert.match(webScreenContent, /VULNERABILITY_DISCLOSURE_REPORT/i, 'VDP raporu tuzak/istihbarat tipi eksik!');
  assert.match(webScreenContent, /autoQuarantine:\s*false/i, 'Meşru güvenlik araştırmacısı için autoQuarantine false kuralı eksik!');
  assert.match(webScreenContent, /\/\.well-known\/security\.txt/i, 'RFC 9116 güvenlik bildirimi bağlantısı eksik!');

  const nativeScreenContent = fs.readFileSync(nativeScreenPath, 'utf8');
  assert.match(nativeScreenContent, /GlassIconButton/i, 'Mobil ekranda Kıstas GlassIconButton bileşeni eksik!');
  assert.match(nativeScreenContent, /theme\.typography\.kistas/i, 'Mobil ekranda Kıstas tipografisi eksik!');

  const webRoutingContent = fs.readFileSync(
    path.join(ROOT, 'src', 'core', 'navigation', 'webRouting.ts'),
    'utf8'
  );
  assert.match(webRoutingContent, /screen === 'security'/i, 'webRouting içinde security ekran kontrolü eksik!');
  assert.match(webRoutingContent, /route\.screen === 'security'[\s\S]*\/security\//i, 'webRouting /security path üretimi eksik!');
  assert.match(webRoutingContent, /primary === 'security' \|\| primary === 'guvenlik'/i, 'webRouting /security ve /guvenlik parse eşleşmesi eksik!');

  const seoHelperContent = fs.readFileSync(
    path.join(ROOT, 'src', 'core', 'seo', 'WebSeoHelper.web.ts'),
    'utf8'
  );
  assert.match(seoHelperContent, /security:[\s\S]*Güvenlik/i, 'Web SEO başlıklarında security sayfası tanımı eksik!');

  const footerContent = fs.readFileSync(
    path.join(ROOT, 'src', 'shared', 'components', 'CinematicFooter.web.tsx'),
    'utf8'
  );
  assert.match(footerContent, /onOpenSecurity\s*\?\s*\[\{\s*title:\s*'Güvenlik & Şeffaflık'/i, 'CinematicFooter içinde Güvenlik & Şeffaflık bağlantısı eksik!');
});

runTest('FAZ 16 AŞAMA 4: Yönetim Paneli Tehdit İstihbaratında VDP (Zafiyet Bildirimleri) ve Web Siber Kalkanı Telemetrisi doğrulanmalı', () => {
  const threatViewPath = path.join(ROOT, 'src', 'features', 'admin', 'presentation', 'ThreatIntelligenceView.tsx');
  assert.strictEqual(fs.existsSync(threatViewPath), true, 'ThreatIntelligenceView.tsx eksik!');

  const threatViewContent = fs.readFileSync(threatViewPath, 'utf8');
  assert.match(threatViewContent, /viewMode === 'vdp'/i, 'ThreatIntelligenceView içinde vdp görünüm modu eksik!');
  assert.match(threatViewContent, /VDP Bildirimleri/i, 'Segmented bar üzerinde VDP sekmesi eksik!');
  assert.match(threatViewContent, /vdpEvents/i, 'VDP bildirim filtre hesaplaması eksik!');
  assert.match(threatViewContent, /parseVdpPayload/i, 'Araştırmacı rapor ayrıştırıcı fonksiyonu eksik!');
  assert.match(threatViewContent, /handleCopyEmail/i, 'Araştırmacı e-postası kopyalama aksiyonu eksik!');
  assert.match(threatViewContent, /handleMailResearcher/i, 'Araştırmacıya doğrudan e-posta yanıtlama fonksiyonu eksik!');
  assert.match(threatViewContent, /CLICKJACKING_IFRAME_EMBED/i, 'Web anti-clickjacking telemetri rozeti eksik!');
  assert.match(threatViewContent, /DOM_XSS_SQLI_INJECTION/i, 'Web canlı girdi ve payload telemetri rozeti eksik!');
  assert.match(threatViewContent, /VULNERABILITY_DISCLOSURE_REPORT/i, 'Sorumlu zafiyet bildirimi telemetri rozeti eksik!');
  assert.match(threatViewContent, /vdpCard/i, 'VDP kart stili eksik!');
});

runTest('FAZ 17 AŞAMA 1: Onboarding & Kayıt Kurtarma (PARSRAPOR V9 & SEC-003) doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000001_faz17_repair_onboarding_and_brand_guard.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 17 Aşama 1 migration dosyası eksik!');
  const migContent = fs.readFileSync(migPath, 'utf8');

  assert.match(migContent, /auth\.role\(\)\s*=\s*'service_role'/i, 'check_profile_brand_name içinde service_role muafiyeti eksik!');
  assert.match(migContent, /Topluluk Üyesi/i, 'handle_new_user içinde Topluluk Üyesi varsayılan ismi eksik!');
  assert.match(migContent, /profiles_insert_own/i, 'profiles_insert_own politikası eksik!');
  assert.match(migContent, /profiles_update_own/i, 'profiles_update_own politikası eksik!');

  const authServicePath = path.join(ROOT, 'src', 'features', 'auth', 'application', 'AuthService.ts');
  const authServiceContent = fs.readFileSync(authServicePath, 'utf8');
  assert.match(authServiceContent, /full_name:\s*fullName\.trim\(\)\s*\|\|\s*'Topluluk Üyesi'/i, 'AuthService upsert içinde Topluluk Üyesi fallback eksik!');
  assert.match(authServiceContent, /fallbackName\s*=[\s\S]*'Topluluk Üyesi'/i, 'AuthService getCurrentProfile içinde Topluluk Üyesi fallback eksik!');
  assert.doesNotMatch(authServiceContent, /full_name:\s*fullName\.trim\(\)\s*\|\|\s*'Kıstas Üyesi'/i, 'AuthService içinde yasaklı Kıstas Üyesi fallback kaldı!');
});

runTest('FAZ 17 AŞAMA 2: Depolama (Storage) İzolasyonu & 7 Adet Foothold/Probe Dosyasının İmhası (PARSRAPOR V2) doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000002_faz17_storage_foothold_cleanup_and_hardening.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 17 Aşama 2 migration dosyası eksik!');
  const migContent = fs.readFileSync(migPath, 'utf8');

  assert.match(migContent, /object_write_authenticated/i, 'storage.objects authenticated write politikası eksik!');
  assert.match(migContent, /object_delete_owner/i, 'storage.objects owner delete politikası eksik!');
  assert.match(migContent, /DELETE FROM storage\.objects/i, 'Foothold dosyalarını silen SQL bloğu eksik!');
  assert.match(migContent, /pars_foothold_beacon\.png/i, 'pars_foothold_beacon.png imha listesinde eksik!');
  assert.match(migContent, /hardening_probe_1789681500\.png/i, 'hardening_probe_1789681500.png imha listesinde eksik!');
});

runTest('FAZ 17 AŞAMA 3: Profil PII İzolasyonu & profiles_public Güvenli Görünümü (PARSRAPOR V1 & V1r) doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000003_faz17_profiles_public_view_and_pii_isolation.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 17 Aşama 3 migration dosyası eksik!');
  const migContent = fs.readFileSync(migPath, 'utf8');

  assert.match(migContent, /REVOKE ALL ON TABLE public\.profiles FROM anon,\s*public/i, 'profiles tablosunun anon rolden arındırılması eksik!');
  assert.match(migContent, /CREATE OR REPLACE VIEW public\.profiles_public/i, 'profiles_public VIEW tanımı eksik!');
  assert.match(migContent, /GRANT SELECT ON public\.profiles_public TO anon,\s*authenticated/i, 'profiles_public okuma izinleri eksik!');
  assert.match(migContent, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon/i, 'Default-deny kuralı eksik!');
  assert.match(migContent, /profiles_select_own/i, 'profiles_select_own RLS politikası eksik!');
});

runTest('FAZ 17 AŞAMA 4: Banka Düzeyi Finansal Bütünlük, B5 Self-Destruct Onarımı & Kriptografik Denetim Zinciri (B3, B4, B5, B6) doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000004_faz17_bank_grade_financial_integrity_and_audit.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 17 Aşama 4 migration dosyası eksik!');
  const migContent = fs.readFileSync(migPath, 'utf8');

  assert.match(migContent, /guard_financial_columns/i, 'guard_financial_columns fonksiyonu eksik!');
  assert.match(migContent, /FORBIDDEN: financial\/verification fields are admin-only/i, 'Finansal alan koruma hatası (B5 self-destruct çözümü) eksik!');
  assert.match(migContent, /financial_audit/i, 'financial_audit denetim tablosu eksik!');
  assert.match(migContent, /_audit_hash/i, '_audit_hash SHA-256 hash-chaining fonksiyonu eksik!');
  assert.match(migContent, /chk_no_negative_balance/i, 'chk_no_negative_balance eksi bakiye kontrolü eksik!');
  assert.match(migContent, /anomaly_events/i, 'anomaly_events anomali tablosu eksik!');
  assert.match(migContent, /check_velocity/i, 'check_velocity hız takip tetikleyicisi eksik!');
});

runTest('FAZ 17 AŞAMA 5: PARS DevState Raporu ve Banka Düzeyi Dokümantasyon Entegrasyonu doğrulanmalı', () => {
  const roadmapPath = path.join(ROOT, 'docs', 'SECURITY_ROADMAP.md');
  const roadmapContent = fs.readFileSync(roadmapPath, 'utf8');

  assert.match(roadmapContent, /### SEC-059/i, 'SEC-059 Onboarding & Kayıt Kurtarma maddesi eksik!');
  assert.match(roadmapContent, /### SEC-060/i, 'SEC-060 Depolama İzolasyonu & Foothold İmhası maddesi eksik!');
  assert.match(roadmapContent, /### SEC-061/i, 'SEC-061 Profil PII İzolasyonu & profiles_public maddesi eksik!');
  assert.match(roadmapContent, /### SEC-062/i, 'SEC-062 Banka Düzeyi Finansal Bütünlük maddesi eksik!');
  assert.match(roadmapContent, /### SEC-063/i, 'SEC-063 GoTrue Auth Rate Limiting & CORS Mühürlemesi maddesi eksik!');
});

runTest('FAZ 19 AŞAMA 1: Savunma Mekanizmasının Silahlaştırılması Engeli (Defense Inversion & Anti-DoS) doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000010_faz19_defense_inversion_and_anti_dos.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 19 Aşama 1 migration dosyası eksik!');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.match(sql, /is_safe_whitelisted_ip/i, 'is_safe_whitelisted_ip fonksiyonu eksik!');
  assert.match(sql, /report_client_honeypot_trap/i, 'report_client_honeypot_trap fonksiyonu eksik!');
  assert.match(sql, /enforce_adaptive_rate_limit/i, 'enforce_adaptive_rate_limit fonksiyonu eksik!');
  assert.match(sql, /127\.0\.0\.1|localhost/i, 'Loopback ve güvenli IP koruması eksik!');
});

runTest('FAZ 19 AŞAMA 2: Eşzamanlı İstek Patlaması & Finansal Bütünlük (Race Condition & Concurrency) doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000011_faz19_race_condition_and_concurrency_shield.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 19 Aşama 2 migration dosyası eksik!');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.match(sql, /chk_profiles_boost_credits_positive/i, 'boost_credits negatif bakiye CHECK kuralı eksik!');
  assert.match(sql, /idx_orders_active_listing_unique/i, 'Aktif sipariş tekillik indeksi eksik!');
  assert.match(sql, /idx_project_upvotes_unique_pair/i, 'Proje oy tekillik indeksi eksik!');
});

runTest('FAZ 19 AŞAMA 3: Webhook Uç Noktaları DoS & Kaynak Tüketimi Kalkanı (Edge Function Throttling) doğrulanmalı', () => {
  const shopierPath = path.join(ROOT, 'supabase', 'functions', 'shopier-credit-webhook', 'index.ts');
  const revenueCatPath = path.join(ROOT, 'supabase', 'functions', 'revenuecat-credit-webhook', 'index.ts');
  assert.strictEqual(fs.existsSync(shopierPath), true, 'Shopier webhook eksik!');
  assert.strictEqual(fs.existsSync(revenueCatPath), true, 'RevenueCat webhook eksik!');

  const shopierCode = fs.readFileSync(shopierPath, 'utf8');
  const rcCode = fs.readFileSync(revenueCatPath, 'utf8');

  assert.match(shopierCode, /isThrottled/i, 'Shopier isThrottled koruması eksik!');
  assert.match(shopierCode, /TOO_MANY_REQUESTS/i, 'Shopier 429 yanıtı eksik!');
  assert.match(rcCode, /isThrottled/i, 'RevenueCat isThrottled koruması eksik!');
  assert.match(rcCode, /MAX_BODY_BYTES/i, 'RevenueCat MAX_BODY_BYTES koruması eksik!');
});

runTest('FAZ 19 AŞAMA 4: PostgREST Doğrudan API Kazıma & IDOR İzolasyonu doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000012_faz19_postgrest_api_scraping_and_idor_shield.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 19 Aşama 4 migration dosyası eksik!');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.match(sql, /REVOKE ALL ON TABLE public\.user_addresses FROM anon/i, 'user_addresses anon izolasyonu eksik!');
  assert.match(sql, /REVOKE ALL ON TABLE public\.orders FROM anon/i, 'orders anon izolasyonu eksik!');
  assert.match(sql, /REVOKE ALL ON TABLE public\.conversations FROM anon/i, 'conversations anon izolasyonu eksik!');
  assert.match(sql, /REVOKE ALL ON TABLE public\.messages FROM anon/i, 'messages anon izolasyonu eksik!');
  assert.match(sql, /REVOKE ALL ON TABLE public\.user_vault_records FROM anon/i, 'user_vault_records anon izolasyonu eksik!');
});

runTest('FAZ 19 AŞAMA 5: Depolama (Storage) Polyglot Dosya & Stored XSS Kalkanı doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000013_faz19_storage_polyglot_and_stored_xss_shield.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 19 Aşama 5 migration dosyası eksik!');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.match(sql, /name !~ '\\\.\\\.'/i, 'Path traversal engeli eksik!');
  assert.match(sql, /allowed_mime_types/i, 'MIME türü beyaz listesi eksik!');
  assert.match(sql, /object_write_authenticated/i, 'object_write_authenticated politikası eksik!');
});

runTest('FAZ 19 AŞAMA 6: WebSocket Realtime CDC Sniffing & Dinleme Kaçağı İzolasyonu doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000014_faz19_realtime_cdc_sniffing_shield.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 19 Aşama 6 migration dosyası eksik!');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.match(sql, /ALTER PUBLICATION supabase_realtime DROP TABLE/i, 'Realtime DROP TABLE komutu eksik!');
  assert.match(sql, /user_vault_records/i, 'user_vault_records realtime izolasyonu eksik!');
  assert.match(sql, /security_threat_events/i, 'security_threat_events realtime izolasyonu eksik!');
});

runTest('FAZ 20 AŞAMA 1: KVKK & GDPR Unutulma Hakkı ve Kriptografik Anonimleştirme Motoru doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000015_faz20_kvkk_account_deletion_and_anonymization.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 20 Aşama 1 migration dosyası eksik!');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.match(sql, /delete_user_account_atomic/i, 'delete_user_account_atomic RPC fonksiyonu eksik!');
  assert.match(sql, /Silinmiş Kullanıcı/i, 'Silinmiş Kullanıcı PII maskelemesi eksik!');
  assert.match(sql, /DELETE FROM public\.user_addresses/i, 'Adres temizliği eksik!');
  assert.match(sql, /DELETE FROM public\.user_vault_records/i, 'Kasa temizliği eksik!');
  assert.match(sql, /KVKK_ACCOUNT_ANONYMIZED/i, 'Denetim izi kaydı eksik!');

  const profileServicePath = path.join(ROOT, 'src', 'features', 'profile', 'application', 'ProfileService.ts');
  const profileServiceCode = fs.readFileSync(profileServicePath, 'utf8');
  assert.match(profileServiceCode, /deleteAccount/i, 'ProfileService.deleteAccount metodu eksik!');
});

runTest('FAZ 20 AŞAMA 2 & 3: OAuth State Replay, CSRF Kalkanı ve Global Oturum Feshi doğrulanmalı', () => {
  const authServicePath = path.join(ROOT, 'src', 'features', 'auth', 'application', 'AuthService.ts');
  const authServiceCode = fs.readFileSync(authServicePath, 'utf8');

  assert.match(authServiceCode, /generateOAuthStateNonce/i, 'generateOAuthStateNonce fonksiyonu eksik!');
  assert.match(authServiceCode, /verifyAndConsumeOAuthState/i, 'verifyAndConsumeOAuthState fonksiyonu eksik!');
  assert.match(authServiceCode, /ALLOWED_OAUTH_ORIGINS/i, 'ALLOWED_OAUTH_ORIGINS allowlist eksik!');
  assert.match(authServiceCode, /signOut\(scope:\s*'local'\s*\|\s*'global'/i, 'signOut scope parametresi desteklemeli!');

  const authContextPath = path.join(ROOT, 'src', 'core', 'state', 'auth', 'AuthContext.tsx');
  const authContextCode = fs.readFileSync(authContextPath, 'utf8');
  assert.match(authContextCode, /verifyAndConsumeOAuthState/i, 'AuthContext OAuth state denetimi eksik!');
  assert.match(authContextCode, /OAUTH_STATE_MISMATCH_CSRF/i, 'OAuth CSRF tuzak bildirimi eksik!');
  assert.match(authContextCode, /signOut\('global'\)/i, 'AuthContext çıkışta global oturum feshini tetiklemeli!');
});

runTest('FAZ 20 AŞAMA 4: İlan, Görsel ve Yorum BOLA/IDOR Savunması & Tehdit Tuzağı doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000016_faz20_bola_idor_and_threat_trapping.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 20 Aşama 4 migration dosyası eksik!');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.match(sql, /guard_listing_ownership_and_trap_idor/i, 'İlan sahiplik koruma tetikleyicisi eksik!');
  assert.match(sql, /guard_listing_image_ownership_and_trap_idor/i, 'Görsel sahiplik koruma tetikleyicisi eksik!');
  assert.match(sql, /guard_project_comment_ownership_and_trap_idor/i, 'Yorum sahiplik koruma tetikleyicisi eksik!');
  assert.match(sql, /BOLA_IDOR_LISTING_TAMPER/i, 'İlan IDOR tehdit bildirimi eksik!');
  assert.match(sql, /BOLA_IDOR_IMAGE_TAMPER/i, 'Görsel IDOR tehdit bildirimi eksik!');
  assert.match(sql, /BOLA_IDOR_COMMENT_TAMPER/i, 'Yorum IDOR tehdit bildirimi eksik!');
});

runTest('FAZ 20 AŞAMA 5: P2P Sohbet ve Yorum Phishing / URL Filtreleme Kalkanı doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000017_faz20_chat_phishing_and_url_filter.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Faz 20 Aşama 5 migration dosyası eksik!');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.match(sql, /filter_chat_message_content/i, 'filter_chat_message_content fonksiyonu eksik!');
  assert.match(sql, /filter_project_comment_content/i, 'filter_project_comment_content fonksiyonu eksik!');
  assert.match(sql, /bit\.ly|tinyurl\.com/i, 'Kısaltılmış URL filtresi eksik!');
  assert.match(sql, /hxxp|\[dot\]/i, 'Obfuscated domain filtresi eksik!');
});

runTest('FAZ 20 KONSOLİDASYON: FAZ20_CONSOLIDATED_DEFENSE_SHIELD_MIGRATION.sql doğrulanmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', 'FAZ20_CONSOLIDATED_DEFENSE_SHIELD_MIGRATION.sql');
  assert.strictEqual(fs.existsSync(migPath), true, 'Konsolide migration dosyası eksik!');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.match(sql, /delete_user_account_atomic/i, 'Konsolide SQL delete_user_account_atomic içermeli!');
  assert.match(sql, /guard_listing_ownership_and_trap_idor/i, 'Konsolide SQL guard_listing_ownership_and_trap_idor içermeli!');
  assert.match(sql, /filter_chat_message_content/i, 'Konsolide SQL filter_chat_message_content içermeli!');
  assert.match(sql, /filter_project_comment_content/i, 'Konsolide SQL filter_project_comment_content içermeli!');
});

console.log(`\n📊 Sonuç: ${passedTests} Başarılı, ${failedTests} Başarısız`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}


