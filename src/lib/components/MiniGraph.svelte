<script>
  // MiniGraph.svelte – Canvas-based wave/area chart
  // Props: data (number[60]), color (css string), height (px)
  import { onMount, afterUpdate } from 'svelte';

  export let data  = Array(60).fill(0);
  export let color = '#00E5FF';
  export let height = 56;

  let canvas;

  function draw() {
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const w      = canvas.width;
    const h      = canvas.height;
    const maxVal = Math.max(...data, 1);

    ctx.clearRect(0, 0, w, h);

    // Filled area
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + 'AA');
    grad.addColorStop(1, color + '11');

    ctx.beginPath();
    ctx.moveTo(0, h);
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / maxVal) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / maxVal) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  onMount(draw);
  afterUpdate(draw);
</script>

<canvas
  bind:this={canvas}
  width={360}
  {height}
  style="width:100%; height:{height}px; display:block; border-radius:4px;"
></canvas>
