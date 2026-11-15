// "1h 12m left" / "8m left" from Plex duration and position (both in ms).
export function timeLeft(duration: number, viewOffset: number): string {
  const mins = Math.max(0, Math.round((duration - viewOffset) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m left` : `${mins}m left`;
}
