import React from "react";
import { random, useCurrentFrame } from "remotion";

interface Props {
  text: string;
  fontFamily: string;
  fontSize: number;
  color?: string;
  intensity?: number;
  style?: React.CSSProperties;
}

/** RGB-split glitch text with random horizontal slice jitter. */
export const GlitchText: React.FC<Props> = ({ text, fontFamily, fontSize, color = "#ffffff", intensity = 1, style }) => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2);
  const jitter = (key: string) => (random(`${key}-${step}`) - 0.5) * 2 * 14 * intensity;
  const glitching = random(`g-${step}`) < 0.45 * intensity;

  const base: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    fontFamily,
    fontWeight: 900,
    fontSize,
    lineHeight: 1,
    textAlign: "center",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ position: "relative", fontFamily, fontWeight: 900, fontSize, lineHeight: 1, ...style }}>
      <span style={{ visibility: "hidden", whiteSpace: "nowrap" }}>{text}</span>
      <span style={{ ...base, color: "#00f0ff", transform: `translate(${jitter("c") - 6 * intensity}px, ${glitching ? jitter("cy") / 3 : 0}px)`, mixBlendMode: "screen", opacity: 0.85 }}>
        {text}
      </span>
      <span style={{ ...base, color: "#ff1f3d", transform: `translate(${jitter("m") + 6 * intensity}px, ${glitching ? jitter("my") / 3 : 0}px)`, mixBlendMode: "screen", opacity: 0.9 }}>
        {text}
      </span>
      <span
        style={{
          ...base,
          color,
          textShadow: "0 10px 0 rgba(0,0,0,0.55)",
          clipPath: glitching ? `inset(${random(`t-${step}`) * 60}% 0 ${random(`b-${step}`) * 30}% 0)` : undefined,
          transform: glitching ? `translateX(${jitter("w")}px)` : undefined,
        }}
      >
        {text}
      </span>
      {glitching && <span style={{ ...base, color, transform: `translateX(${-jitter("w2")}px)`, clipPath: `inset(0 0 ${40 + random(`k-${step}`) * 40}% 0)` }}>{text}</span>}
    </div>
  );
};
