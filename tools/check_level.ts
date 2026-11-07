// Level checker: a bot plays every level through the game's own physics and proves it can be finished.
//   node tools/check_level.ts [public/levels/btc-2026-10.json]     exit 1 if the bot cannot finish
import { readFileSync } from 'node:fs';
import * as C from '../src/sim/constants.ts';
import { buildLevel, cellOf, type LevelFile } from '../src/sim/level.ts';
import { newSim, step, margin, enterVolume } from '../src/sim/physics.ts';
import { bot } from '../src/sim/bot.ts';

const path = process.argv[2] || 'public/levels/btc-2026-10.json';
const lv = buildLevel(JSON.parse(readFileSync(path, 'utf8')) as LevelFile);
console.log(`${lv.file.id}: ${lv.n} candles | spikes ${lv.spikes.length} | lasers ${lv.lasers.length} | boost pads ${lv.springs.length} | ` +
  `power-ups ${lv.powers.map(w => w.kind + '@' + w.i).join(' ')} | volume pits ${lv.vol.filter(v => v.pit).length}, liquidation spikes ${lv.volSpikes.length} | ` +
  `glass planks ${lv.plats.filter(p => p.doji).length} | coins ${lv.coins.length} | height span ${(Math.max(...lv.plats.map(p => p.top)) - Math.min(...lv.plats.map(p => p.top))).toFixed(1)} units`);

function run(withChaser: boolean, human = false) {
  const s = newSim(lv);
  if (!withChaser) s.ch.x = -1e9;
  let stuckT = 0, lastBest = 0;
  const log: string[] = [];
  while (s.state === 'play' && s.t < 600) {
    const inp = bot(lv, s);
    if (human && s.t % 7 > 6.3) inp.right = false;                 // a human hesitates now and then
    step(s, inp);
    if (!withChaser) s.ch.x = -1e9;
    for (const e of s.events) if (e.type === 'hit' || e.type === 'fall' || e.type === 'crumble') log.push(`${e.type} at candle ${cellOf(e.x, lv.n)} (t ${s.t.toFixed(1)}s)`);
    s.events.length = 0;
    if (s.p.best > lastBest) { lastBest = s.p.best; stuckT = 0; } else if ((stuckT += C.DT) > 4) break;
  }
  return { s, log, stuck: s.state === 'play' };
}

const solo = run(false);
console.log(`bot without the chaser: ${solo.s.state}${solo.stuck ? ' (STUCK)' : ''} at candle ${solo.s.p.best}/${lv.n - 1} in ${solo.s.t.toFixed(1)}s, ` +
  `hits ${solo.s.hits}, falls ${solo.s.falls}, coins ${solo.s.p.coins}/${lv.coins.length}`);
solo.log.slice(0, 12).forEach(l => console.log('  ' + l));
if (solo.stuck) {
  const i = solo.s.p.best, q = lv.plats;
  console.log(`  stuck near candle ${i}: tops ${[i - 1, i, i + 1, i + 2].filter(j => j >= 0 && j < lv.n).map(j => `${j}:${q[j].top.toFixed(2)}${q[j].doji ? 'g' : ''}`).join(' ')}`);
}
const race = run(true), slow = run(true, true);
for (const [name, r] of [['expert', race], ['human (pauses 0.7 s every 7 s)', slow]] as const)
  console.log(`racing the taxman, ${name}: ${r.s.state} at candle ${r.s.p.best} in ${r.s.t.toFixed(1)}s, ` +
    `lowest margin ${(r.s.minMargin * 100).toFixed(0)}%, end margin ${(margin(r.s) * 100).toFixed(0)}%`);
// last chance: drop into the volume at several places; the bot must reach the MARGIN TOP-UP heart and get back up
let rescued = 0; const tries = [12, 45, 80, 110, 150, 175];
for (const at of tries) {
  const t = newSim(lv), q = lv.plats[at];
  Object.assign(t.p, { x: q.cx, y: q.top, plat: at }); t.ch.x = -1e9;
  enterVolume(t);
  let ok = false;
  while (t.state === 'play' && t.t < 40) {
    step(t, bot(lv, t)); t.ch.x = -1e9;
    if (t.events.some(e => e.type === 'rescued')) { ok = true; break; }
    t.events.length = 0;
  }
  if (ok) rescued++; else console.log(`  last chance from candle ${at}: FAILED (${t.state}${t.cause ? ', ' + t.cause : ''} at candle ${cellOf(t.p.x, lv.n)})`);
}
console.log(`last chance in the volume: rescued ${rescued}/${tries.length}`);
process.exit(solo.s.state === 'won' && race.s.state === 'won' && rescued === tries.length ? 0 : 1);
