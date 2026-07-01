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
}

function Field({ label, id, value, placeholder, type = 'text', onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-white/40 uppercase tracking-wider mb-1">
        {label}
      </label>
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
            <p className="text-white/70 text-sm font-medium mb-1">Save and restart the container</p>
            <code className="block text-white/40 text-xs font-mono mt-1 bg-black/30 px-3 py-2 rounded">
              cd /opt/lobby && docker compose restart
            </code>
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

export default function SetupPage({ firstRun = false }: { firstRun?: boolean }) {
  const [form, setForm] = useState({
    PLEX_URL: '', PLEX_TOKEN: '',
    JELLYFIN_URL: '', JELLYFIN_API_KEY: '',
    SONARR_URL: '', SONARR_API_KEY: '',
    RADARR_URL: '', RADARR_API_KEY: '',
    GOVEE_IP: '', GOVEE_DEVICE_ID: '',
    LATITUDE: '', LONGITUDE: '', TEMP_UNIT: 'fahrenheit',
    SCHEDULE_CS_DAY: '', SCHEDULE_CS_HOUR: '18',
    SCHEDULE_AUTO_DAY: '', SCHEDULE_AUTO_HOUR: '6',
  });
  const [status, setStatus] = useState<Partial<ConfigState>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingJF, setTestingJF] = useState(false);
  const [testResultJF, setTestResultJF] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
          LATITUDE: d.LATITUDE || '',
          LONGITUDE: d.LONGITUDE || '',
          TEMP_UNIT: d.TEMP_UNIT || 'fahrenheit',
          SCHEDULE_CS_DAY: d.SCHEDULE_CS_DAY || '',
          SCHEDULE_CS_HOUR: d.SCHEDULE_CS_HOUR || '18',
          SCHEDULE_AUTO_DAY: d.SCHEDULE_AUTO_DAY || '',
          SCHEDULE_AUTO_HOUR: d.SCHEDULE_AUTO_HOUR || '6',
        }));
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
    try {
      // Send all values; skip secrets when blank so we don't overwrite stored tokens
      const SECRETS = new Set(['PLEX_TOKEN', 'JELLYFIN_API_KEY', 'SONARR_API_KEY', 'RADARR_API_KEY']);
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) {
        if (SECRETS.has(k) && !v) continue;
        payload[k] = v;
      }
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) setSaved(true);
    } catch {}
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
            <Field label={status.PLEX_TOKEN_SET ? 'Token (set — leave blank to keep)' : 'Token'} id="plex-token" type="password" value={form.PLEX_TOKEN} placeholder={status.PLEX_TOKEN_SET ? '••••••••' : 'Your Plex token'} onChange={set('PLEX_TOKEN')} />
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
            <Field label={status.JELLYFIN_API_KEY_SET ? 'API Key (set — leave blank to keep)' : 'API Key'} id="jf-key" type="password" value={form.JELLYFIN_API_KEY} placeholder={status.JELLYFIN_API_KEY_SET ? '••••••••' : 'Dashboard → API Keys'} onChange={set('JELLYFIN_API_KEY')} />
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
            <Field label={status.SONARR_API_KEY_SET ? 'API Key (set — leave blank to keep)' : 'API Key'} id="sonarr-key" type="password" value={form.SONARR_API_KEY} placeholder={status.SONARR_API_KEY_SET ? '••••••••' : 'Settings → General → API Key'} onChange={set('SONARR_API_KEY')} />
          </Section>

          <Section title="Radarr (optional)">
            <Field label="Server URL" id="radarr-url" value={form.RADARR_URL} placeholder="http://192.168.1.x:7878" onChange={set('RADARR_URL')} />
            <Field label={status.RADARR_API_KEY_SET ? 'API Key (set — leave blank to keep)' : 'API Key'} id="radarr-key" type="password" value={form.RADARR_API_KEY} placeholder={status.RADARR_API_KEY_SET ? '••••••••' : 'Settings → General → API Key'} onChange={set('RADARR_API_KEY')} />
          </Section>

          <Section title="Govee Ambient Sync (optional)">
            <Field label="Device IP" id="govee-ip" value={form.GOVEE_IP} placeholder="192.168.1.x" onChange={set('GOVEE_IP')} />
            <Field label="Device ID" id="govee-id" value={form.GOVEE_DEVICE_ID} placeholder="AA:BB:CC:DD:EE:FF:GG:HH" onChange={set('GOVEE_DEVICE_ID')} />
          </Section>

          <Section title="Weather (optional — Open-Meteo, no API key)">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude" id="lat" value={form.LATITUDE} placeholder="33.749" onChange={set('LATITUDE')} />
              <Field label="Longitude" id="lon" value={form.LONGITUDE} placeholder="-84.388" onChange={set('LONGITUDE')} />
            </div>
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
              Saved. Restart the container for changes to take effect:
              <code className="block mt-1 text-white/40 font-mono">
                cd /opt/lobby && docker compose restart
              </code>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
