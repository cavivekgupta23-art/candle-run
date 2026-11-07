// Sounds: ZzFX effects, two ZzFXM loops (the run, and the scary liquidation zone), all made in code, plus the short official voice clips.
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
  power: [.6, 0, 440, .02, .12, .3, 1, 1.5, , , 440, .06, .08, , , , , .8],
  jet: [.6, 0, 120, .05, .5, .5, 4, 2, 8, , , , , 3, , .3, , .6, .2],
  jetend: [.4, 0, 300, .01, .1, .2, 1, , -12],
  block: [.7, 0, 900, , .06, .25, 1, 2, , , -300, .05, , , , , .04],
  heart: [.7, 0, 60, .01, .04, .12, 1, 3, -4],
  lastchance: [.9, 0, 110, .05, .6, 1.2, 2, 1.6, -1.5, , , , .3, .4, , .2, .2, .5, .3],
  rescued: [.7, 0, 392, .02, .25, .6, 1, 1, , , 392, .08, .12, , , , , .8],
  alarm: [.45, 0, 640, .02, .45, .12, 2, 1, , , , , , , 6.5],
  thunder: [.8, 0, 60, .02, .5, .8, 4, 2.5, -2, , , , , 2, , .5, .1, .5, .3],
};

// the run: a 4-bar loop in A minor, 132 BPM (12 = the instrument's base pitch, 0 = rest)
const INSTR: Instrument[] = [
  [.55, 0, 55, .005, .12, .08, 1, 1.2],                         // 0 bass (triangle)
  [.22, 0, 440, .01, .06, .1, 2, 1.6, , , , , , , , , , .55],   // 1 lead (saw)
  [.9, 0, 60, .001, .04, .12, 1, 2.5, -9],                      // 2 kick
  [.16, 0, 4200, , .008, .025, 4, , , , , , , , , , , .2],      // 3 hat
  [.4, 0, 190, , .03, .12, 4, 1.4, , , , , , 1],                // 4 snare
  [.5, 0, 41, .3, .6, .8, 1, .6, , , , , , .2, , , , .9],       // 5 drone (danger)
  [.25, 0, 880, .01, .05, .6, 0, 1, , , , , , , 0, , , , , .5], // 6 cold bell (danger)
  [1, 0, 50, .001, .05, .15, 1, 3, -6],                         // 7 heartbeat
];
const kick = [12, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 12, 0];
const hat = [0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 0, 0, 0, 24, 24];
const snare = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 12, 0];
const bassA = [12, 0, 12, 0, 24, 0, 12, 0, 12, 0, 24, 0, 22, 0, 19, 0, 8, 0, 8, 0, 20, 0, 8, 0, 10, 0, 22, 0, 15, 0, 17, 0];
const bassB = [5, 0, 5, 0, 17, 0, 5, 0, 7, 0, 7, 0, 19, 0, 7, 0, 12, 0, 12, 0, 24, 0, 12, 0, 7, 0, 19, 0, 10, 0, 11, 0];
const leadA = [24, 0, 0, 27, 0, 0, 29, 0, 31, 0, 29, 0, 27, 0, 24, 0, 20, 0, 0, 24, 0, 0, 27, 0, 29, 0, 27, 0, 24, 0, 22, 0];
const leadB = [17, 0, 0, 20, 0, 0, 24, 0, 22, 0, 20, 0, 19, 0, 17, 0, 24, 0, 27, 0, 31, 0, 29, 0, 27, 0, 24, 0, 22, 0, 23, 0];
const ch = (instr: number, pan: number, notes: number[]) => [instr, pan, ...notes];
const RUN: [Pattern[], number[], number] = [[
  [ch(2, 0, kick), ch(3, .3, hat), ch(4, -.1, snare), ch(0, -.2, bassA)],
  [ch(2, 0, kick), ch(3, .3, hat), ch(4, -.1, snare), ch(0, -.2, bassA), ch(1, .25, leadA)],
  [ch(2, 0, kick), ch(3, .3, hat), ch(4, -.1, snare), ch(0, -.2, bassB), ch(1, .25, leadB)],
], [0, 1, 2, 1, 2], 132];
// the liquidation zone: a low drone, a heartbeat and a cold, out-of-key bell, 84 BPM
const beat = [12, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const drone = [12, 0, 0, 0, 0, 0, 0, 0, 13, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0];
const bell = [0, 0, 0, 0, 0, 0, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 30, 0, 0, 0, 0, 0];
const DANGER: [Pattern[], number[], number] = [[[ch(7, 0, beat), ch(5, -.2, drone), ch(6, .4, bell)]], [0, 0], 84];

let muted = false, music: AudioBufferSourceNode | null = null, musicGain: GainNode | null = null, playing = '';
const bufs: Record<string, AudioBuffer> = {};
try { muted = localStorage.getItem('cr_muted') === '1'; } catch { /* storage blocked */ }
const voices: Record<string, HTMLAudioElement> = {};

export const audio = {
  get muted() { return muted; },
  unlock() { if (ZZFX.audioContext.state !== 'running') ZZFX.audioContext.resume().catch(() => {}); },
  sfx(name: string) {
    if (muted || !SFX[name]) return;
    try { ZZFX.playSamples([ZZFX.buildSamples(...SFX[name])]); } catch { /* audio off */ }
  },
  startMusic(kind: 'run' | 'danger' = 'run') {
    if (muted || playing === kind) return;
    this.stopMusic();
    const ctx = ZZFX.audioContext;
    if (!bufs[kind]) {
      const [pats, seq, bpm] = kind === 'run' ? RUN : DANGER;
      const [l, r] = zzfxM(INSTR, pats, seq, bpm);
      const buf = ctx.createBuffer(2, l.length, ZZFX.sampleRate);
      buf.getChannelData(0).set(l); buf.getChannelData(1).set(r);
      bufs[kind] = buf;
    }
    const gain = ctx.createGain(), src = ctx.createBufferSource();
    gain.gain.value = kind === 'run' ? 0.32 : 0.55;
    gain.connect(ctx.destination);
    src.buffer = bufs[kind]; src.loop = true; src.connect(gain); src.start();
    musicGain = gain; music = src; playing = kind;
  },
  stopMusic() { try { music?.stop(); } catch { /* already stopped */ } music = null; playing = ''; },
  duck(on: boolean) { if (musicGain) musicGain.gain.setTargetAtTime(on ? 0.08 : (playing === 'danger' ? 0.55 : 0.32), ZZFX.audioContext.currentTime, 0.08); },
  voice(src: string | undefined, onEnd?: () => void) {
    if (muted || !src) { onEnd?.(); return; }
    const a = voices[src] || (voices[src] = new Audio(src));
    a.currentTime = 0; a.volume = 1;
    this.duck(true);
    a.onended = () => { this.duck(false); onEnd?.(); };
    a.play().catch(() => { this.duck(false); onEnd?.(); });
  },
  /** stop any voice clip still playing (an intro or event the player skipped) */
  stopVoice() { for (const v of Object.values(voices)) if (!v.paused) { v.onended = null; v.pause(); } this.duck(false); },
  preload(srcs: (string | undefined)[]) { for (const s of srcs) if (s && !voices[s]) { voices[s] = new Audio(s); voices[s].preload = 'auto'; } },
  toggleMute() {
    muted = !muted;
    try { localStorage.setItem('cr_muted', muted ? '1' : '0'); } catch { /* storage blocked */ }
    if (muted) this.stopMusic();
    return muted;
  },
};
