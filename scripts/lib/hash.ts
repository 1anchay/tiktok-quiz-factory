import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SOUND_PACK } from "../../src/audio/sound-pack";
import { collectAssetRefs, type Episode } from "../../src/schema/episode";
import { ASSETS_DIR, MANIFEST_FILE, ROOT, SRC_DIR } from "./paths";

export interface ManifestEntry {
  hash: string;
  output: string;
  renderedAt: string;
  durationSeconds: number;
}
export type Manifest = Record<string, ManifestEntry>;

const sha = (data: crypto.BinaryLike) => crypto.createHash("sha256").update(data).digest("hex");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated") continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

let engineHashCache: string | null = null;

/** Hash of the rendering engine: all source code + Remotion version. Any code change invalidates every render. */
export function engineHash(): string {
  if (engineHashCache) return engineHashCache;
  const h = crypto.createHash("sha256");
  for (const file of walk(SRC_DIR).sort()) {
    h.update(path.relative(ROOT, file).replace(/\\/g, "/"));
    h.update(fs.readFileSync(file));
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  h.update(JSON.stringify(pkg.dependencies ?? {}));
  engineHashCache = h.digest("hex");
  return engineHashCache;
}

/** Content hash of an episode = engine + normalized episode data + bytes of every referenced asset + SFX pack. */
export function episodeHash(episode: Episode): string {
  const h = crypto.createHash("sha256");
  h.update(engineHash());
  h.update(JSON.stringify(episode));
  const refs = [...collectAssetRefs(episode), ...Object.values(SOUND_PACK)].sort();
  for (const ref of refs) {
    const abs = path.join(ASSETS_DIR, ref);
    h.update(ref);
    h.update(fs.existsSync(abs) ? sha(fs.readFileSync(abs)) : "missing");
  }
  return h.digest("hex");
}

export function readManifest(): Manifest {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8")) as Manifest;
  } catch {
    return {};
  }
}

export function writeManifest(manifest: Manifest) {
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");
}

export function isUpToDate(id: string, hash: string, manifest: Manifest): boolean {
  const entry = manifest[id];
  return Boolean(entry && entry.hash === hash && fs.existsSync(path.join(ROOT, entry.output)));
}

export function recordRender(id: string, hash: string, outputAbs: string, durationSeconds: number) {
  const manifest = readManifest();
  manifest[id] = {
    hash,
    output: path.relative(ROOT, outputAbs).replace(/\\/g, "/"),
    renderedAt: new Date().toISOString(),
    durationSeconds: Number(durationSeconds.toFixed(2)),
  };
  writeManifest(manifest);
}
