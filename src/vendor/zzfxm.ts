// ZzFX Music Renderer v2.0.3 by Keith Clark and Frank Force (MIT, see vendor/ZzFXM_LICENSE.txt).
// Ported to a module: the globals zzfxR / zzfxG are the zzfx package's ZZFX.sampleRate / ZZFX.buildSamples.
import { ZZFX } from 'zzfx';

export type Instrument = (number | undefined)[];
export type Channel = number[];
export type Pattern = Channel[];

export function zzfxM(instruments: Instrument[], patterns: Pattern[], sequence: number[], BPM = 125): [number[], number[]] {
  let instrumentParameters: (number | undefined)[];
  let i: number, j: number, k: number, note: number, sample: number, patternChannel: Channel;
  let notFirstBeat: number | boolean, stop: number | boolean, instrument: number | undefined, attenuation = 0, outSampleOffset: number;
  let isSequenceEnd: number | boolean, nextSampleOffset: number;
  let sampleOffset = 0, sampleBuffer: number[] = [], channelIndex = 0, panning = 0, hasMore: number | boolean = 1;
  const leftChannelBuffer: number[] = [], rightChannelBuffer: number[] = [];
  const sampleCache: Record<string, number[]> = {};
  const beatLength = ZZFX.sampleRate / BPM * 60 >> 2;

  for (; hasMore; channelIndex++) {
    sampleBuffer = [hasMore = notFirstBeat = outSampleOffset = 0];
    sequence.map((patternIndex, sequenceIndex) => {
      patternChannel = patterns[patternIndex][channelIndex] || [0, 0, 0];
      hasMore = (hasMore as number) | (patterns[patternIndex][channelIndex] ? 1 : 0);
      nextSampleOffset = outSampleOffset + (patterns[patternIndex][0].length - 2 - (notFirstBeat ? 0 : 1)) * beatLength;
      isSequenceEnd = sequenceIndex == sequence.length - 1;
      for (i = 2, k = outSampleOffset; i < patternChannel.length + (isSequenceEnd ? 1 : 0); notFirstBeat = ++i) {
        note = patternChannel[i];
        stop = i == patternChannel.length + (isSequenceEnd ? 1 : 0) - 1 && isSequenceEnd ||
          ((instrument != (patternChannel[0] || 0) ? 1 : 0) | note | 0);
        for (j = 0; j < beatLength && notFirstBeat;
          j++ > beatLength - 99 && stop ? attenuation += (attenuation < 1 ? 1 : 0) / 99 : 0) {
          sample = (1 - attenuation) * sampleBuffer[sampleOffset++] / 2 || 0;
          leftChannelBuffer[k] = (leftChannelBuffer[k] || 0) - sample * panning + sample;
          rightChannelBuffer[k] = (rightChannelBuffer[k++] || 0) + sample * panning + sample;
        }
        if (note) {
          attenuation = note % 1;
          panning = patternChannel[1] || 0;
          if (note |= 0) {
            const key = `${instrument = patternChannel[sampleOffset = 0] || 0},${note}`;
            sampleBuffer = sampleCache[key] = sampleCache[key] || (
              instrumentParameters = [...instruments[instrument]],
              instrumentParameters[2] = (instrumentParameters[2] ?? 220) * 2 ** ((note - 12) / 12),
              note > 0 ? ZZFX.buildSamples(...instrumentParameters) : []
            );
          }
        }
      }
      outSampleOffset = nextSampleOffset;
    });
  }
  return [leftChannelBuffer, rightChannelBuffer];
}
