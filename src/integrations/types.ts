/**
 * Extension points for future pipeline stages. Nothing here calls a paid API yet —
 * each contract has a no-op/local implementation in ./noop.ts. Real providers
 * (OpenAI, ElevenLabs, TikTok Content Posting API, ...) plug in by implementing these.
 *
 * Pipeline (planned):
 *   idea → ContentGenerator → AssetProvider → EpisodeJSON → TTS/Subtitles → Render → Publisher → Analytics → Experiments
 */
import type { EpisodeInput } from "../schema/episode";

export interface ContentGenerator {
  /** Draft a new episode (levels, answers, clue descriptions) for a topic. */
  generateEpisode(request: { series: string; topic: string; language: string; seed?: number }): Promise<EpisodeInput>;
}

export interface AssetQuery {
  description: string;
  kind: "image" | "music" | "sound" | "background";
  license: "royalty-free" | "cc0" | "owned";
}
export interface AssetProvider {
  /** Returns a path relative to assets/ after downloading/generating the asset. */
  resolve(query: AssetQuery): Promise<{ path: string; attribution?: string }>;
}

export interface TTSProvider {
  synthesize(request: { text: string; voice: string; language: string }): Promise<{ path: string; durationSeconds: number }>;
}

export interface SubtitleCue {
  startFrame: number;
  endFrame: number;
  text: string;
}
export interface SubtitleProvider {
  fromAudio(audioPath: string, fps: number): Promise<SubtitleCue[]>;
}

export interface PublishRequest {
  videoPath: string;
  caption: string;
  hashtags: string[];
  scheduledAt?: Date;
}
export interface Publisher {
  publish(request: PublishRequest): Promise<{ remoteId: string; url?: string }>;
}

export interface VideoStats {
  remoteId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  averageWatchSeconds?: number;
  completionRate?: number;
}
export interface AnalyticsProvider {
  fetchStats(remoteId: string): Promise<VideoStats>;
}

export interface Experiment {
  id: string;
  /** Partial episode overrides per variant, e.g. different hooks or themes. */
  variants: Record<string, Partial<EpisodeInput>>;
}
export interface ExperimentRunner {
  expand(baseEpisode: EpisodeInput, experiment: Experiment): EpisodeInput[];
}

export interface LiveEvent {
  type: "comment" | "gift" | "like" | "join";
  user: string;
  text?: string;
  at: Date;
}
export interface LiveConnector {
  /** Stream of TikTok LIVE events (e.g. to accept answers from comments in real time). */
  subscribe(roomId: string, onEvent: (event: LiveEvent) => void): Promise<() => void>;
}
