import type { EpisodeInput } from "../schema/episode";
import type {
  AnalyticsProvider,
  ContentGenerator,
  Experiment,
  ExperimentRunner,
  LiveConnector,
  Publisher,
  SubtitleProvider,
  TTSProvider,
} from "./types";

const notConfigured = (what: string) => () =>
  Promise.reject(new Error(`${what} is not configured yet. Implement the interface in src/integrations/types.ts.`));

export const noopContentGenerator: ContentGenerator = { generateEpisode: notConfigured("ContentGenerator") };
export const noopTTS: TTSProvider = { synthesize: notConfigured("TTSProvider") };
export const noopSubtitles: SubtitleProvider = { fromAudio: async () => [] };
export const noopPublisher: Publisher = { publish: notConfigured("Publisher") };
export const noopAnalytics: AnalyticsProvider = { fetchStats: notConfigured("AnalyticsProvider") };
export const noopLive: LiveConnector = { subscribe: async () => () => undefined };

/** Local, dependency-free A/B expansion: one episode per variant with id suffix. */
export const localExperimentRunner: ExperimentRunner = {
  expand(base: EpisodeInput, experiment: Experiment) {
    return Object.entries(experiment.variants).map(([variant, overrides]) => ({
      ...base,
      ...overrides,
      id: `${base.id}-${variant}`,
      meta: { ...(base.meta ?? {}), experiment: experiment.id, variant },
    }));
  },
};
