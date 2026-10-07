import fs from "node:fs";
import path from "node:path";
import { SOUND_PACK } from "../../src/audio/sound-pack";
import { EpisodeSchema, collectAssetRefs, formatZodError, type Episode } from "../../src/schema/episode";
import { ASSETS_DIR, EPISODES_DIR } from "./paths";

export class EpisodeError extends Error {
  constructor(
    public readonly episodeId: string,
    public readonly problems: string[],
  ) {
    super(`Episode "${episodeId}" is invalid:\n${problems.map((p) => `  • ${p}`).join("\n")}`);
    this.name = "EpisodeError";
  }
}

export interface LoadedEpisode {
  id: string;
  file: string;
  raw: string;
  episode: Episode;
}

export function listEpisodeIds(): string[] {
  if (!fs.existsSync(EPISODES_DIR)) return [];
  return fs
    .readdirSync(EPISODES_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".schema.json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export function normalizeEpisodeId(arg: string | undefined): string {
  if (!arg) {
    throw new Error("Missing episode id. Usage: npm run make -- episode-001");
  }
  return path.basename(arg).replace(/\.json$/, "");
}

export function episodeFile(id: string) {
  return path.join(EPISODES_DIR, `${id}.json`);
}

export function findMissingAssets(episode: Episode): string[] {
  return [...collectAssetRefs(episode), ...Object.values(SOUND_PACK)]
    .map((ref) => path.join(ASSETS_DIR, ref))
    .filter((abs) => !fs.existsSync(abs));
}

/** Parses + validates an episode. Throws EpisodeError with precise, human-readable problems. */
export function loadEpisode(id: string, { checkAssets = true } = {}): LoadedEpisode {
  const file = episodeFile(id);
  if (!fs.existsSync(file)) {
    const available = listEpisodeIds();
    throw new EpisodeError(id, [
      `File not found: ${file}`,
      available.length ? `Available episodes: ${available.join(", ")}` : "No episodes found in episodes/",
    ]);
  }

  const raw = fs.readFileSync(file, "utf8");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new EpisodeError(id, [`Invalid JSON in ${file}: ${(err as Error).message}`]);
  }

  const parsed = EpisodeSchema.safeParse(json);
  if (!parsed.success) {
    throw new EpisodeError(id, formatZodError(parsed.error).map((p) => `${p}  (${file})`));
  }

  const episode = parsed.data;
  const problems: string[] = [];
  if (episode.id !== id) {
    problems.push(`"id" is "${episode.id}" but the file is named ${id}.json — they must match`);
  }
  if (checkAssets) {
    for (const abs of findMissingAssets(episode)) problems.push(`Missing asset: ${abs}`);
  }
  if (problems.length) throw new EpisodeError(id, problems);

  return { id, file, raw, episode };
}
