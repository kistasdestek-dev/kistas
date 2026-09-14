import { createClient } from 'npm:@supabase/supabase-js@2';

interface RevenueCatAdjustment {
  amount?: unknown;
  currency?: {
    code?: unknown;
  };
}

interface RevenueCatEvent {
  id?: unknown;
  type?: unknown;
  source?: unknown;
  app_user_id?: unknown;
  product_id?: unknown;
  transaction_id?: unknown;
  virtual_currency_transaction_id?: unknown;
  purchase_environment?: unknown;
  store?: unknown;
  event_timestamp_ms?: unknown;
  adjustments?: RevenueCatAdjustment[];
}

interface RevenueCatWebhookPayload {
  event?: RevenueCatEvent;
}

const jsonResponse = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const authorization = request.headers.get('authorization');
  if (!webhookSecret || authorization !== `Bearer ${webhookSecret}`) {
    return jsonResponse(401, { error: 'UNAUTHORIZED' });
  }

  let payload: RevenueCatWebhookPayload;
  try {
    payload = (await request.json()) as RevenueCatWebhookPayload;
  } catch {
    return jsonResponse(400, { error: 'INVALID_JSON' });
  }

  const event = payload.event;
  if (!event || event.type !== 'VIRTUAL_CURRENCY_TRANSACTION') {
    return jsonResponse(200, { received: true, ignored: true });
  }

  if (event.source !== 'in_app_purchase') {
    return jsonResponse(200, { received: true, ignored: true, reason: 'UNSUPPORTED_SOURCE' });
  }

  const eventId = String(event.virtual_currency_transaction_id || event.id || '');
  const appUserId = String(event.app_user_id || '');
  const productId = String(event.product_id || '');
  const transactionId = event.transaction_id ? String(event.transaction_id) : null;
  const store = String(event.store || '');
  const environment = String(event.purchase_environment || '');
  const timestampMs = Number(event.event_timestamp_ms);
  const currencyCode = Deno.env.get('REVENUECAT_CREDIT_CURRENCY_CODE') || 'KCR';
  const adjustment = event.adjustments?.find(
    (item) => item.currency?.code === currencyCode
  );
  const creditDelta = Number(adjustment?.amount);

  if (
    !eventId ||
    !isUuid(appUserId) ||
    !productId ||
    !Number.isSafeInteger(creditDelta) ||
    creditDelta === 0 ||
    !Number.isFinite(timestampMs)
  ) {
    return jsonResponse(400, { error: 'INVALID_CREDIT_EVENT' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'SERVER_NOT_CONFIGURED' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('apply_revenuecat_credit_event', {
    p_provider_event_id: eventId,
    p_provider_transaction_id: transactionId,
    p_user_id: appUserId,
    p_product_id: productId,
    p_credit_delta: creditDelta,
    p_store: store,
    p_environment: environment,
    p_occurred_at: new Date(timestampMs).toISOString(),
  });

  if (error) {
    console.error('RevenueCat kredi olayı uygulanamadı:', error.code, error.message);
    return jsonResponse(500, { error: 'CREDIT_EVENT_APPLY_FAILED' });
  }

  return jsonResponse(200, { received: true, result: data });
});
