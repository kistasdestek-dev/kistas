/**
 * KISTAS — B7 Session & JWT Hardening Test Suite
 * 
 * Bu test paketi, PARSRAPOR B7 gereksinimleri uyarınca:
 * 1. Global Session Revocation (Kill Switch) RPC mimarisini,
 * 2. Token Invalidation (token_valid_after) şema bütünlüğünü,
 * 3. SecureStorage Full Session Purge yeteneğini,
 * 4. AuthService global/local signOut ve revokeAllSessions API'lerini,
 * 5. Supabase Client donanım tabanlı şifreli depolama entegrasyonunu doğrular.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

console.log('🧪 [B7 TEST PAKETİ] Oturum ve JWT Sertleştirmesi (Session & Token Hardening) Denetleniyor...\n');

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
// 1. İSTEMCİ GÜVENLİ DEPOLAMA VE PURGE TESTLERİ
// -------------------------------------------------------------
const SECURE_STORAGE_PATH = path.join(ROOT, 'src', 'core', 'security', 'SecureStorage.ts');

runTest('B7-01: SecureStorageAdapter purgeAllAuthData metodunu içermeli', () => {
  assert.strictEqual(fs.existsSync(SECURE_STORAGE_PATH), true, 'SecureStorage.ts bulunamadı');
  const content = fs.readFileSync(SECURE_STORAGE_PATH, 'utf8');
  assert.strictEqual(content.includes('purgeAllAuthData: async ()'), true, 'purgeAllAuthData metodu eksik');
  assert.strictEqual(content.includes('localStorage.removeItem'), true, 'Web localStorage temizliği eksik');
  assert.strictEqual(content.includes('deleteItemAsync'), true, 'Mobil SecureStore temizliği eksik');
});

runTest('B7-02: Supabase client hardware-backed SecureStorageAdapter kullanmalı', () => {
  const clientPath = path.join(ROOT, 'src', 'core', 'supabase', 'supabaseClient.ts');
  assert.strictEqual(fs.existsSync(clientPath), true, 'supabaseClient.ts bulunamadı');
  const content = fs.readFileSync(clientPath, 'utf8');
  assert.strictEqual(content.includes('storage: SecureStorageAdapter'), true, 'SecureStorageAdapter enjekte edilmemiş');
  assert.strictEqual(content.includes('autoRefreshToken: true'), true, 'autoRefreshToken kapalı');
  assert.strictEqual(content.includes('persistSession: true'), true, 'persistSession kapalı');
});

// -------------------------------------------------------------
// 2. AUTH SERVICE OTURUM VE KILL-SWITCH TESTLERİ
// -------------------------------------------------------------
const AUTH_SERVICE_PATH = path.join(ROOT, 'src', 'features', 'auth', 'application', 'AuthService.ts');

runTest('B7-03: AuthService.signOut global ve local scope parametresi desteklemeli', () => {
  assert.strictEqual(fs.existsSync(AUTH_SERVICE_PATH), true, 'AuthService.ts bulunamadı');
  const content = fs.readFileSync(AUTH_SERVICE_PATH, 'utf8');
  assert.strictEqual(content.includes("signOut(scope: 'local' | 'global' = 'local')"), true, 'signOut scope parametresi eksik');
  assert.strictEqual(content.includes("scope: 'global'"), true, 'global signOut desteği eksik');
  assert.strictEqual(content.includes('purgeAllAuthData()'), true, 'signOut anında purgeAllAuthData çağrılmıyor');
});

runTest('B7-04: AuthService.revokeAllSessions Kill Switch API sunmalı', () => {
  const content = fs.readFileSync(AUTH_SERVICE_PATH, 'utf8');
  assert.strictEqual(content.includes('revokeAllSessions'), true, 'revokeAllSessions metodu eksik');
  assert.strictEqual(content.includes('revoke_user_sessions'), true, 'revoke_user_sessions RPC çağrısı eksik');
});

// -------------------------------------------------------------
// 3. VERİTABANI MİGRATİON VE RPC DOĞRULAMA
// -------------------------------------------------------------
const MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations', '20260918000007_faz17_bank_grade_session_and_jwt_hardening.sql');

runTest('B7-05: B7 migration dosyası mevcut olmalı', () => {
  assert.strictEqual(fs.existsSync(MIGRATION_PATH), true, 'B7 migration dosyası bulunamadı');
});

runTest('B7-06: Migration profiles.token_valid_after kolonunu eklemeli', () => {
  const content = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.strictEqual(content.includes('token_valid_after'), true, 'token_valid_after kolonu eksik');
  assert.strictEqual(content.includes('TIMESTAMPTZ NOT NULL DEFAULT now()'), true, 'Zaman damgası tipi hatalı');
});

runTest('B7-07: revoke_user_sessions RPC SECURITY DEFINER ve arındırılmış arama yolu içermeli', () => {
  const content = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.strictEqual(content.includes('CREATE OR REPLACE FUNCTION public.revoke_user_sessions'), true, 'Fonksiyon bildirimi eksik');
  assert.strictEqual(content.includes('SECURITY DEFINER'), true, 'SECURITY DEFINER eksik');
  assert.strictEqual(content.includes('SET search_path = public, extensions'), true, 'search_path koruması eksik');
});

runTest('B7-08: revoke_user_sessions yetkisiz başkasının oturumunu feshetmeyi engellemeli (IDOR koruması)', () => {
  const content = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.strictEqual(content.includes('v_target_uid <> v_caller_uid AND NOT v_is_admin'), true, 'IDOR kontrolü eksik');
  assert.strictEqual(content.includes('FORBIDDEN'), true, 'FORBIDDEN hata mesajı eksik');
});

runTest('B7-09: Fesih işlemi anomaly_events tablosuna telemetri bırakmalı', () => {
  const content = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.strictEqual(content.includes('session_revocation_kill_switch'), true, 'Anomali kuralı eksik');
  assert.strictEqual(content.includes('anomaly_events'), true, 'anomaly_events yazımı eksik');
});

runTest('B7-10: Anon rolünün revoke_user_sessions çağırması engellenmeli', () => {
  const content = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.strictEqual(content.includes('REVOKE ALL ON FUNCTION public.revoke_user_sessions(UUID) FROM PUBLIC, anon;'), true, 'Anon rolü engellenmemiş');
  assert.strictEqual(content.includes('GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(UUID) TO authenticated;'), true, 'Authenticated yetkisi eksik');
});

console.log(`\n════════════════════════════════════════════════════════════════════`);
console.log(`   📊 B7 TEST SONUCU: ${passedTests} Geçti / ${failedTests} Başarısız`);
console.log(`════════════════════════════════════════════════════════════════════\n`);

if (failedTests > 0) {
  process.exit(1);
}
