// scripts/tests/pars-audit-live.mjs
const SB = 'https://iojgqicgeztqwkbetboa.supabase.co';
const KEY = 'sb_publishable_n82VP8BBfN_HcJC0RClzTA_qJFPwtEC';

async function testEndpoint(name, url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { apikey: KEY, ...options.headers },
      ...options,
    });
    let text = '';
    try { text = await res.text(); } catch {}
    console.log(`[${res.status}] ${name}: ${text.slice(0, 100)}`);
    return res.status;
  } catch (err) {
    console.log(`[ERR] ${name}: ${err.message}`);
    return 0;
  }
}

async function run() {
  console.log('--- CANLI PARSRAPOR DOĞRULAMA AUDIT ---');
  
  // 1. Anon PII read
  await testEndpoint('V1: profiles?select=*', `${SB}/rest/v1/profiles?select=*&limit=1`);
  await testEndpoint('V1r: profiles?select=id', `${SB}/rest/v1/profiles?select=id&limit=1`);
  await testEndpoint('V1r: profiles?select=phone', `${SB}/rest/v1/profiles?select=phone&limit=1`);
  await testEndpoint('profiles_public VIEW', `${SB}/rest/v1/profiles_public?limit=1`);
  
  // 2. V6: 11 Private tables
  const privateTables = [
    'orders', 'credit_transactions', 'user_addresses', 'disputes', 'offers',
    'user_consents', 'notifications', 'reports', 'blocked_users', 'conversations', 'messages', 'admin_action_audit', 'financial_audit'
  ];
  for (const table of privateTables) {
    await testEndpoint(`V6 Table [${table}]`, `${SB}/rest/v1/${table}?limit=1`);
  }
  
  // 3. Storage
  await testEndpoint('V2 Storage: pars_foothold_beacon.png', `${SB}/storage/v1/object/public/kistas/pars_foothold_beacon.png`);
  await testEndpoint('V2 Storage: pars_test.png', `${SB}/storage/v1/object/public/kistas/pars_test.png`);
  
  // 4. Anon Storage Upload (V2)
  const dummyPng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  await testEndpoint('V2 Anon Storage Upload', `${SB}/storage/v1/object/kistas/audit_test_probe.png`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: dummyPng,
  });
  
  // 5. Listings join profiles (misafir vitrini testi)
  await testEndpoint('Vitrin Join (listings with profiles)', `${SB}/rest/v1/listings?select=id,title,profiles:seller_id(id,full_name,avatar_url)&limit=1`);
}

run();
