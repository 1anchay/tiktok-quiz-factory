/**
 *   npm run batch            → renders every new/changed episode (content-hash based)
 *   npm run batch -- --force → renders everything
 *   npm run batch -- --dry   → only lists what would be rendered
 */
import { EpisodeError, listEpisodeIds, loadEpisode, type LoadedEpisode } from "./lib/episodes";
import { episodeHash, isUpToDate, readManifest, recordRender } from "./lib/hash";
import { bundleProject, renderEpisodeVideo } from "./lib/render";
import { runCli } from "./lib/cli";

runCli(async (args) => {
  const force = args.flags.has("force");
  const dry = args.flags.has("dry");
  const manifest = readManifest();

  const todo: { loaded: LoadedEpisode; hash: string }[] = [];
  const invalid: EpisodeError[] = [];
  let skipped = 0;

  for (const id of listEpisodeIds()) {
    try {
      const loaded = loadEpisode(id);
      const hash = episodeHash(loaded.episode);
      if (!force && isUpToDate(id, hash, manifest)) {
        skipped++;
        console.log(`  = ${id} (unchanged)`);
      } else {
        todo.push({ loaded, hash });
        console.log(`  + ${id} (${manifest[id] ? "changed" : "new"})`);
      }
    } catch (err) {
      if (err instanceof EpisodeError) {
        invalid.push(err);
        console.log(`  ✗ ${id} (invalid)`);
      } else throw err;
    }
  }

  console.log(`\n${todo.length} to render, ${skipped} unchanged, ${invalid.length} invalid.`);
  for (const err of invalid) console.error(`\n${err.message}`);
  if (dry || todo.length === 0) {
    if (invalid.length) process.exitCode = 1;
    return;
  }

  const serveUrl = await bundleProject();
  const failures: string[] = [];
  for (const { loaded, hash } of todo) {
    try {
      const result = await renderEpisodeVideo(serveUrl, loaded.episode);
      recordRender(loaded.id, hash, result.outputLocation, result.durationSeconds);
    } catch (err) {
      failures.push(loaded.id);
      console.error(`\n  ✗ ${loaded.id} failed: ${(err as Error).message}`);
    }
  }

  console.log(`\nBatch done: ${todo.length - failures.length} rendered, ${failures.length} failed.`);
  if (failures.length || invalid.length) process.exitCode = 1;
});
