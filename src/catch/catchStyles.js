// Scoped styles for the encounter, injected with the screen so nothing leaks
// into the rest of the app and the whole feature stays deletable in one piece.
//
// Layout rule that drives everything (§2): the middle of the screen is the
// stage and the ball's flight path, so no opaque UI may sit there. Every
// control is a translucent blurred circle at an edge.

export const CATCH_CSS = `
/* ── Modal shell ─────────────────────────────────────────────────────────
   A floating 9:16 card centred in the viewport, over a blurred copy of the
   same scene. Everything the encounter draws lives inside .cx-card, so every
   absolute rule below is card-relative rather than viewport-relative — that
   is the whole reason the layout survives being taken off fullscreen. */
.cx-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  overscroll-behavior: none;
}

/* The encounter opens from inside the detail modal, and .modal-overlay carries
   a backdrop-filter — which makes it the containing block for our fixed
   overlay, padding box and all. Left alone, its 24px/16px padding leaves an
   uncovered ring of the page's own scrim around every edge, and its
   overflow:auto is the thing a missed drag actually scrolls (the body lock in
   the JS cannot reach it, because the body is not the scroller here). */
.modal-overlay:has(> .cx-overlay) { padding: 0; overflow: hidden; }

/* The detail page the player came from stays exactly where it was; this layer
   only dims and softens it. A blurred copy of the game scene was the wrong
   answer — it duplicated what is already inside the card and told the eye
   nothing about where it had come from.
   Enough blur to put the page out of play, not so much that it stops being the
   Pokémon it belongs to. What gets sampled is the detail card itself: the
   enclosing .modal-overlay's own backdrop-filter makes it the backdrop root, so
   this reads its content, not the whole app underneath. */
.cx-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(20, 26, 32, 0.5);
  backdrop-filter: blur(10px) saturate(0.9);
  -webkit-backdrop-filter: blur(10px) saturate(0.9);
  animation: cx-fade-in 250ms ease-out;
}
.cx-overlay.closing .cx-backdrop { animation: cx-fade-out 200ms ease-in forwards; }

/* Economy mode already strips every backdrop-filter in the app (App.css), so
   there is no blur to lean on here and the detail page reads straight through
   at full sharpness, competing with the card. Nothing to add back — just more
   scrim, which costs a single flat fill. */
html.perf-lite .cx-backdrop { background: rgba(16, 20, 26, 0.74); }

.cx-card {
  position: relative;
  /* Portrait 9:16. The vh term is what shrinks the card on short screens:
     with an explicit width, aspect-ratio alone would overflow rather than
     scale, because height is the derived axis. 50.6vh = 90vh x 9/16. */
  width: min(440px, 92vw, 50.6vh);
  aspect-ratio: 9 / 16;
  max-height: 90vh;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.34);
  user-select: none;
  -webkit-user-select: none;
  /* Only the card swallows drags — without this a throw scrolls the page on
     mobile, and putting it on the whole overlay would take gestures the modal
     behind still owns. */
  touch-action: none;
  overscroll-behavior: none;
  color: #fff;
  font-family: var(--font-body, system-ui, sans-serif);
  /* Everything inside sizes off the card, never the viewport — see the
     @container blocks at the bottom of this sheet.
     container-type: size, not inline-size: the composition is stacked
     vertically, so the
     height is what actually runs out first, and only a size container can be
     asked about it. Safe here because the card's height never depends on its
     contents — width is definite, aspect-ratio derives the rest. */
  container-type: size;
  container-name: cxcard;
  animation: cx-card-in 250ms ease-out;
}
.cx-card.closing { animation: cx-card-out 200ms ease-in forwards; }

@keyframes cx-fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes cx-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes cx-card-in {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: none; }
}
@keyframes cx-card-out {
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: scale(0.94); }
}

/* Visually hidden, still announced. */
.cx-sr-live {
  position: absolute; width: 1px; height: 1px;
  margin: -1px; padding: 0; overflow: hidden;
  clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
}

/* ── Scene: three depth bands, centre kept clear ─────────────────────────
   --cx-horizon is where the grass starts, and it is the one number the whole
   composition hangs off: the target stands just below it and the ball lands
   between it and the dock. It used to sit at 72%, which left the only footing
   in the bottom quarter of a 9:16 card — the target had to float in the sky to
   stay in frame. Raising it gives the character ground to stand on and the
   throw somewhere to travel. */
.cx-scene { position: absolute; inset: 0; --cx-horizon: 52%; }
.cx-scene-sky    { position: absolute; inset: 0; }
.cx-scene-haze   { position: absolute; left: 0; right: 0; top: 38%; height: 16%; opacity: 0.85; }
/* Bases sink 2% past the horizon so the masses stand ON the ground plane
   rather than hovering with a seam under them. */
.cx-scene-mid    { position: absolute; left: 0; right: 0; bottom: 46%; width: 100%; height: 22%; }
.cx-scene-ground { position: absolute; left: 0; right: 0; bottom: 0; height: 48%; }
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

/* §3.3 — which item is loaded must be readable without pressing anything, and
   never by colour alone: this is a ring, so it survives a colourblind viewer
   and a greyscale screenshot alike. */
.cx-btn.picked {
  border-color: var(--sel, #fff);
  box-shadow: 0 0 0 2.5px var(--sel, #fff);
  outline-offset: 2px;
}
.cx-badge {
  position: absolute;
  top: -4px; right: -4px;
  min-width: 18px; height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(16, 18, 24, 0.92);
  border: 1px solid rgba(255,255,255,0.35);
  font-size: 10.5px; font-weight: 800; line-height: 16px;
  text-align: center;
}
.cx-flee { top: max(16px, env(safe-area-inset-top)); left: 16px; }
.cx-lb   { top: max(16px, env(safe-area-inset-top)); right: 16px; width: 40px; height: 40px; }

/* ── Arena ─────────────────────────────────────────────────────────────── */
.cx-arena { position: absolute; inset: 0; }

/* Measured UP from the stage's ground line, like everything else on the stage,
   so it clears the sprite at every size instead of at one. */
.cx-nameplate {
  position: absolute;
  bottom: 238px;
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

/* The stage's origin is the GROUND CONTACT POINT — the spot on the grass the
   target stands on, a little below the horizon. Everything on the stage is
   measured up from there with a bottom offset, so a sprite that changes size
   keeps its feet planted instead of drifting off the floor.
   The stage itself carries only the horizontal drift; the vertical bob is a
   CSS animation one level down (see .cx-bob) precisely so the shadow can stay
   behind on the ground. */
.cx-stage {
  position: absolute;
  left: 50%; top: 56%;
  width: 0; height: 0;
  z-index: 5;
}

/* Sprite-sized box that does the idle bob. It exists so .cx-poke's own
   transform stays free for the capture animations — shake, suck-in, reappear
   and flee all write transform, and sharing one element would mean the bob
   cancelling them mid-sequence.
   The negative bottom is the transparent margin baked into the official
   artwork: the drawn feet sit a little above the image's own edge, so the box
   has to overshoot the ground line for them to land on it. */
.cx-bob {
  position: absolute;
  left: -105px; bottom: -14px;
  width: 210px; height: 210px;
  animation: cx-bob 2800ms ease-in-out infinite;
}
/* Held still from contact onward: the capture is laid out in coordinates frozen
   at the moment of impact, and 5px of bob is enough to slide the sprite out
   from under the beam. */
.cx-bob.still { animation: none; }
@keyframes cx-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}

.cx-poke {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  object-fit: contain;
  -webkit-user-drag: none;
  /* Contact shadow only. The cast shadow on the grass is a real element now, so
     this one is tightened up to avoid reading as a second, floating one. */
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.22));
  transition: transform 0.35s cubic-bezier(0.34,1.4,0.64,1), opacity 0.3s;
}
.cx-poke.flee { transform: translateY(-140px) scale(0.4); opacity: 0; transition: transform 700ms ease-out, opacity 700ms; }

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

/* Small detail, but the character floats without it. The ellipse straddles the
   ground line — half above, half below — because that is where a contact shadow
   sits, and it stays on .cx-stage rather than inside .cx-bob so the bob lifts
   the body off it instead of dragging it along. */
.cx-shadow {
  position: absolute;
  left: -52px; bottom: -11px;
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
/* §3.1 — a centred cluster, not edge-to-edge. Pinning the side buttons to the
   card's edges put them ~173px from the middle on a 440px card; the spec caps
   that at 140px so the whole set is reachable without the thumb leaving the
   slot. A 40px gap puts them at 59 + 40 = 99px.
   align-items: center also does the "slightly lower" of §3.1 for free: the slot
   column is taller than a button because of its label, so centring on the
   column drops the buttons ~11px below the slot's own centre. */
.cx-bottom {
  position: absolute;
  left: 0; right: 0;
  bottom: max(22px, env(safe-area-inset-bottom));
  display: flex; align-items: center; justify-content: center;
  gap: 40px;
  padding: 0 16px;
  z-index: 20;
}
/* relative, not static: each carries an absolutely-placed count badge (§3.3),
   and a static button would hand that badge to .cx-bottom instead — parking it
   in the corner of the card. */
.cx-btn.cx-item, .cx-btn.cx-swap, .cx-btn.cx-spacer { position: relative; flex-shrink: 0; }
.cx-btn.cx-spacer { background: none; border: none; backdrop-filter: none; pointer-events: none; }
.cx-item-icon { font-size: 22px; line-height: 1; }

/* ── Throw slot (throwable-item-spec §2) ─────────────────────────────────
   The one place anything is thrown from. It is the biggest tappable thing on
   the card by a clear margin (§2.1: ~1.6× a side button) because it is the
   only one the player uses every round. */
.cx-slot-dock { position: relative; display: flex; flex-direction: column; align-items: center; }
.cx-slot-label {
  margin-top: 6px;
  font-size: 12.5px; font-weight: 800; letter-spacing: 0.2px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.55);
  white-space: nowrap;
}

/* §2.2 — a cross-fade, so both items are on screen at once for 180ms. Stacked
   absolutely: laying them out in flow would shove the slot sideways mid-swap. */
.cx-slot-item {
  width: 72px; height: 72px;
  display: grid; place-items: center;
}
.cx-slot-item.out {
  position: absolute; inset: 0;
  animation: cx-slot-out 180ms ease-in forwards;
  pointer-events: none;
}
.cx-slot-item.in { animation: cx-slot-in 180ms ease-out; }
/* §4.3 — the automatic reload is not a swap the player asked for, so it gets
   its own softer entrance: 260ms, from 0.7, on a spring. */
.cx-slot-item.in.rl { animation: cx-slot-reload 260ms cubic-bezier(.2,1.4,.5,1); }
@keyframes cx-slot-reload { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
/* The bounce that says the press registered (§2.2). Only on a real swap — the
   first paint of the encounter has nothing to confirm. */
.cx-slot-item.in.bump { animation: cx-slot-in 180ms ease-out, cx-slot-bump 200ms cubic-bezier(.2,1.4,.5,1); }
@keyframes cx-slot-in  { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
@keyframes cx-slot-out { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.6); } }
@keyframes cx-slot-bump { 0% { transform: scale(1); } 45% { transform: scale(1.18); } 100% { transform: scale(1); } }
.cx-ball {
  border: none;
  background: none;
  padding: 0;
  cursor: grab;
  touch-action: none;
  z-index: 2;
}
.cx-ball.held { cursor: grabbing; }

/* Carries the drag: translated and rolled straight from the pointer handler.
   Separate from the button so the button's box — which geom() measures the dock
   from — stays put while the ball is carried around. */
.cx-ball-vis {
  display: block;
  will-change: transform;
  /* Only the trip HOME is animated. While the finger is down the transform is
     rewritten every move, and a transition there would lag the ball behind the
     finger by its own duration. */
  transition: transform 260ms cubic-bezier(.22, 1, .36, 1);
}
.cx-ball.held .cx-ball-vis { transition: none; }
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

/* Neither the dot that rode the ball's edge nor the halo a wound-up ball used
   to wear is here any more, both by request. What announces spin now is the
   ball turning — which it does under the finger, and keeps doing in flight. */

/* The spin meter under the ball is gone by request. */

/* ── Eating a berry (§5.2) ───────────────────────────────────────────────
   Sparks first, then the chew. Both live on the stage so they travel with the
   target rather than sitting where it used to be. */
.cx-eat-spark {
  position: absolute;
  left: 0; bottom: 120px;
  width: 7px; height: 7px;
  margin: 0 0 -3.5px -3.5px;
  border-radius: 50%;
  background: var(--c, #fff);
  box-shadow: 0 0 8px var(--c, #fff);
  transform: rotate(var(--a)) translateY(0);
  animation: cx-eat-spark 430ms ease-out forwards;
  pointer-events: none;
  z-index: 7;
}
@keyframes cx-eat-spark {
  0%   { opacity: 0;   transform: rotate(var(--a)) translateX(0) scale(0.4); }
  25%  { opacity: 1; }
  100% { opacity: 0;   transform: rotate(var(--a)) translateX(34px) scale(1); }
}

/* Four chews at 140ms, squashing one way then the other. The spec also asks for
   the mouth to open — the target is the official artwork, a flat sprite with no
   mouth to move, so the squash carries the whole beat. */
.cx-poke.chew { animation: cx-chew 140ms ease-in-out 4; }
@keyframes cx-chew {
  0%   { transform: scale(1, 1); }
  50%  { transform: scale(1.06, 0.95); }
  100% { transform: scale(0.96, 1.05); }
}

/* §5.1 — the sparkle a reward berry leaves behind while its effect is live. */
.cx-aura {
  position: absolute;
  left: -84px; bottom: -20px;
  width: 168px; height: 190px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 55%,
    color-mix(in srgb, var(--aura) 32%, transparent), transparent 68%);
  animation: cx-aura 1800ms ease-in-out infinite;
  pointer-events: none;
  z-index: 4;
}
@keyframes cx-aura { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

/* §3.2 / §5.2 — one line, centred over the controls, gone in 1400ms. */
.cx-toast {
  position: absolute;
  left: 50%; bottom: calc(max(22px, env(safe-area-inset-bottom)) + 196px);
  transform: translateX(-50%);
  max-width: 82%;
  padding: 7px 15px;
  border-radius: 999px;
  background: rgba(18, 20, 26, 0.9);
  border: 1px solid rgba(255,255,255,0.16);
  font-size: 12px; font-weight: 700;
  text-align: center;
  z-index: 21;
  animation: cx-toast-in 180ms ease-out;
}
@keyframes cx-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* ── Item popovers (§6) ──────────────────────────────────────────────────
   Over the button that opened them, inside the card — not a new screen. */
.cx-pop-scrim { position: absolute; inset: 0; z-index: 24; }
.cx-pop {
  position: absolute;
  bottom: calc(max(22px, env(safe-area-inset-bottom)) + 74px);
  width: min(232px, 68%);
  max-height: 54%;
  overflow-y: auto;
  touch-action: pan-y;
  padding: 10px;
  border-radius: 16px;
  background: rgba(22, 24, 30, 0.95);
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 14px 34px rgba(0,0,0,0.45);
  animation: cx-pop-in 160ms cubic-bezier(.2,1.4,.5,1);
}
.cx-pop-left  { left: 12px; }
.cx-pop-right { right: 12px; }
@keyframes cx-pop-in { from { opacity: 0; transform: translateY(10px) scale(0.94); } to { opacity: 1; transform: none; } }

/* Trail: one tapered ribbon rebuilt each frame from the flight samples, rather
   than a row of dots. A single <path> per layer, so the cost is the same string
   write per frame no matter how many samples the curve is drawn through.
   No viewBox — user units are arena px, the same space the physics writes in. */
.cx-trail-layer {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 6;
}
/* Soft coloured spread under the streak. Blurred, so it needs no gradient of
   its own to look like light rather than paint. */
.cx-trail-glow {
  fill: var(--cx-trail-tint, #FFFFFF);
  opacity: 0.34;
  filter: blur(5px);
}
.cx-trail-core { fill: rgba(255, 255, 255, 0.82); }

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
/* No running ball count on screen by request — the number is still enforced
   (a throw spends one, and running out ends the encounter), just not printed.
   It stays in the throw button's aria-label, where it costs no pixels. */

/* Only ever holds a transient reply now (never the standing how-to-play line),
   so it is styled as one thing rather than a base plus a .loud variant. */
.cx-hint {
  position: absolute;
  left: 50%; bottom: calc(max(22px, env(safe-area-inset-bottom)) + 118px);
  transform: translateX(-50%);
  color: #FFD35C;
  font-size: 12px; font-weight: 800;
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
  /* The card sets touch-action: none so a throw never scrolls anything. This
     list is the one place inside it that must still scroll under a finger. */
  touch-action: pan-y;
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
.cx-card.cx-reduce,
.cx-card.cx-reduce *,
.cx-card.cx-reduce *::before,
.cx-card.cx-reduce *::after {
  animation: none !important;
  transition: none !important;
}
/* Hidden rather than merely un-animated: these elements only exist as motion,
   and the rule above would freeze them on screen at their first frame (§10).
   The outcome still reaches this user through the banner and aria-live. */
.cx-card.cx-reduce .cx-capture { display: none; }

/* Phones and any short window: the card *is* the screen. A floating window with
   a backdrop would spend the little space there is on scenery nobody can play
   in — and the height clause matters more than it looks, because 50.6vh on a
   landscape phone yields a ~208px-wide sliver of a card that nothing fits in. */
@media (max-width: 479px), (max-height: 560px) {
  .cx-backdrop { display: none; }
  .cx-card {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    aspect-ratio: auto;
    border-radius: 0;
    box-shadow: none;
  }
}

/* Container, not media: the card no longer tracks the viewport's width, so a
   viewport query would shrink the sprite on a phone held sideways and leave it
   oversized in a short desktop card, which is exactly backwards. */
/* Every override below is on .cx-bob, never .cx-poke: the sprite is inset:0
   inside the bob box now, so the box is the only thing with a size to change.
   Each one keeps the same three relationships as the base — the bob's negative
   bottom is the artwork's transparent margin scaled with it, the ring sits at
   (sprite height / 2 + bottom) - (ring / 2), and the nameplate clears the
   sprite's top by ~40px. */
@container cxcard (max-width: 400px) {
  .cx-bob { width: 168px; height: 168px; left: -84px; bottom: -11px; }
  .cx-shadow { width: 84px; left: -42px; height: 18px; bottom: -9px; }
  .cx-nameplate { bottom: 200px; }
  .cx-bottom { padding: 0 16px; }
}
/* Very short windows only. The ring deliberately stays at its 250px size from
   the block above: the hit test judges in arena px against the same radius the
   ring is drawn from, so resizing it again here would quietly change how
   forgiving a throw is on one class of screen. Only its offset moves, to stay
   centred on the smaller sprite. */
@container cxcard (max-width: 330px) {
  .cx-bob { width: 138px; height: 138px; left: -69px; bottom: -9px; }
  .cx-shadow { width: 69px; left: -34.5px; height: 15px; bottom: -8px; }
  .cx-nameplate { bottom: 170px; padding: 5px 12px; }
  .cx-name { font-size: 13px; }
}
/* Short cards, whatever their width — a wide-but-short window is the case the
   width tiers above cannot see. The composition stacks vertically (nameplate,
   sprite, ground, dock), so height is what runs out first: on a landscape phone
   the ground line lands at 56% of ~412px and a full-size nameplate would be
   pushed off the top of the card into the close button.
   Last in the sheet on purpose: same specificity as the width tiers, so source
   order is what lets a short card override a wide one. */
@container cxcard (max-height: 560px) {
  .cx-bob { width: 138px; height: 138px; left: -69px; bottom: -9px; }
  .cx-shadow { width: 69px; left: -34.5px; height: 15px; bottom: -8px; }
  /* Tucked in to ~7px above the sprite rather than the usual ~42px: the space
     it would otherwise claim is the space the header buttons are already in.
     129px is where the sprite's head is (138 - 9), so this is the floor. */
  .cx-nameplate { bottom: 136px; padding: 4px 11px; }
  .cx-name { font-size: 13px; }
}
`;
