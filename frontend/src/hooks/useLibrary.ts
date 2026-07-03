import { useState, useEffect, useRef } from 'react';
import type { LibraryItem } from '../types';

function interleave(library: LibraryItem[], upcoming: LibraryItem[], every = 5): LibraryItem[] {
  if (!upcoming.length) return library;
  if (!library.length) return upcoming;
  const result: LibraryItem[] = [];
  let slot = 0;
  for (let i = 0; i < library.length; i++) {
    result.push(library[i]);
    if ((i + 1) % every === 0) {
      result.push(upcoming[slot % upcoming.length]);
      slot++;
    }
  }
  if (slot === 0) result.push(...upcoming);
  return result;
}

export function useLibrary(intervalMs: number) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = () => {
      Promise.all([
        fetch('/api/library/recent?limit=30').then((r) => r.json()).catch(() => ({ items: [] })),
        fetch('/api/library/random?limit=100').then((r) => r.json()).catch(() => ({ items: [] })),
        fetch('/api/upcoming').then((r) => r.json()).catch(() => ({ upcoming: [] })),
      ]).then(([recent, random, upcomingData]) => {
        const seen = new Set<string>();
        const library: LibraryItem[] = [];
        for (const item of [...(recent.items || []), ...(random.items || [])]) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            library.push(item);
          }
        }
        for (let i = library.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [library[i], library[j]] = [library[j], library[i]];
        }
        const upcomingItems: LibraryItem[] = (upcomingData.upcoming || [])
          .filter((u: { thumb?: string }) => !!u.thumb)
          .map((u: { title: string; subtitle?: string; airDate?: string; thumb: string; type: string }, idx: number) => ({
            id: `upcoming-${idx}`,
            title: u.title,
            thumb: u.thumb,
            type: (u.type === 'movie' ? 'movie' : 'episode') as 'movie' | 'episode',
            upcoming: true as const,
            airDate: u.airDate,
            subtitle: u.subtitle && u.subtitle !== u.title ? u.subtitle : undefined,
          }));
        setItems(interleave(library, upcomingItems, 5));
        setIndex(0);
      });
    };
    load();
    const id = setInterval(load, 15 * 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    intervalRef.current = setInterval(() => {
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 300);
    }, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [items, intervalMs]);

  return { items, index, setIndex, visible };
}
