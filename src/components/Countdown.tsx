import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, pop, SPRINGS } from "../animations";
import { FONTS } from "../themes/fonts";
import { glow, rgba } from "../utils/style";

interface Props {
  start: number;
  seconds: number;
  colors: string[];
  size?: number;
}

/** Circular 3–2–1 timer with a depleting ring and a punch on every tick. */
export const Countdown: React.FC<Props> = ({ start, seconds, colors, size = 260 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - start;
  const end = seconds * fps;
  if (local < 0 || local >= end + 6) return null;

  const elapsedSec = Math.min(seconds - 1, Math.floor(local / fps));
  const value = seconds - elapsedSec;
  const tickFrame = local - elapsedSec * fps;
  const color = colors[Math.min(colors.length - 1, Math.max(0, colors.length - value))];

  const appear = pop(frame, fps, start, SPRINGS.snappy);
  const punch = pop(tickFrame, fps, 0, SPRINGS.pop);
  const numScale = interpolate(punch, [0, 1], [1.8, 1]);
  const progress = 1 - Math.min(1, local / end);
  const exit = interpolate(local, [end, end + 6], [1, 0], clamp);
  const ringWidth = 18;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        transform: `scale(${appear * exit})`,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 0 10px rgba(0,0,0,0.35), 0 20px 60px rgba(0,0,0,0.6), ${glow(color, 0.9)}`,
        background: `conic-gradient(${color} ${progress * 360}deg, ${rgba("#ffffff", 0.12)} 0deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: ringWidth,
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 35%, #1d2347, #070a1c)",
        }}
      />
      <div
        style={{
          position: "relative",
          fontFamily: FONTS.display,
          fontWeight: 900,
          fontSize: size * 0.58,
          lineHeight: 1,
          color: "#fff",
          transform: `scale(${numScale})`,
          textShadow: `0 8px 0 rgba(0,0,0,0.5), ${glow(color, 1)}`,
        }}
      >
        {value}
      </div>
    </div>
  );
};
