/**
 *   npm run screenshot -- episode-001
 *   → output/screenshots/episode-001/{hook,level-1,level-1-reveal,boss-intro,boss,ending}.png
 */
import { loadEpisode, normalizeEpisodeId } from "./lib/episodes";
import { bundleProject, renderEpisodeScreenshots } from "./lib/render";
import { runCli } from "./lib/cli";

runCli(async (args) => {
  const id = normalizeEpisodeId(args.positional[0]);
  const { episode } = loadEpisode(id);
  console.log(`▶ Screenshots for ${id}`);
  const serveUrl = await bundleProject();
  await renderEpisodeScreenshots(serveUrl, episode);
});
