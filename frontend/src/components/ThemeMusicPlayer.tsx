import { useEffect, useRef } from 'react';

interface ThemeMusicPlayerProps {
  ratingKey?: string;
  enabled: boolean;
}

// Renders no visible UI — just an <audio> element that plays a session's
// Plex theme song on loop while it's the sole active Now Playing session.
// Not every title has a theme track; a missing one is silent, not an error.
export default function ThemeMusicPlayer({ ratingKey, enabled }: ThemeMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!enabled || !ratingKey) {
      audio.pause();
      audio.removeAttribute('src');
      return;
    }

    audio.src = `/api/theme/${ratingKey}`;
    audio.loop = true;
    audio.play().catch((err) => {
      // AbortError = a newer session interrupted this play() call before it started —
      // expected whenever sessions switch quickly, not a real failure. Anything else
      // (404 for no theme, NotAllowedError for blocked autoplay) is worth logging.
      if (err?.name === 'AbortError') return;
      console.warn('[lobby] theme music playback failed:', err?.message || err);
    });

    return () => {
      audio.pause();
    };
  }, [ratingKey, enabled]);

  return <audio ref={audioRef} />;
}
