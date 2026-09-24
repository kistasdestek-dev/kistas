/**
 * KISTAS — B9 & B10 Disaster Recovery and Key Management Test Suite
 * 
 * Bu test paketi, PARSRAPOR B9 & B10 gereksinimleri uyarınca:
 * 1. Yedekleme altyapısının (create-backup.ps1) bütünlüğünü,
 * 2. RPO (< 1 saat) ve RTO (< 30 dakika) felaket kurtarma hedeflerinin tescilini,
 * 3. .env.example şablonunda gizli anahtar sızıntısı olmadığını,
 * 4. B10 Anahtar rotasyonu ve acil durum müdahale kılavuzunu doğrular.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

console.log('🧪 [B9 & B10 TEST PAKETİ] Felaket Kurtarma & Anahtar Yönetimi Denetleniyor...\n');

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
// 1. YEDEKLEME VE FELAKET KURTARMA (B9)
// -------------------------------------------------------------
const BACKUP_SCRIPT_PATH = path.join(ROOT, 'scripts', 'create-backup.ps1');

runTest('B9-01: Otomatik yedekleme scripti (create-backup.ps1) mevcut ve geçerli olmalı', () => {
  assert.strictEqual(fs.existsSync(BACKUP_SCRIPT_PATH), true, 'create-backup.ps1 bulunamadı');
  const content = fs.readFileSync(BACKUP_SCRIPT_PATH, 'utf8');
  assert.strictEqual(content.includes('Compress-Archive'), true, 'ZIP sıkıştırma komutu eksik');
  assert.strictEqual(content.includes('KISTAS_backup_'), true, 'Yedek isimlendirme formatı hatalı');
});

runTest('B9-02: Yedeklenecek dizinler src, supabase, docs, scripts ve App.tsx içermeli', () => {
  const content = fs.readFileSync(BACKUP_SCRIPT_PATH, 'utf8');
  assert.strictEqual(content.includes('"src"'), true, 'src eksik');
  assert.strictEqual(content.includes('"supabase"'), true, 'supabase eksik');
  assert.strictEqual(content.includes('"docs"'), true, 'docs eksik');
  assert.strictEqual(content.includes('"scripts"'), true, 'scripts eksik');
  assert.strictEqual(content.includes('"App.tsx"'), true, 'App.tsx eksik');
});

runTest('B9-03: Yedekleme deposu yerel kalmalı ve script tarafından hedeflenmeli', () => {
  const backupScript = fs.readFileSync(BACKUP_SCRIPT_PATH, 'utf8');
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  assert.match(backupScript, /\$backupDir\s*=\s*Join-Path[^\r\n]+["']\.\.\\backups["']/i, 'Script backups/ hedefini tanımlamıyor');
  assert.match(backupScript, /\$backupFilePath\s*=\s*Join-Path\s+\$backupDir\s+\$backupFileName/i, 'Yedek dosyası backups/ altında oluşturulmuyor');
  assert.match(gitignore, /^backups\/$/m, 'Yerel yedek klasörü Git dışında tutulmuyor');
});

// -------------------------------------------------------------
// 2. RPO & RTO STANDARTLARI (B9 DOKÜMANTASYON)
// -------------------------------------------------------------
const DOC_PATH = path.join(ROOT, 'docs', 'DISASTER_RECOVERY_AND_KEY_MANAGEMENT.md');

runTest('B9-04: Felaket kurtarma kılavuzu (DISASTER_RECOVERY_AND_KEY_MANAGEMENT.md) mevcut olmalı', () => {
  assert.strictEqual(fs.existsSync(DOC_PATH), true, 'Kılavuz dokümanı bulunamadı');
});

runTest('B9-05: RPO hedefi < 1 Saat ve RTO hedefi < 30 Dakika olarak tescil edilmiş olmalı', () => {
  const content = fs.readFileSync(DOC_PATH, 'utf8');
  assert.strictEqual(content.includes('< 1 Saat'), true, 'RPO hedefi eksik veya hatalı');
  assert.strictEqual(content.includes('< 30 Dakika'), true, 'RTO hedefi eksik veya hatalı');
  assert.strictEqual(content.includes('PITR'), true, 'PITR veritabanı kurtarma standardı eksik');
});

// -------------------------------------------------------------
// 3. GİZLİ ANAHTAR YÖNETİMİ & SIZINTI DENETİMİ (B10)
// -------------------------------------------------------------
runTest('B10-06: .env.example şablonunda gerçek gizli anahtarlar yer almamalı (Template Hijyeni)', () => {
  const envExamplePath = path.join(ROOT, '.env.example');
  if (fs.existsSync(envExamplePath)) {
    const content = fs.readFileSync(envExamplePath, 'utf8');
    assert.strictEqual(content.includes('service_role'), false, 'Örnek dosyada service_role anahtarı bulunamaz');
    assert.strictEqual(content.includes('eyJh'), false, 'Örnek dosyada gerçek JWT imzası bulunamaz');
  }
});

runTest('B10-07: Anahtar envanteri service_role anahtarının istemcide yasak olduğunu belirtmeli', () => {
  const content = fs.readFileSync(DOC_PATH, 'utf8');
  assert.strictEqual(content.includes('SUPABASE_SERVICE_ROLE_KEY'), true, 'service_role anahtarı envanterde eksik');
  assert.strictEqual(content.includes('KESİNLİKLE YASAK'), true, 'Yasak kuralı açıkça belirtilmemiş');
});

runTest('B10-08: Acil durum anahtar sızıntı protokolü (Compromised Key) tanımlanmış olmalı', () => {
  const content = fs.readFileSync(DOC_PATH, 'utf8');
  assert.strictEqual(content.includes('Acil Durum Anahtar İhlali Protokolü'), true, 'İhlal protokolü başlığı eksik');
  assert.strictEqual(content.includes('Derhal İptal'), true, 'Derhal iptal adımı eksik');
  assert.strictEqual(content.includes('revoke_user_sessions'), true, 'Oturum feshi adımı eksik');
});

runTest('B10-09: Planlı JWT ve Kasa anahtar rotasyonu adımları yer almalı', () => {
  const content = fs.readFileSync(DOC_PATH, 'utf8');
  assert.strictEqual(content.includes('Generate new JWT secret'), true, 'JWT rotasyonu eksik');
  assert.strictEqual(content.includes('app.settings.encryption_key'), true, 'Kasa anahtar rotasyonu eksik');
});

runTest('B10-10: Kaynak kodda service_role doğrudan çağrısı bulunmamalı', () => {
  const srcDir = path.join(ROOT, 'src');
  function checkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) {
        checkDir(fullPath);
      } else if (/\.(tsx|ts|js)$/.test(e.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.strictEqual(content.includes('SUPABASE_SERVICE_ROLE_KEY'), false, `İstemci kodunda service_role bulundu: ${fullPath}`);
      }
    }
  }
  checkDir(srcDir);
});

console.log(`\n════════════════════════════════════════════════════════════════════`);
console.log(`   📊 B9 & B10 TEST SONUCU: ${passedTests} Geçti / ${failedTests} Başarısız`);
console.log(`════════════════════════════════════════════════════════════════════\n`);

if (failedTests > 0) {
  process.exit(1);
}
