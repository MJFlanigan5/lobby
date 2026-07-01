import { useWebSocket } from './useWebSocket';
import type { DisplayConfig } from './useWebSocket';
import type { Session } from '../types';

interface UseSessionsResult {
  sessions: Session[];
  activeSessions: Session[];
  sessionCount: number;
  connected: boolean;
  serverMode: string | null;
  displayConfig: DisplayConfig | null;
}

export function useSessions(): UseSessionsResult {
  const { sessions, serverMode, connected, displayConfig } = useWebSocket();
  const activeSessions = sessions.filter((s) => s.state !== 'paused');

  return {
    sessions,
    activeSessions,
    sessionCount: sessions.length,
    connected,
    serverMode,
    displayConfig,
  };
}
