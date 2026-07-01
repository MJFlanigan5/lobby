import type { Session } from '../types';
import SessionCard from './SessionCard';
import MusicCard from './MusicCard';

interface NowPlayingProps {
  sessions: Session[];
}

function VideoGrid({ sessions }: { sessions: Session[] }) {
  const count = sessions.length;

  if (count === 1) {
    return (
      <div className="w-full h-full">
        <SessionCard session={sessions[0]} size="full" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="w-full h-full flex">
        {sessions.map((s) => (
          <div key={s.id} className="flex-1 h-full">
            <SessionCard session={s} size="half" />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="w-full h-full flex">
        <div className="h-full" style={{ width: '60%' }}>
          <SessionCard session={sessions[0]} size="half" />
        </div>
        <div className="h-full flex flex-col" style={{ width: '40%' }}>
          {sessions.slice(1).map((s) => (
            <div key={s.id} className="flex-1">
              <SessionCard session={s} size="quarter" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2">
      {sessions.slice(0, 4).map((s) => (
        <div key={s.id} className="overflow-hidden">
          <SessionCard session={s} size="quarter" />
        </div>
      ))}
    </div>
  );
}

export default function NowPlaying({ sessions }: NowPlayingProps) {
  const tracks = sessions.filter((s) => s.type === 'track');
  const videos = sessions.filter((s) => s.type !== 'track');

  // All music
  if (tracks.length > 0 && videos.length === 0) {
    return <MusicCard sessions={tracks} />;
  }

  // All video
  if (videos.length > 0 && tracks.length === 0) {
    return <VideoGrid sessions={videos} />;
  }

  // Mixed: video takes the main area, music stacks below in a slim bar
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <VideoGrid sessions={videos} />
      </div>
      <div className="shrink-0">
        <MusicCard sessions={tracks} />
      </div>
    </div>
  );
}
