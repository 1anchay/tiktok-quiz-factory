import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, pop, SPRINGS } from "../animations";
import { LAYOUT } from "../engine/layout";
import { VIDEO } from "../engine/timeline";
import { FONTS } from "../themes/fonts";
import { fitFontSize, rgba } from "../utils/style";
import { Burst } from "./Burst";

interface Props {
  start: number;
  label: string;
  text: string;
  background: string;
  textColor?: string;
  burstColors: string[];
  rotate?: number;
}

/** Slanted banner that slams across the grid with a light flash and confetti burst. */
export const AnswerBanner: React.FC<Props> = ({ start, label, text, background, textColor = "#0a0a14", burstColors, rotate = -4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) return null;

  const enter = pop(frame, fps, start, SPRINGS.snappy);
  const labelEnter = pop(frame, fps, start + 4, SPRINGS.pop);
  const flash = interpolate(frame, [start, start + 10], [0.85, 0], clamp);
  const fontSize = fitFontSize(text, { maxWidth: 820, maxSize: 118, minSize: 54 });

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: -60,
          right: -60,
          top: LAYOUT.gridCenterY - 130,
          height: 260,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateX(${(1 - enter) * -VIDEO.width}px) rotate(${rotate}deg) scale(${interpolate(enter, [0, 1], [1.3, 1])})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background,
            boxShadow: `0 0 0 8px #ffffff, 0 30px 80px rgba(0,0,0,0.6), 0 0 120px ${rgba(background, 0.7)}`,
          }}
        />
        <div
          style={{
            position: "relative",
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: 40,
            letterSpacing: 8,
            color: rgba(textColor === "#ffffff" ? "#ffffff" : "#0a0a14", 0.75),
            transform: `scale(${labelEnter})`,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            position: "relative",
            fontFamily: FONTS.display,
            fontWeight: 900,
            fontSize,
            lineHeight: 1.05,
            color: textColor,
            textAlign: "center",
            maxWidth: 860,
            textShadow: textColor === "#ffffff" ? "0 6px 0 rgba(0,0,0,0.45)" : "0 5px 0 rgba(255,255,255,0.35)",
          }}
        >
          {text}
        </div>
      </div>
      <Burst start={start} x={VIDEO.width / 2} y={LAYOUT.gridCenterY} colors={burstColors} />
      <div style={{ position: "absolute", inset: 0, background: "#ffffff", opacity: flash, pointerEvents: "none" }} />
    </>
  );
};
