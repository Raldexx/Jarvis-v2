<script>
  import { config, THEMES } from '$lib/stores/system.js';

  $: {
    const t = THEMES[$config.theme] || THEMES.ironman;
    if (typeof document !== 'undefined') {
      const r = document.documentElement.style;
      r.setProperty('--primary',   t.primary);
      r.setProperty('--secondary', t.secondary);
      r.setProperty('--accent',    t.accent);
      r.setProperty('--warning',   t.warning);
      r.setProperty('--danger',    t.danger);
    }
  }
</script>

<slot />

<style>
  :global(*) { box-sizing:border-box; margin:0; padding:0; }
  :global(:root) {
    --primary:#00E5FF; --secondary:#0080FF; --accent:#00FF41;
    --warning:#FFD700; --danger:#FF1744;
    font-family:'Consolas','JetBrains Mono',monospace;
    font-size:13px; color:#eee;
  }
  :global(body) { background:transparent; overflow:hidden; user-select:none; -webkit-user-select:none; }
  :global(button,select,input) { font-family:inherit; outline:none; }
</style>
