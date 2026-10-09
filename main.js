// Hero background: a dot grid shaded like a slowly shifting loss surface.
// The pointer digs a well into it.
(() => {
  const canvas = document.querySelector('.hero-canvas');
  const hero = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = matchMedia('(prefers-color-scheme: dark)');

  const SPACING = 26;
  const WELL_RADIUS = 180;

  let width = 0;
  let height = 0;
  let ink = '';
  let accent = '';
  let frame = 0;
  let visible = true;
  const pointer = { x: -9999, y: -9999, active: false, strength: 0 };

  function readColors() {
    const styles = getComputedStyle(document.documentElement);
    ink = styles.getPropertyValue('--ink').trim();
    accent = styles.getPropertyValue('--accent').trim();
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

  // Smooth pseudo-terrain in [0, 1].
  function surface(x, y, t) {
    const v =
      Math.sin(x * 0.006 + t * 0.35) +
      Math.sin(y * 0.008 - t * 0.28) +
      Math.sin((x + y) * 0.004 + t * 0.2) +
      Math.sin(Math.hypot(x - width * 0.3, y - height * 0.7) * 0.007 - t * 0.4);
    return v / 8 + 0.5;
  }

  function draw(now) {
    const t = reduceMotion.matches ? 0 : now / 1000;
    pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * 0.08;

    ctx.clearRect(0, 0, width, height);

    const offsetX = (width % SPACING) / 2;
    const offsetY = (height % SPACING) / 2;

    for (let y = offsetY; y <= height; y += SPACING) {
      for (let x = offsetX; x <= width; x += SPACING) {
        const h = surface(x, y, t);
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const dist = Math.hypot(dx, dy);
        const well = pointer.strength * Math.max(0, 1 - dist / WELL_RADIUS) ** 2;

        // Dots slide toward the bottom of the well.
        const pull = well * 10;
        const px = dist > 0 ? x - (dx / dist) * pull : x;
        const py = dist > 0 ? y - (dy / dist) * pull : y;

        ctx.globalAlpha = 0.12 + h * 0.3 + well * 0.6;
        ctx.fillStyle = well > 0.02 ? accent : ink;
        ctx.beginPath();
        ctx.arc(px, py, 0.8 + h * 1.6 + well * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
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
  darkScheme.addEventListener('change', readColors);
  window.addEventListener('resize', resize);

  readColors();
  resize();
  start();
})();
