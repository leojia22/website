// Hero background: rows of wave lines that swell and drift like a slow tide,
// fading from the soft accent near the surface to the full accent at depth.
// The pointer sends ripples through them.
(() => {
  const canvas = document.querySelector('.hero-canvas');
  const hero = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const LINE_GAP = 30;
  const STEP = 10;
  const RIPPLE_RADIUS = 240;

  let width = 0;
  let height = 0;
  let accent = [0, 0, 0];
  let accentSoft = [0, 0, 0];
  let frame = 0;
  let visible = true;
  const pointer = { x: -9999, y: -9999, active: false, strength: 0 };

  function readColors() {
    const styles = getComputedStyle(document.documentElement);
    const rgb = (name) => {
      const hex = styles.getPropertyValue(name).trim().slice(1);
      return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    };
    accent = rgb('--accent');
    accentSoft = rgb('--accent-soft');
  }

  function mix(a, b, k) {
    return a.map((v, i) => v + (b[i] - v) * k);
  }

  function rgba([r, g, b], alpha) {
    return `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now());
  }

  // Vertical offset of the water at (x, row): a few sines drifting past each other.
  function swell(x, row, t) {
    return (
      Math.sin(x * 0.006 + row * 0.011 + t * 0.5) * 7 +
      Math.sin(x * 0.013 + row * 0.023 - t * 0.35) * 4 +
      Math.sin(x * 0.0025 + t * 0.2) * 9
    );
  }

  function draw(now) {
    const t = reduceMotion.matches ? 0 : now / 1000;
    pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * 0.08;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1.2;

    // The whole field rises and falls slowly.
    const tide = Math.sin(t * 0.25) * 12;

    for (let row = LINE_GAP / 2; row < height + LINE_GAP; row += LINE_GAP) {
      const depth = Math.min(1, row / height);
      const y0 = row + tide * (0.3 + depth);
      const reach = 0.4 + depth * 0.8;

      ctx.beginPath();
      for (let x = -STEP; x <= width + STEP; x += STEP) {
        const dist = Math.hypot(x - pointer.x, y0 - pointer.y);
        const near = pointer.strength * Math.max(0, 1 - dist / RIPPLE_RADIUS) ** 2;
        const y = y0 + swell(x, row, t) * reach + Math.sin(dist * 0.07 - t * 5) * near * 9;
        if (x === -STEP) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const color = mix(accentSoft, accent, depth);
      const alpha = 0.07 + depth * depth * 0.45;
      const glow = pointer.strength * Math.max(0, 1 - Math.abs(y0 - pointer.y) / RIPPLE_RADIUS) ** 2;

      if (glow > 0.01) {
        // Lines brighten where they pass under the pointer.
        const grad = ctx.createLinearGradient(pointer.x - RIPPLE_RADIUS, 0, pointer.x + RIPPLE_RADIUS, 0);
        grad.addColorStop(0, rgba(color, alpha));
        grad.addColorStop(0.5, rgba(mix(color, accent, glow), Math.min(1, alpha + glow * 0.7)));
        grad.addColorStop(1, rgba(color, alpha));
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = rgba(color, alpha);
      }
      ctx.stroke();
    }
  }

  function loop(now) {
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  function start() {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden) frame = requestAnimationFrame(loop);
  }

  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  });
  hero.addEventListener('pointerleave', () => { pointer.active = false; });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    start();
  }).observe(hero);
  document.addEventListener('visibilitychange', start);
  // The hero grows with its content on small screens, so watch it rather than the window.
  new ResizeObserver(resize).observe(hero);

  readColors();
  resize();
  start();
})();
