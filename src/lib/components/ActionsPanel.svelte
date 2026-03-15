<script>
  import { systemAction, ttsSpeak, clearDailyStats } from '$lib/stores/system.js';
  export let onClose = () => {};
  let confirmAction = null;
  async function doAction(action) {
    if (['restart','shutdown'].includes(action)) { confirmAction = action; return; }
    await exec(action);
  }
  async function exec(action) {
    if (action === 'clear_stats') { clearDailyStats(); ttsSpeak('Statistics cleared'); confirmAction = null; return; }
    const phrases = { restart:'Initiating system restart', shutdown:'Initiating system shutdown', sleep:'Entering sleep mode', taskmgr:'Opening task manager' };
    if (phrases[action]) ttsSpeak(phrases[action]);
    await systemAction(action);
    confirmAction = null;
  }
</script>
<div class="panel">
  <h2>⚡ QUICK ACTIONS</h2>
  {#if confirmAction}
    <div class="confirm">
      <p>⚠ Confirm {confirmAction}?</p>
      <div class="row">
        <button class="danger"  on:click={() => exec(confirmAction)}>Yes, proceed</button>
        <button class="cancel"  on:click={() => confirmAction = null}>Cancel</button>
      </div>
    </div>
  {:else}
    <div class="group-label">🖥 SYSTEM</div>
    <button class="action" on:click={() => doAction('restart')}>🔄 Restart System</button>
    <button class="action" on:click={() => doAction('shutdown')}>⚫ Shutdown</button>
    <button class="action" on:click={() => doAction('sleep')}>😴 Sleep Mode</button>
    <div class="group-label" style="margin-top:8px">🛠 UTILITIES</div>
    <button class="action" on:click={() => doAction('taskmgr')}>📋 Task Manager</button>
    <button class="action" on:click={() => doAction('clear_stats')}>🗑 Clear Daily Stats</button>
    <button class="cancel-btn" on:click={onClose}>✕ Close</button>
  {/if}
</div>
<style>
  .panel{display:flex;flex-direction:column;gap:9px;padding:4px 0;}
  h2{font-size:17px;font-weight:800;color:var(--primary);text-align:center;margin:0;}
  .group-label{font-size:10px;font-weight:800;color:var(--primary);letter-spacing:.1em;margin-top:4px;}
  .action{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#eee;padding:11px 14px;font-size:12px;font-weight:600;cursor:pointer;text-align:left;transition:.15s;}
  .action:hover{background:rgba(0,229,255,.12);border-color:var(--primary);color:var(--primary);}
  .confirm{background:rgba(255,23,68,.1);border:1px solid #FF1744;border-radius:10px;padding:16px;}
  .confirm p{color:#FF6B6B;font-weight:700;margin:0 0 12px;text-align:center;}
  .row{display:flex;gap:10px;}
  button.danger,button.cancel{flex:1;padding:9px;border-radius:7px;font-weight:700;font-size:12px;cursor:pointer;}
  button.danger{background:rgba(255,23,68,.3);border:1px solid #FF1744;color:#FF1744;}
  button.cancel{background:rgba(255,255,255,.07);border:1px solid #555;color:#aaa;}
  .cancel-btn{margin-top:4px;background:rgba(255,23,68,.1);border:1px solid #FF1744;border-radius:8px;color:#FF1744;padding:10px;font-weight:700;font-size:12px;cursor:pointer;}
  .cancel-btn:hover{background:rgba(255,23,68,.25);}
</style>
