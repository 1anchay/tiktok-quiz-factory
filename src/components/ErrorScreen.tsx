import React from "react";
import { AbsoluteFill } from "remotion";

/** Shown in Studio when an episode JSON is invalid or references missing assets. */
export const ErrorScreen: React.FC<{ errors: string[] }> = ({ errors }) => (
  <AbsoluteFill
    style={{
      background: "#1a0306",
      color: "#fff",
      padding: 80,
      paddingTop: 220,
      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
      gap: 28,
    }}
  >
    <div style={{ fontSize: 72, fontWeight: 900, color: "#ff4d63" }}>EPISODE ERROR</div>
    <div style={{ fontSize: 34, opacity: 0.8 }}>Fix the episode JSON / assets and run `npm run sync`.</div>
    <ul style={{ margin: 0, paddingLeft: 36, display: "flex", flexDirection: "column", gap: 18 }}>
      {errors.map((e, i) => (
        <li key={i} style={{ fontSize: 30, lineHeight: 1.35, wordBreak: "break-all" }}>
          {e}
        </li>
      ))}
    </ul>
  </AbsoluteFill>
);
