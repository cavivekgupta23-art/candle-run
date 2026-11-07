// The HUD over the 3D view: stats, minimap, margin bar, chart axes (price, days, crosshair), power-ups, the event card,
// speech bubbles, toasts and the last-chance warning.
import { K } from '../sim/constants.ts';
import { cellOf, type Level } from '../sim/level.ts';
import { margin, type Sim } from '../sim/physics.ts';
import { eventMini } from './art2d.ts';
import type { World } from './world.ts';

const $ = (id: string) => document.getElementById(id)!;
const fmt = (p: number) => Math.round(p).toLocaleString('en-US');
const fmtP = (p: number) => p.toLocaleString('en-US', { maximumFractionDigits: p >= 100 ? 0 : p >= 1 ? 2 : 4 });
export const dayStr = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayShort = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export class Hud {
  private mini = $('mini') as HTMLCanvasElement; private axes = $('axes') as HTMLCanvasElement; private base: HTMLCanvasElement;
  private toastT = 0; private sayT = 0; private evT = 0; private sayText = ''; private lastHearts = ''; private lastCoins = -1; private lastCell = -1;
  private powKey = ''; private p0: number; private spotK = -1;

  constructor(private lv: Level, private world: World) {
    const f = lv.file;
    this.p0 = lv.prices.length ? lv.prices[0].price / Math.exp(lv.prices[0].y / K) : 1;
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
    g.fillStyle = '#ffd84d'; g.font = '900 14px sans-serif'; g.textAlign = 'center';
    for (const ev of lv.events) g.fillText('★', 8 + ev.idx * cw + cw / 2, H - 2);
    g.fillStyle = '#fff'; g.fillRect(W - 20, 4, 2, H - 8); g.fillStyle = '#ffd84d'; g.fillRect(W - 18, 4, 12, 8);
  }

  update(s: Sim) {
    const p = s.p, lv = this.lv, n = lv.n, ci = cellOf(p.x, n), k = lv.file.candles, vol = p.lane === 'vol';
    const hearts = vol ? 'LAST ♥' : '♥'.repeat(Math.max(0, p.hearts)) + '♡'.repeat(Math.max(0, 3 - p.hearts));
    if (hearts !== this.lastHearts) { $('hearts').textContent = hearts; this.lastHearts = hearts; }
    if (p.coins !== this.lastCoins) { $('coins').textContent = `◎ ${p.coins}`; this.lastCoins = p.coins; }
    if (ci !== this.lastCell) { $('where').textContent = `candle ${ci + 1} / ${n}  ·  ${dayStr(k[ci][0])}  ·  close ${fmt(k[ci][4])}`; this.lastCell = ci; }
    const m = Math.round(margin(s) * 100), bar = $('mfill'), box = bar.parentElement!;
    bar.style.width = `${Math.max(3, m)}%`;
    bar.style.background = vol ? '#b91c1c' : m < 30 ? 'var(--red)' : m < 55 ? 'var(--amber)' : 'var(--green)';
    box.classList.toggle('danger', (m < 30 || vol) && s.state === 'play');
    $('mtext').textContent = vol && s.heart
      ? `LAST CHANCE · 1 LIFE · MARGIN TOP-UP ♥ in ${Math.max(0, s.heart.i - ci)} candles`
      : `MARGIN LEVEL ${m}%${m < 30 ? '  ·  DANGER' : ''}`;
    $('danger').classList.toggle('on', vol && s.state === 'play');
    // power-ups in use
    const chips = [p.jet > 0 ? `🚀 TO THE MOON ${p.jet.toFixed(1)}s` : '', p.shield ? '🛡️ STOP-LOSS SET' : '', p.magnet > 0 ? `🧲 AIRDROP ${p.magnet.toFixed(1)}s` : '',
      p.slow > 0 ? `😱 FUD: SLOWED ${p.slow.toFixed(1)}s` : ''].filter(Boolean);
    const key = chips.join('|');
    if (key !== this.powKey) { $('pow').innerHTML = chips.map(c => `<span>${c}</span>`).join(''); this.powKey = key; }
    // minimap
    const g = this.mini.getContext('2d')!, W = this.mini.width, H = this.mini.height, cw = (W - 30) / n;
    g.clearRect(0, 0, W, H); g.drawImage(this.base, 0, 0);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(8 + Math.max(0, ci - 6) * cw, 0, 13 * cw, H);
    g.fillStyle = '#c2185b'; g.beginPath(); g.arc(8 + Math.max(0, s.ch.x / 3) * cw, H - 9, 5, 0, 7); g.fill();
    const px = 8 + (p.x / 3) * cw;
    g.fillStyle = vol ? '#ff3b3b' : '#ffd84d'; g.beginPath(); g.moveTo(px, 12); g.lineTo(px - 7, 1); g.lineTo(px + 7, 1); g.closePath(); g.fill();
    // her speech bubble follows her head; a tag at the left edge when she is off screen
    const head = this.world.toScreen(s.ch.x, this.world.tax.root.position.y + 4.4, 0.2);
    const bub = $('bubble');
    bub.classList.toggle('on', this.sayT > 0 && head.on);
    if (this.sayT > 0) { bub.style.left = `${head.x}px`; bub.style.top = `${head.y}px`; bub.textContent = this.sayText; }
    const off = $('offscreen'), behind = Math.max(0, Math.round((p.x - s.ch.x) / 3));
    off.classList.toggle('on', !head.on && s.ch.x < p.x && s.state === 'play');
    off.textContent = `◀ TAXARAMAN · ${behind} candles behind`;
    this.drawAxes(s, ci);
    // the event spotlight follows its box while the camera moves in
    const r = this.spotK >= 0 ? this.world.hlRect(this.spotK) : null;
    if (r) {
      const sp = $('spot'), co = $('callout'), pad = 10, cw = co.offsetWidth, ch = co.offsetHeight, H = innerHeight;
      Object.assign(sp.style, { left: `${r.x - pad}px`, top: `${r.y - pad}px`, width: `${r.w + pad * 2}px`, height: `${r.h + pad * 2}px` });
      // the move goes over the box (never over the card); under it if there is no room above; inside its top edge if neither fits
      const cx = Math.min(innerWidth - cw / 2 - 8, Math.max(cw / 2 + 8, r.x + r.w / 2)), card = $('eventcard').getBoundingClientRect();
      const lim = cx + cw / 2 > card.left && cx - cw / 2 < card.right ? card.bottom + 8 : 8;
      this.world.topPx = innerWidth < H ? card.bottom + 8 + ch + pad + 12 : 0;   // phone held upright: frame the box under card + move
      const above = r.y - pad - 12 - ch >= lim, under = r.y + r.h + pad + 12 + ch <= H - 8;
      co.classList.toggle('below', !above);
      co.style.left = `${cx}px`;
      co.style.top = `${above ? r.y - pad - 12 : under ? r.y + r.h + pad + 12 : Math.max(lim, r.y + 8)}px`;
    }
  }

  /** the event spotlight: everything but event box k goes dark and the move is written big over it (-1 = off) */
  spot(k: number) {
    const b = this.world.hlBox[k], ev = k < this.lv.events.length ? this.lv.events[k] : this.lv.zoneEvent;
    this.spotK = b ? k : -1; if (!b) this.world.topPx = 0;
    $('spot').classList.toggle('on', !!b); $('callout').classList.toggle('on', !!b);
    if (!b) return;
    const dn = b.chg < 0, flat = Math.abs(b.chg) < 0.5, pct = `${dn ? '−' : '+'}${Math.abs(b.chg).toFixed(1)}%`, when = b.days > 1 ? `IN ${b.days} DAYS` : 'THAT DAY';
    for (const id of ['spot', 'callout']) { $(id).classList.toggle('dn', dn && !flat); $(id).classList.toggle('flat', flat); }
    $('cotag').textContent = ev?.tag || ev?.name || '';
    $('comove').textContent = flat ? `FLAT ${when} (${pct})` : `${dn ? '▼' : '▲'} ${pct} ${when}`;
  }

  /** the chart around the runner: price labels on the right, days along the bottom, a crosshair with the runner's price and day */
  private drawAxes(s: Sim, ci: number) {
    const c = this.axes, dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d')!, w = this.world, lv = this.lv, p = s.p, k = lv.file.candles, small = W < 760;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const top = small ? 104 : 128, bot = H - (small ? 26 : 44), axW = small ? 58 : 70;
    g.font = `600 ${small ? 11 : 12}px "Space Grotesk", sans-serif`; g.textBaseline = 'middle';
    // price axis
    g.textAlign = 'right';
    for (const pr of lv.prices) {
      const sp = w.toScreen(w.camX + 11, pr.y, -1.6);
      if (sp.y < top || sp.y > bot - 30) continue;
      g.fillStyle = 'rgba(20,30,60,0.55)'; g.fillRect(W - axW, sp.y - 9, axW - 4, 18);
      g.fillStyle = '#e2e8f0'; g.fillText(fmtP(pr.price), W - 9, sp.y);
    }
    // crosshair and the runner's tags
    const ps = w.toScreen(p.x, p.y, 0), up = k[ci][4] >= k[ci][1];
    g.setLineDash([5, 5]); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(ps.x, top - 30); g.lineTo(ps.x, bot - 22); g.moveTo(ps.x + 14, ps.y); g.lineTo(W - axW, ps.y); g.stroke(); g.setLineDash([]);
    const tag = p.lane === 'vol' ? `VOL ${k[ci][5] >= 1000 ? (k[ci][5] / 1000).toFixed(1) + 'k' : fmt(k[ci][5])}` : fmtP(Math.round(this.p0 * Math.exp(p.y / K)));
    g.fillStyle = p.lane === 'vol' ? '#b91c1c' : up ? '#26a69a' : '#ef5350'; g.fillRect(W - axW - 4, ps.y - 10, axW, 20);
    g.fillStyle = '#ffffff'; g.font = `800 ${small ? 11 : 12}px "Space Grotesk", sans-serif`; g.fillText(tag, W - 9, ps.y);
    // days along the bottom
    g.fillStyle = 'rgba(20,30,60,0.45)'; g.fillRect(0, bot - 22, W - axW, 22);
    g.textAlign = 'center'; g.font = `600 ${small ? 11 : 12}px "Space Grotesk", sans-serif`; g.fillStyle = '#cbd5e1';
    for (let i = Math.max(0, ci - 12); i <= Math.min(lv.n - 1, ci + 16); i++) {
      if (i % 5) continue;
      const sx = w.toScreen(lv.plats[i].cx, p.y, -1.6).x;
      if (sx > 30 && sx < W - axW - 30 && Math.abs(sx - ps.x) > 52) g.fillText(dayShort(k[i][0]), sx, bot - 11);
    }
    const label = dayStr(k[ci][0]), tw = g.measureText(label).width + 16;
    g.fillStyle = '#0f172a'; g.fillRect(ps.x - tw / 2, bot - 22, tw, 22);
    g.fillStyle = '#ffffff'; g.font = `800 ${small ? 11 : 12}px "Space Grotesk", sans-serif`; g.fillText(label, ps.x, bot - 11);
  }

  tick(dt: number) {
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) $('toast').classList.remove('on');
    if (this.sayT > 0) this.sayT -= dt;
    if (this.evT > 0 && (this.evT -= dt) <= 0) $('eventcard').classList.remove('on');
  }
  toast(text: string, secs = 1.1) { const t = $('toast'); t.textContent = text; t.classList.add('on'); this.toastT = secs; }
  say(text: string, secs = 3) { this.sayText = text; this.sayT = secs; }
  /** the event card: k = event index, -1 = the liquidation-zone event */
  showEvent(k: number, secs = 9) {
    const ev = k < 0 ? this.lv.zoneEvent : this.lv.events[k]; if (!ev) return;
    const c = $('evc') as HTMLCanvasElement, g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height); g.drawImage(eventMini(ev), 0, 0);
    $('evcredit').textContent = ev.sound_credit || '';
    $('eventcard').classList.add('on'); this.evT = secs;
  }
  /** a short text that rises from a screen point and fades (liquidations popping out of the pool) */
  popup(text: string, x: number, y: number, color: string) {
    const d = document.createElement('div');
    d.className = 'pop'; d.textContent = text; d.style.left = `${x}px`; d.style.top = `${y}px`; d.style.color = color;
    $('hud').appendChild(d);
    setTimeout(() => d.remove(), 1600);
  }
  focusCard(on: boolean) { $('eventcard').classList.toggle('focus', on); document.body.classList.toggle('evfocus', on); if (!on) this.evT = 4; }
  hideEvent() { $('eventcard').classList.remove('on'); this.evT = 0; }
  count(text: string) { $('count').textContent = text; }
  quiet() { this.sayT = this.toastT = 0; $('toast').classList.remove('on'); $('bubble').classList.remove('on'); $('offscreen').classList.remove('on'); $('danger').classList.remove('on'); }
  reset() {
    this.toastT = this.sayT = 0; this.hideEvent(); this.quiet(); this.spot(-1); $('toast').classList.remove('on');
    this.lastHearts = ''; this.lastCoins = this.lastCell = -1; this.powKey = ''; $('pow').innerHTML = '';
  }
}
