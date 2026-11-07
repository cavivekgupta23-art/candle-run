declare module 'zzfx' {
  type P = (number | undefined)[];
  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    play(...p: P): AudioBufferSourceNode;
    playSamples(channels: number[][], volumeScale?: number, rate?: number, pan?: number, loop?: boolean): AudioBufferSourceNode;
    buildSamples(...p: P): number[];
  };
  export function zzfx(...p: P): AudioBufferSourceNode;
}
