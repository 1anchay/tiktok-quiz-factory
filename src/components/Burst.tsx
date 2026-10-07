import React from "react";
import { Easing, interpolate, random, useCurrentFrame } from "remotion";
import { clamp } from "../animations";

interface Props {
  start: number;
  x: number;
  y: number;
  colors: string[];
  count?: number;
  duration?: number;
  spread?: number;
}

/** Deterministic confetti / shard explosion. */
export const Burst: React.FC<Props> = ({ start, x, y, colors, count = 42, duration = 34, spread = 720 }) => {
  const frame = useCurrentFrame();
  const local = frame - start;
  if (local < 0 || local > duration) return null;

  const t = interpolate(local, [0, duration], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = random(`ba-${i}`) * Math.PI * 2;
        const dist = (0.35 + random(`bd-${i}`) * 0.65) * spread;
        const gravity = local * local * 0.35;
        const px = x + Math.cos(angle) * dist * t;
        const py = y + Math.sin(angle) * dist * t + gravity;
        const w = 12 + random(`bw-${i}`) * 18;
        const h = w * (random(`bh-${i}`) > 0.5 ? 0.45 : 1);
        const rot = random(`br-${i}`) * 720 * t;
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px - w / 2,
              top: py - h / 2,
              width: w,
              height: h,
              borderRadius: h === w ? "50%" : 3,
              background: color,
              transform: `rotate(${rot}deg)`,
              opacity: 1 - t * 0.9,
              boxShadow: `0 0 12px ${color}`,
            }}
          />
        );
      })}
    </>
  );
};
