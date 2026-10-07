import type { Episode } from "../schema/episode";

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

/** Frames between consecutive clue cards popping in. */
export const CLUE_STAGGER = 10;

export const DEFAULT_TIMING = {
  hook: 2.6,
  levelIntro: 1.2,
  countdown: 3,
  reveal: 1.1,
  bossIntro: 1.3,
  bossOutro: 1.4,
  cta: 3.6,
} as const;

export type SegmentKind = "hook" | "level" | "boss" | "cta";

export interface Segment {
  kind: SegmentKind;
  /** 0-based level index (0-3 for levels, 4 for boss). -1 for hook/cta. */
  levelIndex: number;
  from: number;
  duration: number;
  /** Frames relative to segment start. Only meaningful for level/boss. */
  cluesStart: number;
  countdownStart: number;
  countdownSeconds: number;
  revealStart: number;
}

export interface Timeline {
  fps: number;
  segments: Segment[];
  durationInFrames: number;
  keyFrames: {
    hook: number;
    level1: number;
    level1Reveal: number;
    boss: number;
    bossIntro: number;
    bossReveal: number;
    ending: number;
  };
}

export function resolveTiming(episode: Episode) {
  return { ...DEFAULT_TIMING, ...stripUndefined(episode.timing) };
}

export function buildTimeline(episode: Episode, fps: number = VIDEO.fps): Timeline {
  const t = resolveTiming(episode);
  const f = (seconds: number) => Math.round(seconds * fps);

  const segments: Segment[] = [];
  let cursor = 0;

  const push = (seg: Omit<Segment, "from">) => {
    segments.push({ ...seg, from: cursor });
    cursor += seg.duration;
  };

  push({
    kind: "hook",
    levelIndex: -1,
    duration: f(t.hook),
    cluesStart: 0,
    countdownStart: 0,
    countdownSeconds: 0,
    revealStart: 0,
  });

  episode.levels.forEach((_, i) => {
    const intro = f(t.levelIntro);
    const countdown = t.countdown * fps;
    push({
      kind: "level",
      levelIndex: i,
      duration: intro + countdown + f(t.reveal),
      cluesStart: Math.round(intro * 0.25),
      countdownStart: intro,
      countdownSeconds: t.countdown,
      revealStart: intro + countdown,
    });
  });

  {
    const intro = f(t.bossIntro);
    const cluesPhase = f(1.0);
    const countdown = t.countdown * fps;
    push({
      kind: "boss",
      levelIndex: 4,
      duration: intro + cluesPhase + countdown + f(t.bossOutro),
      cluesStart: intro,
      countdownStart: intro + cluesPhase,
      countdownSeconds: t.countdown,
      revealStart: intro + cluesPhase + countdown,
    });
  }

  push({
    kind: "cta",
    levelIndex: -1,
    duration: f(t.cta),
    cluesStart: 0,
    countdownStart: 0,
    countdownSeconds: 0,
    revealStart: 0,
  });

  const hook = segments[0];
  const level1 = segments[1];
  const boss = segments[5];
  const cta = segments[6];

  return {
    fps,
    segments,
    durationInFrames: cursor,
    keyFrames: {
      hook: hook.from + Math.round(hook.duration * 0.7),
      level1: level1.from + level1.countdownStart + Math.round(fps * 0.4),
      level1Reveal: level1.from + level1.revealStart + Math.round(fps * 0.6),
      bossIntro: boss.from + Math.round(boss.cluesStart * 0.55),
      boss: boss.from + boss.countdownStart + Math.round(fps * 1.4),
      bossReveal: boss.from + boss.revealStart + Math.round(fps * 0.7),
      ending: cta.from + Math.round(cta.duration * 0.75),
    },
  };
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
