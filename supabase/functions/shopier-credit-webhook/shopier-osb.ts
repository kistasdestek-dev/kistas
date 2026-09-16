export interface ShopierCreditPackage {
  credits: number;
  priceMinor: number;
  currency: 'TRY';
}

export const SHOPIER_CREDIT_PACKAGES: Readonly<Record<string, ShopierCreditPackage>> = {
  '50900373': { credits: 100, priceMinor: 29_900, currency: 'TRY' },
  '50900401': { credits: 350, priceMinor: 69_900, currency: 'TRY' },
  '50900419': { credits: 1000, priceMinor: 169_900, currency: 'TRY' },
};

export function resolveShopierCreditPackage(
  productId: string,
  priceMinor: number | null,
  currency: string
): ShopierCreditPackage | null {
  const standardPackage = SHOPIER_CREDIT_PACKAGES[productId];
  if (
    standardPackage &&
    priceMinor === standardPackage.priceMinor &&
    currency === standardPackage.currency
  ) {
    return standardPackage;
  }

  return null;
}

export function decodeShopierPayload(encodedPayload: string): Record<string, unknown> {
  const binary = atob(encodedPayload);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes));

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_OSB_PAYLOAD');
  }

  return parsed as Record<string, unknown>;
}

export function parsePriceMinor(value: unknown): number | null {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;

  return Math.round(amount * 100);
}

export function normalizeShopierCurrency(value: unknown): string {
  const currency = String(value ?? '').trim().toUpperCase();
  if (currency === '0' || currency === 'TL' || currency === 'TRY') return 'TRY';
  if (currency === '1' || currency === 'USD') return 'USD';
  if (currency === '2' || currency === 'EUR') return 'EUR';
  return currency;
}

export function extractEmail(value: unknown): string | null {
  const text = String(value ?? '').trim();
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

export async function verifyShopierOsbSignature(
  encodedPayload: string,
  suppliedHash: string,
  username: string,
  password: string
): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/i.test(suppliedHash)) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${encodedPayload}${username}`)
  );
  const expectedHash = bytesToHex(new Uint8Array(signature));

  return constantTimeEqual(expectedHash.toLowerCase(), suppliedHash.toLowerCase());
}
