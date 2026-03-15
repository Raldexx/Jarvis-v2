// src/lib/stores/system.js
// ─────────────────────────────────────────────────────────────────────────────
//  Central reactive state store.
//  All Tauri invoke() calls live here – components just subscribe.
// ─────────────────────────────────────────────────────────────────────────────

import { writable, derived } from 'svelte/store';
import { invoke }            from '@tauri-apps/api/core';

// ── Config ────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'jarvis_config_v2';

const defaultConfig = {
  theme:            'ironman',
  updateIntervalMs: 1000,
  cpuThreshold:     90,
  ramThreshold:     85,
  soundEnabled:     true,
  opacity:          95,
};

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : { ...defaultConfig };
  } catch { return { ...defaultConfig }; }
}

function createConfig() {
  const { subscribe, set, update } = writable(loadConfig());
  return {
    subscribe,
    set(val) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      set(val);
    },
    patch(partial) {
      update(c => {
        const next = { ...c, ...partial };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  };
}

export const config = createConfig();

// ── Themes ────────────────────────────────────────────────────────────────────
export const THEMES = {
  ironman: { primary: '#00E5FF', secondary: '#0080FF', accent: '#00FF41', warning: '#FFD700', danger: '#FF1744', bg: '#0A0A0A',   card: '#151515' },
  hulk:    { primary: '#00FF00', secondary: '#00AA00', accent: '#7FFF00', warning: '#ADFF2F', danger: '#FF4444', bg: '#0A100A',   card: '#151A15' },
  captain: { primary: '#FF3B3B', secondary: '#CC0000', accent: '#4444FF', warning: '#FFFFFF', danger: '#FF6B6B', bg: '#0A0A0F',   card: '#15151A' },
  dark:    { primary: '#888888', secondary: '#666666', accent: '#AAAAAA', warning: '#CCCCCC', danger: '#999999', bg: '#0A0A0A',   card: '#151515' },
};

// ── System Stats ─────────────────────────────────────────────────────────────
export const systemStats = writable({
  cpu_percent:  0,
  ram_percent:  0,
  ram_used_gb:  0,
  ram_total_gb: 0,
  disk_percent: 0,
  disk_free_gb: 0,
  uptime_secs:  0,
  cpu_temp:     null,
  gpu_temp:     null,
  battery:      null,
});

// Rolling history buffers (60 samples)
const HIST = 60;
function makeHistory() { return Array(HIST).fill(0); }

export const cpuHistory  = writable(makeHistory());
export const ramHistory  = writable(makeHistory());
export const netHistory  = writable(makeHistory());

// ── Network Stats ─────────────────────────────────────────────────────────────
export const networkStats = writable({
  dlSpeed:      0,   // KB/s current
  ulSpeed:      0,   // KB/s current
  totalRecvMb:  0,
  totalSentMb:  0,
});

let _prevRecv = 0;
let _prevSent = 0;

// ── Daily Stats ───────────────────────────────────────────────────────────────
const DS_KEY = 'jarvis_daily_' + new Date().toISOString().slice(0,10);
function loadDailyStats() {
  try { return JSON.parse(localStorage.getItem(DS_KEY)) || null; } catch { return null; }
}

const defaultDaily = { dlMb: 0, ulMb: 0, peakCpu: 0, peakRam: 0, cpuSum: 0, ramSum: 0, readings: 0, topProc: { name: 'N/A', cpu: 0 } };
export const dailyStats = writable(loadDailyStats() || { ...defaultDaily });

function saveDailyStats(s) { localStorage.setItem(DS_KEY, JSON.stringify(s)); }

export function clearDailyStats() {
  const fresh = { ...defaultDaily };
  dailyStats.set(fresh);
  saveDailyStats(fresh);
}

// ── Processes ─────────────────────────────────────────────────────────────────
export const processes = writable([]);

// ── Weather ───────────────────────────────────────────────────────────────────
export const weather = writable('Loading...');
let _weatherTs = 0;

// ── Spotify ───────────────────────────────────────────────────────────────────
export const spotify = writable({ playing: false, track: '', artist: '' });
let _prevSpotifyPlaying = false;

// ── Alerts ────────────────────────────────────────────────────────────────────
export const alerts = writable({ active: false, message: '' });

// ── Polling Loops ─────────────────────────────────────────────────────────────

/** Called from +layout.svelte; keeps a reference to clear later */
let _fastId   = null;
let _slowId   = null;

async function fastTick() {
  try {
    // System stats
    const s = await invoke('get_system_stats');
    systemStats.set(s);

    cpuHistory.update(h => { h.shift(); h.push(s.cpu_percent); return h; });
    ramHistory.update(h => { h.shift(); h.push(s.ram_percent); return h; });

    // Network
    const n = await invoke('get_network_stats');
    const dl = Math.max(0, n.download_bytes - _prevRecv) / 1024;  // KB/s
    const ul = Math.max(0, n.upload_bytes   - _prevSent) / 1024;
    _prevRecv = n.download_bytes;
    _prevSent = n.upload_bytes;

    networkStats.set({
      dlSpeed:     dl,
      ulSpeed:     ul,
      totalRecvMb: n.total_recv_mb,
      totalSentMb: n.total_sent_mb,
    });

    netHistory.update(h => { h.shift(); h.push(dl); return h; });

    // Daily stats
    dailyStats.update(d => {
      d.dlMb    += dl / 1024;
      d.ulMb    += ul / 1024;
      d.peakCpu  = Math.max(d.peakCpu, s.cpu_percent);
      d.peakRam  = Math.max(d.peakRam, s.ram_percent);
      d.cpuSum  += s.cpu_percent;
      d.ramSum  += s.ram_percent;
      d.readings++;
      saveDailyStats(d);
      return d;
    });

    // Alerts
    let cfg; config.subscribe(c => cfg = c)();
    const msgs = [];
    if (s.cpu_percent > cfg.cpuThreshold) msgs.push(`⚠ CPU CRITICAL: ${s.cpu_percent.toFixed(0)}%`);
    if (s.ram_percent > cfg.ramThreshold) msgs.push(`⚠ RAM CRITICAL: ${s.ram_percent.toFixed(0)}%`);
    alerts.set({ active: msgs.length > 0, message: msgs.join(' | ') });

  } catch (e) { console.warn('fastTick error:', e); }
}

async function slowTick() {
  try {
    // Weather (cached 5 min)
    const now = Date.now();
    if (now - _weatherTs > 300_000) {
      const w = await invoke('get_weather');
      weather.set(w);
      _weatherTs = now;
    }

    // Processes
    const procs = await invoke('get_processes');
    processes.set(procs);

    dailyStats.update(d => {
      const top = procs[0];
      if (top && top.cpu_percent > d.topProc.cpu) {
        d.topProc = { name: top.name, cpu: top.cpu_percent };
      }
      return d;
    });

    // Spotify
    const sp = await invoke('get_spotify');
    spotify.set(sp);

    // TTS announcement when playback starts
    let cfg; config.subscribe(c => cfg = c)();
    if (sp.playing && !_prevSpotifyPlaying && cfg.soundEnabled) {
      ttsSpeak(`Now playing ${sp.track} by ${sp.artist}`);
    }
    _prevSpotifyPlaying = sp.playing;

  } catch (e) { console.warn('slowTick error:', e); }
}

export function startPolling(intervalMs = 1000) {
  stopPolling();
  fastTick();
  slowTick();
  _fastId = setInterval(fastTick, intervalMs);
  _slowId = setInterval(slowTick, 2000);
}

export function stopPolling() {
  if (_fastId) { clearInterval(_fastId); _fastId = null; }
  if (_slowId) { clearInterval(_slowId); _slowId = null; }
}

// ── TTS (Web Speech API) ──────────────────────────────────────────────────────
export function ttsSpeak(text) {
  let cfg; config.subscribe(c => cfg = c)();
  if (!cfg.soundEnabled) return;
  if (!('speechSynthesis' in window)) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.1;
  window.speechSynthesis.speak(utt);
}

// ── System Actions ────────────────────────────────────────────────────────────
export async function systemAction(action) {
  await invoke('system_action', { action });
}

// ── Derived helpers ───────────────────────────────────────────────────────────
export const uptime = derived(systemStats, $s => {
  const h = Math.floor($s.uptime_secs / 3600);
  const m = Math.floor(($s.uptime_secs % 3600) / 60);
  return `${h}h ${m}m`;
});

export const avgStats = derived(dailyStats, $d => ({
  avgCpu: $d.readings > 0 ? $d.cpuSum / $d.readings : 0,
  avgRam: $d.readings > 0 ? $d.ramSum / $d.readings : 0,
}));
