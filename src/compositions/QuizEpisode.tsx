import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp } from "../animations";
import { AudioLayer } from "../audio/AudioLayer";
import { Background } from "../components/Background";
import { ErrorScreen } from "../components/ErrorScreen";
import { ProgressTrack } from "../components/ProgressTrack";
import { SwipeTransition } from "../components/SwipeTransition";
import { LAYOUT } from "../engine/layout";
import { buildTimeline, type Segment, type Timeline } from "../engine/timeline";
import type { QuizEpisodeProps } from "../engine/types";
import type { Episode } from "../schema/episode";
import { BossScene } from "../scenes/BossScene";
import { CtaScene } from "../scenes/CtaScene";
import { HookScene } from "../scenes/HookScene";
import { LevelScene } from "../scenes/LevelScene";
import { getTheme, type Theme } from "../themes";
import "../themes/fonts";

export const QuizEpisode: React.FC<QuizEpisodeProps> = ({ episode, errors }) => {
  if (!episode || (errors && errors.length > 0)) {
    return <ErrorScreen errors={errors?.length ? errors : ["No episode data provided."]} />;
  }
  return <EpisodeVideo episode={episode} />;
};

const EpisodeVideo: React.FC<{ episode: Episode }> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = getTheme(episode.theme);
  const timeline = useMemo(() => buildTimeline(episode, fps), [episode, fps]);
  const boss = timeline.segments.find((s) => s.kind === "boss")!;
  const cta = timeline.segments.find((s) => s.kind === "cta")!;

  const bossMix = interpolate(frame, [boss.from - 3, boss.from + 2, cta.from - 2, cta.from + 10], [0, 1, 1, 0], clamp);

  const cuts = timeline.segments.slice(1).map((s) => ({
    frame: s.from,
    color: s.kind === "boss" ? theme.boss.primary : theme.colors.primary,
    accent: s.kind === "boss" ? "#0a0a0a" : theme.colors.secondary,
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bgTop, overflow: "hidden" }}>
      <Background theme={theme} bossMix={bossMix} />

      {timeline.segments.map((seg, i) => (
        <Sequence key={i} from={seg.from} durationInFrames={seg.duration} name={sceneName(seg)}>
          <SceneFor seg={seg} episode={episode} theme={theme} />
        </Sequence>
      ))}

      <ProgressOverlay timeline={timeline} theme={theme} />
      <SwipeTransition cuts={cuts} />
      <AudioLayer episode={episode} timeline={timeline} />
    </AbsoluteFill>
  );
};

const SceneFor: React.FC<{ seg: Segment; episode: Episode; theme: Theme }> = ({ seg, episode, theme }) => {
  switch (seg.kind) {
    case "hook":
      return <HookScene episode={episode} theme={theme} segment={seg} />;
    case "level":
      return <LevelScene episode={episode} level={episode.levels[seg.levelIndex]} theme={theme} segment={seg} />;
    case "boss":
      return <BossScene episode={episode} theme={theme} segment={seg} />;
    case "cta":
      return <CtaScene episode={episode} theme={theme} segment={seg} />;
  }
};

function sceneName(seg: Segment) {
  if (seg.kind === "level") return `Level ${seg.levelIndex + 1}`;
  return seg.kind.toUpperCase();
}

/** Persistent 5-node progress indicator shown across all level scenes. */
const ProgressOverlay: React.FC<{ timeline: Timeline; theme: Theme }> = ({ timeline, theme }) => {
  const frame = useCurrentFrame();
  const levels = timeline.segments.filter((s) => s.kind === "level" || s.kind === "boss");
  const first = levels[0];
  const boss = levels[levels.length - 1];
  const cta = timeline.segments.find((s) => s.kind === "cta")!;

  const visible =
    interpolate(frame, [first.from, first.from + 8, cta.from - 4, cta.from], [0, 1, 1, 0], clamp) *
    interpolate(frame, [boss.from - 1, boss.from, boss.from + boss.cluesStart - 4, boss.from + boss.cluesStart + 4], [1, 0, 0, 1], clamp);
  if (visible <= 0) return null;

  const current = levels.findIndex((s) => frame >= s.from && frame < s.from + s.duration);
  const completed = levels.filter((s) => frame >= s.from + s.revealStart + 4).length;

  return (
    <div
      style={{
        position: "absolute",
        top: LAYOUT.progressTop,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: visible,
      }}
    >
      <ProgressTrack theme={theme} current={current} completed={completed} width={720} nodeSize={66} />
    </div>
  );
};
