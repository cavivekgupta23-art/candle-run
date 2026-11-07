// A careful but ordinary player: holds right, jumps spikes, steps and pits, slides under lasers.
// Used by tools/check_level.ts (to prove a level can be finished) and by the game's ?bot=1 autopilot (screenshots, trailers).
import * as C from './constants.ts';
import type { Level } from './level.ts';
import type { Input, Sim } from './physics.ts';

export function bot(lv: Level, s: Sim): Input {
  const p = s.p, ahead = p.x + C.P_W / 2;
  if (p.jet > 0) return { left: false, right: true, jump: false, down: false };
  let jump = false, down = false;
  if (p.lane === 'vol') {
    if (p.grounded) {
      const a = lv.vol[p.plat], b = lv.vol[p.plat + 1];
      if (b) {
        const d = b.x0 - ahead;
        if (b.pit) { if (d < 0.85) jump = true; }
        else if (b.top - a.top > C.STEP_UP - 0.05 && d > 0 && d < 2.4) jump = true;
      }
      for (const sp of lv.volSpikes) { const dd = sp.x - ahead; if (dd > 0.7 && dd < 1.9) jump = true; }
    }
    return { left: false, right: true, jump: jump || (!p.grounded && p.vy > 0 && p.launch === 'jump'), down: false };
  }
  for (const l of lv.lasers) if (ahead > l.x0 - 1.7 && p.x - C.P_W / 2 < l.x1 + 0.1) down = true;
  if (!down && p.grounded) {
    for (const sp of lv.spikes) { const d = sp.x - ahead; if (d > 0.7 && d < 1.9) jump = true; }
    const cur = lv.plats[p.plat], nxt = lv.plats[p.plat + 1];
    if (nxt) {
      const rise = nxt.top - cur.top, d = nxt.x0 - ahead;
      if (rise > C.STEP_UP - 0.05 && rise <= C.SPRING_RISE + 0.01 && d > 0 && d < 2.4) jump = true;
      if (nxt.doji && s.gone[nxt.i] > 0 && d < 1.2) jump = true;
    }
  }
  return { left: false, right: true, jump: jump || (!p.grounded && p.vy > 0 && p.launch === 'jump'), down };
}
