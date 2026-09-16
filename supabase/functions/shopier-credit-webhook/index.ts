import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  decodeShopierPayload,
  extractEmail,
  normalizeShopierCurrency,
  parsePriceMinor,
  resolveShopierCreditPackage,
  verifyShopierOsbSignature,
} from './shopier-osb.ts';

const MAX_BODY_BYTES = 64 * 1024;

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function readOsbEnvelope(request: Request): Promise<{ res: string; hash: string }> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');

  const contentType = request.headers.get('content-type') || '';
  let rawPayload: Record<string, unknown> = {};

  if (contentType.includes('application/json')) {
    const json = await request.json();
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      rawPayload = json as Record<string, unknown>;
    }
  } else if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData();
    formData.forEach((value, key) => {
      if (typeof value === 'string') rawPayload[key] = value;
    });
  } else {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');
    const params = new URLSearchParams(text);
    params.forEach((value, key) => {
      rawPayload[key] = value;
    });
  }

  if (typeof rawPayload.res !== 'string' || typeof rawPayload.hash !== 'string') {
    throw new Error('MISSING_SIGNATURE');
  }

  return { res: rawPayload.res, hash: rawPayload.hash };
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return textResponse('success', 200);
  }
  if (request.method !== 'POST') {
    return textResponse('METHOD_NOT_ALLOWED', 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const osbUsername = Deno.env.get('SHOPIER_OSB_USERNAME');
  const osbPassword = Deno.env.get('SHOPIER_OSB_PASSWORD');
  if (!supabaseUrl || !serviceRoleKey || !osbUsername || !osbPassword) {
    console.error('Shopier Webhook: Sunucu yapılandırması eksik.');
    return textResponse('SERVER_NOT_CONFIGURED', 503);
  }

  let envelope: { res: string; hash: string };
  try {
    envelope = await readOsbEnvelope(request);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'INVALID_PAYLOAD';
    return textResponse(reason, reason === 'PAYLOAD_TOO_LARGE' ? 413 : 400);
  }

  let signatureIsValid = false;
  try {
    signatureIsValid = await verifyShopierOsbSignature(
      envelope.res,
      envelope.hash,
      osbUsername,
      osbPassword
    );
  } catch (error) {
    console.error('Shopier Webhook: İmza doğrulama işlemi başarısız.', error);
    return textResponse('SIGNATURE_CHECK_FAILED', 500);
  }
  if (!signatureIsValid) {
    console.warn('Shopier Webhook: Geçersiz OSB imzası reddedildi.');
    return textResponse('INVALID_SIGNATURE', 401);
  }

  let orderData: Record<string, unknown>;
  try {
    orderData = decodeShopierPayload(envelope.res);
  } catch {
    return textResponse('INVALID_PAYLOAD', 400);
  }

  const isTest = String(orderData.istest ?? orderData.is_test ?? '') === '1';
  if (isTest) return textResponse('success', 200);

  const orderId = String(orderData.orderid ?? '').trim();
  const productId = String(orderData.productid ?? '').trim();
  const currency = normalizeShopierCurrency(orderData.currency);
  const priceMinor = parsePriceMinor(orderData.price);
  const creditPackage = resolveShopierCreditPackage(productId, priceMinor, currency);

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) {
    return textResponse('INVALID_ORDER_ID', 400);
  }
  if (!creditPackage || priceMinor === null) {
    console.warn(`Shopier Webhook #${orderId}: Ürün veya tutar eşleşmedi.`);
    return textResponse('PRODUCT_OR_AMOUNT_MISMATCH', 400);
  }

  const targetEmail = extractEmail(orderData.customernote) ?? extractEmail(orderData.email);
  if (!targetEmail) {
    console.warn(`Shopier Webhook #${orderId}: Kullanıcı eşleme bilgisi bulunamadı.`);
    return textResponse('USER_IDENTIFIER_MISSING', 422);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: result, error: applyError } = await supabase.rpc('apply_shopier_credit_event_by_email', {
      p_order_id: orderId,
      p_user_email: targetEmail,
      p_product_id: productId,
      p_credit_delta: creditPackage.credits,
      p_amount_minor: priceMinor,
      p_currency: currency,
    });

  if (applyError) {
    console.error(`Shopier Webhook #${orderId}: Atomik kredi işlemi başarısız.`, applyError);
    const userWasMissing = applyError.message?.includes('USER_NOT_FOUND');
    return textResponse(userWasMissing ? 'USER_NOT_FOUND' : 'CREDIT_APPLY_FAILED', userWasMissing ? 422 : 500);
  }

  const duplicate = Boolean((result as { duplicate?: boolean } | null)?.duplicate);
  console.log(
    `Shopier Webhook #${orderId}: ${duplicate ? 'Mükerrer bildirim atlandı.' : 'Kredi yüklendi.'}`
  );
  return textResponse('success', 200);
});
