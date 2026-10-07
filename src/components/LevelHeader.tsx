import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, SPRINGS } from "../animations";
import { LAYOUT } from "../engine/layout";
import { FONTS } from "../themes/fonts";
import { fitFontSize, punchyTextShadow, rgba } from "../utils/style";
import { GlitchText } from "./GlitchText";

interface Props {
  title: string;
  question: string;
  chipLabel: string;
  chipColor: string;
  glowColor: string;
  delay?: number;
  glitch?: boolean;
}

/** "УРОВЕНЬ 1" slam + difficulty chip + question line. */
export const LevelHeader: React.FC<Props> = ({ title, question, chipLabel, chipColor, glowColor, delay = 0, glitch = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = pop(frame, fps, delay, SPRINGS.heavy);
  const sub = pop(frame, fps, delay + 6, SPRINGS.snappy);
  const titleSize = fitFontSize(title, { maxWidth: LAYOUT.contentWidth, maxSize: 112, minSize: 64 });

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: LAYOUT.headerTop,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${interpolate(slam, [0, 1], [2.4, 1])})`,
          opacity: Math.min(1, slam * 2),
        }}
      >
        {glitch ? (
          <div style={{ textShadow: punchyTextShadow(glowColor, 9) }}>
            <GlitchText text={title} fontFamily={FONTS.display} fontSize={titleSize} intensity={0.35} />
          </div>
        ) : (
          <div
            style={{
              fontFamily: FONTS.display,
              fontWeight: 900,
              fontSize: titleSize,
              lineHeight: 1,
              color: "#ffffff",
              letterSpacing: -1,
              textShadow: punchyTextShadow(glowColor, 9),
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: LAYOUT.questionTop,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          transform: `translateY(${(1 - sub) * 40}px)`,
          opacity: sub,
        }}
      >
        <div
          style={{
            padding: "10px 24px",
            borderRadius: 999,
            background: chipColor,
            fontFamily: FONTS.display,
            fontWeight: 800,
            fontSize: 30,
            color: "#0a0a14",
            boxShadow: `0 5px 0 rgba(0,0,0,0.45), 0 0 26px ${rgba(chipColor, 0.7)}`,
          }}
        >
          {chipLabel}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: 48,
            color: "#ffffff",
            letterSpacing: 1,
            textShadow: "0 4px 0 rgba(0,0,0,0.5)",
          }}
        >
          {question}
        </div>
      </div>
    </>
  );
};
