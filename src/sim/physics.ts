import * as C from './constants.ts';
import { cellOf, type Level } from './level.ts';

export interface Input { left: boolean; right: boolean; jump: boolean; down: boolean }
export interface Player {
  x: number; y: number; vx: number; vy: number; grounded: boolean; plat: number; coyote: number; buffer: number;
  sliding: boolean; slideT: number; launch: '' | 'jump' | 'spring'; cut: boolean; face: number; hearts: number;
  invuln: number; coins: number; lastSafe: number; best: number;
}
export interface Chaser { x: number; v: number; started: boolean; taxedUpTo: number }
export type EvType = 'jump' | 'land' | 'coin' | 'hit' | 'spring' | 'slide' | 'fall' | 'crumble' | 'event' | 'taxed' | 'broke' | 'won' | 'close';
export interface SimEvent { type: EvType; x: number; y: number; i: number }
export type State = 'play' | 'won' | 'taxed' | 'broke';
export interface Sim {
  lv: Level; t: number; p: Player; ch: Chaser; state: State; events: SimEvent[];
  gone: Float64Array; crumble: Float64Array; got: Uint8Array;
  prevJump: boolean; prevDown: boolean; eventShown: boolean; closeWarned: boolean; hits: number; falls: number; minMargin: number;
}

export function newSim(lv: Level): Sim {
  const sp = lv.plats[1];
  return {
    lv, t: 0, state: 'play', events: [],
    p: { x: lv.startX, y: sp.top, vx: 0, vy: 0, grounded: true, plat: 1, coyote: 0, buffer: 0, sliding: false, slideT: 0, launch: '',
         cut: false, face: 1, hearts: C.HEARTS, invuln: 0, coins: 0, lastSafe: 1, best: 1 },
    ch: { x: lv.startX - C.CHASER_START * C.CELL, v: 0, started: false, taxedUpTo: 0 },
    gone: new Float64Array(lv.n), crumble: new Float64Array(lv.n), got: new Uint8Array(lv.coins.length),
    prevJump: false, prevDown: false, eventShown: false, closeWarned: false, hits: 0, falls: 0, minMargin: 1,
  };
}

const approach = (v: number, t: number, d: number) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
export const playerH = (p: Player) => (p.sliding ? C.P_H_SLIDE : C.P_H);
export const margin = (s: Sim) => Math.max(0, Math.min(1, (s.p.x - s.ch.x) / C.MARGIN_FULL));

function solidNear(s: Sim, x: number) {
  const i = cellOf(x, s.lv.n), out = [];
  for (let j = Math.max(0, i - 1); j <= Math.min(s.lv.n - 1, i + 1); j++) if (s.gone[j] <= 0) out.push(s.lv.plats[j]);
  return out;
}
function blockedAbove(s: Sim) {
  const p = s.p;
  for (const q of solidNear(s, p.x)) if (p.x + C.P_W / 2 > q.x0 && p.x - C.P_W / 2 < q.x1 && q.bot > p.y + 0.01 && q.bot < p.y + C.P_H) return true;
  for (const l of s.lv.lasers) if (p.x + C.P_W / 2 > l.x0 && p.x - C.P_W / 2 < l.x1 && l.y - C.LASER_HALF < p.y + C.P_H && l.y > p.y) return true;
  return false;
}

/** One fixed step. Events of the step are appended to s.events (the caller drains them). */
export function step(s: Sim, inp: Input, dt = C.DT) {
  if (s.state !== 'play') return;
  const p = s.p, lv = s.lv, n = lv.n;
  const emit = (type: EvType, i = p.plat) => s.events.push({ type, x: p.x, y: p.y, i });
  const jumpEdge = inp.jump && !s.prevJump, downEdge = inp.down && !s.prevDown;
  s.prevJump = inp.jump; s.prevDown = inp.down;
  s.t += dt;

  for (let i = 0; i < n; i++) if (s.gone[i] > 0 && (s.gone[i] -= dt) <= 0) { s.gone[i] = 0; s.crumble[i] = 0; }
  p.invuln = Math.max(0, p.invuln - dt);
  p.coyote = p.grounded ? C.COYOTE : Math.max(0, p.coyote - dt);
  p.buffer = jumpEdge ? C.BUFFER : Math.max(0, p.buffer - dt);

  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (dir) p.face = dir;
  if (p.sliding) p.vx = p.face * Math.max(Math.abs(p.vx), 0.85 * C.RUN_V);
  else if (dir) p.vx = approach(p.vx, dir * C.RUN_V, (p.grounded ? C.ACC_GROUND : C.ACC_AIR) * dt);
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
  p.vy = Math.max(p.vy - C.GRAV * dt, -32);

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

  if (p.grounded) {
    const q = lv.plats[p.plat];
    if (q.doji) {
      if ((s.crumble[p.plat] += dt) >= C.CRUMBLE_T && s.gone[p.plat] <= 0) { s.gone[p.plat] = C.CRUMBLE_BACK; emit('crumble'); }
    } else p.lastSafe = p.plat;
    for (const sp of lv.springs) if (sp.i === p.plat && p.x > sp.x - 0.75) {         // the pad and everything right of it
      p.vy = sp.v; p.grounded = false; p.launch = 'spring'; p.sliding = false; emit('spring');
    }
  }

  const ci = cellOf(p.x, n);
  if (p.invuln <= 0) {
    let hit = false;
    for (const sp of lv.spikes) if (Math.abs(sp.i - ci) <= 1 && Math.abs(p.x - sp.x) < (C.P_W + C.SPIKE_W) / 2 && p.y < sp.y1 && p.y + h > sp.y0) hit = true;
    for (const l of lv.lasers) if (p.x + C.P_W / 2 > l.x0 && p.x - C.P_W / 2 < l.x1 && p.y < l.y + C.LASER_HALF && p.y + h > l.y - C.LASER_HALF) hit = true;
    if (hit) {
      p.hearts--; s.hits++; p.invuln = C.INVULN; p.vx = -2 * p.face; p.vy = 5; p.grounded = false; p.sliding = false; p.launch = 'spring';
      emit('hit');
      if (p.hearts <= 0) { s.state = 'broke'; emit('broke'); return; }
    }
  }

  if (p.y < lv.floor[ci] - 1.0) {                       // fell to the volume floor
    p.hearts--; s.falls++; emit('fall');
    if (p.hearts <= 0) { s.state = 'broke'; emit('broke'); return; }
    let r = Math.max(p.lastSafe, cellOf(s.ch.x, n) + 3);
    while (r < n - 1 && (lv.plats[r].doji || s.gone[r] > 0)) r++;
    const q = lv.plats[r];
    p.x = q.cx; p.y = q.top; p.vx = 0; p.vy = 0; p.grounded = true; p.plat = r; p.invuln = 1.5; p.sliding = false;
  }

  lv.coins.forEach((c, j) => {
    if (!s.got[j] && Math.abs(c.x - p.x) < 0.75 && c.y > p.y - 0.4 && c.y < p.y + h + 0.4) { s.got[j] = 1; p.coins++; s.events.push({ type: 'coin', x: c.x, y: c.y, i: j }); }
  });
  p.best = Math.max(p.best, ci);

  const ch = s.ch;
  if (!ch.started) ch.started = s.t >= C.CHASER_GRACE;
  else {
    const red = !lv.plats[cellOf(ch.x, n)].up;
    const pull = 1 + Math.max(0, Math.min(1, (p.x - ch.x - C.CHASER_LEASH) / C.CHASER_LEASH)) * 0.9;
    ch.v = C.CHASER_V * (red ? C.CHASER_RED : C.CHASER_GREEN) * pull;
    ch.x += ch.v * dt;
    while (ch.taxedUpTo < n && lv.plats[ch.taxedUpTo].cx < ch.x) ch.taxedUpTo++;
  }
  const m = margin(s);
  s.minMargin = Math.min(s.minMargin, m);
  if (m < 0.3 && !s.closeWarned) { s.closeWarned = true; emit('close'); }
  if (m > 0.5) s.closeWarned = false;
  if (ch.x >= p.x - 0.9) { s.state = 'taxed'; emit('taxed'); return; }

  if (!s.eventShown && lv.eventIdx >= 0 && ci >= lv.eventIdx - 5) { s.eventShown = true; emit('event', lv.eventIdx); }
  if (p.grounded && p.plat === n - 1 && p.x >= lv.finishX) { s.state = 'won'; emit('won'); }
}
