// The play counter's check: functions/api/run.js takes only valid counts, adds 1 per day, and has nowhere to put anything else.
//   node tools/check_counts.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost } from '../functions/api/run.js';

const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('counts.sql', import.meta.url), 'utf8'));
const DB = { prepare: (sql: string) => ({ bind: (...a: unknown[]) => ({ run: async () => db.prepare(sql).run(...(a as string[])) }) }) };
const post = async (body: unknown, env: object = { DB }, headers: Record<string, string> = {}) => {
  const request = new Request('https://x.test/api/run', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return (await onRequestPost({ request, env })).status;
};
const row = (e: string, v = 0, how = '', tag = 'live') => ({ e, v, how, tag });

for (const ok of [row('open'), row('start', 1), row('start', 0), row('start', 20), row('at', 50), row('at', 200), row('end', 57, 'taxed'), row('end', 12, 'hit'), row('end', 13, 'fall'), row('end', 14, 'broke'), row('end', 200, 'won'), row('end', 90, 'pool', 'test')])
  assert.equal(await post(ok), 204, JSON.stringify(ok));
for (const bad of ['', 'nope', 'null', '5', '[]', '{}', row('open', 1), row('start', 21), row('start', -1), row('start', 1.5), row('at', 0), row('at', 25), row('at', 1050), row('end', 57), row('end', 57, 'rugged'),
  row('at', 50, 'taxed'), row('hack', 1), row('open', 0, '', 'prod'), { ...row('start', 1), v: '1' }, 'x'.repeat(201), JSON.stringify({ ...row('open'), pad: 'x'.repeat(300) })])
  assert.equal(await post(bad), 400, JSON.stringify(bad));
assert.equal(await post(row('open'), { DB }, { origin: 'https://x.test' }), 204);         // the game's own page
assert.equal(await post(row('open'), { DB }, { origin: 'https://other.example' }), 403);  // another site's page
assert.equal(await post(row('open'), { DB }, { origin: 'null' }), 403);                   // a sandboxed frame
const before = db.prepare('SELECT COUNT(*) AS c FROM counts').get()!.c;
assert.equal(await post(row('start', 1)), 204);                 // the same count again adds to its row, it makes no new one
assert.equal(db.prepare('SELECT COUNT(*) AS c FROM counts').get()!.c, before);
assert.equal(db.prepare("SELECT n FROM counts WHERE ev='start' AND v=1 AND tag='live'").get()!.n, 2);
assert.equal(db.prepare("SELECT n FROM counts WHERE ev='end' AND how='pool' AND tag='test'").get()!.n, 1);
const ist = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
assert.equal(db.prepare('SELECT DISTINCT day FROM counts').get()!.day, ist);   // days are IST days
const extra = await post({ ...row('open'), ip: '1.2.3.4' });                    // an extra field is not an error, it is simply never stored
assert.equal(extra, 204);
assert.deepEqual(db.prepare('PRAGMA table_info(counts)').all().map(c => c.name), ['day', 'ev', 'how', 'v', 'tag', 'n']);
assert.equal(await post(row('open'), {}), 204);                                 // no database bound (a fork): the game is never told off
const broken = { prepare: () => { throw new Error('down'); } };
assert.equal(await post(row('open'), { DB: broken }), 503);
console.log('play counter: OK');
