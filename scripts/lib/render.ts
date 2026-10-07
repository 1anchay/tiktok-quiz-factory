import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { buildTimeline } from "../../src/engine/timeline";
import type { QuizEpisodeProps } from "../../src/engine/types";
import type { Episode } from "../../src/schema/episode";
import { syncEpisodes } from "../sync-episodes";
import { ASSETS_DIR, ENTRY_POINT, OUTPUT_DIR, SCREENSHOTS_DIR } from "./paths";

const COMPOSITION_ID = "QuizEpisode";

export function concurrency() {
  const fromEnv = Number(process.env.RENDER_CONCURRENCY);
  if (fromEnv > 0) return fromEnv;
  return Math.max(1, Math.min(8, Math.floor(os.cpus().length * 0.75)));
}

/** Bundles the Remotion project once. Reuse the returned serveUrl for many renders. */
export async function bundleProject(): Promise<string> {
  syncEpisodes({ quiet: true });
  process.stdout.write("Bundling Remotion project... ");
  const started = Date.now();
  const serveUrl = await bundle({
    entryPoint: ENTRY_POINT,
    publicDir: ASSETS_DIR,
    onProgress: () => undefined,
  });
  console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return serveUrl;
}

async function select(serveUrl: string, episode: Episode) {
  const inputProps: QuizEpisodeProps = { episode, errors: [] };
  const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps });
  return { composition, inputProps };
}

export async function renderEpisodeVideo(serveUrl: string, episode: Episode) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputLocation = path.join(OUTPUT_DIR, `${episode.id}.mp4`);
  const tmpLocation = path.join(OUTPUT_DIR, `.${episode.id}.rendering.mp4`);
  const { composition, inputProps } = await select(serveUrl, episode);

  let lastPct = -1;
  const started = Date.now();
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    pixelFormat: "yuv420p",
    crf: 18,
    audioCodec: "aac",
    audioBitrate: "192k",
    imageFormat: "jpeg",
    jpegQuality: 92,
    concurrency: concurrency(),
    outputLocation: tmpLocation,
    overwrite: true,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct !== lastPct && pct % 5 === 0) {
        lastPct = pct;
        process.stdout.write(`\r  rendering ${episode.id}: ${String(pct).padStart(3)}%`);
      }
    },
  });
  fs.renameSync(tmpLocation, outputLocation);
  const seconds = composition.durationInFrames / composition.fps;
  console.log(`\n  ✓ ${path.relative(process.cwd(), outputLocation)}  (${seconds.toFixed(1)}s video, rendered in ${((Date.now() - started) / 1000).toFixed(0)}s)`);
  return { outputLocation, durationSeconds: seconds, frames: composition.durationInFrames };
}

export async function renderEpisodeScreenshots(serveUrl: string, episode: Episode) {
  const dir = path.join(SCREENSHOTS_DIR, episode.id);
  fs.mkdirSync(dir, { recursive: true });
  const { composition, inputProps } = await select(serveUrl, episode);
  const { keyFrames } = buildTimeline(episode, composition.fps);

  const shots: [string, number][] = [
    ["hook", keyFrames.hook],
    ["level-1", keyFrames.level1],
    ["level-1-reveal", keyFrames.level1Reveal],
    ["boss-intro", keyFrames.bossIntro],
    ["boss", keyFrames.boss],
    ["ending", keyFrames.ending],
  ];

  const files: string[] = [];
  for (const [name, frame] of shots) {
    const output = path.join(dir, `${name}.png`);
    await renderStill({ serveUrl, composition, inputProps, frame, output, imageFormat: "png", overwrite: true });
    files.push(output);
    console.log(`  ✓ ${path.relative(process.cwd(), output)}  (frame ${frame})`);
  }
  return files;
}
