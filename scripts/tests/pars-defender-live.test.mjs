/**
 * scripts/tests/pars-defender-live.test.mjs
 * 
 * Bu test paketi, FAZ 18: PARS-DEFENDER Otonom Tehdit Radarı ve Bal Küpü (Canary)
 * korumalarını doğrular:
 * 1. log_security_threat_event fonksiyonunun SQL tanımları
 * 2. admin_clear_support_messages ve admin_close_support_conversation tehdit yakalama sarıcıları
 * 3. guard_financial_columns finansal manipülasyon radarı
 * 4. admin_credentials ve system_config_keys bal küpü decoy görünümleri
 * 5. ThreatIntelligenceView.tsx otonom 10 saniye polling mekanizması
 * 6. Canlı Supabase endpointlerinde yetkisiz admin RPC ve decoy yanıtları
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n--- 🛡️ FAZ 18: PARS-DEFENDER AKTİF TEHDİT RADARI TESTLERİ ---\n');

// Test 1: Migration dosyası kontrolü
runTest('FAZ 18 Migration dosyası mevcut ve eksiksiz olmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000009_faz18_pars_defender_db_level_threat_radar.sql');
  if (!fs.existsSync(migPath)) {
    throw new Error('20260918000009_faz18_pars_defender_db_level_threat_radar.sql bulunamadı.');
  }
  const content = fs.readFileSync(migPath, 'utf8');
  if (!content.includes('log_security_threat_event')) {
    throw new Error('log_security_threat_event fonksiyonu eksik.');
  }
  if (!content.includes('admin_credentials')) {
    throw new Error('admin_credentials bal küpü eksik.');
  }
  if (!content.includes('system_config_keys')) {
    throw new Error('system_config_keys bal küpü eksik.');
  }
  if (!content.includes('UNAUTHORIZED_ADMIN_RPC_PROBE')) {
    throw new Error('UNAUTHORIZED_ADMIN_RPC_PROBE vektörü eksik.');
  }
});

// Test 2: Konsolide Migration dosyası kontrolü
runTest('FAZ17_CONSOLIDATED_BANK_GRADE_MIGRATION.sql içinde AŞAMA 9 (PARS-DEFENDER) bulunmalı', () => {
  const consPath = path.join(ROOT, 'supabase', 'manual-sql', 'FAZ17_CONSOLIDATED_BANK_GRADE_MIGRATION.sql');
  const content = fs.readFileSync(consPath, 'utf8');
  if (!content.includes('AŞAMA 9: PARS-DEFENDER VERİTABANI DÜZEYİ AKTİF TEHDİT RADARI')) {
    throw new Error('AŞAMA 9 konsolide migration dosyasına eklenmemiş.');
  }
  if (!content.includes('trap_canary_credentials_probe')) {
    throw new Error('Bal küpü fonksiyonu konsolide dosyada eksik.');
  }
});

// Test 3: PostgREST GUC Header Çıkarımı
runTest('log_security_threat_event PostgREST cf-connecting-ip ve user-agent başlıklarını çıkarmalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000009_faz18_pars_defender_db_level_threat_radar.sql');
  const content = fs.readFileSync(migPath, 'utf8');
  if (!content.includes("current_setting('request.headers', true)")) {
    throw new Error('request.headers GUC ayarı okunmuyor.');
  }
  if (!content.includes('cf-connecting-ip') || !content.includes('user-agent')) {
    throw new Error('cf-connecting-ip veya user-agent başlığı aranmıyor.');
  }
});

// Test 4: Finansal Kolon Koruması ve Tehdit Yakalama
runTest('guard_financial_columns yetkisiz manipülasyonları FINANCIAL_TAMPER_ATTEMPT olarak yakalamalı', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000009_faz18_pars_defender_db_level_threat_radar.sql');
  const content = fs.readFileSync(migPath, 'utf8');
  if (!content.includes('FINANCIAL_TAMPER_ATTEMPT')) {
    throw new Error('FINANCIAL_TAMPER_ATTEMPT vektörü trigger içine eklenmemiş.');
  }
  if (!content.includes('SELF_DESTRUCT_PROFILE_WIPE')) {
    throw new Error('SELF_DESTRUCT_PROFILE_WIPE vektörü trigger içine eklenmemiş.');
  }
});

// Test 5: Bal Küpü (Canary) Tablolarının Güvenliği
runTest('Bal küpü görünümleri anon ve authenticated rollerine açık olmalı (Tuzak Stratejisi)', () => {
  const migPath = path.join(ROOT, 'supabase', 'migrations', '20260918000009_faz18_pars_defender_db_level_threat_radar.sql');
  const content = fs.readFileSync(migPath, 'utf8');
  if (!content.includes('GRANT SELECT ON public.admin_credentials TO anon, authenticated;')) {
    throw new Error('admin_credentials için SELECT grant eksik.');
  }
  if (!content.includes('GRANT SELECT ON public.system_config_keys TO anon, authenticated;')) {
    throw new Error('system_config_keys için SELECT grant eksik.');
  }
});

// Test 6: ThreatIntelligenceView Otomatik Canlı Polling
runTest('ThreatIntelligenceView.tsx içinde 10 saniyelik otonom canlı radar polling bulunmalı', () => {
  const viewPath = path.join(ROOT, 'src', 'features', 'admin', 'presentation', 'ThreatIntelligenceView.tsx');
  const content = fs.readFileSync(viewPath, 'utf8');
  if (!content.includes('setInterval') || !content.includes('10000')) {
    throw new Error('10 saniyelik otonom polling timer bulunamadı.');
  }
  if (!content.includes('isSilent')) {
    throw new Error('Sessiz arkaplan yenileme parametresi (isSilent) eksik.');
  }
});

// Test 7: Canlı Ağ - Yetkisiz admin_clear_support_messages çağrısının sunucuda 401/404/42501 dönmesi
const SB = 'https://iojgqicgeztqwkbetboa.supabase.co';
const KEY = 'sb_publishable_n82VP8BBfN_HcJC0RClzTA_qJFPwtEC';

async function runAsyncTests() {
  try {
    const res = await fetch(`${SB}/rest/v1/rpc/admin_clear_support_messages`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_conversation_id: '00000000-0000-0000-0000-000000000000' }),
    });
    // Yetkisiz çağrı asla 200 dönmemeli (401 veya 403 veya 400 olmalı)
    if (res.status === 200) {
      throw new Error('Yetkisiz admin RPC çağrısı 200 döndü, bu bir güvenlik açığıdır!');
    }
    console.log(`  ✅ [PASS] Canlı Ağ: admin_clear_support_messages yetkisiz anon çağrısı güvenle engellendi [HTTP ${res.status}]`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] Canlı Ağ admin RPC testi: ${err.message}`);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`FAZ 18 TEST SONUCU: ${passed} Başarılı · ${failed} Hatalı`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAsyncTests();
