import * as C from './constants.ts';
import { FLARE_R, cellOf, flareAt, type Level, type Plat, type PowerKind } from './level.ts';

export interface Input { left: boolean; right: boolean; jump: boolean; down: boolean }
export type Lane = 'top' | 'vol';
export interface Player {
  x: number; y: number; vx: number; vy: number; grounded: boolean; plat: number; coyote: number; buffer: number;
  sliding: boolean; slideT: number; launch: '' | 'jump' | 'spring'; cut: boolean; face: number; hearts: number;
  invuln: number; coins: number; lastSafe: number; best: number;
  lane: Lane; jet: number; slowFall: number; shield: boolean; magnet: number; lock: number; slow: number; downT: number;
}
export interface Chaser { x: number; v: number; started: boolean; taxedUpTo: number; wait: number }
export type EvType = 'jump' | 'land' | 'coin' | 'hit' | 'spring' | 'slide' | 'fall' | 'crumble' | 'event' | 'taxed' | 'broke' | 'won' | 'close'
  | 'power' | 'block' | 'jetend' | 'lastchance' | 'rescued';
export interface SimEvent { type: EvType; x: number; y: number; i: number; kind?: PowerKind }
export type State = 'play' | 'won' | 'taxed' | 'broke';
export interface Sim {
  lv: Level; t: number; p: Player; ch: Chaser; state: State; events: SimEvent[];
  gone: Float64Array; crumble: Float64Array; got: Uint8Array; gotPow: Uint8Array; gotVol: Uint8Array;
  prevJump: boolean; prevDown: boolean; shownEv: Uint8Array; closeWarned: boolean; hits: number; falls: number; minMargin: number;
  lastUsed: boolean; heart: { i: number; x: number; y: number; got: boolean } | null; cause: '' | 'hit' | 'fall' | 'pool';
}

export function newSim(lv: Level): Sim {
  const sp = lv.plats[1];
  return {
    lv, t: 0, state: 'play', events: [],
    p: { x: lv.startX, y: sp.top, vx: 0, vy: 0, grounded: true, plat: 1, coyote: 0, buffer: 0, sliding: false, slideT: 0, launch: '',
         cut: false, face: 1, hearts: C.HEARTS, invuln: 0, coins: 0, lastSafe: 1, best: 1, lane: 'top', jet: 0, slowFall: 0, shield: false, magnet: 0, lock: 0, slow: 0, downT: 0 },
    ch: { x: lv.startX - C.CHASER_START * C.CELL, v: 0, started: false, taxedUpTo: 0, wait: 0 },
    gone: new Float64Array(lv.n), crumble: new Float64Array(lv.n), got: new Uint8Array(lv.coins.length), gotPow: new Uint8Array(lv.powers.length), gotVol: new Uint8Array(lv.volCoins.length),
    prevJump: false, prevDown: false, shownEv: new Uint8Array(lv.events.length), closeWarned: false, hits: 0, falls: 0, minMargin: 1,
    lastUsed: false, heart: null, cause: '',
  };
}

const approach = (v: number, t: number, d: number) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
export const playerH = (p: Player) => (p.sliding ? C.P_H_SLIDE : C.P_H);
export const margin = (s: Sim) => Math.max(0, Math.min(1, (s.p.x - s.ch.x) / C.MARGIN_FULL));

/** the solid things the player can stand on in the current lane */
function solidNear(s: Sim, x: number) {
  const i = cellOf(x, s.lv.n), out: Plat[] = [], vol = s.p.lane === 'vol', arr = vol ? s.lv.vol : s.lv.plats;
  for (let j = Math.max(0, i - 1); j <= Math.min(s.lv.n - 1, i + 1); j++) {
    const q = arr[j];
    if (vol ? !q.pit : s.gone[j] <= 0) out.push(q);
  }
  return out;
}
function blockedAbove(s: Sim) {
  const p = s.p;
  for (const q of solidNear(s, p.x)) if (p.x + C.P_W / 2 > q.x0 && p.x - C.P_W / 2 < q.x1 && q.bot > p.y + 0.01 && q.bot < p.y + C.P_H) return true;
  if (p.lane === 'top') for (const l of s.lv.lasers) if (p.x + C.P_W / 2 > l.x0 && p.x - C.P_W / 2 < l.x1 && l.y - C.LASER_HALF < p.y + C.P_H && l.y > p.y) return true;
  return false;
}

/** out of hearts on the candles: drop into the volume (once per run), with a MARGIN TOP-UP heart 20 candles ahead */
export function enterVolume(s: Sim) {
  const p = s.p, lv = s.lv, n = lv.n;
  s.lastUsed = true; p.lane = 'vol'; p.hearts = 1; p.jet = 0; p.sliding = false; p.slowFall = 0; p.invuln = 1.2; p.launch = ''; p.shield = false;
  let r = cellOf(p.x, n);
  while (r < n - 2 && lv.vol[r].pit) r++;
  p.x = lv.vol[r].cx; p.vx = 0; p.vy = 0; p.grounded = false; p.plat = r; p.y = Math.max(p.y, lv.vol[r].top + 0.6); p.lock = 3;
  let h = Math.min(n - 2, r + C.LAST_HEART);
  while (h < n - 2 && lv.vol[h].pit) h++;
  s.heart = { i: h, x: lv.vol[h].cx, y: lv.vol[h].top + 1.1, got: false };
  s.ch.wait = C.LAST_GRACE;
}

/** one fixed step; its events are appended to s.events (the caller drains them) */
export function step(s: Sim, inp: Input, dt = C.DT) {
  if (s.state !== 'play') return;
  const p = s.p, lv = s.lv, n = lv.n;
  const emit = (type: EvType, i = p.plat, kind?: PowerKind) => s.events.push({ type, x: p.x, y: p.y, i, kind });
  const jumpEdge = inp.jump && !s.prevJump, downEdge = inp.down && !s.prevDown;
  s.prevJump = inp.jump; s.prevDown = inp.down;
  s.t += dt;
  // a heart lost: knock back, drop into the volume (once) or end the run; true when the run left the candles or ended
  const lose = (how: 'hit' | 'fall') => {
    p.hearts--;
    if (p.hearts > 0) return false;
    if (p.lane === 'top' && !s.lastUsed) { enterVolume(s); emit('lastchance'); return true; }
    s.state = 'broke'; s.cause = how; emit('broke');
    return true;
  };

  for (let i = 0; i < n; i++) if (s.gone[i] > 0 && (s.gone[i] -= dt) <= 0) { s.gone[i] = 0; s.crumble[i] = 0; }
  p.invuln = Math.max(0, p.invuln - dt);
  p.magnet = Math.max(0, p.magnet - dt);
  p.slow = Math.max(0, p.slow - dt);
  p.coyote = p.grounded ? C.COYOTE : Math.max(0, p.coyote - dt);
  p.buffer = jumpEdge ? C.BUFFER : Math.max(0, p.buffer - dt);

  const respawn = () => {
    let r = Math.max(p.lastSafe, cellOf(s.ch.x, n) + 3);
    while (r < n - 1 && (lv.plats[r].doji || s.gone[r] > 0)) r++;
    const q = lv.plats[r];
    p.x = q.cx; p.y = q.top; p.vx = 0; p.vy = 0; p.grounded = true; p.plat = r; p.invuln = 1.5; p.sliding = false;
  };
  const down = p.downT > 0 && p.lane === 'top';
  if (down) { p.downT -= dt; if (p.downT <= 0) { p.downT = 0; respawn(); } }
  if (down) { /* lying on the volume floor: no moving, no hazards, no pickups */ }
  else if (p.jet > 0) {                                       // 100x TO THE MOON: fly over the next candles
    p.jet -= dt;
    const ci = cellOf(p.x, n);
    let hi = -1e9;
    for (let j = ci; j <= Math.min(n - 1, ci + 5); j++) hi = Math.max(hi, lv.plats[j].top);
    p.vy = Math.max(-9, Math.min(13, (hi + C.JET_CLEAR - p.y) * 5));
    p.vx = (inp.left ? 0.4 : 1) * C.RUN_V * C.JET_V; p.face = 1;
    p.grounded = false; p.sliding = false; p.launch = 'spring';
    if (p.jet <= 0) { p.jet = 0; p.slowFall = 0.8; emit('jetend'); }
  } else if (p.lock > 0) {                                   // dropping into the volume: straight down, run once landed
    p.vx = 0; p.lock = p.grounded ? 0 : p.lock - dt;
    p.vy = Math.max(p.vy - C.GRAV * dt, -32);
  } else {
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (dir) p.face = dir;
    const top = C.RUN_V * (p.slow > 0 ? C.SLOW_F : 1);
    if (p.sliding) p.vx = p.face * Math.max(Math.min(Math.abs(p.vx), top), 0.85 * top);
    else if (dir) p.vx = approach(p.vx, dir * top, (p.grounded ? C.ACC_GROUND : C.ACC_AIR) * dt);
    else if (p.grounded) p.vx = approach(p.vx, 0, C.FRICTION * dt);
    if (inp.down && p.grounded && Math.abs(p.vx) > 1 && !p.sliding) { p.sliding = true; p.slideT = 0; if (downEdge) emit('slide'); }
    if (p.sliding) {
      p.slideT += dt;
      if (!((inp.down && p.slideT < C.SLIDE_MAX) || p.slideT < C.SLIDE_MIN || blockedAbove(s))) p.sliding = false;
    }
    if (p.buffer > 0 && p.coyote > 0 && !(p.sliding && blockedAbove(s))) {
      p.vy = C.JUMP_V; p.grounded = false; p.coyote = 0; p.buffer = 0; p.sliding = false; p.launch = 'jump'; p.cut = false; emit('jump');
    }
    if (p.launch === 'jump' && !inp.jump && p.vy > 0 && !p.cut) { p.vy *= 0.5; p.cut = true; }
    const slow = p.slowFall > 0;
    p.slowFall = Math.max(0, p.slowFall - dt);
    p.vy = Math.max(p.vy - C.GRAV * (slow ? 0.35 : 1) * dt, slow ? -9 : -32);
  }

  let ci = cellOf(p.x, n);
  if (!down) {
    // horizontal move: walk up small steps, stop at walls
    const h = playerH(p);
    let nx = p.x + p.vx * dt;
    for (const q of solidNear(s, nx)) {
      if (nx + C.P_W / 2 > q.x0 && nx - C.P_W / 2 < q.x1 && p.y < q.top - 1e-3 && p.y + h > q.bot + 1e-3) {
        const rise = q.top - p.y;
        if (rise <= C.STEP_UP && p.vy <= 2) { p.y = q.top; p.vy = Math.max(p.vy, 0); }
        else { nx = p.vx > 0 ? q.x0 - C.P_W / 2 - 1e-4 : q.x1 + C.P_W / 2 + 1e-4; p.vx = 0; }
      }
    }
    p.x = Math.max(0.5, nx);

    // vertical move: land on tops, bump heads on bottoms
    const was = p.grounded;
    let ny = p.y + p.vy * dt;
    p.grounded = false;
    for (const q of solidNear(s, p.x)) {
      if (!(p.x + C.P_W / 2 > q.x0 && p.x - C.P_W / 2 < q.x1)) continue;
      if (p.vy <= 0 && p.y >= q.top - 2e-3 && ny <= q.top) { ny = q.top; p.vy = 0; p.grounded = true; p.plat = q.i; p.launch = ''; }
      else if (p.vy > 0 && p.y + h <= q.bot + 2e-3 && ny + h > q.bot) { ny = q.bot - h; p.vy = 0; }
    }
    p.y = ny;
    if (p.grounded && !was) emit('land');

    if (p.grounded && p.lane === 'top') {
      const q = lv.plats[p.plat];
      if (q.doji) {
        if ((s.crumble[p.plat] += dt) >= C.CRUMBLE_T && s.gone[p.plat] <= 0) { s.gone[p.plat] = C.CRUMBLE_BACK; emit('crumble'); }
      } else p.lastSafe = p.plat;
      for (const sp of lv.springs) if (sp.i === p.plat && p.x > sp.x - 0.75) {         // the pad and everything right of it
        p.vy = sp.v; p.grounded = false; p.launch = 'spring'; p.sliding = false; emit('spring');
      }
    }

    // hazards: stop-hunt wicks and resistance lasers on the candles, liquidation spikes in the volume
    ci = cellOf(p.x, n);
    if (p.invuln <= 0 && p.jet <= 0) {
      let hit = false;
      const touch = (x: number, y0: number, y1: number) => Math.abs(p.x - x) < (C.P_W + C.SPIKE_W) / 2 && p.y < y1 && p.y + h > y0;
      if (p.lane === 'top') {
        for (const sp of lv.spikes) if (Math.abs(sp.i - ci) <= 1 && touch(sp.x, sp.y0, sp.y1)) hit = true;
        for (const l of lv.lasers) if (p.x + C.P_W / 2 > l.x0 && p.x - C.P_W / 2 < l.x1 && p.y < l.y + C.LASER_HALF && p.y + h > l.y - C.LASER_HALF) hit = true;
      } else {
        for (const sp of lv.volSpikes) if (Math.abs(sp.i - ci) <= 1 && touch(sp.x, sp.y0, sp.y1)) hit = true;
        for (let j = ci - 1; j <= ci + 1; j++) {                // liquidation flares out of the pits
          const fy = flareAt(lv, j, s.t);
          if (fy !== null && Math.abs(p.x - lv.vol[j].cx) < FLARE_R + C.P_W / 2 && fy > p.y - FLARE_R && fy < p.y + h + FLARE_R) hit = true;
        }
      }
      if (hit && p.shield) { p.shield = false; p.invuln = C.INVULN; p.vy = Math.max(p.vy, 4); emit('block'); }
      else if (hit) {
        s.hits++; p.invuln = C.INVULN; p.vx = -2 * p.face; p.vy = 5; p.grounded = false; p.sliding = false; p.launch = 'spring';
        emit('hit');
        if (lose('hit') && s.state !== 'play') return;
      }
    }

    if (p.lane === 'top' && p.y < lv.floor[ci] - 1.0) {       // fell to the volume floor: lie there a moment, then get back up
      s.falls++;
      const v = lv.vol[ci];
      p.y = v.pit ? v.bot + 0.15 : v.top; p.vx = 0; p.vy = 0; p.grounded = false; p.sliding = false; p.jet = 0;
      emit('fall');
      if (lose('fall')) { if (s.state !== 'play') return; }    // the third heart: the last chance starts right here
      else { p.downT = C.DOWN_T; p.invuln = 2.2; }
    }
    if (p.lane === 'vol' && p.y < lv.vol[ci].bot + 0.15) {    // into the liquidation pool: the last life is gone
      s.state = 'broke'; s.cause = 'pool'; emit('broke');
      return;
    }

    const hNow = playerH(p);
    lv.coins.forEach((c, j) => {
      if (s.got[j]) return;
      const reach = p.magnet > 0 ? Math.hypot(c.x - p.x, c.y - (p.y + hNow / 2)) < C.MAGNET_R : Math.abs(c.x - p.x) < 0.75 && c.y > p.y - 0.4 && c.y < p.y + hNow + 0.4;
      if (reach) { s.got[j] = 1; p.coins++; s.events.push({ type: 'coin', x: c.x, y: c.y, i: j }); }
    });
    if (p.lane === 'vol') lv.volCoins.forEach((c, j) => {     // insurance-fund coins in the volume
      if (s.gotVol[j] || Math.abs(c.x - p.x) > 0.75 || c.y < p.y - 0.4 || c.y > p.y + hNow + 0.4) return;
      s.gotVol[j] = 1; p.coins++; s.events.push({ type: 'coin', x: c.x, y: c.y, i: -1 });
    });
    if (p.lane === 'top') lv.powers.forEach((w, j) => {
      if (s.gotPow[j] || Math.abs(w.x - p.x) > 0.9 || w.y < p.y - 0.5 || w.y > p.y + hNow + 0.6) return;
      s.gotPow[j] = 1;
      if (w.kind === 'moon') { p.jet = C.JET_T; p.slowFall = 0; p.sliding = false; }
      else if (w.kind === 'shield') p.shield = true;
      else if (w.kind === 'fud') p.slow = C.SLOW_T;
      else p.magnet = C.MAGNET_T;
      s.events.push({ type: 'power', x: w.x, y: w.y, i: j, kind: w.kind });
    });
    if (p.lane === 'vol' && s.heart && !s.heart.got && Math.abs(s.heart.x - p.x) < 0.95 && s.heart.y > p.y - 0.5 && s.heart.y < p.y + hNow + 0.7) {
      s.heart.got = true; p.lane = 'top';                       // MARGIN TOP-UP: back onto the candles with one heart
      let r = Math.min(n - 1, ci + 1);
      while (r < n - 1 && lv.plats[r].doji) r++;
      const q = lv.plats[r];
      p.x = q.cx; p.y = q.top; p.vx = C.RUN_V * 0.5; p.vy = 0; p.grounded = true; p.plat = r; p.lastSafe = r; p.invuln = 2; p.hearts = 1;
      s.ch.x = Math.min(s.ch.x, p.x - 3 * C.CELL);
      emit('rescued');
    }
  }
  p.best = Math.max(p.best, ci);

  const ch = s.ch;
  if (ch.wait > 0) ch.wait -= dt;
  else if (!ch.started) ch.started = s.t >= C.CHASER_GRACE;
  else {
    const red = !lv.plats[cellOf(ch.x, n)].up;
    const pull = 1 + Math.max(0, Math.min(1, (p.x - ch.x - C.CHASER_LEASH) / C.CHASER_LEASH)) * 0.9;
    ch.v = C.CHASER_V * (red ? C.CHASER_RED : C.CHASER_GREEN) * pull * (p.lane === 'vol' ? 0.75 : 1);   // slower while you are in the volume
    ch.x += ch.v * dt;
    while (ch.taxedUpTo < n && lv.plats[ch.taxedUpTo].cx < ch.x) ch.taxedUpTo++;
  }
  const m = margin(s);
  s.minMargin = Math.min(s.minMargin, m);
  if (m < 0.3 && !s.closeWarned) { s.closeWarned = true; emit('close'); }
  if (m > 0.5) s.closeWarned = false;
  if (ch.x >= p.x - 0.9) { s.state = 'taxed'; emit('taxed'); return; }

  lv.events.forEach((e, k) => { if (!s.shownEv[k] && ci >= e.idx - 5 && ci <= e.idx + 3) { s.shownEv[k] = 1; emit('event', k); } });
  if (p.lane === 'top' && p.grounded && p.plat === n - 1 && p.x >= lv.finishX) { s.state = 'won'; emit('won'); }
}
