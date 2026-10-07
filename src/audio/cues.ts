import { CLUE_STAGGER, type Timeline } from "../engine/timeline";
import type { SoundName } from "./sound-pack";

export { SOUND_PACK, type SoundName } from "./sound-pack";

export interface SfxCue {
  sound: SoundName;
  frame: number;
  volume: number;
}

/** Derives every sound effect from the timeline, so new formats get audio "for free". */
export function buildSfxCues(timeline: Timeline, hookWordCount: number, hasHookBait = false): SfxCue[] {
  const cues: SfxCue[] = [];
  const { fps } = timeline;
  const add = (sound: SoundName, frame: number, volume = 1) => cues.push({ sound, frame: Math.max(0, Math.round(frame)), volume });

  for (const seg of timeline.segments) {
    if (seg.kind === "hook") {
      add("whoosh", seg.from, hasHookBait ? 0.3 : 0.45);
      if (hasHookBait) {
        add("bossImpact", seg.from + 2, 0.22);
        add("whoosh", seg.from + Math.round(fps * 0.68), 0.5);
      } else if (hookWordCount > 0) {
        add("pop", seg.from + 8, 0.35);
      }
      continue;
    }

    if (seg.kind === "cta") {
      add("whoosh", seg.from - 4, 0.45);
      add("ctaChime", seg.from + 8, 0.5);
      continue;
    }

    const isBoss = seg.kind === "boss";
    if (isBoss) {
      add("riser", seg.from - Math.round(fps * 0.85), 0.35);
      add("bossImpact", seg.from, 0.55);
    } else {
      add("whoosh", seg.from - 4, 0.4);
    }

    const stagger = isBoss ? CLUE_STAGGER - 1 : CLUE_STAGGER;
    const cluesStart = isBoss ? seg.cluesStart + 2 : seg.cluesStart;
    for (let i = 0; i < 4; i++) add("pop", seg.from + cluesStart + i * stagger, isBoss ? 0.5 : 0.42);

    if (isBoss) {
      add("bossImpact", seg.from + seg.revealStart, 0.45);
    } else {
      add("reveal", seg.from + seg.revealStart, 0.6);
    }
  }

  return cues.sort((a, b) => a.frame - b.frame);
}
