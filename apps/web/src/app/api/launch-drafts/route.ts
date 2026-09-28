import { createClient } from '@/lib/supabase/server';
import { isLaunchArchiveExpired, LAUNCH_ARCHIVE_RETENTION_MS, launchDraftPayloadSchema } from '@kistas/shared';
import { z } from 'zod';

const input = z.object({ id: z.string().uuid(), revision: z.number().int().min(0), payload: launchDraftPayloadSchema,
  sourceListingRevision: z.number().int().min(0).nullable(), sourceListingId: z.string().uuid().nullable() }).strict();
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply({ error: 'AUTH_REQUIRED' }, 401);
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  if (id) {
    if (!z.string().uuid().safeParse(id).success) return reply({ error: 'INVALID_DRAFT' }, 400);
    const { data, error } = await supabase.from('launch_drafts')
      .select('id,payload,source_listing_id,source_listing_revision,revision,state,submitted_listing_id,updated_at')
      .eq('id', id).eq('owner_id', user.id).maybeSingle();
    if (error) return reply({ error: 'ARCHIVE_UNAVAILABLE' }, 503);
    if (data && isLaunchArchiveExpired(data.updated_at)) return reply({ error: 'DRAFT_EXPIRED' }, 410);
    return data ? reply(data) : reply({ error: 'NOT_FOUND' }, 404);
  }
  const offset = Number(params.get('offset') || 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) return reply({ error: 'INVALID_PAGE' }, 400);
  const { data, error } = await supabase.from('launch_drafts')
    .select('id,source_listing_id,revision,updated_at,title:payload->>title')
    .eq('owner_id', user.id).eq('state', 'editing')
    .gt('updated_at', new Date(Date.now() - LAUNCH_ARCHIVE_RETENTION_MS).toISOString())
    .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 29);
  if (error) return reply({ error: 'ARCHIVE_UNAVAILABLE' }, 503);
  return reply({ items: data, nextOffset: data?.length === 30 ? offset + 30 : null });
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'FORBIDDEN' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'INVALID_DRAFT' }, 400);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply({ error: 'AUTH_REQUIRED' }, 401);
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'INVALID_DRAFT' }, 400);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > 65536) { await reader.cancel(); return reply({ error: 'INVALID_DRAFT' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const parsed = input.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    if (!parsed.success) return reply({ error: 'INVALID_DRAFT' }, 400);
    const body = parsed.data;
    const { data, error } = await supabase.rpc('save_launch_draft', { p_id: body.id, p_revision: body.revision,
      p_payload: body.payload, p_source_listing_id: body.sourceListingId, p_source_revision: body.sourceListingRevision });
    if (error) {
      if (error.message.includes('DRAFT_EXPIRED')) return reply({ error: 'DRAFT_EXPIRED' }, 410);
      return reply({ error: error.message.includes('DRAFT_CONFLICT') ? 'DRAFT_CONFLICT' : 'ARCHIVE_UNAVAILABLE' },
        error.message.includes('DRAFT_CONFLICT') ? 409 : 503);
    }
    return reply(data);
  } catch { return reply({ error: 'INVALID_DRAFT' }, 400); }
}
