import { useEffect, useRef } from "react";
import { DISSOLVE } from "./captureSequence.js";

// Particle dissolve for rare species (spec §4.3).
//
// Canvas, not DOM: 55 particles with light trails would mean 55 nodes mutated
// every frame, which is exactly the kind of thing that makes a phone drop
// frames. One canvas and one rAF loop instead.
//
// The tuning table lives in captureSequence.js with the rest of the sequence's
// numbers, so there is one place to reach for when any of this needs dialling.

const rand = (a, b) => a + Math.random() * (b - a);

/**
 * @param origin  {x,y,w,h} sprite box in arena px — where particles are born
 * @param target  {x,y} ball centre in arena px — where they end up
 * @param color   base particle colour (the species' type colour)
 * @param onBallPulse called once when the stream lands, to kick the ball
 */
export default function DissolveCanvas({ origin, target, color, durationMs, onBallPulse, width, height }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const pulsedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render at 2× and scale down in CSS, or the particles look soft on retina.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    const cx = origin.x, cy = origin.y;
    const particles = Array.from({ length: DISSOLVE.particleCount }, () => {
      // Born somewhere on the sprite.
      const px = cx + rand(-origin.w / 2, origin.w / 2);
      const py = cy + rand(-origin.h / 2, origin.h / 2);

      // Control point sits OUTSIDE and ABOVE the start, which is what makes the
      // path bow out before curving home. A straight line reads visibly stiff.
      const outward = px >= cx ? 1 : -1;
      const c1x = px + outward * rand(DISSOLVE.swirl * 0.5, DISSOLVE.swirl);
      const c1y = py - rand(30, 74);

      // Bottom of the sprite leaves first, so the body empties upward.
      const yFrac = (py - (cy - origin.h / 2)) / Math.max(1, origin.h);
      return {
        px, py, c1x, c1y,
        delay: (1 - yFrac) * DISSOLVE.staggerMs,
        dur: rand(DISSOLVE.minDurMs, DISSOLVE.maxDurMs),
        size: rand(DISSOLVE.minSize, DISSOLVE.maxSize),
      };
    });

    const t0 = performance.now();
    let running = true;

    const step = (now) => {
      if (!running) return;
      const elapsed = now - t0;

      // Fade the previous frame instead of clearing it — that residue IS the
      // trail, and it costs nothing extra.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${1 - DISSOLVE.trail})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      let landed = 0;
      for (const p of particles) {
        const local = elapsed - p.delay;
        if (local < 0) continue;
        const k = Math.min(1, local / p.dur);
        if (k >= 1) { landed++; continue; }

        // Quadratic Bézier: start → swirled control point → ball.
        const inv = 1 - k;
        const x = inv * inv * p.px + 2 * inv * k * p.c1x + k * k * target.x;
        const y = inv * inv * p.py + 2 * inv * k * p.c1y + k * k * target.y;

        // In fast, out slow — so the stream reads as being pulled in.
        const alpha = k < 0.12 ? k / 0.12
          : k > 0.82 ? (1 - k) / 0.18
          : 1;

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 - 0.75 * k), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!pulsedRef.current && landed > particles.length * 0.75) {
        pulsedRef.current = true;
        onBallPulse?.();
      }
      if (elapsed < durationMs + DISSOLVE.maxDurMs) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    const onVis = () => { if (document.hidden) running = false; };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [origin, target, color, durationMs, onBallPulse, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="cx-dissolve"
      style={{ width, height }}
      aria-hidden
    />
  );
}
