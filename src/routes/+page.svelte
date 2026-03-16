<script>
  import { onMount, onDestroy } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';

  import CircleGauge       from '$lib/components/CircleGauge.svelte';
  import MiniGraph         from '$lib/components/MiniGraph.svelte';
  import SpotifyVisualizer from '$lib/components/SpotifyVisualizer.svelte';
  import SettingsPanel     from '$lib/components/SettingsPanel.svelte';
  import ActionsPanel      from '$lib/components/ActionsPanel.svelte';
  import StatsPanel        from '$lib/components/StatsPanel.svelte';

  import {
    systemStats, networkStats, dailyStats,
    cpuHistory, ramHistory, netHistory,
    weather, spotify, processes,
    alerts, uptime, config, THEMES, ttsSpeak, lastError, startPolling, stopPolling,
  } from '$lib/stores/system.js';

  let modal = null;

  $: s          = $systemStats;
  $: n          = $networkStats;
  $: sp         = $spotify;
  $: al         = $alerts;
  $: th         = THEMES[$config.theme] || THEMES.ironman;
  $: totalToday = ($dailyStats.dlMb + $dailyStats.ulMb).toFixed(1);

  async function onMouseDown(e) {
    if (e.target.closest('button, input, select, .no-drag')) return;
    const win = getCurrentWindow();
    await win.startDragging();
  }

  function fmtSpeed(kbs) {
    return kbs >= 1024 ? `${(kbs/1024).toFixed(2)} MB/s` : `${kbs.toFixed(1)} KB/s`;
  }
  function fmtTemp(t) { return t != null ? `${t.toFixed(0)}°C` : 'N/A'; }
  function colorForPct(p) {
    return p > 85 ? 'var(--danger)' : p > 65 ? 'var(--warning)' : 'var(--primary)';
  }

  onDestroy(() => stopPolling());
  onMount(() => {
    startPolling($config.updateIntervalMs);
    if ($config.soundEnabled) setTimeout(() => ttsSpeak('Systems online'), 800);
  });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="shell"
  style="--primary:{th.primary};--secondary:{th.secondary};--accent:{th.accent};--warning:{th.warning};--danger:{th.danger};opacity:{$config.opacity/100};"
  on:mousedown={onMouseDown}
>

  <!-- HEADER -->
  <header class="card header-card">
    <div class="header-left">
      <div class="logo">
        <span class="logo-bolt">⚡</span>
        <span class="logo-text">JARVIS</span>
        <span class="logo-version">v2.0</span>
      </div>
      <div class="header-sub">SYSTEM MONITOR</div>
    </div>
    <div class="header-right">
      <div class="meta-row"><span>⏱</span><span class="meta-val">{$uptime}</span></div>
      <div class="meta-row"><span>🌤</span><span class="meta-val">{$weather}</span></div>
    </div>
  </header>

  <!-- SPOTIFY -->
  <div class="card spotify-card">
    <SpotifyVisualizer playing={sp.playing} />
    <div class="spotify-info">
      <div class="spotify-label">🎵 NOW PLAYING</div>
      {#if sp.playing}
        <div class="spotify-track">{sp.track}</div>
        <div class="spotify-artist">by {sp.artist}</div>
      {:else}
        <div class="spotify-track muted">Not Playing</div>
        <div class="spotify-artist">Open Spotify to see track info</div>
      {/if}
    </div>
  </div>

  <!-- CPU + RAM -->
  <div class="row-2">
    <div class="card gauge-card">
      <div class="gauge-header">🔥 CPU</div>
      <CircleGauge value={s.cpu_percent} color={colorForPct(s.cpu_percent)} size={88} />
      <MiniGraph data={$cpuHistory} color={colorForPct(s.cpu_percent)} height={48} />
      <div class="gauge-footer">
        {#if s.cpu_temp != null}<span class="temp-badge">🌡 {fmtTemp(s.cpu_temp)}</span>{/if}
      </div>
    </div>
    <div class="card gauge-card">
      <div class="gauge-header">💾 RAM</div>
      <CircleGauge value={s.ram_percent} color={colorForPct(s.ram_percent)} size={88} />
      <MiniGraph data={$ramHistory} color={colorForPct(s.ram_percent)} height={48} />
      <div class="gauge-footer">
        <span class="temp-badge">{s.ram_used_gb.toFixed(1)} / {s.ram_total_gb.toFixed(1)} GB</span>
      </div>
    </div>
  </div>

  <!-- NETWORK -->
  <div class="card network-card">
    <div class="net-header">
      <span class="section-title">🌐 NETWORK</span>
      <span class="net-today">📊 Today: {totalToday} MB</span>
    </div>
    <div class="net-speeds">
      <span class="dl">⬇ {fmtSpeed(n.dlSpeed)}</span>
      <span class="ul">⬆ {fmtSpeed(n.ulSpeed)}</span>
    </div>
    <MiniGraph data={$netHistory} color="var(--accent)" height={52} />
  </div>

  <!-- PILLS -->
  <div class="pills-row">
    <div class="pill">
      <span class="pill-icon">💿</span>
      <span class="pill-name">DISK</span>
      <span class="pill-val" style="color:{colorForPct(s.disk_percent)}">{s.disk_percent.toFixed(0)}%</span>
      <span class="pill-sub">{s.disk_free_gb.toFixed(1)} GB free</span>
    </div>
    <div class="pill">
      <span class="pill-icon">🌡</span>
      <span class="pill-name">CPU TEMP</span>
      <span class="pill-val">{fmtTemp(s.cpu_temp)}</span>
      <span class="pill-sub">{s.gpu_temp != null ? `GPU ${fmtTemp(s.gpu_temp)}` : 'GPU N/A'}</span>
    </div>
    <div class="pill">
      <span class="pill-icon">🔋</span>
      <span class="pill-name">BATTERY</span>
      {#if s.battery}
        <span class="pill-val">{s.battery.percent.toFixed(0)}%</span>
        <span class="pill-sub">{s.battery.charging ? '⚡ Charging' : 'On Battery'}</span>
      {:else}
        <span class="pill-val muted">N/A</span>
        <span class="pill-sub">Plugged in</span>
      {/if}
    </div>
  </div>

  <!-- PROCESSES -->
  <div class="card proc-card">
    <div class="section-title" style="margin-bottom:8px">📋 TOP PROCESSES</div>
    <div class="proc-list">
      {#each $processes as p}
        <div class="proc-row">
          <span class="proc-name">{p.name}</span>
          <div class="proc-bar-wrap">
            <div class="proc-bar" style="width:{Math.min(p.cpu_percent,100)}%;background:{colorForPct(p.cpu_percent)};"></div>
          </div>
          <span class="proc-pct">{p.cpu_percent.toFixed(1)}%</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- ALERT -->
  {#if $lastError}
  <div class="error-banner">{$lastError}</div>
{/if}

  {#if al.active}
    <div class="alert-banner">{al.message}</div>
  {/if}

  <!-- BUTTONS -->
  <div class="btn-row no-drag">
    <button class="icon-btn" on:click={() => modal = 'settings'}>
      <span>⚙</span><span class="btn-label">Settings</span>
    </button>
    <button class="icon-btn" on:click={() => modal = 'stats'}>
      <span>📊</span><span class="btn-label">Stats</span>
    </button>
    <button class="icon-btn" on:click={() => modal = 'actions'}>
      <span>⚡</span><span class="btn-label">Actions</span>
    </button>
  </div>

</div>

<!-- MODAL -->
{#if modal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="overlay" on:click|self={() => modal = null}>
    <div class="modal-box">
      {#if modal === 'settings'}
        <SettingsPanel onClose={() => modal = null} />
      {:else if modal === 'stats'}
        <StatsPanel    onClose={() => modal = null} />
      {:else if modal === 'actions'}
        <ActionsPanel  onClose={() => modal = null} />
      {/if}
    </div>
  </div>
{/if}

<style>
.shell{width:420px;min-height:100vh;background:linear-gradient(160deg,#0c0c0c 0%,#080810 100%);padding:14px;display:flex;flex-direction:column;gap:10px;cursor:default;border:1px solid rgba(255,255,255,.06);border-radius:14px;position:relative;overflow:hidden;}
.shell::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.012) 2px,rgba(255,255,255,.012) 4px);pointer-events:none;border-radius:inherit;}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:12px 14px;position:relative;overflow:hidden;}
.card::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:2px;background:var(--primary);border-radius:99px;opacity:.6;}
.header-card{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;}
.header-left{display:flex;flex-direction:column;gap:2px;}
.logo{display:flex;align-items:baseline;gap:6px;}
.logo-bolt{font-size:20px;}
.logo-text{font-size:22px;font-weight:900;letter-spacing:.12em;background:linear-gradient(90deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.logo-version{font-size:10px;color:#555;font-weight:600;}
.header-sub{font-size:9px;letter-spacing:.18em;color:#555;padding-left:28px;}
.header-right{display:flex;flex-direction:column;gap:5px;align-items:flex-end;}
.meta-row{display:flex;align-items:center;gap:5px;}
.meta-val{font-size:11px;color:#aaa;font-family:monospace;}
.spotify-card{display:flex;align-items:center;gap:14px;min-height:100px;}
.spotify-info{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;}
.spotify-label{font-size:9px;font-weight:800;letter-spacing:.14em;color:#1DB954;}
.spotify-track{font-size:14px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.spotify-artist{font-size:11px;color:#888;}
.muted{color:#555!important;}
.row-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.gauge-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 10px;}
.gauge-header{font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--primary);}
.gauge-footer{min-height:18px;}
.temp-badge{font-size:10px;color:#777;font-family:monospace;}
.network-card{display:flex;flex-direction:column;gap:8px;}
.net-header{display:flex;justify-content:space-between;align-items:center;}
.net-today{font-size:10px;color:#666;}
.net-speeds{display:flex;justify-content:space-between;}
.dl{font-size:15px;font-weight:800;color:var(--accent);font-family:monospace;}
.ul{font-size:15px;font-weight:800;color:var(--warning);font-family:monospace;}
.section-title{font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--primary);}
.pills-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.pill{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;}
.pill-icon{font-size:18px;}
.pill-name{font-size:8px;font-weight:800;letter-spacing:.12em;color:#666;}
.pill-val{font-size:14px;font-weight:800;color:var(--primary);font-family:monospace;}
.pill-sub{font-size:9px;color:#555;text-align:center;}
.proc-card{padding:12px 14px;}
.proc-list{display:flex;flex-direction:column;gap:6px;}
.proc-row{display:flex;align-items:center;gap:8px;}
.proc-name{width:110px;font-size:10px;color:#bbb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;}
.proc-bar-wrap{flex:1;height:5px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden;}
.proc-bar{height:100%;border-radius:99px;transition:width .4s ease;min-width:2px;}
.proc-pct{font-size:10px;color:#888;font-family:monospace;width:40px;text-align:right;flex-shrink:0;}
.error-banner{background:rgba(255,150,0,.15);border:1px solid orange;border-radius:8px;padding:10px 14px;font-size:11px;font-weight:700;color:orange;text-align:center;}
.alert-banner{background:rgba(255,23,68,.15);border:1px solid var(--danger);border-radius:8px;padding:10px 14px;font-size:12px;font-weight:700;color:var(--danger);text-align:center;animation:pulse 1.4s ease-in-out infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
.btn-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:2px;}
.icon-btn{display:flex;flex-direction:column;align-items:center;gap:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 6px;color:#aaa;cursor:pointer;transition:.15s;font-size:11px;}
.icon-btn span:first-child{font-size:20px;}
.icon-btn:hover{background:rgba(0,229,255,.12);border-color:var(--primary);color:var(--primary);}
.btn-label{font-size:10px;font-weight:700;letter-spacing:.06em;}
.overlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;}
.modal-box{background:#0e0e14;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:20px;width:340px;max-height:80vh;overflow-y:auto;box-shadow:0 0 40px rgba(0,229,255,.12);}
.modal-box::-webkit-scrollbar{width:4px;}
.modal-box::-webkit-scrollbar-thumb{background:rgba(0,229,255,.3);border-radius:99px;}
</style>
