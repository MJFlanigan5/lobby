import type { Session } from '../types';

type CardSize = 'full' | 'half' | 'quarter';

interface SessionCardProps {
  session: Session;
  size: CardSize;
}

function posterUrl(thumb: string) {
  if (!thumb) return '';
  return `/api/poster?path=${encodeURIComponent(thumb)}`;
}

export default function SessionCard({ session, size }: SessionCardProps) {
  const bgStyle = session.thumb
    ? {
        backgroundImage: `url(${posterUrl(session.thumb)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { background: '#1a1a1a' };

  const titleSize =
    size === 'full' ? 'text-4xl' : size === 'half' ? 'text-2xl' : 'text-lg';
  const subtitleSize =
    size === 'full' ? 'text-xl' : size === 'half' ? 'text-base' : 'text-sm';

  return (
    <div
      className="relative w-full h-full overflow-hidden fade-in"
      style={bgStyle}
    >
      {/* Bottom gradient */}
      <div
        className="absolute inset-x-0 bottom-0 z-10"
        style={{
          height: '55%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
        }}
      />

      {/* Quality badge — top left */}
      <div className="absolute top-4 left-4 z-20">
        <span
          className={`text-xs font-semibold tracking-widest px-2 py-1 rounded-sm ${
            session.quality === 'direct'
              ? 'bg-green-900/70 text-green-300'
              : 'bg-amber-900/70 text-amber-300'
          }`}
        >
          {session.quality === 'direct' ? 'DIRECT' : 'TRANSCODE'}
        </span>
      </div>

      {/* Username badge — top right */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <span className="text-xs text-white/70 bg-black/50 px-2 py-1 rounded-full">
          {session.username}
        </span>
      </div>

      {/* Metadata — bottom */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-5">
        <div className="flex items-center gap-2 mb-1">
          {/* State dot */}
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              session.state === 'playing'
                ? 'bg-white pulse-dot'
                : 'bg-gray-400'
            }`}
          />
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            {session.state}
          </span>
          <span className="text-xs text-gray-600 ml-1">{session.player}</span>
        </div>

        <h2 className={`${titleSize} font-bold text-white leading-tight mb-1`}>
          {session.title}
        </h2>
        {session.subtitle && (
          <p className={`${subtitleSize} text-gray-300`}>{session.subtitle}</p>
        )}

        {/* Progress bar */}
        {session.duration > 0 && (
          <div className="mt-3 h-[3px] w-full bg-white/20 rounded-none">
            <div
              className="h-full bg-white/80 transition-all duration-1000"
              style={{ width: `${session.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
