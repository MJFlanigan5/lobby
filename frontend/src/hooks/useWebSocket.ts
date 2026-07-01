import { useEffect, useRef, useState, useCallback } from 'react';
import type { Session } from '../types';

export interface DisplayConfig {
  SLIDESHOW_INTERVAL: string;
  CLOCK_FORMAT: string;
  LIBRARY_FILTER: string;
  SHOW_WEATHER: string;
  SHOW_CLOCK: string;
  DISPLAY_NAME: string;
}

type WsMessage =
  | { type: 'sessions'; data: Session[] }
  | { type: 'mode'; data: string }
  | { type: 'config'; data: DisplayConfig };

interface UseWebSocketResult {
  sessions: Session[];
  serverMode: string | null;
  connected: boolean;
  displayConfig: DisplayConfig | null;
}

export function useWebSocket(): UseWebSocketResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [serverMode, setServerMode] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      backoffRef.current = 1000;
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg: WsMessage = JSON.parse(event.data);
        if (msg.type === 'sessions') setSessions(msg.data);
        else if (msg.type === 'mode') setServerMode(msg.data);
        else if (msg.type === 'config') setDisplayConfig(msg.data);
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      const delay = Math.min(backoffRef.current, 30_000);
      backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, [connect]);

  return { sessions, serverMode, connected, displayConfig };
}
