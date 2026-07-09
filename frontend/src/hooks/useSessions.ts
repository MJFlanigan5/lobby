import { useWebSocket } from './useWebSocket';
import type { DisplayConfig } from './useWebSocket';
import type { Session } from '../types';

interface UseSessionsResult {
  sessions: Session[];
  sessionCount: number;
  connected: boolean;
  serverMode: string | null;
  displayConfig: DisplayConfig | null;
}

export function useSessions(): UseSessionsResult {
  const { sessions, serverMode, connected, displayConfig } = useWebSocket();

  return {
    sessions,
    sessionCount: sessions.length,
    connected,
    serverMode,
    displayConfig,
  };
}
