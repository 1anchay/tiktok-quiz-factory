import React, { useMemo } from "react";
import { Audio, interpolate, Sequence, staticFile } from "remotion";
import { clamp } from "../animations";
import type { Timeline } from "../engine/timeline";
import type { Episode } from "../schema/episode";
import { buildSfxCues } from "./cues";
import { SOUND_PACK } from "./sound-pack";

interface Props {
  episode: Episode;
  timeline: Timeline;
}

/**
 * Music bed + timeline-driven SFX.
 * Main track ducks out for the boss (if a boss track exists) and returns for the CTA.
 * Future: a TTS/voice-over track would be mounted here with sidechain ducking.
 */
export const AudioLayer: React.FC<Props> = ({ episode, timeline }) => {
  const { music } = episode;
  const boss = timeline.segments.find((s) => s.kind === "boss")!;
  const cta = timeline.segments.find((s) => s.kind === "cta")!;
  const total = timeline.durationInFrames;
  const hasBossTrack = Boolean(music.bossTrack);
  const cues = useMemo(() => buildSfxCues(timeline, episode.hook.title.split(/\s+/).length), [timeline, episode.hook.title]);

  const mainVolume = (f: number) => {
    const fadeIn = interpolate(f, [0, 10], [0, 1], clamp);
    const fadeOut = interpolate(f, [total - 20, total], [1, 0], clamp);
    const bossDuck = hasBossTrack
      ? interpolate(f, [boss.from - 8, boss.from, cta.from, cta.from + 10], [1, 0, 0, 1], clamp)
      : 1;
    return music.volume * fadeIn * fadeOut * bossDuck;
  };

  const bossDuration = cta.from - boss.from + 10;

  return (
    <>
      {music.track && <Audio src={staticFile(music.track)} volume={mainVolume} loop />}

      {music.bossTrack && (
        <Sequence from={boss.from} durationInFrames={bossDuration} name="Boss music">
          <Audio
            src={staticFile(music.bossTrack)}
            loop
            volume={(f) =>
              music.volume * interpolate(f, [0, 4, bossDuration - 12, bossDuration], [0, 1, 1, 0], clamp)
            }
          />
        </Sequence>
      )}

      {cues.map((cue, i) => (
        <Sequence key={`${cue.sound}-${i}`} from={cue.frame} durationInFrames={timeline.fps * 2.2} name={`SFX ${cue.sound}`}>
          <Audio src={staticFile(SOUND_PACK[cue.sound])} volume={cue.volume * music.sfxVolume} />
        </Sequence>
      ))}
    </>
  );
};
