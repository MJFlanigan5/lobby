import { useState, useEffect, useRef, type ReactNode } from 'react';
import { getAuthToken, setAuthToken } from '../authToken';

const SESSION_KEY = 'lobby_authed';

type Status = 'checking' | 'open' | 'locked' | 'unlocked';

export default function PinGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const authed = sessionStorage.getItem(SESSION_KEY);
    const token = getAuthToken();

    if (authed && token) {
      // Validate stored token — catches server restarts that regenerate SESSION_TOKEN
      fetch('/api/auth/check', { headers: { 'X-Lobby-Token': token } })
        .then((r) => r.json())
        .then((d) => {
          if (d.valid) {
            setStatus('unlocked');
          } else {
            sessionStorage.removeItem(SESSION_KEY);
            return fetch('/api/auth/required')
              .then((r) => r.json())
              .then((r2) => setStatus(r2.required ? 'locked' : 'open'));
          }
        })
        .catch(() => setStatus('open'));
      return;
    }

    if (authed) sessionStorage.removeItem(SESSION_KEY); // authed flag with no token — clear it

    fetch('/api/auth/required')
      .then((r) => r.json())
      .then((d) => setStatus(d.required ? 'locked' : 'open'))
      .catch(() => setStatus('open'));
  }, []);

  useEffect(() => {
    if (status === 'locked') inputRef.current?.focus();
  }, [status]);

  const verify = async () => {
    if (!pin || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (r.ok) {
        const data = await r.json();
        sessionStorage.setItem(SESSION_KEY, '1');
        if (data.token) setAuthToken(data.token);
        setStatus('unlocked');
      } else {
        setError(true);
        setPin('');
        inputRef.current?.focus();
      }
    } catch {
      setError(true);
      setPin('');
    }
    setSubmitting(false);
  };

  if (status === 'checking') return null;
  if (status === 'open' || status === 'unlocked') return <>{children}</>;

  return (
    <div className="w-full h-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-6">
      <p className="text-white/20 text-xs tracking-[0.3em] uppercase">Lobby</p>
      <div className="flex flex-col items-center gap-3">
        <input
          ref={inputRef}
          type="password"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === 'Enter' && verify()}
          placeholder="PIN"
          className={`bg-white/5 border text-white text-center text-sm tracking-[0.2em] w-40 px-4 py-2.5 rounded-sm outline-none transition-colors placeholder:text-white/15 ${
            error ? 'border-red-500/60' : 'border-white/10 focus:border-white/30'
          }`}
        />
        {error && (
          <p className="text-red-400/70 text-xs tracking-widest uppercase">Incorrect PIN</p>
        )}
        <button
          onClick={verify}
          disabled={!pin || submitting}
          className="text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-1"
        >
          {submitting ? 'Verifying...' : 'Enter'}
        </button>
      </div>
    </div>
  );
}
