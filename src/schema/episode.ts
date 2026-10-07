import { z } from "zod";

/** Path relative to the `assets/` folder, e.g. `images/minecraft/tnt.jpg`. */
const assetPath = z
  .string()
  .min(1)
  .refine((p) => !p.startsWith("/") && !p.includes(".."), {
    message: "Asset paths must be relative to assets/ (no leading slash, no '..')",
  });

export const DifficultySchema = z.enum(["easy", "medium", "hard", "expert", "boss"]);

export const ClueSchema = z
  .object({
    image: assetPath.optional(),
    emoji: z.string().min(1).max(8).optional(),
    label: z.string().max(24).optional(),
  })
  .refine((c) => Boolean(c.image || c.emoji), {
    message: "Each clue needs either `image` or `emoji`",
  });

export const LevelSchema = z.object({
  answer: z.string().min(1).max(40),
  clues: z.array(ClueSchema).length(4, "Each level needs exactly 4 clues"),
  difficulty: DifficultySchema.default("medium"),
  question: z.string().max(60).optional(),
});

export const BossSchema = LevelSchema.extend({
  difficulty: DifficultySchema.default("boss"),
  title: z.string().max(20).default("BOSS"),
  subtitle: z.string().max(40).default("ФИНАЛЬНЫЙ УРОВЕНЬ"),
  revealAnswer: z.boolean().default(false),
  commentPrompt: z.string().max(48).default("ПИШИ ОТВЕТ В КОММЕНТАХ"),
});

export const MusicSchema = z.object({
  track: assetPath.optional(),
  bossTrack: assetPath.optional(),
  volume: z.number().min(0).max(1).default(0.45),
  sfxVolume: z.number().min(0).max(1).default(0.8),
});

export const CtaSchema = z.object({
  headline: z.string().max(40).default("ЗНАЕШЬ BOSS? ПИШИ ОТВЕТ"),
  question: z.string().max(40).default("СКОЛЬКО У ТЕБЯ ИЗ 5?"),
  subscribe: z.string().max(60).default("ПОДПИШИСЬ — ПРОДОЛЖЕНИЕ В СЛЕДУЮЩЕМ ВЫПУСКЕ"),
});

/** All values in seconds. Every field is optional and falls back to engine defaults. */
export const TimingSchema = z.object({
  hook: z.number().min(1).max(6).optional(),
  levelIntro: z.number().min(0.5).max(3).optional(),
  countdown: z.number().int().min(2).max(5).optional(),
  reveal: z.number().min(0.5).max(3).optional(),
  bossIntro: z.number().min(0.5).max(3).optional(),
  bossOutro: z.number().min(0.5).max(3).optional(),
  cta: z.number().min(2).max(6).optional(),
});

export const EpisodeSchema = z.object({
  $schema: z.string().optional(),
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/, "id may only contain lowercase letters, digits and dashes"),
  series: z.string().min(1),
  format: z.literal("five-levels").default("five-levels"),
  hook: z.object({
    title: z.string().min(1).max(60),
    subtitle: z.string().max(60).optional(),
  }),
  theme: z.string().default("neon-arcade"),
  question: z.string().max(60).default("УГАДАЙ ИГРУ"),
  levels: z.array(LevelSchema).length(4, "Format `five-levels` needs exactly 4 regular levels + boss"),
  boss: BossSchema,
  music: MusicSchema.default({ volume: 0.45, sfxVolume: 0.8 }),
  cta: CtaSchema.default({
    headline: "ЗНАЕШЬ BOSS? ПИШИ ОТВЕТ",
    question: "СКОЛЬКО У ТЕБЯ ИЗ 5?",
    subscribe: "ПОДПИШИСЬ — ПРОДОЛЖЕНИЕ В СЛЕДУЮЩЕМ ВЫПУСКЕ",
  }),
  timing: TimingSchema.default({}),
  /** Free-form metadata reserved for future pipeline stages (AI generation, A/B tests, analytics). */
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type Clue = z.infer<typeof ClueSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type Boss = z.infer<typeof BossSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
export type EpisodeInput = z.input<typeof EpisodeSchema>;

export function formatZodError(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const where = issue.path.length ? issue.path.join(".") : "(root)";
    return `${where}: ${issue.message}`;
  });
}

/** Every asset path an episode references, relative to `assets/`. */
export function collectAssetRefs(episode: Episode): string[] {
  const refs = new Set<string>();
  for (const level of [...episode.levels, episode.boss]) {
    for (const clue of level.clues) if (clue.image) refs.add(clue.image);
  }
  if (episode.music.track) refs.add(episode.music.track);
  if (episode.music.bossTrack) refs.add(episode.music.bossTrack);
  return [...refs];
}
