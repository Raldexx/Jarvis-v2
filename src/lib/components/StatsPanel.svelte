<script>
  import { dailyStats, avgStats } from '$lib/stores/system.js';
  export let onClose = () => {};
  $: s  = $dailyStats;
  $: av = $avgStats;
</script>
<div class="panel">
  <h2>📊 DAILY STATISTICS</h2>
  <div class="grid">
    <div class="stat"><span class="lbl">⬇ Download</span><span class="val">{s.dlMb.toFixed(1)} MB</span></div>
    <div class="stat"><span class="lbl">⬆ Upload</span>   <span class="val">{s.ulMb.toFixed(1)} MB</span></div>
    <div class="stat"><span class="lbl">🔥 Peak CPU</span><span class="val">{s.peakCpu.toFixed(1)}%</span></div>
    <div class="stat"><span class="lbl">💾 Peak RAM</span><span class="val">{s.peakRam.toFixed(1)}%</span></div>
    <div class="stat"><span class="lbl">📈 Avg CPU</span> <span class="val">{av.avgCpu.toFixed(1)}%</span></div>
    <div class="stat"><span class="lbl">📈 Avg RAM</span> <span class="val">{av.avgRam.toFixed(1)}%</span></div>
  </div>
  <div class="top-proc">
    <span class="lbl">🏆 Top Process</span>
    <span class="proc-name">{s.topProc.name}</span>
    <span class="proc-cpu">{s.topProc.cpu.toFixed(1)}% CPU</span>
  </div>
  <button class="close-btn" on:click={onClose}>✕ Close</button>
</div>
<style>
  .panel{display:flex;flex-direction:column;gap:14px;padding:4px 0;}
  h2{font-size:17px;font-weight:800;color:var(--primary);text-align:center;margin:0;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .stat{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:4px;}
  .lbl{font-size:10px;color:#888;font-weight:700;letter-spacing:.05em;}
  .val{font-size:16px;color:#fff;font-weight:800;font-family:monospace;}
  .top-proc{background:rgba(0,229,255,.08);border:1px solid rgba(0,229,255,.2);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px;}
  .proc-name{font-size:14px;color:var(--primary);font-weight:700;}
  .proc-cpu{font-size:11px;color:#888;}
  .close-btn{background:rgba(255,23,68,.15);border:1px solid #FF1744;border-radius:8px;color:#FF1744;padding:10px;font-weight:700;font-size:12px;cursor:pointer;margin-top:4px;}
  .close-btn:hover{background:rgba(255,23,68,.3);}
</style>
