/**
 *   npm run make -- episode-001          → output/episode-001.mp4
 *   npm run make -- episode-001 --force  → re-render even if unchanged
 */
import { loadEpisode, normalizeEpisodeId } from "./lib/episodes";
import { episodeHash, isUpToDate, readManifest, recordRender } from "./lib/hash";
import { bundleProject, renderEpisodeVideo } from "./lib/render";
import { runCli } from "./lib/cli";

runCli(async (args) => {
  const id = normalizeEpisodeId(args.positional[0]);
  const { episode } = loadEpisode(id);
  const hash = episodeHash(episode);

  if (!args.flags.has("force") && isUpToDate(id, hash, readManifest())) {
    console.log(`✓ ${id} is up to date (hash ${hash.slice(0, 10)}). Use --force to re-render.`);
    return;
  }

  console.log(`▶ Making ${id}`);
  const serveUrl = await bundleProject();
  const result = await renderEpisodeVideo(serveUrl, episode);
  recordRender(id, hash, result.outputLocation, result.durationSeconds);
});
