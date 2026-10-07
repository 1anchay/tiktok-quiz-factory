import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { VIDEO } from "../engine/timeline";

interface Props {
  /** Absolute frames where scene cuts happen. */
  cuts: { frame: number; color: string; accent: string }[];
  halfLength?: number;
}

/** Skewed double-bar swipe that covers each hard cut between scenes. */
export const SwipeTransition: React.FC<Props> = ({ cuts, halfLength = 6 }) => {
  const frame = useCurrentFrame();
  const active = cuts.find((c) => Math.abs(frame - c.frame) <= halfLength);
  if (!active) return null;

  const p = interpolate(frame, [active.frame - halfLength, active.frame + halfLength], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
  });
  const travel = VIDEO.width * 3.2;
  const x = interpolate(p, [0, 1], [-VIDEO.width * 1.6, travel - VIDEO.width * 1.6]);

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: -400,
          bottom: -400,
          left: x - 260,
          width: 180,
          background: active.accent,
          transform: "skewX(-18deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -400,
          bottom: -400,
          left: x,
          width: VIDEO.width * 1.25,
          background: active.color,
          transform: "skewX(-18deg)",
        }}
      />
    </AbsoluteFill>
  );
};
