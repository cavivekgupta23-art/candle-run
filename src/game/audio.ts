// Sounds: ZzFX effects, a ZzFXM chiptune loop (both made in code), and the short official voice clips.
import { ZZFX } from 'zzfx';
import { zzfxM, type Instrument, type Pattern } from '../vendor/zzfxm.ts';

const SFX: Record<string, (number | undefined)[]> = {
  jump: [.5, 0, 220, .01, .05, .12, 1, 1.6, 9, , , , , , , , , .6, .02],
  land: [.35, 0, 90, , .02, .05, 4, , , , , , , .6],
  coin: [.45, 0, 1500, , .03, .14, 1, 1.8, , , 620, .05],
  hit: [.7, 0, 260, , .05, .25, 4, 2.2, -5, , , , , 1.2, , .4, , .5, .05],
  spring: [.6, 0, 200, .02, .1, .3, 1, 1.4, 28, , , , , , , , , .7, .04],
  slide: [.35, 0, 600, .02, .12, .16, 4, , , -40, , , , , , , , , .08],
  crumble: [.6, 0, 340, .01, .06, .35, 4, 3, , , , , , 2, , .6, , .3, .1],
  fall: [.6, 0, 520, .04, .2, .6, , .5, -3, , , , , , , , , .5, .2],
  close: [.35, 0, 880, , .05, .07, 2, , , , , , .09],
  tick: [.4, 0, 660, , .03, .06, 2],
  go: [.5, 0, 990, , .08, .2, 2, , , , 300, .06],
  sting: [.55, 0, 523, .01, .18, .4, 2, .8, , , 262, .09, .18],
  taxed: [.8, 0, 160, .02, .3, .6, 2, 1.4, -2, , , , , , , .3, .1, .4, .2],
  win: [.6, 0, 523, .02, .25, .55, 1, .9, , , 262, .08, .1, , , , , .7],
  kaching: [.5, 0, 1300, , .05, .25, 1, 1.5, , , 700, .03, , , , , .05],
};

// a 4-bar loop in A minor, 132 BPM; notes: 12 = the instrument's base pitch, 0 = rest
const INSTR: Instrument[] = [
  [.55, 0, 55, .005, .12, .08, 1, 1.2],                         // 0 bass (triangle)
  [.22, 0, 440, .01, .06, .1, 2, 1.6, , , , , , , , , , .55],   // 1 lead (saw)
  [.9, 0, 60, .001, .04, .12, 1, 2.5, -9],                      // 2 kick
  [.16, 0, 4200, , .008, .025, 4, , , , , , , , , , , .2],      // 3 hat
  [.4, 0, 190, , .03, .12, 4, 1.4, , , , , , 1],                // 4 snare
];
const K16 = (pat: (number)[]) => pat;
const kick = K16([12, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 12, 0]);
const hat = K16([0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 24]);
const snare = K16([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 12, 0]);
const bassA = K16([12, 0, 12, 0, 24, 0, 12, 0, 12, 0, 24, 0, 22, 0, 19, 0, 8, 0, 8, 0, 20, 0, 8, 0, 10, 0, 22, 0, 15, 0, 17, 0]);
const bassB = K16([5, 0, 5, 0, 17, 0, 5, 0, 7, 0, 7, 0, 19, 0, 7, 0, 12, 0, 12, 0, 24, 0, 12, 0, 7, 0, 19, 0, 10, 0, 11, 0]);
const leadA = K16([24, 0, 0, 27, 0, 0, 29, 0, 31, 0, 29, 0, 27, 0, 24, 0, 20, 0, 0, 24, 0, 0, 27, 0, 29, 0, 27, 0, 24, 0, 22, 0]);
const leadB = K16([17, 0, 0, 20, 0, 0, 24, 0, 22, 0, 20, 0, 19, 0, 17, 0, 24, 0, 27, 0, 31, 0, 29, 0, 27, 0, 24, 0, 22, 0, 23, 0]);
const ch = (instr: number, pan: number, notes: number[]) => [instr, pan, ...notes];
const PATTERNS: Pattern[] = [
  [ch(2, 0, kick), ch(3, .3, hat), ch(4, -.1, snare), ch(0, -.2, bassA)],
  [ch(2, 0, kick), ch(3, .3, hat), ch(4, -.1, snare), ch(0, -.2, bassA), ch(1, .25, leadA)],
  [ch(2, 0, kick), ch(3, .3, hat), ch(4, -.1, snare), ch(0, -.2, bassB), ch(1, .25, leadB)],
];
const SEQUENCE = [0, 1, 2, 1, 2];

let muted = false, music: AudioBufferSourceNode | null = null, musicGain: GainNode | null = null, musicBuf: AudioBuffer | null = null;
try { muted = localStorage.getItem('cr_muted') === '1'; } catch { /* storage blocked */ }
const voices: Record<string, HTMLAudioElement> = {};

export const audio = {
  get muted() { return muted; },
  unlock() { if (ZZFX.audioContext.state !== 'running') ZZFX.audioContext.resume().catch(() => {}); },
  sfx(name: keyof typeof SFX | string) {
    if (muted || !SFX[name]) return;
    try { ZZFX.playSamples([ZZFX.buildSamples(...SFX[name])]); } catch { /* audio off */ }
  },
  startMusic() {
    if (muted || music) return;
    const ctx = ZZFX.audioContext;
    if (!musicBuf) {
      const [l, r] = zzfxM(INSTR, PATTERNS, SEQUENCE, 132);
      const buf = ctx.createBuffer(2, l.length, ZZFX.sampleRate);
      buf.getChannelData(0).set(l);
      buf.getChannelData(1).set(r);
      musicBuf = buf;
    }
    const gain = ctx.createGain(), src = ctx.createBufferSource();
    gain.gain.value = 0.32;
    gain.connect(ctx.destination);
    src.buffer = musicBuf;
    src.loop = true;
    src.connect(gain);
    src.start();
    musicGain = gain; music = src;
  },
  stopMusic() { try { music?.stop(); } catch { /* already stopped */ } music = null; },
  duck(on: boolean) { if (musicGain) musicGain.gain.setTargetAtTime(on ? 0.08 : 0.32, ZZFX.audioContext.currentTime, 0.08); },
  voice(src: string | undefined, onEnd?: () => void) {
    if (muted || !src) { onEnd?.(); return; }
    const a = voices[src] || (voices[src] = new Audio(src));
    a.currentTime = 0;
    a.volume = 1;
    this.duck(true);
    a.onended = () => { this.duck(false); onEnd?.(); };
    a.play().catch(() => { this.duck(false); onEnd?.(); });
  },
  preload(srcs: (string | undefined)[]) { for (const s of srcs) if (s && !voices[s]) { voices[s] = new Audio(s); voices[s].preload = 'auto'; } },
  toggleMute() {
    muted = !muted;
    try { localStorage.setItem('cr_muted', muted ? '1' : '0'); } catch { /* storage blocked */ }
    if (muted) this.stopMusic();
    return muted;
  },
};
