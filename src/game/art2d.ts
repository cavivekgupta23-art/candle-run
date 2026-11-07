// 2D canvas art: the event billboard, caricature portraits, signs and the voxel textures. All drawn in code (no image files).
import type { EventInfo } from '../sim/level.ts';

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d')! };
}
export function shade(hex: string, f: number) {
  const v = parseInt(hex.slice(1), 16), ch = [v >> 16, (v >> 8) & 255, v & 255];
  return '#' + ch.map(c => Math.max(0, Math.min(255, Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f))))).map(c => c.toString(16).padStart(2, '0')).join('');
}
/** a box with its front, top and right faces (the voxel look in 2D) */
export function box2d(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hex: string, d = 6) {
  const dy = d * 0.72;
  g.fillStyle = hex; g.fillRect(x, y, w, h);
  g.fillStyle = shade(hex, 0.32); g.beginPath(); g.moveTo(x, y); g.lineTo(x + d, y - dy); g.lineTo(x + w + d, y - dy); g.lineTo(x + w, y); g.closePath(); g.fill();
  g.fillStyle = shade(hex, -0.3); g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w + d, y - dy); g.lineTo(x + w + d, y + h - dy); g.lineTo(x + w, y + h); g.closePath(); g.fill();
}
export function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** "Nirmala Taxaraman": a caricature, drawn around (0,0) = her feet (about 152 px tall at scale 1) */
export function taxFigure(g: CanvasRenderingContext2D) {
  const skin = '#b67d4e', cream = '#f2e8d2', mag = '#c2185b', gold = '#d4a017';
  g.fillStyle = '#3e2723'; g.fillRect(-16, -5, 12, 5); g.fillRect(4, -5, 12, 5);
  box2d(g, -26, -64, 52, 60, cream, 6);
  g.strokeStyle = 'rgba(150,120,80,0.35)'; g.lineWidth = 1.5;
  for (let x = -18; x < 26; x += 8) { g.beginPath(); g.moveTo(x, -60); g.lineTo(x - 2, -6); g.stroke(); }
  g.fillStyle = mag; g.fillRect(-26, -16, 52, 11); g.fillStyle = gold; g.fillRect(-26, -18, 52, 2); g.fillRect(-26, -7, 52, 2);
  box2d(g, -36, -100, 11, 34, skin, 4);
  box2d(g, -54, -78, 32, 42, '#c62828', 6); g.fillStyle = gold; g.fillRect(-54, -61, 32, 3); g.fillRect(-40, -78, 3, 42);
  box2d(g, -22, -104, 44, 42, cream, 6);
  g.fillStyle = mag; g.beginPath(); g.moveTo(-22, -104); g.lineTo(-6, -104); g.lineTo(22, -76); g.lineTo(22, -60); g.closePath(); g.fill();
  g.strokeStyle = gold; g.lineWidth = 2; g.stroke();
  box2d(g, 20, -100, 11, 30, skin, 4);
  box2d(g, 24, -136, 42, 54, '#455a64', 6); g.fillStyle = '#a5d66b'; g.fillRect(28, -131, 34, 15);
  g.fillStyle = '#1b2a1b'; g.font = '900 12px "Space Grotesk", Segoe UI, sans-serif'; g.fillText('30%', 33, -119);
  g.fillStyle = '#cfd8dc'; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.fillRect(28 + c * 8.5, -110 + r * 9, 6, 6);
  g.fillStyle = skin; g.fillRect(-6, -110, 12, 8);
  box2d(g, -31, -146, 13, 13, '#55555c', 4);
  box2d(g, -17, -146, 34, 38, skin, 5);
  box2d(g, -19, -152, 38, 11, '#5f5f66', 5); g.fillStyle = '#c9c9cf'; g.fillRect(-3, -152, 7, 11);
  g.fillStyle = '#5f5f66'; g.fillRect(-17, -142, 5, 16);
  g.strokeStyle = '#e3e8ea'; g.lineWidth = 2; g.strokeRect(-12, -133, 10, 8); g.strokeRect(2, -133, 10, 8);
  g.beginPath(); g.moveTo(-2, -129); g.lineTo(2, -129); g.stroke();
  g.fillStyle = '#1b1b1b'; g.fillRect(-9, -131, 4, 4); g.fillRect(5, -131, 4, 4);
  g.fillStyle = '#d32f2f'; g.fillRect(-1.5, -140, 3, 3);
  g.fillStyle = '#5d2f22'; g.fillRect(-6, -119, 12, 3);
}

/** "Donald Trumpet": caricature bust in a 150 x 160 box at (x, y) */
export function trumpBust(g: CanvasRenderingContext2D, x: number, y: number) {
  const skin = '#f0a35e', hair = '#f5d26a';
  box2d(g, x + 4, y + 112, 142, 50, '#1e2a46', 6);
  g.fillStyle = '#ffffff'; g.fillRect(x + 58, y + 112, 34, 22);
  g.fillStyle = '#d01f2e'; g.fillRect(x + 69, y + 120, 12, 42); g.fillStyle = '#a8111d'; g.fillRect(x + 66, y + 114, 18, 9);
  box2d(g, x + 56, y + 98, 38, 18, skin, 4); box2d(g, x + 36, y + 30, 78, 72, skin, 6);
  g.fillStyle = '#f7caa1'; g.fillRect(x + 50, y + 56, 22, 12); g.fillRect(x + 80, y + 56, 22, 12);
  g.fillStyle = '#2b2b2b'; g.fillRect(x + 55, y + 61, 12, 4); g.fillRect(x + 85, y + 61, 12, 4);
  g.fillStyle = '#e2b24a'; g.fillRect(x + 52, y + 51, 18, 5); g.fillRect(x + 83, y + 51, 18, 5);
  g.fillStyle = '#b5534a'; g.fillRect(x + 68, y + 82, 16, 11); g.fillStyle = '#5a1f1a'; g.fillRect(x + 71, y + 85, 10, 6);
  box2d(g, x + 28, y + 14, 96, 24, hair, 6); box2d(g, x + 64, y + 28, 64, 15, hair, 5);
  g.fillStyle = hair; g.fillRect(x + 32, y + 36, 9, 26); g.fillRect(x + 110, y + 36, 8, 20);
  box2d(g, x + 122, y + 100, 28, 18, skin, 4); g.fillStyle = skin; g.fillRect(x + 148, y + 104, 16, 6);
}
/** "REKT RANDY": a made-up over-leveraged trader (100x cap, laser eyes, tears) */
export function rektBust(g: CanvasRenderingContext2D, x: number, y: number) {
  const skin = '#e8b48a';
  box2d(g, x + 6, y + 112, 140, 50, '#b91c1c', 6); g.fillStyle = '#7f1d1d'; g.fillRect(x + 70, y + 112, 10, 50);
  box2d(g, x + 56, y + 98, 38, 18, skin, 4); box2d(g, x + 36, y + 34, 78, 70, skin, 6);
  box2d(g, x + 30, y + 20, 92, 22, '#111827', 6); box2d(g, x + 104, y + 36, 40, 8, '#111827', 3);
  g.fillStyle = '#ffd400'; g.font = '900 16px "Space Grotesk", sans-serif'; g.fillText('100x', x + 54, y + 38);
  g.fillStyle = 'rgba(255,23,68,0.6)'; g.fillRect(x + 66, y + 60, 120, 4);
  g.fillStyle = '#ff1744'; g.fillRect(x + 52, y + 57, 14, 9); g.fillRect(x + 84, y + 57, 14, 9);
  g.fillStyle = '#7dd3fc'; g.fillRect(x + 55, y + 67, 5, 16); g.fillRect(x + 88, y + 67, 5, 16);
  g.fillStyle = '#5a1f1a'; g.fillRect(x + 64, y + 90, 22, 4); g.fillRect(x + 60, y + 94, 4, 4); g.fillRect(x + 86, y + 94, 4, 4);
}
/** "MICHAEL SELLOR": a parody caricature (bald, laser eyes, dark suit, orange bitcoin pin) */
export function saylorBust(g: CanvasRenderingContext2D, x: number, y: number) {
  const skin = '#e9b98f';
  box2d(g, x + 6, y + 112, 140, 50, '#1f2937', 6); g.fillStyle = '#fff'; g.fillRect(x + 62, y + 112, 26, 20); g.fillStyle = '#1e3a8a'; g.fillRect(x + 70, y + 118, 10, 40);
  g.fillStyle = '#f7931a'; g.beginPath(); g.arc(x + 112, y + 132, 9, 0, 7); g.fill();
  box2d(g, x + 56, y + 98, 38, 18, skin, 4); box2d(g, x + 34, y + 26, 82, 78, skin, 6);
  g.fillStyle = '#d9a37a'; g.fillRect(x + 34, y + 26, 82, 8);
  g.fillStyle = 'rgba(255,23,68,0.6)'; g.fillRect(x + 66, y + 58, 130, 4);
  g.fillStyle = '#ff1744'; g.fillRect(x + 50, y + 55, 15, 9); g.fillRect(x + 84, y + 55, 15, 9);
  g.fillStyle = '#5a1f1a'; g.fillRect(x + 64, y + 86, 22, 4);
}
/** a hooded hacker bust (for hack events; never a real person) */
export function hackerBust(g: CanvasRenderingContext2D, x: number, y: number) {
  box2d(g, x + 10, y + 100, 130, 60, '#263238', 6);
  box2d(g, x + 30, y + 20, 90, 90, '#37474f', 7);
  g.fillStyle = '#0d1117'; g.fillRect(x + 46, y + 40, 58, 58);
  g.fillStyle = '#00e676'; g.fillRect(x + 56, y + 60, 12, 6); g.fillRect(x + 82, y + 60, 12, 6);
  g.fillStyle = '#ffd54f'; g.font = '900 34px "Space Grotesk", sans-serif'; g.fillText('$', x + 120, y + 140);
}

const FONT = '"Space Grotesk", "Segoe UI", sans-serif';

/** the level's one real event: caricature + post + the checked facts (used for the 3D billboard and the side card) */
export function eventCard(ev: EventInfo, candle: number[]) {
  const W = 760, H = 420, { c, g } = canvas(W, H);
  g.fillStyle = '#2b2f3a'; rrect(g, 0, 26, W, H - 26, 18); g.fill();
  g.fillStyle = '#d32f2f'; rrect(g, 0, 0, 210, 44, 10); g.fill();
  g.fillStyle = '#fff'; g.font = `900 24px ${FONT}`; g.fillText('● BREAKING', 18, 31);
  g.fillStyle = '#0d1b2a'; rrect(g, 16, 58, W - 32, 236, 12); g.fill();
  g.save(); g.beginPath(); g.rect(16, 58, 300, 236); g.clip();
  g.translate(40, 78); g.scale(1.42, 1.42);
  if (ev.figure === 'hacker') hackerBust(g, 0, 0); else if (ev.figure === 'rekt') rektBust(g, 0, 0); else if (ev.figure === 'saylor') saylorBust(g, 0, 0); else trumpBust(g, 0, 0);
  g.restore();
  g.fillStyle = '#fff'; rrect(g, 330, 76, 400, 200, 14); g.fill();
  g.fillStyle = '#f0a35e'; g.beginPath(); g.arc(358, 104, 13, 0, 7); g.fill();
  g.fillStyle = '#1e2b4a'; g.font = `900 20px ${FONT}`; g.fillText(ev.name || '', 380, 111);
  g.fillStyle = '#d01f2e'; g.font = `900 46px ${FONT}`;
  (ev.post || [ev.headline]).forEach((l, i) => g.fillText(l, 350, 168 + i * 50));
  const [, o, , , cl] = candle, chg = (cl - o) / o * 100, fmt = (p: number) => Math.round(p).toLocaleString('en-US');
  g.fillStyle = '#fff'; g.font = `800 22px ${FONT}`;
  g.fillText(`${dateLabel(ev.date)} · BTC ${chg >= 0 ? '+' : ''}${chg.toFixed(1)}% (${fmt(o)} → ${fmt(cl)})`, 22, 330);
  g.font = `600 19px ${FONT}`; g.fillStyle = '#cfd8dc';
  wrap(g, ev.headline, 22, 360, W - 44, 24, 1);
  g.fillStyle = '#90a4ae'; g.font = `600 15px ${FONT}`;
  g.fillText('Sources: ' + (ev.sources || []).map(s => s.publisher).join(', ') + '  ·  parody, not an endorsement', 22, 402);
  return c;
}
export function dateLabel(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, lh: number, max: number) {
  const words = text.split(' '); let line = '', n = 0;
  for (const wd of words) {
    if (g.measureText(line + wd).width > w && line) { g.fillText(line.trim(), x, y); y += lh; line = ''; if (++n >= max) return; }
    line += wd + ' ';
  }
  g.fillText(line.trim(), x, y);
}

/** a sign with big text (joke billboards, the start and finish signs) */
export function sign(lines: string[], bg = '#ffffff', fg = '#1e2b4a', w = 512, h = 256) {
  const { c, g } = canvas(w, h);
  g.fillStyle = bg; rrect(g, 6, 6, w - 12, h - 12, 22); g.fill();
  g.strokeStyle = fg; g.lineWidth = 8; rrect(g, 10, 10, w - 20, h - 20, 20); g.stroke();
  g.fillStyle = fg; g.textAlign = 'center';
  const size = Math.min(84, (h - 40) / lines.length * 0.82);
  g.font = `900 ${size}px ${FONT}`;
  lines.forEach((l, i) => {
    let s = size; while (g.measureText(l).width > w - 60 && s > 20) g.font = `900 ${(s -= 4)}px ${FONT}`;
    g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05 + size * 0.34);
    g.font = `900 ${size}px ${FONT}`;
  });
  return c;
}
export function nameTag(text: string, color = '#c2185b') {
  const { c, g } = canvas(512, 96);
  g.font = `900 46px ${FONT}`;
  const w = Math.min(500, g.measureText(text).width + 48);
  g.fillStyle = color; rrect(g, (512 - w) / 2, 12, w, 72, 18); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, 256, 64);
  return c;
}
export function stamp(text: string) {
  const { c, g } = canvas(256, 128);
  g.translate(128, 64); g.rotate(-0.22);
  g.strokeStyle = '#c62828'; g.lineWidth = 9; rrect(g, -110, -40, 220, 80, 10); g.stroke();
  g.fillStyle = '#c62828'; g.font = `900 52px ${FONT}`; g.textAlign = 'center'; g.fillText(text, 0, 18);
  return c;
}
export function calcScreen(text: string) {
  const { c, g } = canvas(128, 64);
  g.fillStyle = '#a5d66b'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#1b2a1b'; g.font = `900 44px ${FONT}`; g.textAlign = 'center'; g.fillText(text, 64, 48);
  return c;
}
/** white square with soft dark edges: multiplied by each brick's colour it gives the voxel grid look */
export function edgeTex() {
  const { c, g } = canvas(64, 64);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 5; g.strokeRect(2.5, 2.5, 59, 59);
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.strokeRect(7, 7, 50, 50);
  return c;
}
export function windowsTex() {
  const { c, g } = canvas(64, 128);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128);
  for (let y = 10; y < 124; y += 18) for (let x = 8; x < 60; x += 14) { g.fillStyle = (x * 7 + y * 3) % 5 < 2 ? '#c7d6ef' : '#e6eefb'; g.fillRect(x, y, 7, 10); }
  return c;
}
export function glassTex() {
  const { c, g } = canvas(64, 64);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(60,90,130,0.55)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(10, 8); g.lineTo(30, 30); g.lineTo(52, 22); g.moveTo(30, 30); g.lineTo(24, 56); g.moveTo(30, 30); g.lineTo(58, 50); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 4; g.strokeRect(2, 2, 60, 60);
  return c;
}

/** a power-up face: a glossy rounded tile with the icon and its name */
export function powerTile(kind: 'moon' | 'shield' | 'magnet') {
  const { c, g } = canvas(128, 128);
  const [bg, icon, label] = kind === 'moon' ? ['#7c3aed', '🚀', '100x'] : kind === 'shield' ? ['#0ea5e9', '🛡️', 'STOP'] : ['#f59e0b', '🧲', 'DROP'];
  g.fillStyle = bg; rrect(g, 4, 4, 120, 120, 22); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 6; rrect(g, 7, 7, 114, 114, 20); g.stroke();
  g.font = '64px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; g.textAlign = 'center'; g.fillText(icon, 64, 80);
  g.fillStyle = '#ffffff'; g.font = `900 22px ${FONT}`; g.fillText(label, 64, 112);
  return c;
}
/** a yellow-black warning sign (stop-hunt wicks, liquidation spikes, the pool) */
export function hazardSign(text: string, w = 384) {
  const { c, g } = canvas(w, 96);
  g.fillStyle = '#ffd400'; rrect(g, 4, 8, w - 8, 80, 14); g.fill();
  g.save(); g.beginPath(); rrect(g, 4, 8, w - 8, 80, 14); g.clip();
  g.fillStyle = '#111111'; for (let x = -80; x < w; x += 36) { g.beginPath(); g.moveTo(x, 88); g.lineTo(x + 18, 88); g.lineTo(x + 58, 8); g.lineTo(x + 40, 8); g.closePath(); g.fill(); }
  g.restore();
  g.fillStyle = '#111111'; rrect(g, 22, 22, w - 44, 52, 10); g.fill();
  g.fillStyle = '#ffd400'; g.font = `900 34px ${FONT}`; g.textAlign = 'center'; g.fillText('⚠ ' + text, w / 2, 60);
  return c;
}
/** a white label with coloured text (power-up names, the rescue heart) */
export function label(text: string, color: string, w = 512) {
  const { c, g } = canvas(w, 96);
  g.font = `900 40px ${FONT}`;
  const tw = Math.min(w - 8, g.measureText(text).width + 40);
  g.fillStyle = 'rgba(255,255,255,0.92)'; rrect(g, (w - tw) / 2, 14, tw, 64, 16); g.fill();
  g.fillStyle = color; g.textAlign = 'center'; g.fillText(text, w / 2, 60);
  return c;
}
