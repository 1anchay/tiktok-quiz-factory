import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { pop, pulse } from "../animations";
import type { Theme } from "../themes";
import { FONTS } from "../themes/fonts";
import { glow, rgba } from "../utils/style";

interface Props {
  theme: Theme;
  /** Index of the active level (0-4), or -1 for none. */
  current: number;
  /** How many levels are fully completed. */
  completed: number;
  width?: number;
  nodeSize?: number;
  /** Stagger nodes in on mount. */
  animateIn?: boolean;
}

export const ProgressTrack: React.FC<Props> = ({
  theme,
  current,
  completed,
  width = 760,
  nodeSize = 72,
  animateIn = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nodes = [0, 1, 2, 3, 4];
  const bossSize = nodeSize * 1.3;
  const gap = (width - nodeSize * 4 - bossSize) / 4;
  const fillRatio = Math.min(1, Math.max(0, (Math.max(completed, current) ) / 4));

  return (
    <div style={{ position: "relative", width, height: bossSize, display: "flex", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          left: nodeSize / 2,
          right: bossSize / 2,
          height: 10,
          borderRadius: 5,
          background: rgba("#ffffff", 0.14),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: nodeSize / 2,
          width: `calc(${fillRatio} * (100% - ${nodeSize / 2 + bossSize / 2}px))`,
          height: 10,
          borderRadius: 5,
          background: `linear-gradient(90deg, ${theme.colors.success}, ${theme.colors.primary})`,
          boxShadow: glow(theme.colors.primary, 0.5),
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap, position: "relative" }}>
        {nodes.map((i) => {
          const isBoss = i === 4;
          const done = i < completed;
          const active = i === current;
          const size = isBoss ? bossSize : nodeSize;
          const enter = animateIn ? pop(frame, fps, 4 + i * 4) : 1;
          const beat = active ? 1 + pulse(frame, 20) * 0.12 : 1;
          const color = isBoss ? theme.boss.primary : done ? theme.colors.success : active ? theme.colors.primary : "#ffffff";

          return (
            <div
              key={i}
              style={{
                width: size,
                height: size,
                transform: `scale(${enter * beat}) rotate(${isBoss ? 45 : 0}deg)`,
                borderRadius: isBoss ? 18 : "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: done || active || isBoss ? color : rgba("#0b1028", 0.9),
                border: `5px solid ${done || active || isBoss ? "#ffffff" : rgba("#ffffff", 0.35)}`,
                boxShadow: done || active || isBoss ? glow(color, active ? 1.1 : 0.6) : "none",
              }}
            >
              <div
                style={{
                  transform: `rotate(${isBoss ? -45 : 0}deg)`,
                  fontFamily: FONTS.display,
                  fontWeight: 900,
                  fontSize: isBoss ? size * 0.2 : size * 0.42,
                  color: done || active || isBoss ? "#0a0a14" : rgba("#ffffff", 0.7),
                  letterSpacing: isBoss ? 1 : 0,
                }}
              >
                {isBoss ? (done ? <span style={{ fontSize: size * 0.5 }}>?</span> : "BOSS") : done ? <Check size={size * 0.5} /> : i + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Check: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#0a0a14" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
