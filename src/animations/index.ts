import { Easing, interpolate, random, spring, type SpringConfig } from "remotion";

export const SPRINGS = {
  pop: { damping: 11, stiffness: 180, mass: 0.7 } satisfies Partial<SpringConfig>,
  snappy: { damping: 16, stiffness: 260, mass: 0.6 } satisfies Partial<SpringConfig>,
  heavy: { damping: 9, stiffness: 120, mass: 1.2 } satisfies Partial<SpringConfig>,
  soft: { damping: 200 } satisfies Partial<SpringConfig>,
};

export function pop(frame: number, fps: number, delay = 0, config: Partial<SpringConfig> = SPRINGS.pop) {
  return spring({ frame: frame - delay, fps, config });
}

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function fadeIn(frame: number, start: number, length = 8) {
  return interpolate(frame, [start, start + length], [0, 1], clamp);
}

export function fadeOut(frame: number, end: number, length = 8) {
  return interpolate(frame, [end - length, end], [1, 0], clamp);
}

/** Deterministic camera shake. `intensity` in px. */
export function shake(frame: number, intensity: number, seed = "shake") {
  if (intensity <= 0) return { x: 0, y: 0, r: 0 };
  return {
    x: (random(`${seed}-x-${frame}`) - 0.5) * 2 * intensity,
    y: (random(`${seed}-y-${frame}`) - 0.5) * 2 * intensity,
    r: (random(`${seed}-r-${frame}`) - 0.5) * intensity * 0.08,
  };
}

/** 0..1 sine pulse. */
export function pulse(frame: number, periodFrames: number, phase = 0) {
  return (Math.sin(((frame + phase) / periodFrames) * Math.PI * 2) + 1) / 2;
}

/** Segment enter/exit: punchy zoom + blur in, quick zoom out. */
export function segmentTransition(frame: number, duration: number) {
  const enter = interpolate(frame, [0, 9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const exit = interpolate(frame, [duration - 7, duration], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return {
    opacity: enter * (1 - exit),
    scale: interpolate(enter, [0, 1], [1.12, 1]) * interpolate(exit, [0, 1], [1, 0.92]),
    blur: (1 - enter) * 14 + exit * 10,
  };
}
