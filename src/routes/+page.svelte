<script>
  import { onMount, onDestroy } from 'svelte';

  // ── State (plain variables, no stores) ──
  let cpu = 0, ram = 0, disk = 0;
  let ramUsed = 0, ramTotal = 0, diskFree = 0;
  let cpuTemp = null, gpuTemp = null;
  let uptime = '0h 0m';
  let dlSpeed = 0, ulSpeed = 0;
  let weatherText = 'Loading...';
  let spotifyPlaying = false, spotifyTrack = '', spotifyArtist = '';
  let processList = [];
  let modal = null;
  let errorMsg = '';

  let cpuHistory = Array(60).fill(0);
  let netHistory = Array(60).fill(0);

  let prevRecv = 0, prevSent = 0;
  let weatherTs = 0;
  let mockTick = 0;

  // ── Invoke helper ──
  async function inv(cmd, args) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke(cmd, args);
    } catch(e) {
      return null;
    }
  }

  // ── Tick ──
  async function tick() {
    mockTick++;

    const s = await inv('get_system_stats');
    if (s) {
      cpu = s.cpu_percent;
      ram = s.ram_percent;
      ramUsed = s.ram_used_gb;
      ramTotal = s.ram_total_gb;
      disk = s.disk_percent;
      diskFree = s.disk_free_gb;
      cpuTemp = s.cpu_temp;
      gpuTemp = s.gpu_temp;
      const h = Math.floor(s.uptime_secs / 3600);
      const m = Math.floor((s.uptime_secs % 3600) / 60);
      uptime = `${h}h ${m}m`;
      errorMsg = '';
    } else {
      // Mock fallback
      cpu = 30 + Math.sin(mockTick * 0.15) * 20;
      ram = 55 + Math.sin(mockTick * 0.08) * 15;
      ramUsed = 8.4; ramTotal = 16;
      disk = 60; diskFree = 180;
      cpuTemp = 65;
      const h = Math.floor(mockTick * 2 / 3600);
      const m = Math.floor((mockTick * 2 % 3600) / 60);
      uptime = `${h}h ${m}m`;
      errorMsg = 'MOCK MODE - backend not responding';
    }

    cpuHistory = [...cpuHistory.slice(1), cpu];

    const n = await inv('get_network_stats');
    if (n) {
      dlSpeed = Math.max(0, n.download_bytes - prevRecv) / 1024;
      ulSpeed = Math.max(0, n.upload_bytes   - prevSent) / 1024;
      prevRecv = n.download_bytes;
      prevSent = n.upload_bytes;
    } else if (!s) {
      dlSpeed = Math.random() * 300;
      ulSpeed = Math.random() * 50;
    }
    netHistory = [...netHistory.slice(1), dlSpeed];
  }

  async function slowTick() {
    const now = Date.now();
    if (now - weatherTs > 300_000) {
      const w = await inv('get_weather');
      weatherText = w || '☀ 22°C';
      weatherTs = now;
    }
    const p = await inv('get_processes');
    if (p) processList = p;
    else processList = [
      { name: 'chrome.exe',  cpu_percent: 12.3 },
      { name: 'code.exe',    cpu_percent: 8.1  },
      { name: 'discord.exe', cpu_percent: 3.4  },
    ];
    const sp = await inv('get_spotify');
    if (sp) { spotifyPlaying = sp.playing; spotifyTrack = sp.track; spotifyArtist = sp.artist; }
  }

  let fastId, slowId;
  onMount(() => {
    tick(); slowTick();
    fastId = setInterval(tick, 1000);
    slowId = setInterval(slowTick, 2000);
  });
  onDestroy(() => { clearInterval(fastId); clearInterval(slowId); });

  // ── Helpers ──
  function fmtSpeed(k) { return k >= 1024 ? `${(k/1024).toFixed(2)} MB/s` : `${k.toFixed(1)} KB/s`; }
  function fmtTemp(t)  { return t != null ? `${t.toFixed(0)}°C` : 'N/A'; }
  function colPct(p)   { return p > 85 ? '#FF1744' : p > 65 ? '#FFD700' : '#00E5FF'; }
  function arc(pct, r) {
    const c = 2 * Math.PI * r;
    return `${c * Math.min(pct,100)/100} ${c}`;
  }

  async function doAction(action) {
    if (['restart','shutdown'].includes(action)) {
      if (!confirm(`Confirm ${action}?`)) return;
    }
    await inv('system_action', { action });
  }
</script>

<div class="shell">

  <!-- HEADER -->
  <div class="card hdr">
    <div>
      <div class="logo">⚡ <span>JARVIS</span> <small>v2.0</small></div>
      <div class="sub">SYSTEM MONITOR</div>
    </div>
    <div class="meta">
      <div>⏱ {uptime}</div>
      <div>🌤 {weatherText}</div>
    </div>
  </div>

  <!-- ERROR -->
  {#if errorMsg}
    <div class="err-banner">{errorMsg}</div>
  {/if}

  <!-- SPOTIFY -->
  <div class="card spotify">
    <div class="sp-icon">{spotifyPlaying ? '🎵' : '⏸'}</div>
    <div>
      <div class="sp-label">NOW PLAYING</div>
      <div class="sp-track">{spotifyPlaying ? spotifyTrack : 'Not Playing'}</div>
      <div class="sp-artist">{spotifyPlaying ? `by ${spotifyArtist}` : 'Open Spotify to see track info'}</div>
    </div>
  </div>

  <!-- CPU + RAM -->
  <div class="row2">
    <div class="card gauge-card">
      <div class="g-title">🔥 CPU</div>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="#222" stroke-width="8"/>
        <circle cx="44" cy="44" r="36" fill="none" stroke={colPct(cpu)} stroke-width="8"
          stroke-linecap="round" stroke-dasharray={arc(cpu,36)}
          transform="rotate(-90 44 44)" style="transition:stroke-dasharray .4s"/>
        <text x="44" y="49" text-anchor="middle" font-size="13" font-weight="bold" fill="white">{cpu.toFixed(0)}%</text>
      </svg>
      <div class="mini-graph">
        {#each cpuHistory as v, i}
          <div class="bar" style="height:{Math.max(2, v/100*52)}px; background:{colPct(v)}"></div>
        {/each}
      </div>
      {#if cpuTemp}<div class="badge">🌡 {fmtTemp(cpuTemp)}</div>{/if}
    </div>

    <div class="card gauge-card">
      <div class="g-title">💾 RAM</div>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="#222" stroke-width="8"/>
        <circle cx="44" cy="44" r="36" fill="none" stroke={colPct(ram)} stroke-width="8"
          stroke-linecap="round" stroke-dasharray={arc(ram,36)}
          transform="rotate(-90 44 44)" style="transition:stroke-dasharray .4s"/>
        <text x="44" y="49" text-anchor="middle" font-size="13" font-weight="bold" fill="white">{ram.toFixed(0)}%</text>
      </svg>
      <div class="mini-graph">
        {#each Array(60).fill(0) as _, i}
          <div class="bar" style="height:{Math.max(2, ram/100*52)}px; background:{colPct(ram)}"></div>
        {/each}
      </div>
      <div class="badge">{ramUsed.toFixed(1)} / {ramTotal.toFixed(1)} GB</div>
    </div>
  </div>

  <!-- NETWORK -->
  <div class="card net-card">
    <div class="net-hdr">
      <span class="sec-title">🌐 NETWORK</span>
    </div>
    <div class="net-speeds">
      <span class="dl">⬇ {fmtSpeed(dlSpeed)}</span>
      <span class="ul">⬆ {fmtSpeed(ulSpeed)}</span>
    </div>
    <div class="mini-graph">
      {#each netHistory as v}
        {@const max = Math.max(...netHistory, 1)}
        <div class="bar" style="height:{Math.max(2, v/max*52)}px; background:#00FF41"></div>
      {/each}
    </div>
  </div>

  <!-- PILLS -->
  <div class="pills">
    <div class="pill">
      <div class="pill-icon">💿</div>
      <div class="pill-name">DISK</div>
      <div class="pill-val" style="color:{colPct(disk)}">{disk.toFixed(0)}%</div>
      <div class="pill-sub">{diskFree.toFixed(1)} GB free</div>
    </div>
    <div class="pill">
      <div class="pill-icon">🌡</div>
      <div class="pill-name">CPU TEMP</div>
      <div class="pill-val">{fmtTemp(cpuTemp)}</div>
      <div class="pill-sub">GPU {fmtTemp(gpuTemp)}</div>
    </div>
    <div class="pill">
      <div class="pill-icon">🔋</div>
      <div class="pill-name">BATTERY</div>
      <div class="pill-val muted">N/A</div>
      <div class="pill-sub">Plugged in</div>
    </div>
  </div>

  <!-- PROCESSES -->
  <div class="card proc-card">
    <div class="sec-title" style="margin-bottom:8px">📋 TOP PROCESSES</div>
    {#each processList as p}
      <div class="proc-row">
        <span class="proc-name">{p.name}</span>
        <div class="proc-bar-wrap"><div class="proc-bar" style="width:{Math.min(p.cpu_percent,100)}%;background:{colPct(p.cpu_percent)}"></div></div>
        <span class="proc-pct">{p.cpu_percent.toFixed(1)}%</span>
      </div>
    {/each}
  </div>

  <!-- BUTTONS -->
  <div class="btns">
    <button class="ibtn" on:click={() => modal='settings'}>⚙<span>Settings</span></button>
    <button class="ibtn" on:click={() => modal='actions'}>⚡<span>Actions</span></button>
  </div>

</div>

<!-- MODAL -->
{#if modal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="overlay" on:click|self={() => modal=null}>
    <div class="mbox">
      {#if modal === 'settings'}
        <h3>⚙ SETTINGS</h3>
        <p style="color:#888;font-size:11px;margin-bottom:16px">Settings coming soon in next version.</p>
        <button class="cbtn" on:click={() => modal=null}>✕ Close</button>

      {:else if modal === 'actions'}
        <h3>⚡ QUICK ACTIONS</h3>
        <button class="abtn" on:click={() => doAction('restart')}>🔄 Restart System</button>
        <button class="abtn" on:click={() => doAction('shutdown')}>⚫ Shutdown</button>
        <button class="abtn" on:click={() => doAction('sleep')}>😴 Sleep Mode</button>
        <button class="abtn" on:click={() => doAction('taskmgr')}>📋 Task Manager</button>
        <button class="cbtn" on:click={() => modal=null}>✕ Close</button>
      {/if}
    </div>
  </div>
{/if}

<style>
*{box-sizing:border-box;margin:0;padding:0;}
.shell{width:420px;min-height:100vh;background:linear-gradient(160deg,#0c0c0c,#080810);padding:14px;display:flex;flex-direction:column;gap:10px;font-family:'Consolas',monospace;color:#eee;border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden;}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:12px 14px;position:relative;}
.card::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:2px;background:#00E5FF;border-radius:99px;opacity:.6;}
.hdr{display:flex;align-items:center;justify-content:space-between;}
.logo{font-size:20px;font-weight:900;letter-spacing:.1em;}
.logo span{background:linear-gradient(90deg,#00E5FF,#00FF41);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.logo small{font-size:10px;color:#555;-webkit-text-fill-color:#555;}
.sub{font-size:9px;letter-spacing:.18em;color:#555;margin-top:2px;}
.meta{text-align:right;font-size:11px;color:#aaa;display:flex;flex-direction:column;gap:4px;}
.err-banner{background:rgba(255,150,0,.15);border:1px solid orange;border-radius:8px;padding:8px 12px;font-size:10px;font-weight:700;color:orange;text-align:center;}
.spotify{display:flex;align-items:center;gap:14px;min-height:80px;}
.sp-icon{font-size:36px;}
.sp-label{font-size:9px;font-weight:800;letter-spacing:.14em;color:#1DB954;}
.sp-track{font-size:14px;font-weight:700;color:#fff;}
.sp-artist{font-size:11px;color:#888;}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.gauge-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 10px;}
.g-title{font-size:11px;font-weight:800;letter-spacing:.1em;color:#00E5FF;}
.mini-graph{display:flex;align-items:flex-end;gap:1px;height:52px;width:100%;}
.bar{width:100%;border-radius:2px 2px 0 0;transition:height .3s;}
.badge{font-size:10px;color:#777;font-family:monospace;}
.net-card{display:flex;flex-direction:column;gap:8px;}
.net-hdr{display:flex;justify-content:space-between;}
.net-speeds{display:flex;justify-content:space-between;}
.dl{font-size:15px;font-weight:800;color:#00FF41;font-family:monospace;}
.ul{font-size:15px;font-weight:800;color:#FFD700;font-family:monospace;}
.sec-title{font-size:11px;font-weight:800;letter-spacing:.1em;color:#00E5FF;}
.pills{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.pill{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;}
.pill-icon{font-size:18px;}
.pill-name{font-size:8px;font-weight:800;letter-spacing:.12em;color:#666;}
.pill-val{font-size:14px;font-weight:800;color:#00E5FF;font-family:monospace;}
.pill-sub{font-size:9px;color:#555;text-align:center;}
.muted{color:#555!important;}
.proc-card{padding:12px 14px;}
.proc-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.proc-name{width:110px;font-size:10px;color:#bbb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;}
.proc-bar-wrap{flex:1;height:5px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden;}
.proc-bar{height:100%;border-radius:99px;transition:width .4s;}
.proc-pct{font-size:10px;color:#888;font-family:monospace;width:40px;text-align:right;flex-shrink:0;}
.btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.ibtn{display:flex;flex-direction:column;align-items:center;gap:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px;color:#aaa;cursor:pointer;transition:.15s;font-size:20px;}
.ibtn span{font-size:10px;font-weight:700;letter-spacing:.06em;}
.ibtn:hover{background:rgba(0,229,255,.12);border-color:#00E5FF;color:#00E5FF;}
.overlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;}
.mbox{background:#0e0e14;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:20px;width:300px;display:flex;flex-direction:column;gap:10px;}
.mbox h3{font-size:16px;font-weight:800;color:#00E5FF;text-align:center;}
.abtn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#eee;padding:11px;font-size:12px;font-weight:600;cursor:pointer;text-align:left;transition:.15s;}
.abtn:hover{background:rgba(0,229,255,.12);border-color:#00E5FF;color:#00E5FF;}
.cbtn{background:rgba(255,23,68,.15);border:1px solid #FF1744;border-radius:8px;color:#FF1744;padding:10px;font-weight:700;font-size:12px;cursor:pointer;}
</style>
