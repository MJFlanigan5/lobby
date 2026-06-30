import type { Session } from '../types';
import SessionCard from './SessionCard';

interface NowPlayingProps {
  sessions: Session[];
}

export default function NowPlaying({ sessions }: NowPlayingProps) {
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

  // 4+ sessions: 2x2 grid (show up to 4)
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
