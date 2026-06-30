import { useState, useEffect } from 'react';

interface ConfigState {
  PLEX_URL: string;
  PLEX_TOKEN_SET: boolean;
  SONARR_URL: string;
  SONARR_API_KEY_SET: boolean;
  RADARR_URL: string;
  RADARR_API_KEY_SET: boolean;
  GOVEE_IP: string;
  GOVEE_DEVICE_ID: string;
  LATITUDE: string;
  LONGITUDE: string;
  TEMP_UNIT: string;
  SCHEDULE_COMING_SOON: string;
  SCHEDULE_AUTO: string;
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

export default function SetupPage() {
  const [form, setForm] = useState({
    PLEX_URL: '', PLEX_TOKEN: '',
    SONARR_URL: '', SONARR_API_KEY: '',
    RADARR_URL: '', RADARR_API_KEY: '',
    GOVEE_IP: '', GOVEE_DEVICE_ID: '',
    LATITUDE: '', LONGITUDE: '', TEMP_UNIT: 'fahrenheit',
    SCHEDULE_COMING_SOON: '', SCHEDULE_AUTO: '',
  });
  const [status, setStatus] = useState<Partial<ConfigState>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
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
          SONARR_URL: d.SONARR_URL || '',
          RADARR_URL: d.RADARR_URL || '',
          GOVEE_IP: d.GOVEE_IP || '',
          GOVEE_DEVICE_ID: d.GOVEE_DEVICE_ID || '',
          LATITUDE: d.LATITUDE || '',
          LONGITUDE: d.LONGITUDE || '',
          TEMP_UNIT: d.TEMP_UNIT || 'fahrenheit',
          SCHEDULE_COMING_SOON: d.SCHEDULE_COMING_SOON || '',
          SCHEDULE_AUTO: d.SCHEDULE_AUTO || '',
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

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Only send non-empty values so we don't overwrite env-var secrets with blanks
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v) payload[k] = v;
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
        <div className="mb-8">
          <h1 className="text-white/40 text-xs font-bold tracking-[0.4em] uppercase mb-1 select-none">
            LOBBY SETUP
          </h1>
          <p className="text-white/20 text-xs">
            Configure services. Tokens set via env vars are active but not shown here.
          </p>
        </div>

        {/* Status row */}
        <div className="flex gap-4 mb-6 text-xs text-white/40">
          <span><StatusDot ok={!!status.PLEX_TOKEN_SET} />Plex</span>
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
            <Field
              label="Switch to Coming Soon (cron)"
              id="sched-cs"
              value={form.SCHEDULE_COMING_SOON}
              placeholder="0 18 * * 5  (Fridays at 6pm)"
              onChange={set('SCHEDULE_COMING_SOON')}
            />
            <Field
              label="Switch back to Auto (cron)"
              id="sched-auto"
              value={form.SCHEDULE_AUTO}
              placeholder="0 6 * * 1  (Mondays at 6am)"
              onChange={set('SCHEDULE_AUTO')}
            />
            <p className="text-white/20 text-xs">
              Format: minute hour day month weekday (0=Sun, 5=Fri). Applied on next container start.
            </p>
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

        <div className="mt-8 flex gap-4 justify-center text-xs text-white/20">
          <a href="/?page=control" className="hover:text-white/40 transition-colors">Control</a>
          <a href="/" className="hover:text-white/40 transition-colors">Display</a>
        </div>
      </div>
    </div>
  );
}
