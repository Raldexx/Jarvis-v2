<script>
  // CircleGauge.svelte – SVG donut gauge
  export let value = 0;    // 0-100
  export let color = '#00E5FF';
  export let size  = 88;
  export let label = '';

  const R     = 36;
  const CX    = 44;
  const CY    = 44;
  const CIRC  = 2 * Math.PI * R;

  $: dashoffset = CIRC * (1 - Math.min(value, 100) / 100);
</script>

<svg width={size} height={size} viewBox="0 0 88 88" style="display:block;">
  <!-- track -->
  <circle cx={CX} cy={CY} r={R}
    fill="none" stroke="#222" stroke-width="8"/>
  <!-- progress -->
  <circle cx={CX} cy={CY} r={R}
    fill="none"
    stroke={color}
    stroke-width="8"
    stroke-linecap="round"
    stroke-dasharray={CIRC}
    stroke-dashoffset={dashoffset}
    transform="rotate(-90 44 44)"
    style="transition: stroke-dashoffset 0.35s ease;"
  />
  <!-- label -->
  <text x={CX} y={CY + 5}
    text-anchor="middle"
    font-size="13"
    font-weight="bold"
    fill="white"
    font-family="monospace">{label || `${Math.round(value)}%`}</text>
</svg>
