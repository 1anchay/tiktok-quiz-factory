import type { Episode } from "../schema/episode";

export interface EpisodeRegistryEntry {
  id: string;
  episode: Episode | null;
  errors: string[];
}

/** Props passed to the QuizEpisode composition (also used as render inputProps). */
export type QuizEpisodeProps = {
  episode: Episode | null;
  errors?: string[];
};
