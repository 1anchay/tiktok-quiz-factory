import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, pulse, SPRINGS } from "../animations";
import { Burst } from "../components/Burst";
import { SceneFrame } from "../components/SceneFrame";
import type { Segment } from "../engine/timeline";
import type { Episode } from "../schema/episode";
import type { Theme } from "../themes";
import { FONTS } from "../themes/fonts";
import { fitFontSize, glow, punchyTextShadow, rgba } from "../utils/style";

interface Props {
  episode: Episode;
  theme: Theme;
  segment: Segment;
}

function splitHeadline(text: string): [string, string?] {
  const idx = text.indexOf("?");
  if (idx > 0 && idx < text.length - 1) return [text.slice(0, idx + 1).trim(), text.slice(idx + 1).trim()];
  return [text];
}

export const CtaScene: React.FC<Props> = ({ episode, theme, segment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [line1, line2] = splitHeadline(episode.cta.headline);

  const h1 = pop(frame, fps, 2, SPRINGS.heavy);
  const h2 = pop(frame, fps, 8, SPRINGS.heavy);
  const card = pop(frame, fps, 16, SPRINGS.pop);
  const sub = pop(frame, fps, 28, SPRINGS.snappy);
  const rolling = frame < 40;
  const scoreDigit = rolling ? String(Math.floor(frame / 3) % 6) : "?";

  return (
    <SceneFrame duration={segment.duration}>
      <Burst start={2} x={540} y={520} colors={[theme.colors.accent, theme.colors.primary, theme.colors.secondary]} count={36} />
      <div
        style={{
          position: "absolute",
          top: 220,
          bottom: 400,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontWeight: 900,
              fontSize: fitFontSize(line1, { maxWidth: 880, maxSize: 104, minSize: 56 }),
              color: "#ffffff",
              textShadow: punchyTextShadow(theme.colors.primary, 9),
              transform: `scale(${interpolate(h1, [0, 1], [2, 1])}) rotate(-2deg)`,
              opacity: Math.min(1, h1 * 2),
              whiteSpace: "nowrap",
            }}
          >
            {line1}
          </div>
          {line2 && (
            <div
              style={{
                fontFamily: FONTS.display,
                fontWeight: 900,
                fontSize: fitFontSize(line2, { maxWidth: 880, maxSize: 104, minSize: 56 }),
                color: theme.colors.accent,
                textShadow: punchyTextShadow(theme.colors.accent, 9),
                transform: `scale(${interpolate(h2, [0, 1], [2, 1]) * (1 + pulse(frame, 18) * 0.04)}) rotate(1deg)`,
                opacity: Math.min(1, h2 * 2),
                whiteSpace: "nowrap",
              }}
            >
              {line2}
            </div>
          )}
        </div>

        <div
          style={{
            transform: `scale(${card}) rotate(${(1 - card) * -10}deg)`,
            width: 760,
            padding: "36px 40px 40px",
            borderRadius: 48,
            background: `linear-gradient(160deg, ${rgba(theme.colors.card, 0.95)}, ${rgba("#000000", 0.85)})`,
            border: `6px solid ${theme.colors.primary}`,
            boxShadow: `0 24px 60px rgba(0,0,0,0.6), ${glow(theme.colors.primary, 0.7)}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: 46, color: "#ffffff", textAlign: "center" }}>
            {episode.cta.question}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", fontFamily: FONTS.display, fontWeight: 900, lineHeight: 1 }}>
            <span style={{ fontSize: 200, color: theme.colors.accent, textShadow: punchyTextShadow(theme.colors.accent, 10) }}>{scoreDigit}</span>
            <span style={{ fontSize: 130, color: "#ffffff", opacity: 0.9 }}>/5</span>
          </div>
        </div>

        <div
          style={{
            transform: `translateY(${(1 - sub) * 80}px) scale(${sub * (1 + pulse(frame, 14) * 0.05)})`,
            maxWidth: 860,
            padding: "26px 44px",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${theme.colors.secondary}, ${theme.colors.primary})`,
            fontFamily: FONTS.display,
            fontWeight: 900,
            fontSize: 36,
            lineHeight: 1.2,
            color: "#ffffff",
            textAlign: "center",
            textShadow: "0 4px 0 rgba(0,0,0,0.35)",
            boxShadow: `0 10px 0 rgba(0,0,0,0.45), 0 0 50px ${rgba(theme.colors.secondary, 0.6)}`,
          }}
        >
          {episode.cta.subscribe}
        </div>
      </div>
    </SceneFrame>
  );
};
