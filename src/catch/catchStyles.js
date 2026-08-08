// Scoped styles for the encounter, injected with the screen so nothing leaks
// into the rest of the app and the whole feature stays deletable in one piece.
//
// Layout rule that drives everything (§2): the middle of the screen is the
// stage and the ball's flight path, so no opaque UI may sit there. Every
// control is a translucent blurred circle at an edge.

export const CATCH_CSS = `
.cx-screen {
  position: fixed;
  inset: 0;
  z-index: 3000;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  /* Without this a drag scrolls the page on mobile instead of throwing. */
  touch-action: none;
  overscroll-behavior: none;
  color: #fff;
  font-family: var(--font-body, system-ui, sans-serif);
}

/* Visually hidden, still announced. */
.cx-sr-live {
  position: absolute; width: 1px; height: 1px;
  margin: -1px; padding: 0; overflow: hidden;
  clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
}

/* ── Scene: three depth bands, centre kept clear ───────────────────────── */
.cx-scene { position: absolute; inset: 0; }
.cx-scene-sky    { position: absolute; inset: 0; }
.cx-scene-haze   { position: absolute; left: 0; right: 0; top: 46%; height: 20%; opacity: 0.85; }
.cx-scene-mid    { position: absolute; left: 0; right: 0; bottom: 26%; width: 100%; height: 22%; }
.cx-scene-ground { position: absolute; left: 0; right: 0; bottom: 0; height: 28%; }
.cx-scene-near   { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 14%; }
.cx-scene-lights {
  position: absolute; left: 0; right: 0; bottom: 22%; height: 30%;
  background:
    radial-gradient(circle at 12% 100%, color-mix(in srgb, var(--lamp) 45%, transparent), transparent 60%),
    radial-gradient(circle at 88% 100%, color-mix(in srgb, var(--lamp) 45%, transparent), transparent 60%);
  pointer-events: none;
}
.cx-scene-fog {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 70%, rgba(255,255,255,0.16), transparent 60%);
  pointer-events: none;
}

/* ── Edge controls: translucent circles, never opaque panels ───────────── */
.cx-btn {
  position: absolute;
  width: 46px; height: 46px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.16);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #fff;
  cursor: pointer;
  z-index: 20;
  transition: opacity 0.15s, transform 0.12s;
}
.cx-btn:active { opacity: 0.6; transform: scale(0.94); }
.cx-btn:disabled { opacity: 0.4; cursor: default; }
.cx-btn.out { opacity: 0.4; }
.cx-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.cx-flee { top: max(16px, env(safe-area-inset-top)); left: 16px; }
.cx-lb   { top: max(16px, env(safe-area-inset-top)); right: 16px; width: 40px; height: 40px; }

/* ── Arena ─────────────────────────────────────────────────────────────── */
.cx-arena { position: absolute; inset: 0; }

.cx-nameplate {
  position: absolute;
  top: -190px;
  left: 50%;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 7px 16px;
  border-radius: 999px;
  background: rgba(20, 22, 28, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  white-space: nowrap;
  transform: translateX(-50%);
  z-index: 6;
}
.cx-name { font-size: 15px; font-weight: 800; text-transform: capitalize; letter-spacing: 0.3px; }
.cx-diff { font-size: 11.5px; font-weight: 700; }

.cx-stage {
  position: absolute;
  left: 50%; top: 38%;
  width: 0; height: 0;
  display: flex; align-items: center; justify-content: center;
  z-index: 5;
}
.cx-ring { position: absolute; width: 300px; height: 300px; left: -150px; top: -150px; }
.cx-poke {
  position: absolute;
  width: 210px; height: 210px;
  left: -105px; top: -118px;
  object-fit: contain;
  -webkit-user-drag: none;
  filter: drop-shadow(0 10px 18px rgba(0,0,0,0.28));
  transition: transform 0.35s cubic-bezier(0.34,1.4,0.64,1), opacity 0.3s;
}
.cx-poke.hop { animation: cx-hop 420ms ease-out; }
.cx-poke.flee { transform: translateY(-140px) scale(0.4); opacity: 0; transition: transform 700ms ease-out, opacity 700ms; }
@keyframes cx-hop {
  0%,100% { transform: translateY(0); }
  45%     { transform: translateY(-26px); }
}

/* §3 — the target flinches on contact. Small and fast: it confirms the hit
   without competing with the absorb that follows a quarter-second later. */
.cx-poke.shake { animation: cx-shake 240ms ease-out; }
@keyframes cx-shake {
  0%   { transform: translateX(0); }
  33%  { transform: translateX(5px); }
  66%  { transform: translateX(-4px); }
  100% { transform: translateX(0); }
}

/* §4.2 — pulled down the beam into the ball. --sdy is the measured gap between
   the sprite's centre and the ball, so this lands on the ball at any size. */
.cx-poke.absorb-beam {
  animation: cx-suck-in 340ms cubic-bezier(0.5, 0, 0.9, 0.4) 180ms forwards;
}
@keyframes cx-suck-in {
  0%   { transform: none; opacity: 1; }
  100% { transform: translateY(var(--sdy, 90px)) rotate(160deg) scale(0.05); opacity: 0; }
}

/* §4.3 rule 3 — the body has to empty in the same direction the particles
   leave, which a plain fade cannot express. A gradient mask three times the
   sprite's height slides across it, erasing bottom-up. */
.cx-poke.absorb-dissolve {
  -webkit-mask-image: linear-gradient(to top, transparent 0%, transparent 40%, #000 62%, #000 100%);
          mask-image: linear-gradient(to top, transparent 0%, transparent 40%, #000 62%, #000 100%);
  -webkit-mask-size: 100% 300%;
          mask-size: 100% 300%;
  -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
  animation: cx-dissolve-body var(--absorb, 900ms) linear forwards;
}
@keyframes cx-dissolve-body {
  0%   { -webkit-mask-position: 0 0%;   mask-position: 0 0%; }
  100% { -webkit-mask-position: 0 100%; mask-position: 0 100%; }
}

/* Already inside the ball — no transition, or it would fade back in on the
   next class change. */
.cx-poke.gone { opacity: 0; visibility: hidden; transition: none; }

/* §7.2 — the overshoot is what makes it read as alive rather than replaced. */
.cx-poke.reappear { animation: cx-reappear 300ms cubic-bezier(0.2, 1.4, 0.5, 1); }
@keyframes cx-reappear {
  0%   { transform: scale(0.05) translateY(30px); opacity: 0; }
  100% { transform: none; opacity: 1; }
}

/* Small detail, but the character floats without it. */
.cx-shadow {
  position: absolute;
  left: -52px; top: 74px;
  width: 104px; height: 22px;
  border-radius: 50%;
  background: rgba(20, 24, 20, 0.32);
  filter: blur(7px);
  transition: opacity 260ms ease-out, transform 260ms ease-out;
}
/* §4.4 — a shadow left behind on the floor with nothing casting it is the
   most conspicuous way to break the scene, so it always leaves with the body. */
.cx-shadow.gone { opacity: 0; transform: scale(0.4); }

/* Flight: position and scale are written every frame by the physics step, so
   there is deliberately no CSS animation or transition here — one would fight
   the simulation and smear the trajectory. */
.cx-flyball {
  position: absolute;
  left: 0; top: 0;
  z-index: 7;
  pointer-events: none;
  will-change: transform;
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
}

/* ══ Capture sequence (§3–§7) ═══════════════════════════════════════════════
   Positioned from --bx/--by/--fall, which are measured once at contact and set
   on .cx-arena. The layer sits outside .cx-stage on purpose: the stage carries
   the target's drift, and the capture must not inherit it. */
.cx-capture {
  position: absolute;
  inset: 0;
  z-index: 8;
  pointer-events: none;
}
.cx-dissolve { position: absolute; left: 0; top: 0; }

/* §3 — expanding contact ring, 12px to 110px. Drawn at its final size and
   scaled down, so the growth is a transform rather than a layout change. */
.cx-impact-ring {
  position: absolute;
  left: var(--bx); top: var(--by);
  width: 110px; height: 110px;
  margin: -55px 0 0 -55px;
  border: 3px solid rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  animation: cx-impact-ring 260ms ease-out forwards;
}
@keyframes cx-impact-ring {
  0%   { transform: scale(0.11); opacity: 1; }
  100% { transform: scale(1);    opacity: 0; }
}

/* §4.2 — the beam runs from the ball up to the target it is about to take. */
.cx-beamup {
  position: absolute;
  left: var(--bx); top: var(--sy);
  width: 18px; margin-left: -9px;
  height: var(--beamlen, 90px);
  border-radius: 9px;
  background: linear-gradient(180deg,
    rgba(255, 255, 255, 0.35) 0%,
    rgba(255, 242, 196, 0.9) 45%,
    rgba(255, 208, 96, 1) 100%);
  filter: blur(1px);
  transform-origin: 50% 100%;
  animation: cx-beamup 180ms ease-out forwards;
}
@keyframes cx-beamup {
  0%   { opacity: 0;    transform: scaleY(0.1); }
  100% { opacity: 0.75; transform: scaleY(1); }
}

/* The ball itself, from contact through to the reveal. One element for the
   whole sequence — handing it off between elements loses the continuity that
   makes the drop and the wobbles read as the same object. */
.cx-cap-ball {
  position: absolute;
  left: var(--bx); top: var(--by);
  margin: -26px 0 0 -26px;
  will-change: transform;
}
/* §5 — accelerating fall with a half turn, then a squash on landing. The
   squash is what gives the ball weight; without it, it looks set down. */
.cx-cap-ball.drop {
  animation:
    cx-ball-fall 270ms cubic-bezier(0.5, 0, 0.9, 0.5) forwards,
    cx-ball-squash 110ms ease-out 270ms;
}
@keyframes cx-ball-fall {
  0%   { transform: translateY(0) rotate(0deg); }
  100% { transform: translateY(var(--fall, 150px)) rotate(180deg); }
}
@keyframes cx-ball-squash {
  0%   { transform: translateY(var(--fall, 150px)) rotate(180deg) scale(1.1, 0.85); }
  100% { transform: translateY(var(--fall, 150px)) rotate(180deg) scale(1); }
}
.cx-cap-ball.grounded { transform: translateY(var(--fall, 150px)) rotate(180deg); }

/* §4.3 — the ball kicks as the particle stream arrives. */
.cx-cap-ball.pulse { animation: cx-ball-pulse 220ms ease-out; }
@keyframes cx-ball-pulse {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.14); }
  70%  { transform: scale(0.88); }
  100% { transform: scale(1); }
}

/* §6.1 — one beat per wobble: left, right, centre, then a pause. Three
   identical keyframes under different names because a CSS animation only
   restarts when animation-name changes; reusing one would play beat 1 and
   then hold still through beats 2 and 3. */
.cx-cap-ball.wa { animation: cx-wob-a 490ms ease-in-out; }
.cx-cap-ball.wb { animation: cx-wob-b 490ms ease-in-out; }
.cx-cap-ball.wc { animation: cx-wob-c 490ms ease-in-out; }
@keyframes cx-wob-a {
  0%   { transform: translateY(var(--fall, 150px)) rotate(180deg); }
  33%  { transform: translateY(var(--fall, 150px)) rotate(164deg); }
  66%  { transform: translateY(var(--fall, 150px)) rotate(194deg); }
  100% { transform: translateY(var(--fall, 150px)) rotate(180deg); }
}
@keyframes cx-wob-b {
  0%   { transform: translateY(var(--fall, 150px)) rotate(180deg); }
  33%  { transform: translateY(var(--fall, 150px)) rotate(164deg); }
  66%  { transform: translateY(var(--fall, 150px)) rotate(194deg); }
  100% { transform: translateY(var(--fall, 150px)) rotate(180deg); }
}
@keyframes cx-wob-c {
  0%   { transform: translateY(var(--fall, 150px)) rotate(180deg); }
  33%  { transform: translateY(var(--fall, 150px)) rotate(164deg); }
  66%  { transform: translateY(var(--fall, 150px)) rotate(194deg); }
  100% { transform: translateY(var(--fall, 150px)) rotate(180deg); }
}

.cx-cap-ball.caught { animation: cx-lock 500ms ease-out forwards; }
@keyframes cx-lock {
  0%   { transform: translateY(var(--fall, 150px)) rotate(180deg); filter: brightness(1); }
  40%  { transform: translateY(var(--fall, 150px)) rotate(180deg); filter: brightness(2.4) drop-shadow(0 0 26px #fff); }
  100% { transform: translateY(var(--fall, 150px)) rotate(180deg); filter: brightness(1); }
}
/* §7.2 — the ball blows open and the target is back on stage behind it. */
.cx-cap-ball.burst { animation: cx-ballburst 180ms ease-out forwards; }
@keyframes cx-ballburst {
  0%   { opacity: 1; transform: translateY(var(--fall, 150px)) rotate(180deg) scale(1); }
  100% { opacity: 0; transform: translateY(var(--fall, 150px)) rotate(180deg) scale(1.35); }
}

/* §5 — the shadow moves under the ball once it is on the floor. */
.cx-ball-shadow {
  position: absolute;
  left: var(--bx);
  top: calc(var(--by) + var(--fall, 150px) + 22px);
  width: 42px; height: 12px;
  margin-left: -21px;
  border-radius: 50%;
  background: rgba(20, 24, 20, 1);
  opacity: 0.18;
  filter: blur(5px);
  animation: cx-ball-shadow-in 150ms ease-out;
}
@keyframes cx-ball-shadow-in {
  0%   { opacity: 0; transform: scale(1.7); }
  100% { opacity: 0.18; transform: scale(1); }
}

/* §7.1 — eight stars on a 50px radius, plus one shockwave. --a is the spoke
   angle; rotating out and back keeps each star upright as it travels. */
.cx-star, .cx-spark {
  position: absolute;
  left: var(--bx);
  top: calc(var(--by) + var(--fall, 150px));
  width: 10px; height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: #FFE79A;
  box-shadow: 0 0 10px 2px rgba(255, 214, 110, 0.9);
  animation: cx-star-out 480ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}
@keyframes cx-star-out {
  0%   { opacity: 1; transform: rotate(var(--a)) translateY(0) scale(0.6); }
  100% { opacity: 0; transform: rotate(var(--a)) translateY(-50px) scale(1.3); }
}
.cx-spark {
  width: 8px; height: 8px; margin: -4px 0 0 -4px;
  background: #FFF3D0;
  animation: cx-spark-out 380ms ease-out forwards;
}
@keyframes cx-spark-out {
  0%   { opacity: 1; transform: rotate(var(--a)) translateY(0) scale(0.7); }
  100% { opacity: 0; transform: rotate(var(--a)) translateY(-44px) scale(1); }
}
.cx-shockwave {
  position: absolute;
  left: var(--bx);
  top: calc(var(--by) + var(--fall, 150px));
  width: 140px; height: 140px;
  margin: -70px 0 0 -70px;
  border: 3px solid rgba(255, 233, 160, 0.9);
  border-radius: 50%;
  animation: cx-shockwave 420ms ease-out forwards;
}
@keyframes cx-shockwave {
  0%   { opacity: 0.95; transform: scale(0.14); }
  100% { opacity: 0;    transform: scale(1); }
}

/* ── Contact burst (Pokémon GO style) ──────────────────────────────────── */
/* Three stacked layers: a tapered warm beam raking back along the throw, a
   soft halo, and a small blown-out core. Sizes are in px because the burst has
   to sit exactly on the impact point, which is computed in arena pixels. */
.cx-burst {
  position: absolute;
  width: 0; height: 0;
  z-index: 8;
  pointer-events: none;
}
.cx-burst-beam {
  position: absolute;
  left: 0; top: 0;
  width: 74px;
  height: 300px;
  margin-left: -37px;
  /* Rotated so the beam's base sits at the impact and it stretches away along
     --beam-deg; +90deg because the gradient runs down the element's own axis. */
  transform-origin: 50% 0;
  transform: rotate(calc(var(--beam-deg) - 90deg)) scaleY(0.2);
  background: linear-gradient(
    180deg,
    rgba(255, 246, 214, 0.95) 0%,
    rgba(255, 206, 92, 0.85) 22%,
    rgba(250, 160, 40, 0.55) 55%,
    rgba(250, 140, 20, 0) 100%
  );
  clip-path: polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%);
  filter: blur(5px);
  opacity: 0;
  animation: cx-beam 620ms cubic-bezier(0.15, 0.85, 0.3, 1) forwards;
}
@keyframes cx-beam {
  0%   { opacity: 0;    transform: rotate(calc(var(--beam-deg) - 90deg)) scaleY(0.15); }
  14%  { opacity: 1;    transform: rotate(calc(var(--beam-deg) - 90deg)) scaleY(1.05); }
  45%  { opacity: 0.75; transform: rotate(calc(var(--beam-deg) - 90deg)) scaleY(1); }
  100% { opacity: 0;    transform: rotate(calc(var(--beam-deg) - 90deg)) scaleY(0.9); }
}
.cx-burst-halo {
  position: absolute;
  left: -90px; top: -90px;
  width: 180px; height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255,255,255,0.95) 0%,
    rgba(255, 232, 150, 0.8) 30%,
    rgba(255, 190, 70, 0.45) 55%,
    rgba(255, 170, 40, 0) 75%);
  filter: blur(3px);
  animation: cx-halo 560ms ease-out forwards;
}
@keyframes cx-halo {
  0%   { opacity: 0;   transform: scale(0.25); }
  18%  { opacity: 1;   transform: scale(1.05); }
  100% { opacity: 0;   transform: scale(1.75); }
}
.cx-burst-core {
  position: absolute;
  left: -30px; top: -30px;
  width: 60px; height: 60px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 34px 16px rgba(255, 255, 255, 0.95);
  animation: cx-core 460ms ease-out forwards;
}
@keyframes cx-core {
  0%   { opacity: 0; transform: scale(0.2); }
  16%  { opacity: 1; transform: scale(1.25); }
  55%  { opacity: 0.9; transform: scale(0.8); }
  100% { opacity: 0; transform: scale(0.5); }
}

.cx-tier {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 26px; font-weight: 900; letter-spacing: 0.5px;
  text-shadow: 0 3px 12px rgba(0,0,0,0.5);
  animation: cx-pop 420ms cubic-bezier(0.34,1.56,0.64,1);
  z-index: 9;
}
.cx-tier-nice      { color: #7FE3A6; }
.cx-tier-great     { color: #7FC6FF; }
.cx-tier-excellent { color: #FFD35C; }
@keyframes cx-pop {
  0%   { opacity: 0; transform: translateX(-50%) scale(0.5); }
  60%  { opacity: 1; transform: translateX(-50%) scale(1.15); }
  100% { opacity: 1; transform: translateX(-50%) scale(1); }
}

.cx-gotcha, .cx-banner {
  position: absolute;
  left: 50%; top: 30%;
  transform: translateX(-50%);
  padding: 10px 22px;
  border-radius: 999px;
  background: rgba(20, 22, 28, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 20px; font-weight: 900;
  white-space: nowrap;
  z-index: 10;
  animation: cx-pop 420ms cubic-bezier(0.34,1.56,0.64,1);
}
.cx-gotcha { color: #FFD35C; }

/* ── Bottom row: item · ball · swap, ball dominant (§2) ────────────────── */
.cx-bottom {
  position: absolute;
  left: 0; right: 0;
  bottom: max(22px, env(safe-area-inset-bottom));
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  z-index: 20;
}
.cx-btn.cx-item, .cx-btn.cx-swap, .cx-btn.cx-spacer { position: static; flex-shrink: 0; }
.cx-btn.cx-spacer { background: none; border: none; backdrop-filter: none; pointer-events: none; }
.cx-item-icon { font-size: 22px; line-height: 1; }

.cx-ball-dock { position: relative; display: flex; flex-direction: column; align-items: center; }
.cx-ball {
  border: none;
  background: none;
  padding: 0;
  cursor: grab;
  touch-action: none;
  filter: drop-shadow(0 8px 18px rgba(0,0,0,0.35));
  transition: transform 0.08s linear;
  z-index: 2;
}
.cx-ball.held { cursor: grabbing; transition: none; }
.cx-ball:disabled { opacity: 0.45; cursor: default; }
.cx-ball:focus-visible { outline: 3px solid #fff; outline-offset: 4px; border-radius: 50%; }

.cx-guide {
  position: absolute;
  left: 50%; bottom: 50%;
  width: 3px;
  transform-origin: bottom center;
  background: linear-gradient(to top, rgba(255,255,255,0.85), transparent);
  border-radius: 2px;
  pointer-events: none;
  z-index: 1;
}

/* 30px pixel-art sprites, so scaling must stay crisp rather than blur. */
.cx-ballimg {
  display: block;
  image-rendering: pixelated;
  -webkit-user-drag: none;
  transition: transform 0.08s linear;
}

/* Spin readout while winding up — the tell that a curve is armed. */
.cx-spin-tag {
  position: absolute;
  left: 50%; bottom: -26px;
  transform: translateX(-50%);
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(126, 200, 255, 0.9);
  color: #10243A;
  font-size: 11px; font-weight: 900; letter-spacing: 0.3px;
  white-space: nowrap;
  z-index: 3;
}
.cx-curve-tag {
  display: inline-block;
  margin-right: 8px;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(126, 200, 255, 0.95);
  color: #10243A;
  font-size: 13px; font-weight: 900;
  vertical-align: middle;
}
.cx-tier-curve { color: #7FC6FF; }

/* Marker pinned to the finger's angle. It must be visibly still whenever spin
   is off — an earlier build span it during flight too, which made players think
   they had curved the ball when they hadn't (§5). */
.cx-spin-orbit {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.cx-spin-dot {
  position: absolute;
  right: 2px;
  top: 50%;
  width: 10px; height: 10px;
  margin-top: -5px;
  border-radius: 50%;
  background: rgba(255,255,255,0.55);
  box-shadow: 0 0 0 2px rgba(0,0,0,0.25);
  transition: background 0.12s, box-shadow 0.12s;
}
.cx-spin-dot.on {
  background: #7FC6FF;
  box-shadow: 0 0 10px #7FC6FF, 0 0 0 2px rgba(0,0,0,0.25);
}
.cx-ball.spinning { filter: drop-shadow(0 0 12px #7FC6FF); }

/* How much spin is wound in — readable without any text. */
.cx-power {
  width: 78px;
  height: 4px;
  margin-top: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.22);
  overflow: hidden;
}
.cx-power-fill {
  width: 0%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #7FC6FF, #FFD35C);
  transition: width 0.08s linear;
}

/* Trail: a fixed pool of dots, positioned imperatively each frame. */
.cx-trail {
  position: absolute;
  left: 0; top: 0;
  width: 10px; height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: rgba(255,255,255,0.85);
  opacity: 0;
  pointer-events: none;
  z-index: 6;
  will-change: transform, opacity;
}

.cx-aim-readout {
  position: absolute;
  left: 50%;
  bottom: calc(max(22px, env(safe-area-inset-bottom)) + 172px);
  transform: translateX(-50%);
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(20,22,28,0.55);
  font-size: 11.5px; font-weight: 800;
  white-space: nowrap;
  z-index: 12;
}
.cx-hint.loud { color: #FFD35C; font-weight: 800; opacity: 1; }

.cx-count {
  margin-top: 6px;
  font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

.cx-hint {
  position: absolute;
  left: 50%; bottom: calc(max(22px, env(safe-area-inset-bottom)) + 118px);
  transform: translateX(-50%);
  font-size: 12px; opacity: 0.85;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  white-space: nowrap;
  z-index: 12;
}
.cx-berry-armed {
  position: absolute;
  left: 50%; bottom: calc(max(22px, env(safe-area-inset-bottom)) + 146px);
  transform: translateX(-50%);
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(62, 190, 120, 0.85);
  font-size: 12px; font-weight: 800;
  white-space: nowrap;
  z-index: 12;
}

/* ── Bottom sheets (pickers, leaderboard) ──────────────────────────────── */
.cx-sheet {
  position: absolute; inset: 0;
  background: rgba(12, 14, 18, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 40;
  animation: cx-fade 180ms ease-out;
}
@keyframes cx-fade { from { opacity: 0; } to { opacity: 1; } }
.cx-sheet-body {
  width: 100%;
  max-width: 460px;
  max-height: 70%;
  overflow-y: auto;
  padding: 18px 18px calc(18px + env(safe-area-inset-bottom));
  border-radius: 22px 22px 0 0;
  background: rgba(24, 26, 32, 0.92);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  animation: cx-rise 220ms cubic-bezier(0.2, 0.9, 0.3, 1);
}
@keyframes cx-rise { from { transform: translateY(24px); } to { transform: none; } }
.cx-sheet-title { font-size: 14px; font-weight: 800; margin-bottom: 12px; opacity: 0.9; }
.cx-pick-list { display: flex; flex-direction: column; gap: 8px; }
.cx-pick {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: #fff;
  cursor: pointer;
  text-align: left;
}
.cx-pick:disabled { opacity: 0.35; cursor: default; }
.cx-pick.on { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.14); }
.cx-pick-name { flex: 1; font-size: 13.5px; font-weight: 700; }
.cx-pick-meta { font-size: 11.5px; opacity: 0.7; font-weight: 700; }

/* ── Debug panel (§3.3) ─────────────────────────────────────────────────── */
.cx-debug {
  position: absolute;
  top: 70px; right: 12px;
  width: 250px;
  max-height: calc(100% - 190px);
  overflow-y: auto;
  padding: 10px 12px 12px;
  border-radius: 12px;
  background: rgba(12, 14, 18, 0.92);
  border: 1px solid rgba(255,255,255,0.16);
  color: #E6E9EF;
  font: 500 11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  z-index: 60;
  touch-action: auto;
}
.cx-debug-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px; font-size: 12px;
}
.cx-debug-head button {
  background: none; border: none; color: #E6E9EF; cursor: pointer; font-size: 13px;
}
.cx-debug-sec {
  margin: 10px 0 5px;
  font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;
  color: #8A93A6;
}
.cx-debug-grid {
  display: grid; grid-template-columns: 1fr auto; gap: 2px 10px;
}
.cx-debug-grid span { color: #8A93A6; }
.cx-debug-grid b { font-weight: 700; text-align: right; }
.cx-debug-grid b.ok { color: #6EE7A0; }
.cx-debug-grid b.no { color: #FF8A80; }
.cx-debug-empty { color: #8A93A6; }
.cx-debug-slider {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 8px;
  margin-bottom: 7px;
}
.cx-debug-slider span { color: #8A93A6; }
.cx-debug-slider b { font-weight: 700; }
.cx-debug-slider input { grid-column: 1 / -1; width: 100%; margin: 2px 0 0; accent-color: #7FC6FF; }
.cx-debug-foot { margin-top: 8px; color: #8A93A6; font-size: 10px; }

/* Reduce motion: the encounter still completes, it just stops moving (§9). */
.cx-screen.cx-reduce *,
.cx-screen.cx-reduce *::before,
.cx-screen.cx-reduce *::after {
  animation: none !important;
  transition: none !important;
}
/* Hidden rather than merely un-animated: these elements only exist as motion,
   and the rule above would freeze them on screen at their first frame (§10).
   The outcome still reaches this user through the banner and aria-live. */
.cx-screen.cx-reduce .cx-capture { display: none; }

@media (max-width: 400px) {
  .cx-poke { width: 168px; height: 168px; left: -84px; top: -96px; }
  .cx-ring { width: 250px; height: 250px; left: -125px; top: -125px; }
  .cx-bottom { padding: 0 16px; }
}
`;
