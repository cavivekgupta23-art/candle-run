// Keyboard and touch. Phones get auto-run (the runner moves right on its own; ◀ holds back) plus jump / slide buttons.
import type { Input } from '../sim/physics.ts';

export const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const held = { left: false, right: false, jump: false, down: false };
const pad = { left: false, right: false, jump: false, down: false };
let autoRun = touch;
type Cb = () => void;
const hooks: Record<string, Cb[]> = {};
export const on = (k: string, cb: Cb) => { (hooks[k] ||= []).push(cb); };
const fire = (k: string) => (hooks[k] || []).forEach(f => f());

const KEYS: Record<string, keyof typeof held> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'down', KeyS: 'down',
};
addEventListener('keydown', e => {
  const k = KEYS[e.code];
  if (k) { held[k] = true; e.preventDefault(); }
  if (e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') fire('pause');
  if (e.code === 'Enter') fire('enter');
  if (e.code === 'KeyM') { fire('mute'); return; }   // M is never the 'any key' that skips the intro or an event (like the ♪ button)
  if (e.code === 'KeyR') fire('retry');
  fire('any');
});
addEventListener('keyup', e => { const k = KEYS[e.code]; if (k) held[k] = false; });
addEventListener('blur', () => { Object.keys(held).forEach(k => (held[k as keyof typeof held] = false)); });

export function bindTouch(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-pad]').forEach(b => {
    const k = b.dataset.pad as keyof typeof pad;
    const down = (e: PointerEvent) => { e.preventDefault(); pad[k] = true; b.classList.add('on'); b.setPointerCapture(e.pointerId); fire('any'); };
    const up = () => { pad[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
  });
}
export const setAutoRun = (v: boolean) => { autoRun = v; };
export const getAutoRun = () => autoRun;

export function read(): Input {
  const left = held.left || pad.left;
  return {
    left,
    right: held.right || pad.right || (autoRun && !left),
    jump: held.jump || pad.jump,
    down: held.down || pad.down,
  };
}
