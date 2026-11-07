import { CELL, COL_W, DOJI, GRAV, K, LASERS_MAX, LASER_UP, MIN_BODY, SPIKES_MAX, SPIKE_MAX, SPIKE_MIN, SPRING_RISE, STEP_UP, VOL_BASE, VOL_MAX } from './constants.ts';

export type Candle = [number, number, number, number, number, number];   // open time (ms), open, high, low, close, volume

export interface EventSource { title: string; url: string; publisher: string; date?: string }
export interface EventInfo {
  idx: number; date: string; headline: string; what_happened?: string; figure?: string; name?: string;
  post?: string[]; quote?: string; sound?: string; sfx?: string; sound_credit?: string; sources?: EventSource[];
}
export interface LevelFile {
  id: string; coin: string; pair: string; name: string; source: string; from: string; to: string; month: string;
  next_update: string; candles: Candle[]; event: EventInfo | null; events?: EventInfo[];
}
export interface Plat { i: number; x0: number; x1: number; cx: number; top: number; bot: number; up: boolean; doji: boolean; wickTop: number; wickBot: number; pit?: boolean }
export interface Spike { i: number; x: number; y0: number; y1: number }
export interface Laser { i0: number; i1: number; x0: number; x1: number; y: number }
export interface Spring { i: number; x: number; v: number }
export interface Coin { i: number; x: number; y: number }
export type PowerKind = 'moon' | 'shield' | 'magnet' | 'fud';
export interface Power { i: number; x: number; y: number; kind: PowerKind }
export interface PriceLevel { price: number; y: number }
export interface Level {
  file: LevelFile; n: number; plats: Plat[]; spikes: Spike[]; lasers: Laser[]; springs: Spring[]; coins: Coin[];
  floor: number[]; startX: number; finishX: number; events: EventInfo[]; vmax: number;
  vol: Plat[]; volSpikes: Spike[]; powers: Power[]; prices: PriceLevel[]; priceStep: number;
}

/** Turns a chart into a course. Pure: the game and tools/check_level.ts build the same level from the same file. */
export function buildLevel(file: LevelFile): Level {
  const k = file.candles, n = k.length;
  const p0 = Math.min(...k.map(a => a[3]));
  const lv = (p: number) => K * Math.log(p / p0);
  const events = file.events ?? (file.event ? [file.event] : []), evAt = new Set(events.map(e => e.idx));
  const plats: Plat[] = k.map((a, i) => {
    const [, o, h, l, c] = a, cx = i * CELL + CELL / 2;
    const top = lv(Math.max(o, c));
    const bot = Math.min(lv(Math.min(o, c)), top - MIN_BODY);
    return { i, x0: cx - COL_W / 2, x1: cx + COL_W / 2, cx, top, bot, up: c >= o, doji: false, wickTop: lv(h), wickBot: lv(l) };
  });

  // a rise too high to jump gets a boost pad near the right edge of the lower candle
  const springs: Spring[] = [];
  for (let i = 0; i < n - 1; i++) {
    const rise = plats[i + 1].top - plats[i].top;
    if (rise > SPRING_RISE) springs.push({ i, x: plats[i].x1 - 0.7, v: Math.sqrt(2 * GRAV * (rise + 1.4)) });
  }
  const spring = new Set(springs.map(s => s.i));
  const near = (i: number) => spring.has(i) || spring.has(i - 1);

  // dojis (almost no body) are glass planks
  for (const p of plats) {
    const [, o, , , c] = k[p.i];
    if (Math.abs(c - o) / o < DOJI && p.i > 3 && p.i < n - 2 && !evAt.has(p.i) && !near(p.i) && !spring.has(p.i + 1)) p.doji = true;
  }

  // the longest upper wicks become stop-hunt spikes; never two in a row, never on a special candle
  const spikeAt = new Set<number>();
  const spikes: Spike[] = [];
  const cand = plats.filter(p => p.i > 4 && p.i < n - 2 && !p.doji && !near(p.i) && !evAt.has(p.i) && p.wickTop - p.top >= SPIKE_MIN)
    .sort((a, b) => (b.wickTop - b.top) - (a.wickTop - a.top));
  for (const p of cand) {
    if (spikes.length >= SPIKES_MAX) break;
    if (spikeAt.has(p.i - 1) || spikeAt.has(p.i + 1)) continue;
    spikeAt.add(p.i);
    spikes.push({ i: p.i, x: p.cx, y0: p.top, y1: p.top + Math.min(SPIKE_MAX, p.wickTop - p.top) });
  }
  spikes.sort((a, b) => a.i - b.i);

  // resistance lasers over flat runs of three candles you can walk onto
  const lasers: Laser[] = [];
  let last = -99;
  for (let j = 8; j < n - 6 && lasers.length < LASERS_MAX; j++) {
    if (j - last < 12) continue;
    const run = [plats[j], plats[j + 1], plats[j + 2]];
    if (run.some(p => p.doji || spikeAt.has(p.i) || near(p.i) || evAt.has(p.i))) continue;
    if (spikeAt.has(j - 1) || spikeAt.has(j - 2) || spikeAt.has(j + 3) || plats[j - 1].doji || near(j + 3)) continue;
    const tops = run.map(p => p.top), hi = Math.max(...tops);
    if (hi - Math.min(...tops) > 0.45) continue;
    if (Math.abs(plats[j - 1].top - run[0].top) > STEP_UP - 0.1) continue;       // walk in, no jump into the beam
    const top = Math.max(hi, plats[j - 1].top);                                    // a sliding player on any of them passes under
    lasers.push({ i0: j, i1: j + 2, x0: run[0].x0 + 0.3, x1: run[2].x1 - 0.3, y: top + LASER_UP });
    last = j;
  }
  const inLaser = (i: number) => lasers.some(l => i >= l.i0 - 1 && i <= l.i1 + 1);

  // one of each: a jetpack before the biggest rally, a stop-loss before the biggest sell-off, an airdrop on the greenest
  // streak, and a FUD cloud (slows you for 3 s) at the start of the next-biggest rally
  const powers: Power[] = [], used: number[] = [];
  const special = (i: number) => i < 6 || i > n - 5 || evAt.has(i) || plats[i].doji || spikeAt.has(i) || near(i) || inLaser(i) || spring.has(i + 1);
  const add = (i: number, kind: Power['kind']) => {
    for (let j = i; j > Math.max(5, i - 6); j--) if (!special(j) && used.every(u => Math.abs(u - j) >= 14)) {
      used.push(j); powers.push({ i: j, x: plats[j].cx, y: plats[j].top + 1.25, kind }); return true;
    }
    return false;
  };
  const move = (i: number) => plats[Math.min(n - 1, i + 5)].top - plats[i].top;
  const by = (f: (i: number) => number) => [...Array(n - 6).keys()].map(i => i + 3).sort((a, b) => f(b) - f(a));
  const one = (order: number[], kind: Power['kind'], back: number) => { for (const i of order) if (add(i - back, kind)) return; };
  const rallies = by(move);
  one(rallies, 'moon', 1);
  one(by(i => -move(i)), 'shield', 1);
  one(by(i => plats.slice(i, i + 8).filter(p => p.up).length), 'magnet', 0);
  one(rallies, 'fud', 0);
  powers.sort((a, b) => a.i - b.i);
  const hasPow = new Set(used);

  // coins: on green candles you can walk through
  const coins: Coin[] = plats.filter(p => p.up && p.i % 3 === 1 && p.i > 2 && p.i < n - 1 && !spikeAt.has(p.i) && !p.doji && !inLaser(p.i) && !hasPow.has(p.i))
    .map(p => ({ i: p.i, x: p.cx, y: p.top + 1.0 }));

  // the volume floor sits a little under the nearby candles (fall in and you lose a heart)
  const raw = plats.map((_, i) => Math.min(...plats.slice(Math.max(0, i - 6), Math.min(n, i + 7)).map(p => p.bot)) - 3.2);
  const floor = raw.map((_, i) => {
    const w = raw.slice(Math.max(0, i - 2), Math.min(n, i + 3));
    return w.reduce((a, b) => a + b, 0) / w.length;
  });

  // the volume bars: the last-chance lane (quietest days are pits into the liquidation pool, loudest red days carry spikes)
  const vmax = Math.max(...k.map(a => a[5]));
  const sorted = k.map(a => a[5]).sort((a, b) => a - b), q = (f: number) => sorted[Math.floor(f * (n - 1))];
  const vol: Plat[] = plats.map((p, i) => {
    const bot = floor[i] - VOL_BASE;
    return { i, x0: p.x0, x1: p.x1, cx: p.cx, top: bot + 0.35 + (k[i][5] / vmax) * VOL_MAX, bot, up: p.up, doji: false, wickTop: 0, wickBot: 0 };
  });
  for (let i = 1; i < n; i++) if (vol[i].top - vol[i - 1].top > 1.7) vol[i].top = vol[i - 1].top + 1.7;   // every step stays jumpable
  for (let i = 5; i < n - 3; i++)
    if (k[i][5] <= q(0.08) && !vol[i - 1].pit && Math.abs(vol[i + 1].top - vol[i - 1].top) < 1.0) vol[i].pit = true;
  const volSpikes: Spike[] = [];
  for (let i = 5; i < n - 3; i++) {
    const v = vol[i];
    if (v.pit || p_up(i) || k[i][5] < q(0.85) || vol[i - 1].pit || vol[i + 1].pit || volSpikes.some(s => s.i === i - 1)) continue;
    if (Math.abs(vol[i - 1].top - v.top) > 0.6 || vol[i + 1].top - v.top > 0.6) continue;     // jumpable from both sides
    volSpikes.push({ i, x: v.cx, y0: v.top, y1: v.top + 0.95 });
  }
  function p_up(i: number) { return plats[i].up; }

  // round price levels for the chart grid (about two units apart)
  const pmax = Math.max(...k.map(a => a[2])), rawStep = Math.sqrt(p0 * pmax) * 1.9 / K, mag = 10 ** Math.floor(Math.log10(rawStep));
  const priceStep = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= rawStep) || 10 * mag;
  const prices: PriceLevel[] = [];
  for (let pr = Math.ceil(p0 / priceStep) * priceStep; pr <= pmax * 1.03; pr += priceStep) prices.push({ price: pr, y: lv(pr) });

  return {
    file, n, plats, spikes, lasers, springs, coins, floor, startX: plats[1].cx, finishX: plats[n - 1].x1 - 0.6,
    events, vmax, vol, volSpikes, powers, prices, priceStep,
  };
}

export const cellOf = (x: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(x / CELL)));
