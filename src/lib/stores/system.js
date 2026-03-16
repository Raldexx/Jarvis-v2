import { writable, derived } from 'svelte/store';

// Tauri invoke - gracefully handle if not in Tauri context
async function safeInvoke(cmd, args) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke(cmd, args);
  } catch (e) {
    console.error(`invoke(${cmd}) failed:`, e);
    return null;
  }
}

// ── Config ────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'jarvis_config_v2';
const defaultConfig = {
  theme: 'ironman', updateIntervalMs: 1000,
  cpuThreshold: 90, ramThreshold: 85,
  soundEnabled: true, opacity: 95,
};
function loadConfig() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? { ...defaultConfig, ...JSON.parse(r) } : { ...defaultConfig }; }
  catch { return { ...defaultConfig }; }
}
function createConfig() {
  const { subscribe, set, update } = writable(loadConfig());
  return {
    subscribe,
    set(val) { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)); set(val); },
    patch(partial) { update(c => { const next = { ...c, ...partial }; localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return next; }); }
  };
}
export const config = createConfig();

// ── Themes ────────────────────────────────────────────────────────────────────
export const THEMES = {
  ironman: { primary: '#00E5FF', secondary: '#0080FF', accent: '#00FF41', warning: '#FFD700', danger: '#FF1744', bg: '#0A0A0A', card: '#151515' },
  hulk:    { primary: '#00FF00', secondary: '#00AA00', accent: '#7FFF00', warning: '#ADFF2F', danger: '#FF4444', bg: '#0A100A', card: '#151A15' },
  captain: { primary: '#FF3B3B', secondary: '#CC0000', accent: '#4444FF', warning: '#FFFFFF', danger: '#FF6B6B', bg: '#0A0A0F', card: '#15151A' },
  dark:    { primary: '#888888', secondary: '#666666', accent: '#AAAAAA', warning: '#CCCCCC', danger: '#999999', bg: '#0A0A0A', card: '#151515' },
};

// ── Stores ────────────────────────────────────────────────────────────────────
export const systemStats = writable({
  cpu_percent: 0, ram_percent: 0, ram_used_gb: 0, ram_total_gb: 0,
  disk_percent: 0, disk_free_gb: 0, uptime_secs: 0,
  cpu_temp: null, gpu_temp: null, battery: null,
});
export const networkStats = writable({ dlSpeed: 0, ulSpeed: 0, totalRecvMb: 0, totalSentMb: 0 });
export const cpuHistory   = writable(Array(60).fill(0));
export const ramHistory   = writable(Array(60).fill(0));
export const netHistory   = writable(Array(60).fill(0));
export const weather      = writable('Loading...');
export const spotify      = writable({ playing: false, track: '', artist: '' });
export const processes    = writable([]);
export const alerts       = writable({ active: false, message: '' });
export const lastError    = writable('');

// ── Daily Stats ───────────────────────────────────────────────────────────────
const DS_KEY = 'jarvis_daily_' + new Date().toISOString().slice(0, 10);
const defaultDaily = { dlMb: 0, ulMb: 0, peakCpu: 0, peakRam: 0, cpuSum: 0, ramSum: 0, readings: 0, topProc: { name: 'N/A', cpu: 0 } };
function loadDaily() { try { return JSON.parse(localStorage.getItem(DS_KEY)) || { ...defaultDaily }; } catch { return { ...defaultDaily }; } }
export const dailyStats = writable(loadDaily());
function saveDaily(s) { localStorage.setItem(DS_KEY, JSON.stringify(s)); }
export function clearDailyStats() { dailyStats.set({ ...defaultDaily }); saveDaily({ ...defaultDaily }); }

// ── Polling ───────────────────────────────────────────────────────────────────
let _prevRecv = 0, _prevSent = 0, _weatherTs = 0, _prevPlaying = false;
let _fastId = null, _slowId = null;

async function fastTick() {
  const s = await safeInvoke('get_system_stats');
  if (s) {
    systemStats.set(s);
    lastError.set('');
    cpuHistory.update(h => { h.shift(); h.push(s.cpu_percent); return [...h]; });
    ramHistory.update(h => { h.shift(); h.push(s.ram_percent); return [...h]; });
  } else {
    lastError.set('⚠ Cannot connect to backend. Make sure you are running the .exe file.');
  }

  const n = await safeInvoke('get_network_stats');
  if (n) {
    const dl = Math.max(0, n.download_bytes - _prevRecv) / 1024;
    const ul = Math.max(0, n.upload_bytes   - _prevSent) / 1024;
    _prevRecv = n.download_bytes;
    _prevSent = n.upload_bytes;
    networkStats.set({ dlSpeed: dl, ulSpeed: ul, totalRecvMb: n.total_recv_mb, totalSentMb: n.total_sent_mb });
    netHistory.update(h => { h.shift(); h.push(dl); return [...h]; });

    dailyStats.update(d => {
      d.dlMb += dl / 1024; d.ulMb += ul / 1024;
      if (s) { d.peakCpu = Math.max(d.peakCpu, s.cpu_percent); d.peakRam = Math.max(d.peakRam, s.ram_percent); d.cpuSum += s.cpu_percent; d.ramSum += s.ram_percent; d.readings++; }
      saveDaily(d); return d;
    });
  }

  if (s) {
    let cfg; config.subscribe(c => cfg = c)();
    const msgs = [];
    if (s.cpu_percent > cfg.cpuThreshold) msgs.push(`⚠ CPU CRITICAL: ${s.cpu_percent.toFixed(0)}%`);
    if (s.ram_percent > cfg.ramThreshold) msgs.push(`⚠ RAM CRITICAL: ${s.ram_percent.toFixed(0)}%`);
    alerts.set({ active: msgs.length > 0, message: msgs.join(' | ') });
  }
}

async function slowTick() {
  if (Date.now() - _weatherTs > 300_000) {
    const w = await safeInvoke('get_weather');
    if (w) { weather.set(w); _weatherTs = Date.now(); }
  }

  const procs = await safeInvoke('get_processes');
  if (procs) {
    processes.set(procs);
    dailyStats.update(d => {
      const top = procs[0];
      if (top && top.cpu_percent > d.topProc.cpu) d.topProc = { name: top.name, cpu: top.cpu_percent };
      return d;
    });
  }

  const sp = await safeInvoke('get_spotify');
  if (sp) {
    spotify.set(sp);
    let cfg; config.subscribe(c => cfg = c)();
    if (sp.playing && !_prevPlaying && cfg.soundEnabled) ttsSpeak(`Now playing ${sp.track} by ${sp.artist}`);
    _prevPlaying = sp.playing;
  }
}

export function startPolling(intervalMs = 1000) {
  stopPolling();
  fastTick(); slowTick();
  _fastId = setInterval(fastTick, intervalMs);
  _slowId = setInterval(slowTick, 2000);
}
export function stopPolling() {
  if (_fastId) { clearInterval(_fastId); _fastId = null; }
  if (_slowId) { clearInterval(_slowId); _slowId = null; }
}

// ── TTS ───────────────────────────────────────────────────────────────────────
export function ttsSpeak(text) {
  let cfg; config.subscribe(c => cfg = c)();
  if (!cfg.soundEnabled || !('speechSynthesis' in window)) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.1;
  window.speechSynthesis.speak(utt);
}

// ── System Actions ────────────────────────────────────────────────────────────
export async function systemAction(action) {
  await safeInvoke('system_action', { action });
}

// ── Derived ───────────────────────────────────────────────────────────────────
export const uptime = derived(systemStats, $s => {
  const h = Math.floor($s.uptime_secs / 3600);
  const m = Math.floor(($s.uptime_secs % 3600) / 60);
  return `${h}h ${m}m`;
});
export const avgStats = derived(dailyStats, $d => ({
  avgCpu: $d.readings > 0 ? $d.cpuSum / $d.readings : 0,
  avgRam: $d.readings > 0 ? $d.ramSum / $d.readings : 0,
}));
