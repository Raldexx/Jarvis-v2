<script>
  // SpotifyVisualizer.svelte – animated radial bars when playing
  import { onMount, onDestroy } from 'svelte';
  export let playing = false;

  const BARS    = 12;
  const BAR_LEN = 18;
  const RADIUS  = 30;
  const W = 100; const H = 100;

  let bars    = Array(BARS).fill(0.3);
  let frameId = null;
  let t       = 0;

  function animate() {
    t += 0.06;
    if (playing) {
      bars = bars.map((_, i) => 0.3 + 0.7 * Math.abs(Math.sin(t * 2.5 + i * 0.6)));
    } else {
      bars = bars.map(v => Math.max(0.1, v * 0.9));
    }
    frameId = requestAnimationFrame(animate);
  }

  onMount(() => { frameId = requestAnimationFrame(animate); });
  onDestroy(() => { if (frameId) cancelAnimationFrame(frameId); });

  function barLine(i) {
    const angle = (360 / BARS) * i;
    const rad   = angle * Math.PI / 180;
    const len   = bars[i] * BAR_LEN;
    const x1 = W/2 + Math.cos(rad) * RADIUS;
    const y1 = H/2 + Math.sin(rad) * RADIUS;
    const x2 = W/2 + Math.cos(rad) * (RADIUS + len);
    const y2 = H/2 + Math.sin(rad) * (RADIUS + len);
    return { x1, y1, x2, y2, opacity: bars[i] };
  }
</script>

<svg width="100" height="100" viewBox="0 0 100 100" style="display:block;">
  <!-- glow circle -->
  {#if playing}
    <circle cx="50" cy="50" r="28"
      fill="none" stroke="#00E5FF" stroke-width="1" opacity="0.3"/>
    <circle cx="50" cy="50" r="20"
      fill="rgba(0,229,255,0.08)"/>
  {/if}

  <!-- bars -->
  {#each Array(BARS) as _, i}
    {@const l = barLine(i)}
    <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
      stroke={playing ? '#00FF41' : '#444'}
      stroke-width="3"
      stroke-linecap="round"
      opacity={l.opacity}
    />
  {/each}

  <!-- center dot -->
  <circle cx="50" cy="50" r="5"
    fill={playing ? '#00E5FF' : '#333'}/>

  <!-- paused bars if not playing -->
  {#if !playing}
    <rect x="43" y="38" width="4" height="24" rx="2" fill="#555"/>
    <rect x="53" y="38" width="4" height="24" rx="2" fill="#555"/>
  {/if}
</svg>
