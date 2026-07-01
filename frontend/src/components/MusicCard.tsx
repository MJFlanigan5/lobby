import type { Session } from '../types';

interface MusicCardProps {
  sessions: Session[];
}

function plexUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('/api/')) return path; // Jellyfin paths are already routable
  return `/api/poster?path=${encodeURIComponent(path)}`;
}

function EqBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-white/60"
          style={{
            height: playing ? undefined : '30%',
            animation: playing
              ? `eq-bar ${0.6 + i * 0.15}s ease-in-out infinite alternate`
              : 'none',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

function MusicRow({ session }: { session: Session }) {
  const isPlaying = session.state === 'playing';

  return (
    <div className="flex items-center gap-5">
      {/* Album art */}
      <div
        className="flex-shrink-0 rounded-sm overflow-hidden shadow-lg"
        style={{ width: 72, height: 72 }}
      >
        {session.thumb ? (
          <img
            src={plexUrl(session.thumb)}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-white/10" />
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <EqBars playing={isPlaying} />
          <span className="text-xs text-white/40 uppercase tracking-wider">
            {session.player}
          </span>
          <span className="text-xs text-white/30 bg-black/30 px-1.5 py-0.5 rounded-full">
            {session.username}
          </span>
        </div>
        <p className="text-white font-semibold text-base leading-tight truncate">
          {session.title}
        </p>
        {session.subtitle && (
          <p className="text-white/50 text-sm truncate mt-0.5">{session.subtitle}</p>
        )}
        {session.duration > 0 && (
          <div className="mt-2 h-[2px] w-full bg-white/15 rounded-none">
            <div
              className="h-full bg-white/50 transition-all duration-1000"
              style={{ width: `${session.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function MusicCard({ sessions }: MusicCardProps) {
  const lead = sessions[0];

  return (
    <div
      className="w-full h-full relative overflow-hidden fade-in"
      style={{ background: '#0a0a0a' }}
    >
      {/* Blurred album art background */}
      {lead?.thumb && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${plexUrl(lead.thumb)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(60px) brightness(0.25) saturate(1.8)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-12 py-10 gap-6">
        {sessions.map((s) => (
          <MusicRow key={s.id} session={s} />
        ))}
      </div>
    </div>
  );
}
