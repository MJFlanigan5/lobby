import type { DisplayConfig } from '../hooks/useWebSocket';
import Weather from './Weather';
import { Clock } from './clockUtils';

// Software sleep — blanks the poster/slideshow during scheduled off-hours,
// but keeps clock and weather visible (respects the same SHOW_CLOCK/SHOW_WEATHER
// toggles as Ambient). Note: this is a black screen, not a real power-off — no
// HDMI-CEC hardware access from this Docker deployment.
export default function Sleep({ displayConfig }: { displayConfig?: DisplayConfig }) {
  const clockFormat = displayConfig?.CLOCK_FORMAT || '12h';
  const showWeather = displayConfig?.SHOW_WEATHER !== 'false';
  const showClock = displayConfig?.SHOW_CLOCK !== 'false';

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      {showWeather && (
        <div className="absolute bottom-6 left-8 z-20">
          <Weather />
        </div>
      )}
      {showClock && (
        <div className="absolute bottom-6 right-8 z-20">
          <Clock format={clockFormat} />
        </div>
      )}
    </div>
  );
}
