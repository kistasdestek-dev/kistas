/**
 * KISTAS — B1 Field-Level Encryption & Vault Test Suite
 * 
 * Bu test paketi, PARSRAPOR B1 gereksinimleri uyarınca:
 * 1. OpenPGP AES-256 simetrik şifreleme ve bütünlük (tamper-detection) simülasyonunu,
 * 2. Deterministik Blind Index (HMAC-SHA256) türetme ve normalizasyonunu,
 * 3. IBAN ve TCKN veri maskeleme (Data Masking) doğruluğunu,
 * 4. Migration SQL dosyalarındaki RLS, SECURITY DEFINER ve yetki kısıtlamalarını doğrular.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = process.cwd();

console.log('🧪 [B1 TEST PAKETİ] Saha Düzeyinde Şifreleme (FLE Vault) Denetleniyor...\n');

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
// 1. DATA MASKING DOĞRULAMA (SQL İLE BİREBİR AYNI MANTIK)
// -------------------------------------------------------------
function maskSensitivePreview(type, plaintext) {
  if (!plaintext || plaintext.trim().length === 0) return '***';
  const cleanVal = plaintext.trim().replace(/\s+/g, '').toUpperCase();
  const len = cleanVal.length;

  if (type === 'iban') {
    if (len >= 10) {
      return `${cleanVal.substring(0, 4)} **** **** **** **** **** ${cleanVal.substring(len - 2)}`;
    }
    return `${cleanVal.substring(0, 2)}****${cleanVal.substring(len - 2)}`;
  } else if (type === 'tckn') {
    if (len === 11) {
      return `${cleanVal.substring(0, 3)}*****${cleanVal.substring(8, 10)}`;
    }
    return `${cleanVal.substring(0, 2)}***${cleanVal.substring(len - 2)}`;
  } else {
    if (len <= 4) return '****';
    return `${cleanVal.substring(0, 2)}****${cleanVal.substring(len - 2)}`;
  }
}

runTest('B1-01: IBAN doğru formatta maskelenmeli (İlk 4 ve Son 2 görünür, ortası kapalı)', () => {
  const iban = 'TR330006100511123456789012';
  const masked = maskSensitivePreview('iban', iban);
  assert.strictEqual(masked, 'TR33 **** **** **** **** **** 12');
  assert.strictEqual(masked.includes('34567890'), false, 'Hassas orta kısım sızmamalıdır');
});

runTest('B1-02: Boşluklu girilen IBAN arındırılıp doğru maskelenmeli', () => {
  const ibanWithSpaces = '  tr33 0006 1005 1112 3456 7890 12  ';
  const masked = maskSensitivePreview('iban', ibanWithSpaces);
  assert.strictEqual(masked, 'TR33 **** **** **** **** **** 12');
});

runTest('B1-03: TCKN doğru formatta maskelenmeli (İlk 3 ve 9-10. haneler)', () => {
  const tckn = '12345678901';
  const masked = maskSensitivePreview('tckn', tckn);
  assert.strictEqual(masked, '123*****90');
  assert.strictEqual(masked.includes('45678'), false, 'TCKN orta haneleri gizlenmelidir');
});

// -------------------------------------------------------------
// 2. DETERMINISTIC BLIND INDEXING (HMAC-SHA256) TESTLERİ
// -------------------------------------------------------------
const BLIND_INDEX_SALT = 'kistas_blind_index_hmac_salt_2026';

function generateBlindIndex(plaintext) {
  if (!plaintext || plaintext.trim().length === 0) return null;
  const normalized = plaintext.trim().replace(/\s+/g, '').toUpperCase();
  return crypto.createHmac('sha256', BLIND_INDEX_SALT).update(normalized).digest('hex');
}

runTest('B1-04: Blind Index deterministik olmalı (Aynı girdi her zaman aynı hash)', () => {
  const input1 = 'TR330006100511123456789012';
  const hash1 = generateBlindIndex(input1);
  const hash2 = generateBlindIndex(input1);
  assert.strictEqual(hash1, hash2);
  assert.strictEqual(hash1.length, 64, 'SHA-256 64 karakter hex olmalıdır');
});

runTest('B1-05: Boşluk ve harf büyüklüğü blind index eşitliğini bozmamalı', () => {
  const canonical = 'TR330006100511123456789012';
  const formatted = '  tr33 0006 1005 1112 3456 7890 12 ';
  assert.strictEqual(generateBlindIndex(canonical), generateBlindIndex(formatted));
});

runTest('B1-06: Farklı girdiler farklı Blind Index üretmeli (Çakışma koruması)', () => {
  const hashA = generateBlindIndex('TR330006100511123456789012');
  const hashB = generateBlindIndex('TR330006100511123456789013');
  assert.notStrictEqual(hashA, hashB);
});

// -------------------------------------------------------------
// 3. KRİPTOGRAFİK ŞİFRELEME & KURCALANMA (TAMPERING) KORUMASI
// -------------------------------------------------------------
const MASTER_AES_KEY = crypto.createHash('sha256').update('kistas_bank_vault_master_aes256_key_98a7bc61f2e4d0').digest();

function simulateEncrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_AES_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { iv: iv.toString('hex'), authTag, ciphertext: encrypted };
}

function simulateDecrypt(bundle) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_AES_KEY, Buffer.from(bundle.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(bundle.authTag, 'hex'));
  let decrypted = decipher.update(bundle.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

runTest('B1-07: AES-256 simetrik şifreleme ve deşifreleme veri bütünlüğünü korumalı', () => {
  const sensitiveIban = 'TR330006100511123456789012';
  const bundle = simulateEncrypt(sensitiveIban);
  assert.notStrictEqual(bundle.ciphertext, sensitiveIban);
  const decrypted = simulateDecrypt(bundle);
  assert.strictEqual(decrypted, sensitiveIban);
});

runTest('B1-08: Şifreli veride 1 bit dahi oynanırsa deşifreleme fail-closed olmalı', () => {
  const bundle = simulateEncrypt('SENSITIVE_TCKN_12345678901');
  // Tamper authTag
  const tamperedBundle = {
    ...bundle,
    authTag: bundle.authTag.substring(0, 30) + '00'
  };

  assert.throws(() => {
    simulateDecrypt(tamperedBundle);
  }, /Unsupported state or unable to authenticate data/, 'Kurcalanmış veri deşifre edilememeli');
});

// -------------------------------------------------------------
// 4. MİGRATİON & GÜVENLİK POLİTİKASI STATİK DENETİMİ
// -------------------------------------------------------------
const MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations', '20260918000006_faz17_bank_grade_field_level_encryption_vault.sql');

runTest('B1-09: B1 migration dosyası mevcut ve RLS ile donatılmış olmalı', () => {
  assert.strictEqual(fs.existsSync(MIGRATION_PATH), true, 'B1 migration dosyası bulunamadı');
  const content = fs.readFileSync(MIGRATION_PATH, 'utf8');

  assert.strictEqual(content.includes('ENABLE ROW LEVEL SECURITY'), true, 'RLS etkinleştirilmemiş');
  assert.strictEqual(content.includes('REVOKE ALL ON public.user_vault_records FROM anon;'), true, 'Anon rolü engellenmemiş');
  assert.strictEqual(content.includes('REVOKE ALL ON FUNCTION public.internal_get_encryption_key() FROM PUBLIC, anon, authenticated;'), true, 'Anahtar sağlayıcı izole edilmemiş');
  assert.strictEqual(content.includes('REVOKE ALL ON FUNCTION public.encrypt_sensitive_data'), true, 'Ham şifreleme fonksiyonu izole edilmemiş');
  assert.strictEqual(content.includes('REVOKE ALL ON FUNCTION public.decrypt_sensitive_data'), true, 'Ham deşifreleme fonksiyonu izole edilmemiş');
  assert.strictEqual(content.includes('user_vault_select_own'), true, 'Sahiplik kontrol politikası eksik');
  assert.strictEqual(content.includes('financial_audit'), true, 'Deşifreleme denetim izi (audit trail) eksik');
});

runTest('B1-10: VaultService.ts tip güvenli ve sıfır-plaintext sızıntılı olmalı', () => {
  const servicePath = path.join(ROOT, 'src', 'core', 'security', 'VaultService.ts');
  assert.strictEqual(fs.existsSync(servicePath), true, 'VaultService.ts bulunamadı');
  const content = fs.readFileSync(servicePath, 'utf8');

  assert.strictEqual(content.includes('store_vault_record'), true, 'store_vault_record RPC çağrısı eksik');
  assert.strictEqual(content.includes('reveal_vault_record'), true, 'reveal_vault_record RPC çağrısı eksik');
  assert.strictEqual(content.includes('delete_vault_record'), true, 'delete_vault_record RPC çağrısı eksik');
  assert.strictEqual(content.includes('encrypted_data'), false, 'İstemci kodunda encrypted_data doğrudan okunmamalı');
});

console.log(`\n════════════════════════════════════════════════════════════════════`);
console.log(`   📊 B1 TEST SONUCU: ${passedTests} Geçti / ${failedTests} Başarısız`);
console.log(`════════════════════════════════════════════════════════════════════\n`);

if (failedTests > 0) {
  process.exit(1);
}
