import { useState, useEffect, useRef } from 'react';

interface PosterFrameProps {
  src: string;
  alt?: string;
  className?: string;
}

export default function PosterFrame({ src, alt = '', className = '' }: PosterFrameProps) {
  const [displaySrc, setDisplaySrc] = useState(src);
  const [nextSrc, setNextSrc] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const [errored, setErrored] = useState(false);
  const prevSrcRef = useRef(src);

  useEffect(() => {
    if (src === prevSrcRef.current) return;
    prevSrcRef.current = src;
    setNextSrc(src);
    setFading(true);
    setErrored(false);
  }, [src]);

  const isVideo = (s: string) => /\.(mp4|webm)$/i.test(s);

  const handleTransitionEnd = () => {
    if (nextSrc) {
      setDisplaySrc(nextSrc);
      setNextSrc(null);
      setFading(false);
    }
  };

  const containerClass = `relative w-full h-full overflow-hidden ${className}`;

  if (errored) {
    return <div className={containerClass} style={{ background: '#1a1a1a' }} />;
  }

  return (
    <div className={containerClass}>
      {isVideo(displaySrc) ? (
        <video
          key={displaySrc}
          src={displaySrc}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: fading ? 0 : 1, transition: 'opacity 300ms ease-in-out' }}
          onTransitionEnd={handleTransitionEnd}
        />
      ) : (
        <img
          key={displaySrc}
          src={displaySrc}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: fading ? 0 : 1, transition: 'opacity 300ms ease-in-out' }}
          onError={() => setErrored(true)}
          onTransitionEnd={handleTransitionEnd}
        />
      )}
    </div>
  );
}
