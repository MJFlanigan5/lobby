export interface Session {
  id: string;
  type: 'movie' | 'episode' | 'track';
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
}

export interface LibraryItem {
  id: string;
  title: string;
  thumb: string;
  type: 'movie' | 'show';
  year?: number;
}

export interface UpcomingItem {
  title: string;
  subtitle?: string;
  airDate?: string;
  thumb: string;
  type: 'movie' | 'episode';
}
