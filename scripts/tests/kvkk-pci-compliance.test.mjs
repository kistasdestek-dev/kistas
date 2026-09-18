/**
 * KISTAS — B8 KVKK & PCI-DSS Compliance Test Suite
 * 
 * Bu test paketi, PARSRAPOR B8 gereksinimleri uyarınca:
 * 1. Kaynak kodda kart verisi (PAN, CVV, Card Number) bulunmadığını (PCI-DSS SAQ A muafiyeti),
 * 2. Gizlilik politikasında PCI-DSS beyanı ve KVKK Madde 11 haklarının bulunduğunu,
 * 3. delete_my_account_and_anonymize RPC fonksiyonunun güvenlik mimarisini,
 * 4. KvkkConsentService hesap silme ve PII anonimleştirme API'sini doğrular.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

console.log('🧪 [B8 TEST PAKETİ] KVKK & PCI-DSS Kapsam Dışı Çerçevesi Denetleniyor...\n');

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
// 1. PCI-DSS SAQ A: KART VERİSİ DOKUNULMAZLIĞI STATİK ANALİZİ
// -------------------------------------------------------------
runTest('B8-01: Projede kredi kartı numarası veya CVV saklayan veritabanı kolonu olmamalı', () => {
  const migrationsDir = path.join(ROOT, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  
  for (const f of files) {
    const content = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
    // Tablolarda card_number, pan, cvv, ccv kolon tanımı olmamalıdır
    const hasCardColumn = /ADD COLUMN\s+(card_number|pan|cvv|ccv|card_cvv)\b/i.test(content) ||
                          /\b(card_number|card_cvv)\s+TEXT/i.test(content);
    assert.strictEqual(hasCardColumn, false, `Migration içinde yasaklı kart kolonu bulundu: ${f}`);
  }
});

runTest('B8-02: İstemci kaynak kodunda kredi kartı ham verisi toplayan form bileşeni olmamalı', () => {
  const srcDir = path.join(ROOT, 'src');
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(tsx|ts|js)$/.test(e.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Kredi kartı form inputu yakalama
        const hasCardInput = /placeholder=["'].*(kart\s*numaras[ıi]|card\s*number|cvv|güvenlik\s*kodu)/i.test(content);
        assert.strictEqual(hasCardInput, false, `Kaynak kodda yasaklı kart girdisi bulundu: ${fullPath}`);
      }
    }
  }
  scanDir(srcDir);
});

// -------------------------------------------------------------
// 2. GİZLİLİK POLİTİKASI BEYANLARI
// -------------------------------------------------------------
const POLICY_PATH = path.join(ROOT, 'src', 'features', 'legal', 'presentation', 'PrivacyPolicyScreen.tsx');

runTest('B8-03: Gizlilik politikasında PCI-DSS SAQ A kapsam dışı beyanı yer almalı', () => {
  assert.strictEqual(fs.existsSync(POLICY_PATH), true, 'PrivacyPolicyScreen.tsx bulunamadı');
  const content = fs.readFileSync(POLICY_PATH, 'utf8');
  assert.strictEqual(content.includes('PCI-DSS'), true, 'PCI-DSS beyanı eksik');
  assert.strictEqual(content.includes('SAQ A'), true, 'SAQ A kapsam dışı ifadesi eksik');
});

runTest('B8-04: Gizlilik politikasında Hesap Silme ve Unutulma Hakkı maddesi yer almalı', () => {
  const content = fs.readFileSync(POLICY_PATH, 'utf8');
  assert.strictEqual(content.includes('Hesap silme'), true, 'Hesap silme maddesi eksik');
  assert.strictEqual(content.includes('unutulma hakkı'), true, 'Unutulma hakkı ifadesi eksik');
});

// -------------------------------------------------------------
// 3. VERİTABANI HESAP SİLME & ANONİMLEŞTİRME RPC'Sİ
// -------------------------------------------------------------
const MIGRATION_PATH = path.join(ROOT, 'supabase', 'migrations', '20260918000008_faz17_bank_grade_kvkk_and_pci_compliance.sql');

runTest('B8-05: B8 migration dosyası mevcut olmalı', () => {
  assert.strictEqual(fs.existsSync(MIGRATION_PATH), true, 'B8 migration dosyası bulunamadı');
});

runTest('B8-06: delete_my_account_and_anonymize RPC fonksiyonu SECURITY DEFINER içermeli', () => {
  const content = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.strictEqual(content.includes('delete_my_account_and_anonymize'), true, 'delete_my_account_and_anonymize fonksiyonu eksik');
  assert.strictEqual(content.includes('SECURITY DEFINER'), true, 'SECURITY DEFINER eksik');
  assert.strictEqual(content.includes('SET search_path = public, extensions'), true, 'search_path eksik');
});

runTest('B8-07: RPC kullanıcının şifreli kasa verilerini (user_vault_records) silmeli', () => {
  const content = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.strictEqual(content.includes('DELETE FROM public.user_vault_records'), true, 'Kasa silme işlemi eksik');
});

runTest('B8-08: RPC profil PII verilerini anonimleştirmeli (Ad soyad, avatar, bio sıfırlama)', () => {
  const content = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.strictEqual(content.includes('bio = NULL'), true, 'Bio sıfırlanmıyor');
  assert.strictEqual(content.includes('avatar_url = NULL'), true, 'Avatar sıfırlanmıyor');
  assert.strictEqual(content.includes('phone = NULL'), true, 'Telefon sıfırlanmıyor');
});

runTest('B8-09: RPC işlemi anomaly_events tablosuna telemetri bırakmalı', () => {
  const content = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.strictEqual(content.includes('kvkk_account_anonymized'), true, 'KVKK anonimleştirme kuralı eksik');
});

runTest('B8-10: KvkkConsentService.deleteMyAccountAndAnonymize API sunmalı', () => {
  const servicePath = path.join(ROOT, 'src', 'features', 'legal', 'application', 'KvkkConsentService.ts');
  assert.strictEqual(fs.existsSync(servicePath), true, 'KvkkConsentService.ts bulunamadı');
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.strictEqual(content.includes('deleteMyAccountAndAnonymize'), true, 'deleteMyAccountAndAnonymize metodu eksik');
  assert.strictEqual(content.includes('delete_my_account_and_anonymize'), true, 'RPC çağrısı eksik');
});

console.log(`\n════════════════════════════════════════════════════════════════════`);
console.log(`   📊 B8 TEST SONUCU: ${passedTests} Geçti / ${failedTests} Başarısız`);
console.log(`════════════════════════════════════════════════════════════════════\n`);

if (failedTests > 0) {
  process.exit(1);
}
