// POST /api/run: one anonymous play count. The game sends {e, v, how, tag} (src/game/count.ts); this adds 1 to a per-day counter in D1
// (binding DB, table in tools/counts.sql). Nothing else is read or kept: no IP, no cookie, no id, no user agent, no per-event row.
// There is no public read: tools/counts.py reads the numbers with the Cloudflare key. A fork without the binding counts nothing.
// ponytail: no rate limit. Every POST here, valid or not, is one request on the account's free daily quota (100,000 Workers requests and
// 100,000 D1 rows written), which is shared with AI Survivor City, so a flood or a very big day could stop the City's functions until
// midnight UTC. A run costs 2 to 6 requests. tools/counts.py prints today's use. Deleting functions/ and redeploying stops it at once;
// the game is static, does not go through this function and keeps working. A paid plan or a rate limit is the upgrade if it ever gets close.
const UPSERT = `INSERT INTO counts (day, ev, how, v, tag, n) VALUES (date('now', '+330 minutes'), ?1, ?2, ?3, ?4, 1)
  ON CONFLICT (day, ev, how, v, tag) DO UPDATE SET n = n + 1`;
const ENDS = ['won', 'taxed', 'hit', 'fall', 'pool', 'broke'];
const MAX_BODY = 200, MAX_CANDLE = 1000, MAX_RUN = 20, MARK = 50;   // MARK as in src/game/count.ts

function valid({ e, v, how, tag }) {
  if ((tag !== 'live' && tag !== 'test') || !Number.isInteger(v)) return false;
  switch (e) {
    case 'open': return v === 0 && how === '';
    case 'start': return v >= 0 && v <= MAX_RUN && how === '';
    case 'at': return v >= MARK && v <= MAX_CANDLE && v % MARK === 0 && how === '';
    case 'end': return v >= 1 && v <= MAX_CANDLE && ENDS.includes(how);
    default: return false;
  }
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin');     // browsers say where a POST comes from: another site's page is refused
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  let row = null;
  try {
    const text = Number(request.headers.get('content-length')) > MAX_BODY ? '' : (await request.text()).slice(0, MAX_BODY);
    const parsed = JSON.parse(text);
    if (valid(parsed)) row = parsed;
  } catch { /* not JSON: refused below */ }
  if (!row) return new Response(null, { status: 400 });
  if (!env.DB) return new Response(null, { status: 204 });
  try {
    await env.DB.prepare(UPSERT).bind(row.e, row.how, row.v, row.tag).run();
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
