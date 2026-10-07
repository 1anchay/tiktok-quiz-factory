import React from "react";
import { AbsoluteFill, interpolateColors, useCurrentFrame } from "remotion";
import type { Theme } from "../themes";
import { rgba } from "../utils/style";
import { Particles } from "./Particles";

interface Props {
  theme: Theme;
  /** 0 = normal palette, 1 = boss palette. */
  bossMix: number;
}

/** Persistent animated backdrop: gradient sky, glowing orbs, synthwave grid floor, particles, scanlines. */
export const Background: React.FC<Props> = ({ theme, bossMix }) => {
  const frame = useCurrentFrame();
  const mix = (a: string, b: string) => interpolateColors(bossMix, [0, 1], [a, b]);

  const top = mix(theme.colors.bgTop, theme.boss.bgTop);
  const bottom = mix(theme.colors.bgBottom, theme.boss.bgBottom);
  const grid = mix(theme.colors.grid, theme.boss.grid);
  const orbA = mix(theme.colors.primary, theme.boss.primary);
  const orbB = mix(theme.colors.secondary, theme.boss.secondary);

  const gridScroll = (frame * (3 + bossMix * 5)) % 80;
  const orbDrift = Math.sin(frame / 50) * 60;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 62%, ${top} 100%)` }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${30 + orbDrift / 20}% 22%, ${rgba(orbA, 0.35)} 0%, transparent 42%),
                       radial-gradient(circle at ${75 - orbDrift / 25}% 48%, ${rgba(orbB, 0.28)} 0%, transparent 40%)`,
        }}
      />

      {/* Horizon glow */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1180,
          height: 6,
          background: grid,
          boxShadow: `0 0 40px 12px ${rgba(grid, 0.55)}, 0 0 160px 50px ${rgba(grid, 0.25)}`,
          opacity: 0.85,
        }}
      />

      {/* Perspective grid floor */}
      <div
        style={{
          position: "absolute",
          left: -540,
          right: -540,
          top: 1183,
          height: 900,
          perspective: 420,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: "rotateX(62deg)",
            transformOrigin: "50% 0%",
            backgroundImage: `linear-gradient(${rgba(grid, 0.7)} 2px, transparent 2px), linear-gradient(90deg, ${rgba(grid, 0.55)} 2px, transparent 2px)`,
            backgroundSize: "80px 80px",
            backgroundPosition: `0 ${gridScroll}px`,
            maskImage: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, black 55%)",
          }}
        />
      </div>

      <Particles theme={theme} bossMix={bossMix} />

      {/* Scanlines + vignette */}
      <AbsoluteFill
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 5px)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 45%, transparent 45%, ${rgba("#000000", 0.55 + bossMix * 0.25)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
