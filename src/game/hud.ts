// The HUD over the 3D view: stats, minimap, margin bar, the event card, speech bubbles, toasts.
import { cellOf, type Level } from '../sim/level.ts';
import { margin, type Sim } from '../sim/physics.ts';
import { eventCard } from './art2d.ts';
import type { World } from './world.ts';

const $ = (id: string) => document.getElementById(id)!;
const fmt = (p: number) => Math.round(p).toLocaleString('en-US');
export const dayStr = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export class Hud {
  private mini = $('mini') as HTMLCanvasElement; private base: HTMLCanvasElement; private toastT = 0; private sayT = 0; private evT = 0;
  private sayText = ''; private lastHearts = -1; private lastCoins = -1; private lastCell = -1;

  constructor(private lv: Level, private world: World) {
    const f = lv.file;
    $('pair').textContent = `${f.pair}  ·  1D`;
    $('sub').textContent = `LEVEL 1  ·  ${f.candles.length} daily candles  ·  ${dayStr(f.candles[0][0])} → ${dayStr(f.candles[f.candles.length - 1][0])}`;
    this.base = document.createElement('canvas'); this.base.width = this.mini.width; this.base.height = this.mini.height;
    const g = this.base.getContext('2d')!, k = f.candles, W = this.base.width, H = this.base.height;
    const lo = Math.min(...k.map(a => a[3])), hi = Math.max(...k.map(a => a[2])), cw = (W - 30) / k.length, y = (p: number) => 8 + (H - 22) * (1 - (p - lo) / (hi - lo));
    g.fillStyle = 'rgba(20,30,60,0.55)'; g.fillRect(0, 0, W, H);
    k.forEach((a, i) => {
      g.fillStyle = a[4] >= a[1] ? '#5fe39a' : '#ff7a80';
      g.fillRect(8 + i * cw + cw * 0.35, y(a[2]), Math.max(1, cw * 0.3), y(a[3]) - y(a[2]));
      g.fillRect(8 + i * cw, y(Math.max(a[1], a[4])), Math.max(1.2, cw * 0.8), Math.max(1.2, y(Math.min(a[1], a[4])) - y(Math.max(a[1], a[4]))));
    });
    if (f.event) { g.fillStyle = '#ffd84d'; g.font = '900 14px sans-serif'; g.textAlign = 'center'; g.fillText('★', 8 + f.event.idx * cw + cw / 2, H - 2); }
    g.fillStyle = '#fff'; g.fillRect(W - 20, 4, 2, H - 8); g.fillStyle = '#ffd84d'; g.fillRect(W - 18, 4, 12, 8);
    if (f.event) {
      const c = $('evc') as HTMLCanvasElement;
      c.getContext('2d')!.drawImage(eventCard(f.event, f.candles[f.event.idx]), 0, 0);
      $('evcredit').textContent = f.event.sound_credit || '';
    }
  }

  update(s: Sim) {
    const p = s.p, lv = this.lv, n = lv.n, ci = cellOf(p.x, n), k = lv.file.candles;
    if (p.hearts !== this.lastHearts) { $('hearts').textContent = '♥'.repeat(Math.max(0, p.hearts)) + '♡'.repeat(Math.max(0, 3 - p.hearts)); this.lastHearts = p.hearts; }
    if (p.coins !== this.lastCoins) { $('coins').textContent = `◎ ${p.coins}`; this.lastCoins = p.coins; }
    if (ci !== this.lastCell) { $('where').textContent = `candle ${ci + 1} / ${n}  ·  ${dayStr(k[ci][0])}  ·  close ${fmt(k[ci][4])}`; this.lastCell = ci; }
    const m = Math.round(margin(s) * 100), bar = $('mfill'), box = bar.parentElement!;
    bar.style.width = `${Math.max(3, m)}%`;
    bar.style.background = m < 30 ? 'var(--red)' : m < 55 ? 'var(--amber)' : 'var(--green)';
    box.classList.toggle('danger', m < 30 && s.state === 'play');
    $('mtext').textContent = `MARGIN LEVEL ${m}%${m < 30 ? '  ·  DANGER' : ''}`;
    // minimap
    const g = this.mini.getContext('2d')!, W = this.mini.width, H = this.mini.height, cw = (W - 30) / n;
    g.clearRect(0, 0, W, H); g.drawImage(this.base, 0, 0);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(8 + Math.max(0, ci - 6) * cw, 0, 13 * cw, H);
    const tx = 8 + Math.max(0, s.ch.x / 3) * cw;
    g.fillStyle = '#c2185b'; g.beginPath(); g.arc(tx, H - 9, 5, 0, 7); g.fill();
    const px = 8 + (p.x / 3) * cw;
    g.fillStyle = '#ffd84d'; g.beginPath(); g.moveTo(px, 12); g.lineTo(px - 7, 1); g.lineTo(px + 7, 1); g.closePath(); g.fill();
    // her speech bubble follows her head; an arrow at the left edge when she is off screen
    const head = this.world.toScreen(s.ch.x, this.world.tax.root.position.y + 4.4, 0.2);
    const bub = $('bubble');
    bub.classList.toggle('on', this.sayT > 0 && head.on);
    if (this.sayT > 0) { bub.style.left = `${head.x}px`; bub.style.top = `${head.y}px`; bub.textContent = this.sayText; }
    const off = $('offscreen'), behind = Math.max(0, Math.round((p.x - s.ch.x) / 3));
    off.classList.toggle('on', !head.on && s.ch.x < p.x && s.state === 'play');
    off.textContent = `◀ TAXARAMAN · ${behind} candles behind`;
  }

  tick(dt: number) {
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) $('toast').classList.remove('on');
    if (this.sayT > 0) this.sayT -= dt;
    if (this.evT > 0 && (this.evT -= dt) <= 0) $('eventcard').classList.remove('on');
  }
  toast(text: string, secs = 1.1) { const t = $('toast'); t.textContent = text; t.classList.add('on'); this.toastT = secs; }
  say(text: string, secs = 3) { this.sayText = text; this.sayT = secs; }
  showEvent(secs = 9) { if (this.lv.file.event) { $('eventcard').classList.add('on'); this.evT = secs; } }
  hideEvent() { $('eventcard').classList.remove('on'); this.evT = 0; }
  count(text: string) { $('count').textContent = text; }
  quiet() { this.sayT = 0; $('bubble').classList.remove('on'); $('offscreen').classList.remove('on'); }
  reset() { this.toastT = this.sayT = 0; this.hideEvent(); $('toast').classList.remove('on'); $('bubble').classList.remove('on'); this.lastHearts = this.lastCoins = this.lastCell = -1; }
}
