/**
 *   npm run validate                 → validates every episode (schema + assets)
 *   npm run validate -- episode-001  → validates one episode
 */
import { buildTimeline } from "../src/engine/timeline";
import { EpisodeError, listEpisodeIds, loadEpisode, normalizeEpisodeId } from "./lib/episodes";
import { runCli } from "./lib/cli";

runCli(async (args) => {
  const ids = args.positional.length ? args.positional.map(normalizeEpisodeId) : listEpisodeIds();
  let failed = 0;
  for (const id of ids) {
    try {
      const { episode } = loadEpisode(id);
      const t = buildTimeline(episode);
      console.log(`  ✓ ${id}  ${(t.durationInFrames / t.fps).toFixed(1)}s, ${t.durationInFrames} frames`);
    } catch (err) {
      failed++;
      console.error(err instanceof EpisodeError ? `  ✗ ${err.message}` : err);
    }
  }
  if (failed) {
    console.error(`\n${failed} episode(s) invalid.`);
    process.exitCode = 1;
  }
});
