import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Shopier Otomatik Sipariş Bildirimi (OSB) ve Webhook Servisi.
 * Shopier'de ödeme tamamlandığında çağrılır; kullanıcıyı tespit edip
 * kredi bakiyesini otomatik olarak tanımlar.
 */

// Kredi Paketleri Eşleşme Tablosu
const PRODUCT_CREDITS_MAP: Record<string, number> = {
  '50900373': 100,  // Başlangıç Paketi (100 Kredi - ₺299)
  '50900401': 350,  // Profesyonel Paket (350 Kredi - ₺699)
  '50900419': 1000, // Ölçek Paketi (1.000 Kredi - ₺1.699)
};

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const extractEmail = (text: string): string | null => {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
};

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('METHOD_NOT_ALLOWED', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Shopier Webhook: Supabase ortam değişkenleri eksik.');
    return new Response('SERVER_NOT_CONFIGURED', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let rawPayload: Record<string, unknown> = {};

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await request.json();
      if (json && typeof json === 'object') {
        rawPayload = json as Record<string, unknown>;
      }
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        rawPayload[key] = value;
      });
    } else {
      // Düz metin veya bilinmeyen format desteği
      const text = await request.text();
      try {
        rawPayload = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        params.forEach((value, key) => {
          rawPayload[key] = value;
        });
      }
    }
  } catch (err) {
    console.error('Shopier Webhook: İstek gövdesi okunamadı:', err);
    return new Response('INVALID_PAYLOAD', { status: 400 });
  }

  // Shopier OSB Base64 'res' Alanını Çözümleme
  let orderData: Record<string, unknown> = rawPayload;
  if (typeof rawPayload.res === 'string' && rawPayload.res.length > 0) {
    try {
      const decodedRes = atob(rawPayload.res);
      orderData = JSON.parse(decodedRes);
    } catch (decodeErr) {
      console.warn('Shopier Webhook: res alanı base64 çözülemedi, ham veri deneniyor:', decodeErr);
    }
  }

  // Güvenlik: İsteğe Bağlı OSB Hash Kontrolü
  const osbSecret = Deno.env.get('SHOPIER_OSB_SECRET');
  if (osbSecret && typeof rawPayload.hash === 'string' && typeof rawPayload.res === 'string') {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(osbSecret);
      const messageData = encoder.encode(rawPayload.res);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const hashHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (hashHex.toLowerCase() !== rawPayload.hash.toLowerCase()) {
        console.error('Shopier Webhook: Geçersiz HMAC imzası.');
        return new Response('INVALID_SIGNATURE', { status: 401 });
      }
    } catch (cryptoErr) {
      console.error('Shopier Webhook: İmza doğrulama hatası:', cryptoErr);
    }
  }

  // Alanları Çıkarma
  const orderId = String(
    orderData.orderid || orderData.order_id || orderData.id || ''
  ).trim();

  const productId = String(
    orderData.productid || orderData.product_id || ''
  ).trim();

  const productName = String(
    orderData.productname || orderData.product_name || orderData.title || ''
  ).trim();

  const customerNote = String(
    orderData.customernote || orderData.order_note || orderData.note || ''
  ).trim();

  const buyerEmail = String(
    orderData.email || orderData.buyer_email || ''
  ).trim().toLowerCase();

  const price = parseFloat(String(orderData.price || orderData.total || '0'));

  if (!orderId) {
    console.warn('Shopier Webhook: orderId bulunamadı.');
    return new Response('MISSING_ORDER_ID', { status: 400 });
  }

  // 1. Kredi Miktarını Belirleme
  let creditDelta = PRODUCT_CREDITS_MAP[productId] || 0;

  if (!creditDelta) {
    // Ürün adı veya fiyattan çözümleme yedeği
    if (productName.includes('1000') || productName.toLowerCase().includes('ölçek')) {
      creditDelta = 1000;
    } else if (productName.includes('350') || productName.toLowerCase().includes('profesyonel')) {
      creditDelta = 350;
    } else if (productName.includes('100') || productName.toLowerCase().includes('başlangıç')) {
      creditDelta = 100;
    } else if (price >= 1500) {
      creditDelta = 1000;
    } else if (price >= 500) {
      creditDelta = 350;
    } else if (price >= 200) {
      creditDelta = 100;
    }
  }

  if (creditDelta <= 0) {
    console.warn(`Shopier Webhook #${orderId}: Ürün eşleşmedi (${productId} - ${productName}).`);
    return new Response('UNKNOWN_PRODUCT', { status: 400 });
  }

  // 2. Kullanıcıyı Tespit Etme
  let targetEmail = extractEmail(customerNote);
  if (!targetEmail && buyerEmail) {
    targetEmail = extractEmail(buyerEmail);
  }

  let profile: { id: string; email?: string | null; boost_credits?: number | null } | null = null;

  if (targetEmail) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, boost_credits')
      .ilike('email', targetEmail)
      .maybeSingle();

    if (!error && data) {
      profile = data;
    }
  }

  // Not alanında doğrudan UUID girilmişse
  if (!profile && isUuid(customerNote)) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, boost_credits')
      .eq('id', customerNote)
      .maybeSingle();

    if (!error && data) {
      profile = data;
    }
  }

  if (!profile) {
    console.error(
      `Shopier Webhook #${orderId}: Kullanıcı profili bulunamadı (Not: "${customerNote}", E-posta: "${buyerEmail}").`
    );
    // Siparişin tekrar tekrar gelip tıkanmaması için 200 success dönülür, log bırakılır
    return new Response('USER_NOT_FOUND_LOGGED', { status: 200 });
  }

  // 3. Idempotency (Mükerrer Yükleme Koruması)
  const { data: existingTx } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('user_id', profile.id)
    .ilike('description', `%Shopier #${orderId}%`)
    .maybeSingle();

  if (existingTx) {
    console.log(`Shopier Webhook #${orderId}: Sipariş daha önce işlenmiş, mükerrer işlem engellendi.`);
    return new Response('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // 4. Krediyi Hesaba Tanımlama
  const currentCredits = Number(profile.boost_credits || 0);
  const newCredits = currentCredits + creditDelta;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      boost_credits: newCredits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error(`Shopier Webhook #${orderId}: Profil bakiye güncelleme hatası:`, updateError);
    return new Response('BALANCE_UPDATE_FAILED', { status: 500 });
  }

  // 5. İşlem Kaydını (Transaction Log) Yazma
  const { error: txError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: profile.id,
      amount: creditDelta,
      balance_after: newCredits,
      type: 'purchase',
      description: `Shopier #${orderId} (${creditDelta} Vitrin Kredisi)`,
    });

  if (txError) {
    console.warn(`Shopier Webhook #${orderId}: Transaction log yazılamadı:`, txError);
  }

  console.log(
    `Shopier Webhook: #${orderId} siparişiyle ${profile.id} kullanıcısına +${creditDelta} kredi yüklendi. Yeni bakiye: ${newCredits}`
  );

  // Shopier OSB başarılı yanıt olarak "success" düz metnini bekler
  return new Response('success', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
});
