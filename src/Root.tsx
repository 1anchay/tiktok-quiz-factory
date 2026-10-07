import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { QuizEpisode } from "./compositions/QuizEpisode";
import { buildTimeline, VIDEO } from "./engine/timeline";
import type { QuizEpisodeProps } from "./engine/types";
import { EPISODES } from "./generated/episodes";

const ERROR_DURATION = VIDEO.fps * 5;

const calculateMetadata: CalculateMetadataFunction<QuizEpisodeProps> = ({ props }) => ({
  durationInFrames: props.episode ? buildTimeline(props.episode, VIDEO.fps).durationInFrames : ERROR_DURATION,
});

/**
 * `QuizEpisode` is the generic composition used by the render scripts (episode passed via inputProps).
 * Every JSON in episodes/ is additionally registered under its own id for previewing in Studio.
 */
export const RemotionRoot: React.FC = () => {
  const first = EPISODES.find((e) => e.episode) ?? EPISODES[0];

  return (
    <>
      <Composition
        id="QuizEpisode"
        component={QuizEpisode}
        width={VIDEO.width}
        height={VIDEO.height}
        fps={VIDEO.fps}
        durationInFrames={ERROR_DURATION}
        defaultProps={{ episode: first?.episode ?? null, errors: first?.errors ?? ["No episodes found in episodes/"] }}
        calculateMetadata={calculateMetadata}
      />
      {EPISODES.map((entry) => (
        <Composition
          key={entry.id}
          id={entry.id}
          component={QuizEpisode}
          width={VIDEO.width}
          height={VIDEO.height}
          fps={VIDEO.fps}
          durationInFrames={ERROR_DURATION}
          defaultProps={{ episode: entry.episode, errors: entry.errors }}
          calculateMetadata={calculateMetadata}
        />
      ))}
    </>
  );
};
