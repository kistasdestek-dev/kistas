// Test-only Auth/PostgREST/Storage responses; never forwarded to a real service.
export const launchUsers = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
export function launchSession(id = launchUsers[0]) {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const access_token = `${encoded({alg:'HS256',typ:'JWT'})}.${encoded({sub:id,exp,role:'authenticated'})}.m2-fixture-signature`;
  return { access_token, refresh_token: 'm2-test-refresh', token_type: 'bearer', expires_in:86400, expires_at:exp,
    user: { id, aud:'authenticated', role:'authenticated', email:'m2@example.test', email_confirmed_at:'2026-01-01T00:00:00Z', app_metadata:{provider:'email'},user_metadata:{} } };
}
const drafts = new Map();
const sessions = launchUsers.map(id=>launchSession(id));
export async function privateLaunchFixtureResponse(request) {
  const url = new URL(request.url);
  if (!url.hostname.endsWith('.supabase.co')) return null;
  const token = request.headers.get('authorization')?.replace(/^Bearer /i,'');
  // Match stable subject/signature, not wall clock-dependent exp.
  if (!token?.endsWith('.m2-fixture-signature')) return null;
  let subject;
  try { subject = JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub; } catch { throw new Error('Invalid fixture identity'); }
  const session = sessions.find(item=>item.user.id===subject); if (!session) throw new Error('Unknown fixture identity');
  if (url.pathname === '/auth/v1/user' && request.method==='GET') return Response.json(session.user);
  const resource=url.pathname.split('/').at(-1);
  if (request.method==='POST' && resource==='save_launch_draft') {
    const body=await request.json();const current=drafts.get(body.p_id);
    if (current && current.owner_id!==subject) return Response.json({code:'P0001',message:'FORBIDDEN'},{status:403});
    if ((current && (current.revision!==body.p_revision || current.state!=='editing')) || (!current && body.p_revision!==0)) return Response.json({code:'P0001',message:'DRAFT_CONFLICT'},{status:400});
    const row={id:body.p_id,owner_id:subject,payload:body.p_payload,source_listing_id:body.p_source_listing_id,
      source_listing_revision:body.p_source_revision,revision:(current?.revision||0)+1,updated_at:new Date().toISOString(),state:'editing'};
    drafts.set(row.id,row);return Response.json({revision:row.revision,updatedAt:row.updated_at});
  }
  if (resource==='launch_drafts' && request.method==='GET') {
    const id=url.searchParams.get('id')?.replace(/^eq\./,'');
    if(id) {const row=drafts.get(id);return Response.json(row?.owner_id===subject ? row : null);}
    const offset=Number(url.searchParams.get('offset')||0);
    return Response.json([...drafts.values()].filter(row=>row.owner_id===subject&&row.state==='editing')
      .reverse().slice(offset,offset+30).map(row=>({...row,title:row.payload.title})));
  }
  if (resource==='categories' && request.method==='GET') return null;
  if (request.method==='POST' && resource==='delete_launch_draft') {
    const body=await request.json(); const row=drafts.get(body.p_id);
    if (row && (row.owner_id!==subject || row.state!=='editing' || row.revision!==body.p_revision)) {
      return Response.json({code:'P0001',message:'DRAFT_CONFLICT'},{status:400});
    }
    drafts.delete(body.p_id); return Response.json(null);
  }
  throw new Error(`Unmocked private fixture request: ${request.method} ${url.pathname}`);
}
