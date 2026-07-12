export interface Session {
  id: string;
  type: 'movie' | 'episode' | 'track';
  ratingKey?: string;
  title: string;
  subtitle: string;
  year?: number;
  thumb: string;
  art?: string;
  userThumb: string;
  username: string;
  progress: number;
  duration: number;
  viewOffset: number;
  state: 'playing' | 'paused' | 'buffering';
  quality: 'direct' | 'transcode';
  player: string;
  resolution?: string | null;
  atmos?: boolean;
  contentRating?: string | null;
}

export interface LibraryItem {
  id: string;
  title: string;
  thumb: string;
  type: 'movie' | 'show' | 'episode';
  year?: number;
  contentRating?: string;
  rating?: number;
  studio?: string;
  runtime?: number;
  // upcoming items only
  upcoming?: boolean;
  airDate?: string;
  subtitle?: string;
}

export interface UpcomingItem {
  title: string;
  subtitle?: string;
  airDate?: string;
  thumb: string;
  type: 'movie' | 'episode';
}
