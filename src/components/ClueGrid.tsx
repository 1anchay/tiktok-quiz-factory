import React from "react";
import { LAYOUT } from "../engine/layout";
import type { Clue } from "../schema/episode";
import { ClueCard } from "./ClueCard";

interface Props {
  clues: Clue[];
  cluesStart: number;
  stagger: number;
  dimAt?: number;
  borderColor: string;
  glowColor: string;
  boss?: boolean;
}

export { CLUE_STAGGER } from "../engine/timeline";

export const ClueGrid: React.FC<Props> = ({ clues, cluesStart, stagger, dimAt, borderColor, glowColor, boss }) => (
  <div
    style={{
      position: "absolute",
      top: LAYOUT.gridTop,
      left: LAYOUT.gridLeft,
      width: LAYOUT.gridWidth,
      display: "flex",
      flexWrap: "wrap",
      gap: LAYOUT.gridGap,
    }}
  >
    {clues.map((clue, i) => (
      <ClueCard
        key={i}
        clue={clue}
        index={i}
        size={LAYOUT.cardSize}
        appearAt={cluesStart + i * stagger}
        dimAt={dimAt}
        borderColor={borderColor}
        glowColor={glowColor}
        boss={boss}
      />
    ))}
  </div>
);
