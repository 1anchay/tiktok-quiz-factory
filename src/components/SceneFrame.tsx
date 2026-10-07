import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { segmentTransition, shake } from "../animations";

interface Props {
  duration: number;
  shakeIntensity?: number;
  children: React.ReactNode;
}

/** Wraps every scene with the shared enter/exit motion and optional camera shake. */
export const SceneFrame: React.FC<Props> = ({ duration, shakeIntensity = 0, children }) => {
  const frame = useCurrentFrame();
  const t = segmentTransition(frame, duration);
  const s = shake(frame, shakeIntensity);

  return (
    <AbsoluteFill
      style={{
        opacity: t.opacity,
        transform: `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg) scale(${t.scale})`,
        filter: t.blur > 0.5 ? `blur(${t.blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
