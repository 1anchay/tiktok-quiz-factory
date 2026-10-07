import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, pop } from "../animations";
import type { Clue } from "../schema/episode";
import { FONTS } from "../themes/fonts";
import { rgba } from "../utils/style";

interface Props {
  clue: Clue;
  index: number;
  size: number;
  /** Frame (relative to scene) at which the card pops in. */
  appearAt: number;
  /** Frame at which the answer is revealed (card dims). */
  dimAt?: number;
  borderColor: string;
  glowColor: string;
  boss?: boolean;
}

const TILTS = [-7, 6, 5, -6];

export const ClueCard: React.FC<Props> = ({ clue, index, size, appearAt, dimAt, borderColor, glowColor, boss }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = pop(frame, fps, appearAt);
  const settle = interpolate(enter, [0, 1], [TILTS[index] * 2.5, 0]);
  const float = Math.sin((frame + index * 17) / 22) * 6;
  const dim = dimAt !== undefined ? interpolate(frame, [dimAt, dimAt + 8], [0, 1], clamp) : 0;
  const flash = interpolate(frame, [appearAt, appearAt + 6], [1, 0], clamp) * (frame >= appearAt ? 1 : 0);
  const radius = 44;

  return (
    <div
      style={{
        width: size,
        height: size,
        transform: `translateY(${(1 - enter) * 160 + float}px) scale(${enter * (1 - dim * 0.06)}) rotate(${settle}deg)`,
        opacity: Math.min(1, enter * 1.4),
        borderRadius: radius,
        padding: 7,
        background: `linear-gradient(145deg, ${borderColor}, ${rgba(glowColor, 0.7)} 55%, ${borderColor})`,
        boxShadow: `0 24px 50px rgba(0,0,0,0.55), 0 0 ${boss ? 70 : 46}px ${rgba(glowColor, boss ? 0.65 : 0.45)}`,
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: radius - 7,
          overflow: "hidden",
          position: "relative",
          background: "#0b0f24",
          filter: `brightness(${1 - dim * 0.55}) saturate(${1 - dim * 0.6})`,
        }}
      >
        {clue.image ? (
          <Img src={staticFile(clue.image)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.08)" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: size * 0.5,
              background: `radial-gradient(circle, ${rgba(glowColor, 0.35)}, transparent 70%)`,
            }}
          >
            {clue.emoji}
          </div>
        )}
        {/* Glass highlight */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0.35) 100%)",
          }}
        />
        {boss && (
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle, transparent 45%, ${rgba("#ff1f3d", 0.45)} 100%)` }} />
        )}
        {clue.label && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "14px 16px",
              background: "linear-gradient(0deg, rgba(0,0,0,0.85), transparent)",
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: 34,
              color: "#fff",
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            {clue.label}
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "#ffffff", opacity: flash * 0.8 }} />
      </div>

      {/* Number badge */}
      <div
        style={{
          position: "absolute",
          top: -14,
          left: -14,
          width: 74,
          height: 74,
          borderRadius: "50%",
          background: borderColor,
          border: "5px solid #fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONTS.display,
          fontWeight: 900,
          fontSize: 36,
          color: "#0a0a14",
          boxShadow: `0 6px 0 rgba(0,0,0,0.4), 0 0 24px ${rgba(borderColor, 0.8)}`,
        }}
      >
        {index + 1}
      </div>
    </div>
  );
};
