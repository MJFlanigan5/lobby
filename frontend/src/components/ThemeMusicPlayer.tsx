import { useEffect, useRef } from 'react';

interface ThemeMusicPlayerProps {
  ratingKey?: string;
  enabled: boolean;
}

function notifyServer(state: 'started' | 'stopped') {
  fetch(`/api/theme-music/${state}`, { method: 'POST' }).catch(() => {});
}

// Renders no visible UI — just an <audio> element that plays a session's
// Plex theme song on loop while it's the sole active Now Playing session.
// Not every title has a theme track; a missing one is silent, not an error.
//
// duckedRef tracks whether the server currently has Sonos ducked for us.
// Ratingkey changes constantly during Ambient/Poster's slideshow rotation —
// we deliberately do NOT restore/re-duck on every track change (that would
// audibly pump the volume up and down every ~20s). We only notify "stopped"
// when theme music genuinely stops: disabled, no themed item, or unmount.
export default function ThemeMusicPlayer({ ratingKey, enabled }: ThemeMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const duckedRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!enabled || !ratingKey) {
      audio.pause();
      audio.removeAttribute('src');
      if (duckedRef.current) {
        duckedRef.current = false;
        notifyServer('stopped');
      }
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

    // Just pause for the track switch — intentionally no "stopped" notification
    // here, so a continuous Ambient session stays ducked instead of pumping.
    return () => {
      audio.pause();
    };
  }, [ratingKey, enabled]);

  // True unmount (leaving Ambient/Poster mode entirely) — release the duck if held.
  useEffect(() => {
    return () => {
      if (duckedRef.current) {
        duckedRef.current = false;
        notifyServer('stopped');
      }
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      onPlaying={() => {
        if (!duckedRef.current) {
          duckedRef.current = true;
          notifyServer('started');
        }
      }}
    />
  );
}
