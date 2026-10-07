import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, pulse, SPRINGS } from "../animations";
import { ProgressTrack } from "../components/ProgressTrack";
import { SceneFrame } from "../components/SceneFrame";
import type { Segment } from "../engine/timeline";
import type { Episode } from "../schema/episode";
import type { Theme } from "../themes";
import { FONTS } from "../themes/fonts";
import { fitFontSize, punchyTextShadow, rgba } from "../utils/style";

interface Props {
  episode: Episode;
  theme: Theme;
  segment: Segment;
}

const DECOR = [
  { left: -70, top: 250, rot: -14, size: 330 },
  { left: 800, top: 300, rot: 12, size: 320 },
  { left: -90, top: 1460, rot: 10, size: 300 },
  { left: 840, top: 1430, rot: -10, size: 310 },
];

export const HookScene: React.FC<Props> = ({ episode, theme, segment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = episode.hook.title.split(/\s+/);
  const issue = episode.id.match(/\d+/)?.[0];

  const decorImages = [...episode.levels.map((l) => l.clues[0]), episode.boss.clues[0]]
    .map((c) => c.image)
    .filter((x): x is string => Boolean(x))
    .slice(0, 4);

  const subEnter = pop(frame, fps, 6 + words.length * 4, SPRINGS.snappy);
  const chipEnter = pop(frame, fps, 0, SPRINGS.snappy);

  return (
    <SceneFrame duration={segment.duration}>
      {decorImages.map((src, i) => {
        const d = DECOR[i];
        const enter = pop(frame, fps, i * 3, SPRINGS.soft);
        return (
          <div
            key={src}
            style={{
              position: "absolute",
              left: d.left,
              top: d.top + Math.sin((frame + i * 20) / 20) * 14,
              width: d.size,
              height: d.size,
              borderRadius: 40,
              overflow: "hidden",
              transform: `rotate(${d.rot + Math.sin(frame / 30 + i) * 3}deg) scale(${enter})`,
              opacity: 0.55,
              border: `5px solid ${rgba(i % 2 ? theme.colors.secondary : theme.colors.primary, 0.9)}`,
              boxShadow: `0 0 50px ${rgba(i % 2 ? theme.colors.secondary : theme.colors.primary, 0.5)}`,
            }}
          >
            <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(1.5px) brightness(0.7)" }} />
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          top: 230,
          bottom: 420,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 54,
        }}
      >
        {issue && (
          <div
            style={{
              transform: `scale(${chipEnter})`,
              padding: "12px 30px",
              borderRadius: 999,
              border: `4px solid ${theme.colors.primary}`,
              background: rgba("#000000", 0.45),
              fontFamily: FONTS.display,
              fontWeight: 800,
              fontSize: 32,
              color: theme.colors.primary,
              letterSpacing: 4,
              boxShadow: `0 0 30px ${rgba(theme.colors.primary, 0.5)}`,
            }}
          >
            {`ВЫПУСК #${issue}`}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {words.map((word, i) => {
            const enter = pop(frame, fps, 4 + i * 4, SPRINGS.heavy);
            const hasDigit = /\d/.test(word);
            const size = hasDigit ? 210 : fitFontSize(word, { maxWidth: 860, maxSize: 138, minSize: 64, ratio: 1.08 });
            const wobble = hasDigit ? 1 + pulse(frame, 16) * 0.06 : 1;
            return (
              <div
                key={i}
                style={{
                  fontFamily: FONTS.display,
                  fontWeight: 900,
                  fontSize: size,
                  lineHeight: 1.02,
                  color: hasDigit ? theme.colors.accent : "#ffffff",
                  textShadow: punchyTextShadow(hasDigit ? theme.colors.accent : theme.colors.primary, hasDigit ? 12 : 9),
                  transform: `scale(${interpolate(enter, [0, 1], [2.2, 1]) * wobble}) rotate(${(i % 2 ? 1 : -1) * 2}deg)`,
                  opacity: Math.min(1, enter * 2),
                  whiteSpace: "nowrap",
                }}
              >
                {word}
              </div>
            );
          })}
        </div>

        {episode.hook.subtitle && (
          <div
            style={{
              transform: `translateY(${(1 - subEnter) * 60}px) rotate(-2deg) scale(${subEnter})`,
              padding: "20px 38px",
              borderRadius: 24,
              background: theme.colors.secondary,
              fontFamily: FONTS.display,
              fontWeight: 900,
              fontSize: fitFontSize(episode.hook.subtitle, { maxWidth: 780, maxSize: 46, minSize: 30 }),
              color: "#ffffff",
              textAlign: "center",
              boxShadow: `0 10px 0 rgba(0,0,0,0.45), 0 0 50px ${rgba(theme.colors.secondary, 0.6)}`,
              textShadow: "0 4px 0 rgba(0,0,0,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            {episode.hook.subtitle}
          </div>
        )}

        <div style={{ transform: `scale(${pop(frame, fps, 14, SPRINGS.soft)})` }}>
          <ProgressTrack theme={theme} current={-1} completed={0} width={820} nodeSize={88} animateIn />
        </div>
      </div>
    </SceneFrame>
  );
};
