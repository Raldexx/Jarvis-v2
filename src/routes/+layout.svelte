<script>
  import { onMount, onDestroy } from 'svelte';
  import { config, THEMES, startPolling, stopPolling } from '$lib/stores/system.js';

  $: {
    const t = THEMES[$config.theme] || THEMES.ironman;
    if (typeof document !== 'undefined') {
      const r = document.documentElement.style;
      r.setProperty('--primary',   t.primary);
      r.setProperty('--secondary', t.secondary);
      r.setProperty('--accent',    t.accent);
      r.setProperty('--warning',   t.warning);
      r.setProperty('--danger',    t.danger);
      r.setProperty('--bg',        t.bg);
      r.setProperty('--card',      t.card);
    }
  }

  onMount(() => { startPolling($config.updateIntervalMs); });
  onDestroy(() => { stopPolling(); });
</script>

<slot />

<style>
  :global(*) { box-sizing:border-box; margin:0; padding:0; }
  :global(:root) {
    --primary:#00E5FF; --secondary:#0080FF; --accent:#00FF41;
    --warning:#FFD700; --danger:#FF1744; --bg:#0A0A0A; --card:#151515;
    font-family:'Consolas','JetBrains Mono',monospace;
    font-size:13px; color:#eee;
  }
  :global(body) { background:transparent; overflow:hidden; user-select:none; -webkit-user-select:none; }
  :global(button,select,input) { font-family:inherit; outline:none; }
</style>
