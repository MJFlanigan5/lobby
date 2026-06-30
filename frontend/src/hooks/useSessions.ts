import { useWebSocket } from './useWebSocket';
import type { Session } from '../types';

interface UseSessionsResult {
  sessions: Session[];
  activeSessions: Session[];
  sessionCount: number;
  connected: boolean;
  serverMode: string | null;
}

export function useSessions(): UseSessionsResult {
  const { sessions, serverMode, connected } = useWebSocket();
  const activeSessions = sessions.filter((s) => s.state !== 'paused');

  return {
    sessions,
    activeSessions,
    sessionCount: sessions.length,
    connected,
    serverMode,
  };
}
