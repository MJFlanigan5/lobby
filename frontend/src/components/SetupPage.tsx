import { useState, useEffect } from 'react';

interface ConfigState {
  PLEX_URL: string;
  PLEX_TOKEN_SET: boolean;
  JELLYFIN_URL: string;
  JELLYFIN_API_KEY_SET: boolean;
  SONARR_URL: string;
  SONARR_API_KEY_SET: boolean;
  RADARR_URL: string;
  RADARR_API_KEY_SET: boolean;
  GOVEE_IP: string;
  GOVEE_DEVICE_ID: string;
  LATITUDE: string;
  LONGITUDE: string;
  TEMP_UNIT: string;
  SCHEDULE_CS_DAY: string;
  SCHEDULE_CS_HOUR: string;
  SCHEDULE_AUTO_DAY: string;
  SCHEDULE_AUTO_HOUR: string;
}

const DAY_OPTIONS = [
  { value: '', label: 'Disabled' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { value: 'weekends', label: 'Weekends (Sat–Sun)' },
  { value: 'daily', label: 'Every day' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
}));

const selectClass =
  'bg-white/5 border border-white/10 text-white text-sm px-3 py-2 rounded outline-none focus:border-white/30 transition-colors cursor-pointer';

function ScheduleRow({
  label, dayKey, hourKey, form, set,
}: {
  label: string;
  dayKey: string;
  hourKey: string;
  form: Record<string, string>;
  set: (key: string) => (value: string) => void;
}) {
  const enabled = !!form[dayKey];
  return (
    <div>
      <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={form[dayKey]}
          onChange={(e) => set(dayKey)(e.target.value)}
          className={selectClass}
        >
          {DAY_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        {enabled && (
          <>
            <span className="text-white/30 text-sm">at</span>
            <select
              value={form[hourKey]}
              onChange={(e) => set(hourKey)(e.target.value)}
              className={selectClass}
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  id: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (v: string) => void;
  onClear?: () => void;
}

function Field({ label, id, value, placeholder, type = 'text', onChange, onClear }: FieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-xs text-white/40 uppercase tracking-wider">
          {label}
        </label>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-white/20 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="w-full bg-white/5 border border-white/10 text-white text-sm px-3 py-2 rounded outline-none focus:border-white/30 placeholder-white/20 transition-colors"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/8 rounded p-5">
      <h2 className="text-white/50 text-xs font-bold tracking-[0.3em] uppercase mb-4">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${ok ? 'bg-green-400' : 'bg-white/20'}`} />
  );
}

function GettingStarted() {
  return (
    <div className="border border-white/10 rounded p-5 mb-4 bg-white/3">
      <h2 className="text-white/70 text-xs font-bold tracking-[0.3em] uppercase mb-4">Getting Started</h2>
      <ol className="flex flex-col gap-4">
        <li className="flex gap-3">
          <span className="text-white/20 font-mono text-sm w-5 shrink-0">1.</span>
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">Get your Plex token</p>
            <p className="text-white/35 text-xs leading-relaxed">
              Open Plex Web and play anything. Open browser DevTools → Network tab and filter
              for requests to your server. Find <code className="text-white/50">X-Plex-Token</code> in
              any request URL.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="text-white/20 font-mono text-sm w-5 shrink-0">2.</span>
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">Enter your server URL and token below</p>
            <p className="text-white/35 text-xs leading-relaxed">
              Use the local IP address of your Plex server, e.g.{' '}
              <code className="text-white/50">http://192.168.1.x:32400</code>.
              Jellyfin, Sonarr, and Radarr are optional.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="text-white/20 font-mono text-sm w-5 shrink-0">3.</span>
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">Save — changes apply instantly</p>
            <p className="text-white/35 text-xs leading-relaxed">
              Hit Save below. The display will update automatically with no restart needed.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="text-white/20 font-mono text-sm w-5 shrink-0">4.</span>
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">Open the display on your TV</p>
            <p className="text-white/35 text-xs leading-relaxed">
              Navigate to <code className="text-white/50">http://&lt;this-server-ip&gt;:3000/</code> in
              your TV browser. Set it as the home page or add it as a shortcut.
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}

async function geocodeLocation(name: string): Promise<{ lat: string; lon: string; display: string } | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
    );
    const data = await res.json();
    if (!data.results?.length) return null;
    const r = data.results[0];
    return {
      lat: String(r.latitude),
      lon: String(r.longitude),
      display: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    };
  } catch {
    return null;
  }
}

export default function SetupPage({ firstRun = false }: { firstRun?: boolean }) {
  const [form, setForm] = useState({
    PLEX_URL: '', PLEX_TOKEN: '',
    JELLYFIN_URL: '', JELLYFIN_API_KEY: '',
    SONARR_URL: '', SONARR_API_KEY: '',
    RADARR_URL: '', RADARR_API_KEY: '',
    GOVEE_IP: '', GOVEE_DEVICE_ID: '',
    LOCATION: '', LATITUDE: '', LONGITUDE: '', TEMP_UNIT: 'fahrenheit',
    SCHEDULE_CS_DAY: '', SCHEDULE_CS_HOUR: '18',
    SCHEDULE_AUTO_DAY: '', SCHEDULE_AUTO_HOUR: '6',
    SLIDESHOW_INTERVAL: '20',
    CLOCK_FORMAT: '12h',
    LIBRARY_FILTER: 'all',
    SHOW_WEATHER: 'true',
    SHOW_CLOCK: 'true',
    SHOW_TITLES: 'true',
    DISPLAY_NAME: 'LOBBY',
  });
  const [resolvedLocation, setResolvedLocation] = useState('');
  const [geoError, setGeoError] = useState('');
  const [status, setStatus] = useState<Partial<ConfigState>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingJF, setTestingJF] = useState(false);
  const [testResultJF, setTestResultJF] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toRemove, setToRemove] = useState<Set<string>>(new Set());

  const clearSecret = (key: string) => {
    setToRemove((prev) => new Set([...prev, key]));
    setForm((f) => ({ ...f, [key]: '' }));
  };

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => {
        setStatus(d);
        setForm((f) => ({
          ...f,
          PLEX_URL: d.PLEX_URL || '',
          JELLYFIN_URL: d.JELLYFIN_URL || '',
          SONARR_URL: d.SONARR_URL || '',
          RADARR_URL: d.RADARR_URL || '',
          GOVEE_IP: d.GOVEE_IP || '',
          GOVEE_DEVICE_ID: d.GOVEE_DEVICE_ID || '',
          LOCATION: d.LOCATION || '',
          LATITUDE: d.LATITUDE || '',
          LONGITUDE: d.LONGITUDE || '',
          TEMP_UNIT: d.TEMP_UNIT || 'fahrenheit',
          SCHEDULE_CS_DAY: d.SCHEDULE_CS_DAY || '',
          SCHEDULE_CS_HOUR: d.SCHEDULE_CS_HOUR || '18',
          SCHEDULE_AUTO_DAY: d.SCHEDULE_AUTO_DAY || '',
          SCHEDULE_AUTO_HOUR: d.SCHEDULE_AUTO_HOUR || '6',
          SLIDESHOW_INTERVAL: d.SLIDESHOW_INTERVAL || '8',
          CLOCK_FORMAT: d.CLOCK_FORMAT || '12h',
          LIBRARY_FILTER: d.LIBRARY_FILTER || 'all',
          SHOW_WEATHER: d.SHOW_WEATHER || 'true',
          SHOW_CLOCK: d.SHOW_CLOCK || 'true',
          SHOW_TITLES: d.SHOW_TITLES || 'true',
          DISPLAY_NAME: d.DISPLAY_NAME || 'LOBBY',
        }));
        if (d.LOCATION) setResolvedLocation('');
      })
      .catch(() => {});
  }, []);

  const set = (key: string) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ PLEX_URL: form.PLEX_URL, PLEX_TOKEN: form.PLEX_TOKEN }),
      });
      const d = await res.json();
      setTestResult({ ok: res.ok, message: res.ok ? 'Plex connected successfully' : (d.error || 'Connection failed') });
    } catch {
      setTestResult({ ok: false, message: 'Request failed' });
    } finally {
      setTesting(false);
    }
  };

  const testJellyfin = async () => {
    setTestingJF(true);
    setTestResultJF(null);
    try {
      const res = await fetch('/api/config/test/jellyfin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ JELLYFIN_URL: form.JELLYFIN_URL, JELLYFIN_API_KEY: form.JELLYFIN_API_KEY }),
      });
      const d = await res.json();
      setTestResultJF({ ok: res.ok, message: res.ok ? 'Jellyfin connected successfully' : (d.error || 'Connection failed') });
    } catch {
      setTestResultJF({ ok: false, message: 'Request failed' });
    } finally {
      setTestingJF(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError('');
    setGeoError('');
    try {
      const SECRETS = new Set(['PLEX_TOKEN', 'JELLYFIN_API_KEY', 'SONARR_API_KEY', 'RADARR_API_KEY']);
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) {
        if (SECRETS.has(k) && !v && !toRemove.has(k)) continue;
        payload[k] = v;
      }
      // Geocode location → lat/lng
      if (form.LOCATION) {
        const geo = await geocodeLocation(form.LOCATION);
        if (!geo) {
          setGeoError('Location not found. Try a city name like "Atlanta, GA" or "London, UK".');
          setSaving(false);
          return;
        }
        payload.LATITUDE = geo.lat;
        payload.LONGITUDE = geo.lon;
        setResolvedLocation(geo.display);
        setForm((f) => ({ ...f, LATITUDE: geo.lat, LONGITUDE: geo.lon }));
      } else {
        payload.LATITUDE = '';
        payload.LONGITUDE = '';
      }
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        setToRemove(new Set());
      } else {
        setSaveError('Save failed — server returned an error.');
      }
    } catch {
      setSaveError('Save failed — could not reach the server.');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-white/40 text-xs font-bold tracking-[0.4em] uppercase mb-1 select-none">
              {firstRun ? 'WELCOME TO LOBBY' : 'LOBBY SETUP'}
            </h1>
            <p className="text-white/20 text-xs">
              {firstRun
                ? 'Nothing is configured yet. Follow the steps below to get started.'
                : 'Configure services. Tokens set via env vars are active but not shown here.'}
            </p>
          </div>
          <div className="flex gap-3 text-xs text-white/25 shrink-0 ml-4 mt-0.5">
            <a href="/" className="hover:text-white/50 transition-colors">Display</a>
            <a href="/?page=control" className="hover:text-white/50 transition-colors">Control</a>
          </div>
        </div>

        {firstRun && <GettingStarted />}

        {/* Status row */}
        <div className="flex gap-4 mb-6 text-xs text-white/40 flex-wrap">
          <span><StatusDot ok={!!status.PLEX_TOKEN_SET} />Plex</span>
          <span><StatusDot ok={!!status.JELLYFIN_API_KEY_SET} />Jellyfin</span>
          <span><StatusDot ok={!!status.SONARR_API_KEY_SET} />Sonarr</span>
          <span><StatusDot ok={!!status.RADARR_API_KEY_SET} />Radarr</span>
        </div>

        <div className="flex flex-col gap-4">
          <Section title="Plex">
            <Field label="Server URL" id="plex-url" value={form.PLEX_URL} placeholder="http://192.168.1.x:32400" onChange={set('PLEX_URL')} />
            <Field label={status.PLEX_TOKEN_SET ? 'Token (set)' : 'Token'} id="plex-token" type="password" value={form.PLEX_TOKEN} placeholder={status.PLEX_TOKEN_SET ? 'Leave blank to keep' : 'Your Plex token'} onChange={set('PLEX_TOKEN')} onClear={status.PLEX_TOKEN_SET ? () => clearSecret('PLEX_TOKEN') : undefined} />
            <div className="flex items-center gap-3">
              <button
                onClick={test}
                disabled={testing || !form.PLEX_URL}
                className="text-xs px-3 py-1.5 bg-white/8 text-white/60 hover:bg-white/12 hover:text-white/80 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test connection'}
              </button>
              {testResult && (
                <span className={`text-xs ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {testResult.message}
                </span>
              )}
            </div>
          </Section>

          <Section title="Jellyfin (optional)">
            <Field label="Server URL" id="jf-url" value={form.JELLYFIN_URL} placeholder="http://192.168.1.x:8096" onChange={set('JELLYFIN_URL')} />
            <Field label={status.JELLYFIN_API_KEY_SET ? 'API Key (set)' : 'API Key'} id="jf-key" type="password" value={form.JELLYFIN_API_KEY} placeholder={status.JELLYFIN_API_KEY_SET ? 'Leave blank to keep' : 'Dashboard → API Keys'} onChange={set('JELLYFIN_API_KEY')} onClear={status.JELLYFIN_API_KEY_SET ? () => clearSecret('JELLYFIN_API_KEY') : undefined} />
            <div className="flex items-center gap-3">
              <button
                onClick={testJellyfin}
                disabled={testingJF || !form.JELLYFIN_URL}
                className="text-xs px-3 py-1.5 bg-white/8 text-white/60 hover:bg-white/12 hover:text-white/80 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testingJF ? 'Testing...' : 'Test connection'}
              </button>
              {testResultJF && (
                <span className={`text-xs ${testResultJF.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {testResultJF.message}
                </span>
              )}
            </div>
          </Section>

          <Section title="Sonarr (optional)">
            <Field label="Server URL" id="sonarr-url" value={form.SONARR_URL} placeholder="http://192.168.1.x:8989" onChange={set('SONARR_URL')} />
            <Field label={status.SONARR_API_KEY_SET ? 'API Key (set)' : 'API Key'} id="sonarr-key" type="password" value={form.SONARR_API_KEY} placeholder={status.SONARR_API_KEY_SET ? 'Leave blank to keep' : 'Settings → General → API Key'} onChange={set('SONARR_API_KEY')} onClear={status.SONARR_API_KEY_SET ? () => clearSecret('SONARR_API_KEY') : undefined} />
          </Section>

          <Section title="Radarr (optional)">
            <Field label="Server URL" id="radarr-url" value={form.RADARR_URL} placeholder="http://192.168.1.x:7878" onChange={set('RADARR_URL')} />
            <Field label={status.RADARR_API_KEY_SET ? 'API Key (set)' : 'API Key'} id="radarr-key" type="password" value={form.RADARR_API_KEY} placeholder={status.RADARR_API_KEY_SET ? 'Leave blank to keep' : 'Settings → General → API Key'} onChange={set('RADARR_API_KEY')} onClear={status.RADARR_API_KEY_SET ? () => clearSecret('RADARR_API_KEY') : undefined} />
          </Section>

          <Section title="Govee Ambient Sync (optional)">
            <p className="text-white/30 text-xs leading-relaxed">
              Extracts the dominant color from poster art while media plays and pushes it to your lights.
              Requires a Govee RGBIC Wi-Fi device with <strong className="text-white/50">LAN Control enabled</strong> in the Govee app (device Settings → LAN Control). Works with strips, panels, and lamps — not the Sync Box.
            </p>
            <Field label="Device IP" id="govee-ip" value={form.GOVEE_IP} placeholder="192.168.1.x" onChange={set('GOVEE_IP')} />
            <Field label="Device ID" id="govee-id" value={form.GOVEE_DEVICE_ID} placeholder="AA:BB:CC:DD:EE:FF:GG:HH" onChange={set('GOVEE_DEVICE_ID')} />
          </Section>

          <Section title="Weather (optional — Open-Meteo, no API key)">
            <Field
              label="Location"
              id="location"
              value={form.LOCATION}
              placeholder="Atlanta, GA"
              onChange={(v) => { set('LOCATION')(v); setResolvedLocation(''); setGeoError(''); }}
            />
            {resolvedLocation && (
              <p className="text-xs text-white/30">Resolved to: {resolvedLocation}</p>
            )}
            {geoError && (
              <p className="text-xs text-red-400">{geoError}</p>
            )}
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-1">Temperature Unit</label>
              <div className="flex gap-3">
                {['fahrenheit', 'celsius'].map((u) => (
                  <button
                    key={u}
                    onClick={() => set('TEMP_UNIT')(u)}
                    className={`px-4 py-2 text-xs rounded transition-colors ${
                      form.TEMP_UNIT === u
                        ? 'bg-white text-black font-semibold'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {u === 'fahrenheit' ? '°F' : '°C'}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Display Settings">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Slideshow Speed</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: '5', label: '5s' },
                  { value: '10', label: '10s' },
                  { value: '20', label: '20s' },
                  { value: '30', label: '30s' },
                  { value: '60', label: '1m' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set('SLIDESHOW_INTERVAL')(opt.value)}
                    className={`px-4 py-2 text-xs rounded transition-colors ${
                      form.SLIDESHOW_INTERVAL === opt.value
                        ? 'bg-white text-black font-semibold'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Clock Format</p>
              <div className="flex gap-3">
                {[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set('CLOCK_FORMAT')(opt.value)}
                    className={`px-4 py-2 text-xs rounded transition-colors ${
                      form.CLOCK_FORMAT === opt.value
                        ? 'bg-white text-black font-semibold'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Field
              label="Display Name"
              id="display-name"
              value={form.DISPLAY_NAME}
              placeholder="LOBBY"
              onChange={set('DISPLAY_NAME')}
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Weather</p>
                <div className="flex gap-2">
                  {[{ value: 'true', label: 'Show' }, { value: 'false', label: 'Hide' }].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => set('SHOW_WEATHER')(opt.value)}
                      className={`flex-1 py-2 text-xs rounded transition-colors ${
                        form.SHOW_WEATHER === opt.value
                          ? 'bg-white text-black font-semibold'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Clock</p>
                <div className="flex gap-2">
                  {[{ value: 'true', label: 'Show' }, { value: 'false', label: 'Hide' }].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => set('SHOW_CLOCK')(opt.value)}
                      className={`flex-1 py-2 text-xs rounded transition-colors ${
                        form.SHOW_CLOCK === opt.value
                          ? 'bg-white text-black font-semibold'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Titles</p>
                <div className="flex gap-2">
                  {[{ value: 'true', label: 'Show' }, { value: 'false', label: 'Hide' }].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => set('SHOW_TITLES')(opt.value)}
                      className={`flex-1 py-2 text-xs rounded transition-colors ${
                        form.SHOW_TITLES === opt.value
                          ? 'bg-white text-black font-semibold'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Library Content</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all', label: 'Movies + Shows' },
                  { value: 'movies', label: 'Movies only' },
                  { value: 'shows', label: 'Shows only' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set('LIBRARY_FILTER')(opt.value)}
                    className={`px-4 py-2 text-xs rounded transition-colors ${
                      form.LIBRARY_FILTER === opt.value
                        ? 'bg-white text-black font-semibold'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Auto-Schedule (optional)">
            <ScheduleRow
              label="Switch to Coming Soon"
              dayKey="SCHEDULE_CS_DAY"
              hourKey="SCHEDULE_CS_HOUR"
              form={form}
              set={set}
            />
            <ScheduleRow
              label="Switch back to Auto"
              dayKey="SCHEDULE_AUTO_DAY"
              hourKey="SCHEDULE_AUTO_HOUR"
              form={form}
              set={set}
            />
            <p className="text-white/20 text-xs">Applied on next container start.</p>
          </Section>

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3 bg-white text-black text-sm font-semibold rounded hover:bg-white/90 active:bg-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save configuration'}
          </button>

          {saved && (
            <p className="text-center text-xs text-green-400">
              Saved — display updated automatically.
            </p>
          )}
          {saveError && (
            <p className="text-center text-xs text-red-400">{saveError}</p>
          )}
        </div>

      </div>
    </div>
  );
}
