import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { AnswerBanner } from "../components/AnswerBanner";
import { CLUE_STAGGER, ClueGrid } from "../components/ClueGrid";
import { LevelHeader } from "../components/LevelHeader";
import { SceneFrame } from "../components/SceneFrame";
import type { Segment } from "../engine/timeline";
import type { Episode, Level } from "../schema/episode";
import { DIFFICULTY_LABELS, type Theme } from "../themes";

interface Props {
  episode: Episode;
  level: Level;
  theme: Theme;
  segment: Segment;
}


export const LevelScene: React.FC<Props> = ({ episode, level, theme, segment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chipColor = theme.difficultyColors[level.difficulty];
  const lastSecond = frame >= segment.revealStart - fps && frame < segment.revealStart;

  return (
    <SceneFrame duration={segment.duration} shakeIntensity={lastSecond ? 3 : 0}>
      <LevelHeader
        title={`УРОВЕНЬ ${segment.levelIndex + 1}`}
        question={level.question ?? episode.question}
        chipLabel={DIFFICULTY_LABELS[level.difficulty]}
        chipColor={chipColor}
        glowColor={theme.colors.primary}
      />

      <ClueGrid
        clues={level.clues}
        cluesStart={segment.cluesStart}
        stagger={CLUE_STAGGER}
        dimAt={segment.revealStart}
        borderColor={chipColor}
        glowColor={theme.colors.primary}
      />

      <AnswerBanner
        start={segment.revealStart}
        label="ОТВЕТ"
        text={level.answer}
        background={theme.colors.accent}
        burstColors={[theme.colors.accent, theme.colors.primary, theme.colors.secondary, "#ffffff"]}
        rotate={segment.levelIndex % 2 ? 4 : -4}
      />
    </SceneFrame>
  );
};
