import React, { useMemo } from "react";
import { AbsoluteFill, interpolateColors, random, useCurrentFrame } from "remotion";
import { VIDEO } from "../engine/timeline";
import type { Theme } from "../themes";

const COUNT = 46;

/** Floating glow particles; in boss mode they turn into fast rising embers. */
export const Particles: React.FC<{ theme: Theme; bossMix: number }> = ({ theme, bossMix }) => {
  const frame = useCurrentFrame();

  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: random(`px-${i}`) * VIDEO.width,
        y: random(`py-${i}`) * VIDEO.height,
        size: 3 + random(`ps-${i}`) * 9,
        speed: 0.6 + random(`pv-${i}`) * 1.8,
        sway: 10 + random(`pw-${i}`) * 40,
        phase: random(`pp-${i}`) * Math.PI * 2,
        hue: random(`ph-${i}`) > 0.5,
      })),
    [],
  );

  return (
    <AbsoluteFill>
      {seeds.map((p, i) => {
        const speed = p.speed * (1 + bossMix * 2.2);
        const y = (((p.y - frame * speed * 2) % VIDEO.height) + VIDEO.height) % VIDEO.height;
        const x = p.x + Math.sin(frame / 30 + p.phase) * p.sway;
        const normal = p.hue ? theme.colors.primary : theme.colors.secondary;
        const boss = p.hue ? theme.boss.ember : theme.boss.secondary;
        const color = interpolateColors(bossMix, [0, 1], [normal, boss]);
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(frame / 18 + p.phase));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: color,
              opacity: twinkle * 0.8,
              boxShadow: `0 0 ${p.size * 2.5}px ${color}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
