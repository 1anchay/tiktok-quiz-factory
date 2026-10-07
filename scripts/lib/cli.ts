import { EpisodeError } from "./episodes";

export interface CliArgs {
  positional: string[];
  flags: Set<string>;
}

export function parseArgs(argv = process.argv.slice(2)): CliArgs {
  const positional: string[] = [];
  const flags = new Set<string>();
  for (const a of argv) {
    if (a.startsWith("--")) flags.add(a.slice(2));
    else positional.push(a);
  }
  return { positional, flags };
}

/** Runs a script with consistent, readable error output (no stack traces for user errors). */
export function runCli(main: (args: CliArgs) => Promise<void>) {
  main(parseArgs()).catch((err: unknown) => {
    if (err instanceof EpisodeError) {
      console.error(`\n✗ ${err.message}\n`);
    } else if (err instanceof Error && err.message.startsWith("Missing episode id")) {
      console.error(`\n✗ ${err.message}\n`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}
