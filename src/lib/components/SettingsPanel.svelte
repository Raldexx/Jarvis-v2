<script>
  import { config, THEMES, startPolling, ttsSpeak } from '$lib/stores/system.js';
  export let onClose = () => {};
  let cfg = { ...$config };
  function save() {
    config.set(cfg);
    startPolling(cfg.updateIntervalMs);
    if (cfg.soundEnabled) ttsSpeak('Settings saved');
    onClose();
  }
</script>
<div class="panel">
  <h2>⚙ SETTINGS</h2>
  <label>🎨 Theme
    <select bind:value={cfg.theme}>
      {#each Object.keys(THEMES) as t}
        <option value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
      {/each}
    </select>
  </label>
  <label>🔆 Opacity: {cfg.opacity}%
    <input type="range" min="50" max="100" bind:value={cfg.opacity}/>
  </label>
  <label>⏱ Update Interval: {cfg.updateIntervalMs}ms
    <input type="range" min="500" max="5000" step="500" bind:value={cfg.updateIntervalMs}/>
  </label>
  <label>🔥 CPU Alert: {cfg.cpuThreshold}%
    <input type="range" min="50" max="100" bind:value={cfg.cpuThreshold}/>
  </label>
  <label>💾 RAM Alert: {cfg.ramThreshold}%
    <input type="range" min="50" max="100" bind:value={cfg.ramThreshold}/>
  </label>
  <label class="check">
    <input type="checkbox" bind:checked={cfg.soundEnabled}/>
    🔊 Voice Alerts
  </label>
  <div class="actions">
    <button class="save"   on:click={save}>✓ Save & Close</button>
    <button class="cancel" on:click={onClose}>✕ Cancel</button>
  </div>
</div>
<style>
  .panel{display:flex;flex-direction:column;gap:14px;padding:4px 0;}
  h2{font-size:17px;font-weight:800;color:var(--primary);text-align:center;margin:0;}
  label{display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:700;color:var(--primary);letter-spacing:.06em;}
  select,input[type=range]{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:6px;color:#fff;padding:6px 10px;font-size:12px;}
  input[type=range]{padding:0;accent-color:var(--primary);}
  label.check{flex-direction:row;align-items:center;gap:10px;}
  .actions{display:flex;gap:10px;margin-top:6px;}
  button{flex:1;padding:10px;border-radius:8px;font-weight:700;font-size:12px;border:none;cursor:pointer;transition:.15s;}
  .save{background:rgba(0,229,255,.2);border:1px solid var(--primary);color:var(--primary);}
  .save:hover{background:rgba(0,229,255,.35);}
  .cancel{background:rgba(255,23,68,.15);border:1px solid #FF1744;color:#FF1744;}
  .cancel:hover{background:rgba(255,23,68,.3);}
</style>
