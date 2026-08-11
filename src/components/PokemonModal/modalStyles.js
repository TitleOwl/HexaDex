// Scoped style overrides for the Pokémon detail modal — moved verbatim out of
// the component file so index.jsx stays readable. Untouched on purpose: the
// selectors/!important stack here is load-bearing against App.css specificity,
// and rewriting it (e.g. to CSS Modules) is a separate, riskier project.
export const MODAL_CSS = `
  /* lucide icons — align inline, centre in icon buttons */
  .modal-overlay .modal-name svg,
  .modal-overlay .hero-shiny-badge svg,
  .modal-overlay .modal-name-cry svg { vertical-align: middle; }
  .modal-overlay .modal-close,
  .modal-overlay .hero-shiny-btn,
  .modal-overlay .hero-card-btn,
  .modal-overlay .modal-fav-btn { display: inline-flex; align-items: center; justify-content: center; }
  .modal-overlay .modal-fav-icon { display: inline-flex; }
  /* Tabs — modern pill design */
  .modal-overlay .modal-tabs {
    display: flex !important;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 0 14px;
    margin-bottom: 8px;
    border-bottom: 1px solid #e5e0d5;
  }
  .modal-overlay .modal-tab {
    padding: 7px 14px !important;
    border-radius: 999px !important;
    background: #efece4 !important;
    border: 1.5px solid transparent !important;
    color: #62605a !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.2px;
  }
  .modal-overlay .modal-tab:hover {
    background: #e5e0d5 !important;
    transform: translateY(-1px);
  }
  .modal-overlay .modal-tab.active {
    background: linear-gradient(135deg, #900603 0%, #6e0402 100%) !important;
    color: white !important;
    box-shadow: 0 4px 14px rgba(144,6,3,0.4);
    border-color: transparent !important;
  }

  /* Section titles — accent bar + bold */
  .modal-overlay .modal-section-title {
    font-size: 14px !important;
    font-weight: 800 !important;
    color: #1f1d20 !important;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    position: relative;
    padding-left: 14px;
    margin: 20px 0 14px !important;
    line-height: 1.2;
  }
  .modal-overlay .modal-section-title::before {
    content: "";
    position: absolute;
    left: 0;
    top: 2px;
    bottom: 2px;
    width: 4px;
    background: linear-gradient(180deg, #900603, #6e0402);
    border-radius: 2px;
  }

  /* Stat total — big colored banner */
  .modal-overlay .stat-total-row {
    display: flex !important;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px !important;
    background: linear-gradient(135deg, #900603 0%, #6e0402 100%) !important;
    color: white !important;
    border-radius: 16px !important;
    margin-top: 14px;
    box-shadow: 0 6px 22px rgba(144,6,3,0.4);
  }
  .modal-overlay .stat-total-label {
    font-size: 14px !important;
    font-weight: 800 !important;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .modal-overlay .stat-total-val {
    font-size: 24px !important;
    font-weight: 900 !important;
    color: white !important;
  }

  /* Type tags */
  .modal-overlay .modal-type-tag {
    padding: 6px 14px !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    border-radius: 999px !important;
    letter-spacing: 1px;
    text-transform: uppercase;
    box-shadow: 0 2px 10px rgba(0,0,0,0.18);
  }

  /* Abilities — card style */
  .modal-overlay .abilities-grid {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
    margin-top: 6px;
  }
  .modal-overlay .ability-chip {
    padding: 14px 18px !important;
    background: white !important;
    border: 2px solid #e5e0d5 !important;
    border-radius: 14px !important;
    font-weight: 700 !important;
    color: #1f1d20 !important;
    text-transform: capitalize;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    font-size: 14px !important;
    position: relative;
    transition: all 0.2s;
  }
  .modal-overlay .ability-chip:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0,0,0,0.08);
  }
  .modal-overlay .ability-chip.hidden-ability {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
    border-color: #fbbf24 !important;
  }
  .modal-overlay .hidden-label {
    display: inline-block;
    margin-left: 10px;
    padding: 3px 10px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white !important;
    border-radius: 999px;
    font-size: 10px;
    letter-spacing: 0.5px;
    font-weight: 800;
    text-transform: uppercase;
  }

  /* Evolution chain — softer cards */
  .modal-overlay .evo-chain {
    display: flex !important;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 12px !important;
    margin-top: 14px;
    padding: 8px;
  }
  .modal-overlay .evo-node {
    background: white !important;
    border: 2px solid #e5e0d5 !important;
    border-radius: 16px !important;
    padding: 14px !important;
    cursor: pointer;
    transition: all 0.25s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    min-width: 110px;
  }
  .modal-overlay .evo-node:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 22px rgba(0,0,0,0.12);
  }
  .modal-overlay .evo-node.current {
    background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%) !important;
    border-width: 3px !important;
    box-shadow: 0 8px 26px rgba(144,6,3,0.35) !important;
    transform: scale(1.05);
  }
  .modal-overlay .evo-arrow {
    color: #9c988e !important;
    font-size: 22px !important;
    font-weight: 800;
  }

  /* Info cards (height/weight/EXP) */
  .modal-overlay .info-cards-row {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }
  .modal-overlay .info-card {
    flex: 1;
    padding: 12px !important;
    background: white !important;
    border: 1.5px solid #e5e0d5 !important;
    border-radius: 12px !important;
    text-align: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
  }
  .modal-overlay .info-card-label {
    font-size: 10px !important;
    color: #7a766e !important;
    font-weight: 800 !important;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }
  .modal-overlay .info-card-value {
    font-size: 18px !important;
    font-weight: 900 !important;
    color: #1f1d20 !important;
    margin-top: 4px;
  }

  /* Dex entry / flavor text */
  .modal-overlay .modal-flavor {
    background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%) !important;
    padding: 14px 18px !important;
    border-radius: 14px !important;
    border-left: 4px solid #900603 !important;
    font-style: italic !important;
    color: #62605a !important;
    font-size: 13px !important;
    margin-top: 10px;
    line-height: 1.6 !important;
  }

  /* Sprites grid */
  .modal-overlay .sprite-grid {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
    gap: 12px !important;
    margin-top: 6px;
  }
  .modal-overlay .sprite-label {
    display: block;
    margin-top: 6px;
    font-size: 10px;
    color: #7a766e;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  /* Dark mode adjustments */
  [data-theme="dark"] .modal-overlay .ability-chip,
  [data-theme="dark"] .modal-overlay .evo-node,
  [data-theme="dark"] .modal-overlay .info-card,
  [data-theme="dark"] .modal-overlay .modal-section-title {
    color: #efece4 !important;
  }
  [data-theme="dark"] .modal-overlay .modal-tab {
    background: #2c2926 !important;
    color: #d4cdbe !important;
  }
  [data-theme="dark"] .modal-overlay .info-card-value {
    color: #efece4 !important;
  }
  [data-theme="dark"] .modal-overlay .info-card-label {
    color: #9c988e !important;
  }
  [data-theme="dark"] .modal-overlay .modal-flavor {
    background: linear-gradient(135deg, #1f1d20 0%, #1a1816 100%) !important;
    color: #d4cdbe !important;
  }

  /* ─── Button + Tab polish (consistent w/ HexaDex pattern) ─── */
  .modal-overlay .modal-close {
    position: absolute !important;
    top: 14px !important; right: 14px !important;
    width: 36px !important; height: 36px !important;
    border-radius: 50% !important;
    background: rgba(15, 23, 42, 0.52) !important;
    border: 1.5px solid rgba(255,255,255,0.18) !important;
    color: rgba(255,255,255,0.72) !important;
    font-size: 14px !important; font-weight: 700 !important;
    cursor: pointer !important;
    backdrop-filter: blur(10px) !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
    transition: transform 0.22s cubic-bezier(.22,1,.36,1), background 0.18s, color 0.18s !important;
    z-index: 5 !important;
    display: flex !important; align-items: center !important; justify-content: center !important;
  }
  .modal-overlay .modal-close:hover {
    transform: scale(1.1) rotate(90deg) !important;
    background: rgba(30, 41, 59, 0.82) !important;
    color: #fff !important;
    box-shadow: 0 4px 18px rgba(0,0,0,0.28) !important;
  }

  .modal-overlay .hero-view-controls {
    position: absolute !important;
    top: 14px !important; left: 14px !important;
    display: flex !important; align-items: center !important; gap: 8px !important;
    z-index: 4 !important;
  }
  .modal-overlay .hero-shiny-btn,
  .modal-overlay .hero-card-btn {
    width: 38px !important; height: 38px !important;
    border-radius: 50% !important;
    background: rgba(255, 255, 255, 0.18) !important;
    backdrop-filter: blur(14px) !important;
    border: 2px solid rgba(255, 255, 255, 0.4) !important;
    color: white !important;
    font-size: 17px !important;
    cursor: pointer !important;
    transition: transform 0.2s, background 0.2s !important;
    display: flex !important; align-items: center !important; justify-content: center !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
  }
  .modal-overlay .hero-shiny-btn:hover,
  .modal-overlay .hero-card-btn:hover {
    background: rgba(255, 255, 255, 0.3) !important;
    transform: scale(1.1) !important;
  }
  .modal-overlay .hero-shiny-btn.active {
    background: linear-gradient(135deg, #fbbf24, #f97316) !important;
    box-shadow: 0 0 16px rgba(251, 191, 36, 0.7) !important;
    border-color: rgba(255, 255, 255, 0.6) !important;
  }

  .modal-overlay .hero-view-toggle {
    display: inline-flex !important;
    background: rgba(255, 255, 255, 0.18) !important;
    backdrop-filter: blur(14px) !important;
    border: 2px solid rgba(255, 255, 255, 0.4) !important;
    border-radius: 999px !important;
    padding: 3px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
  }
  .modal-overlay .hv-btn {
    padding: 6px 12px !important;
    border-radius: 999px !important;
    background: transparent !important;
    color: rgba(255, 255, 255, 0.85) !important;
    border: none !important;
    font-size: 11px !important; font-weight: 800 !important;
    cursor: pointer !important;
    letter-spacing: 0.5px !important;
    transition: background 0.2s, color 0.2s !important;
  }
  .modal-overlay .hv-btn.active {
    background: white !important;
    color: #1f1d20 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
  }

  /* Tabs — modern pill design */
  .modal-overlay .modal-tabs {
    display: flex !important;
    gap: 4px !important;
    padding: 4px !important;
    background: var(--md-tabs-bg, #efece4) !important;
    border-radius: 14px !important;
    margin-bottom: 14px !important;
    overflow-x: auto !important;
    scrollbar-width: thin !important;
  }
  [data-theme="dark"] .modal-overlay .modal-tabs {
    --md-tabs-bg: #1f1d20 !important;
  }
  .modal-overlay .modal-tab {
    flex-shrink: 0 !important;
    padding: 8px 14px !important;
    border-radius: 11px !important;
    background: transparent !important;
    color: var(--md-tab-fg, #7a766e) !important;
    border: none !important;
    font-size: 12px !important; font-weight: 700 !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
    white-space: nowrap !important;
  }
  [data-theme="dark"] .modal-overlay .modal-tab {
    --md-tab-fg: #9c988e !important;
  }
  .modal-overlay .modal-tab:hover {
    background: color-mix(in srgb, var(--blue) 8%, transparent) !important;
    color: var(--blue) !important;
  }
  .modal-overlay .modal-tab.active {
    background: linear-gradient(135deg, var(--blue), var(--blue-light)) !important;
    color: white !important;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--blue) 38%, transparent) !important;
  }

  /* ─── Catch FAB — small Pokeball that expands on hover ─── */
  .modal-overlay .catch-fab {
    position: absolute !important;
    bottom: 16px !important;
    right: 16px !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 0 !important;
    padding: 6px !important;
    padding-right: 6px !important;
    height: 56px !important;
    width: 56px !important;
    border-radius: 999px !important;
    /* frosted white glass, same recipe as the type pills and the 3D button,
       instead of the old near-black puck that fought the pastel hero */
    background: rgba(255, 255, 255, 0.22) !important;
    backdrop-filter: blur(16px) saturate(150%) !important;
    -webkit-backdrop-filter: blur(16px) saturate(150%) !important;
    border: 1px solid rgba(255, 255, 255, 0.34) !important;
    color: #fff !important;
    cursor: pointer !important;
    overflow: hidden !important;
    transition: width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                padding 0.35s, transform 0.2s,
                box-shadow 0.35s, background 0.25s !important;
    box-shadow: 0 6px 18px rgba(48, 57, 67, 0.16) !important;
    z-index: 4 !important;
    white-space: nowrap !important;
  }
  .modal-overlay .catch-fab:hover {
    width: 170px !important;
    padding-right: 18px !important;
    transform: scale(1.04) !important;
    background: rgba(255, 255, 255, 0.34) !important;
    box-shadow: 0 10px 26px rgba(48, 57, 67, 0.22) !important;
  }
  .modal-overlay .catch-fab-ball {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 42px !important;
    height: 42px !important;
    border-radius: 50% !important;
    background: radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 60%, transparent 100%) !important;
    flex-shrink: 0 !important;
  }
  .modal-overlay .catch-fab-label {
    font-size: 13px !important;
    font-weight: 900 !important;
    letter-spacing: 0.5px !important;
    /* the puck is translucent now, so the label needs its own lift to stay
       legible over lighter type colors like Electric */
    text-shadow: 0 1px 3px rgba(48, 57, 67, 0.35) !important;
    opacity: 0 !important;
    max-width: 0 !important;
    overflow: hidden !important;
    transition: opacity 0.25s 0.05s, max-width 0.35s, margin-left 0.35s !important;
    margin-left: 0 !important;
  }
  .modal-overlay .catch-fab:hover .catch-fab-label {
    opacity: 1 !important;
    max-width: 120px !important;
    margin-left: 6px !important;
  }
  /* Pulse animation when idle */
  .modal-overlay .catch-fab::before {
    content: "" !important;
    position: absolute !important;
    inset: -4px !important;
    border-radius: 999px !important;
    background: rgba(255, 255, 255, 0.28) !important;
    opacity: 0.5 !important;
    z-index: -1 !important;
    /* Four pulses is enough to draw the eye; running it forever kept a
       compositor layer alive for as long as the modal was open. */
    animation: catch-fab-pulse 2.2s ease-in-out 4 !important;
  }
  @keyframes catch-fab-pulse {
    0%, 100% { transform: scale(0.92); opacity: 0; }
    50%      { transform: scale(1.08); opacity: 0.5; }
  }
  .modal-overlay .catch-fab:hover::before { animation: none !important; opacity: 0 !important; }

  /* Mobile: ensure FAB doesn't get cut off */
  @media (max-width: 480px) {
    .modal-overlay .catch-fab { bottom: 12px !important; right: 12px !important; }
    .modal-overlay .catch-fab:hover { width: 150px !important; }
  }

  /* Touch devices never fire :hover, so the label stayed hidden forever and
     the button read as an unexplained floating ball. Show it expanded. */
  @media (hover: none), (pointer: coarse) {
    .modal-overlay .catch-fab {
      width: auto !important;
      padding-right: 18px !important;
    }
    .modal-overlay .catch-fab .catch-fab-label {
      opacity: 1 !important;
      max-width: 120px !important;
      margin-left: 6px !important;
    }
    .modal-overlay .catch-fab:active {
      transform: scale(0.95) !important;
      background: rgba(255, 255, 255, 0.34) !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-overlay .catch-fab::before { animation: none !important; opacity: 0 !important; }
    .modal-overlay .catch-fab-ball img { animation: none !important; }
  }

  /* DEFENSIVE: hide any leftover old catch button (App.css frozen) */
  .modal-overlay .catch-try-it-cta,
  .modal-overlay .catch-try-below3d {
    display: none !important;
  }

  /* 3D-mode FAB variant: relative positioning (not absolute) */
  .modal-overlay .catch-fab-3d {
    position: relative !important;
    bottom: auto !important;
    right: auto !important;
    margin: 12px auto !important;
    display: flex !important;
  }

  /* ── Detail page redesign — flat hero + underline tab bar ── */

  /* Dex number, inline with the name (reference: "Bulbasaur ... #001") */
  .modal-overlay .modal-dex-num {
    font-family: var(--font-display) !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    color: rgba(255,255,255,0.75) !important;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    margin-left: 4px;
  }
  .modal-overlay .modal-genus {
    font-size: 12px !important;
    font-weight: 700 !important;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.7) !important;
  }

  /* Type pills on the hero — translucent white instead of solid type-color,
     so they read against any type's own background color. */
  .modal-overlay .modal-type-tag {
    background: rgba(255,255,255,0.24) !important;
    border: 1px solid rgba(255,255,255,0.3) !important;
    color: #fff !important;
    box-shadow: none !important;
  }

  /* Horizontal, scrollable underline tab bar (replaces the old dropdown) */
  .modal-overlay .detail-tabbar {
    display: flex;
    gap: 22px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    border-bottom: 1px solid var(--border);
    margin: 4px 0 16px;
    padding-bottom: 0;
  }
  .modal-overlay .detail-tabbar::-webkit-scrollbar { display: none; }
  .modal-overlay .detail-tab {
    flex-shrink: 0;
    background: none !important;
    border: none !important;
    padding: 9px 1px 11px !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    color: var(--text-muted) !important;
    cursor: pointer;
    position: relative;
    white-space: nowrap;
    transition: color 0.15s;
  }
  .modal-overlay .detail-tab:hover { color: var(--text-secondary) !important; }
  .modal-overlay .detail-tab.active { color: var(--text-primary) !important; }
  .modal-overlay .detail-tab.active::after {
    content: "";
    position: absolute;
    left: 0; right: 0; bottom: -1px;
    height: 2.5px;
    border-radius: 2px;
    background: var(--modal-accent, var(--blue));
  }

  /* ══════════════════════════════════════════════════════════════
     Simplified hero + About/Stats layout — matches the reference
     1:1: flat type-color card, back+heart corners, name+dex number,
     translucent type pills, art bleeding into the white body below.
     ══════════════════════════════════════════════════════════════ */
  .modal-overlay .modal-hero {
    overflow: hidden;
    text-align: left !important;
    padding: 20px 22px 0 !important;
    display: flex;
    flex-direction: column;
  }
  .modal-overlay .hero-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 2;
  }
  .modal-overlay .hero-back-btn,
  .modal-overlay .hero-fav-btn {
    background: none;
    border: none;
    color: #fff;
    padding: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0.95;
    transition: transform 0.15s, opacity 0.15s;
  }
  .modal-overlay .hero-back-btn:hover,
  .modal-overlay .hero-fav-btn:hover { opacity: 1; transform: scale(1.08); }
  .modal-overlay .hero-fav-btn.active { color: #fff; }
  .modal-overlay .hero-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-top: 22px;
    position: relative;
    z-index: 2;
  }
  .modal-overlay .hero-name {
    font-family: var(--font-display) !important;
    font-size: 1.9rem !important;
    font-weight: 800 !important;
    color: #fff !important;
    margin: 0 !important;
    line-height: 1.1 !important;
    cursor: pointer;
  }
  .modal-overlay .hero-dex-num {
    font-family: var(--font-display) !important;
    font-size: 15px !important;
    font-weight: 700 !important;
    color: rgba(255,255,255,0.85) !important;
    flex-shrink: 0;
    margin-top: 4px;
  }
  .modal-overlay .hero-name-en {
    font-size: 12px !important;
    font-weight: 600 !important;
    color: rgba(255,255,255,0.7) !important;
    margin-top: 2px;
  }
  .modal-overlay .hero-type-tags {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    position: relative;
    z-index: 2;
  }
  .modal-overlay .hero-type-tag {
    background: rgba(255,255,255,0.24);
    border: 1px solid rgba(255,255,255,0.3);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.4px;
    text-transform: capitalize;
    padding: 5px 14px;
    border-radius: 999px;
  }
  .modal-overlay .hero-art-wrap {
    flex: 1;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    min-height: 160px;
    margin-top: 8px;
    position: relative;
    z-index: 1;
  }
  .modal-overlay .hero-art {
    width: min(58%, 220px);
    height: auto;
    max-height: 210px;
    object-fit: contain;
    cursor: pointer;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
    transition: transform 0.2s;
  }
  .modal-overlay .hero-art:hover { transform: scale(1.04); }

  /* About tab — simple label/value rows */
  .modal-overlay .about-tab { padding-top: 4px; }
  .modal-overlay .about-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-size: 13.5px;
  }
  .modal-overlay .about-row:last-child { border-bottom: none; }
  .modal-overlay .about-label {
    color: var(--text-muted);
    font-weight: 600;
    flex-shrink: 0;
  }
  .modal-overlay .about-val {
    color: var(--text-primary);
    font-weight: 700;
    text-align: right;
    text-transform: capitalize;
  }
  .modal-overlay .about-section-title {
    font-family: var(--font-display) !important;
    font-size: 15px !important;
    font-weight: 800 !important;
    color: var(--text-primary) !important;
    margin: 20px 0 4px !important;
    text-transform: none !important;
    padding-left: 0 !important;
  }
  .modal-overlay .about-section-title::before { display: none !important; }

  /* Base Stats — label / number / red-or-green bar */
  .modal-overlay .stat-bars {
    display: flex;
    flex-direction: column;
    gap: 11px;
    margin-top: 4px;
  }
  .modal-overlay .stat-bar-row {
    display: grid;
    grid-template-columns: 64px 34px 1fr;
    align-items: center;
    gap: 14px;
  }
  .modal-overlay .stat-bar-total { margin-top: 6px; padding-top: 11px; border-top: 1px solid var(--border); }
  .modal-overlay .stat-bar-label {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-secondary);
  }
  .modal-overlay .stat-bar-total .stat-bar-label { color: var(--text-primary); font-weight: 800; }
  .modal-overlay .stat-bar-num {
    font-size: 13px;
    font-weight: 800;
    color: var(--text-primary);
    text-align: left;
    font-variant-numeric: tabular-nums;
  }
  .modal-overlay .stat-bar-track {
    position: relative;
    height: 6px;
    background: var(--border);
    border-radius: 999px;
    overflow: hidden;
  }
  .modal-overlay .stat-bar-fill {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    border-radius: 999px;
    transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
  }
  .modal-overlay .stat-bar-fill.good { background: #22c55e; }
  .modal-overlay .stat-bar-fill.bad  { background: #ef4444; }
  .modal-overlay .type-def-desc {
    font-size: 12.5px;
    color: var(--text-muted);
    margin: 2px 0 14px;
    line-height: 1.5;
  }

  /* ══════════════════════════════════════════════════════════════
     Reference-exact pass: pastel type color fills the WHOLE card,
     the white sheet gets big 30px top corners and sits on top, and
     the artwork straddles the hero/sheet seam with a faint pokéball
     outline behind it (visible only on the colored area).
     ══════════════════════════════════════════════════════════════ */
  .modal-overlay .detail-modal {
    border-radius: 28px;
    box-shadow: 0 18px 50px rgba(30, 40, 60, 0.28);
  }
  .modal-overlay .detail-modal .modal-hero {
    background: transparent !important;
    overflow: visible;
    min-height: 0;
    position: relative;
    z-index: auto;
    padding: 20px 22px 0 !important;
  }
  /* faint pokéball outline — bleeds below the hero but the sheet
     (z-index 1) paints over it, so it only shows on the colored part */
  .modal-overlay .hero-ball-outline {
    position: absolute;
    left: 50%;
    bottom: -70px;
    transform: translateX(-50%);
    width: 210px;
    height: 210px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.22);
    z-index: 0;
    pointer-events: none;
  }
  .modal-overlay .hero-ball-outline::before {
    content: "";
    position: absolute;
    left: -14px; right: -14px;
    top: 50%;
    height: 2px;
    margin-top: -1px;
    background: rgba(255,255,255,0.22);
  }
  .modal-overlay .hero-ball-outline::after {
    content: "";
    position: absolute;
    left: 50%; top: 50%;
    width: 52px; height: 52px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.22);
    background: transparent;
  }
  /* artwork overlaps the seam between colored header and white sheet */
  .modal-overlay .detail-modal .hero-art-wrap {
    position: relative;
    z-index: 2;
    min-height: 175px;
    margin-top: 6px;
    margin-bottom: -64px;
    pointer-events: none;
  }
  .modal-overlay .detail-modal .hero-art {
    pointer-events: auto;
    width: min(60%, 225px);
    max-height: 215px;
    filter: drop-shadow(0 12px 22px rgba(0,0,0,0.18));
  }
  /* the white bottom sheet — big rounded top corners over the color */
  .modal-overlay .detail-sheet {
    position: relative;
    z-index: 1;
    background: var(--bg-card);
    border-radius: 30px 30px 0 0;
    padding: 80px 26px 28px !important;
  }
  /* active tab underline is dark (not type-colored) per the reference */
  .modal-overlay .detail-sheet .detail-tab.active::after {
    background: var(--text-primary);
  }
  /* thinner reference-style stat bars + soft red/green */
  .modal-overlay .stat-bars { gap: 13px; }
  .modal-overlay .stat-bar-track { height: 4px; }
  .modal-overlay .stat-bar-fill.good { background: #4CC790; }
  .modal-overlay .stat-bar-fill.bad  { background: #FB6C6C; }
  .modal-overlay .stat-bar-total {
    border-top: none;
    padding-top: 0;
    margin-top: 2px;
  }
  .modal-overlay .stat-bar-total .stat-bar-label {
    color: var(--text-secondary);
    font-weight: 700;
  }
  /* gender symbols — blue ♂ / pink ♀ like the reference */
  .modal-overlay .gender-m { color: #77BDFE; font-weight: 800; }
  .modal-overlay .gender-f { color: #F0709A; font-weight: 800; }

  /* ══════════════════════════════════════════════════════════════
     Component-spec pass (deep-dive doc): design tokens scoped to the
     detail card, spec type scale, left-aligned About columns, /100
     stat scale with staggered fill animation, indigo tab indicator,
     and motion per §7. Light-mode hexes come straight from the spec;
     dark mode maps the tokens back onto the app's dark palette.
     ══════════════════════════════════════════════════════════════ */
  .modal-overlay .detail-modal {
    --dtl-text-primary:   #303943;
    --dtl-text-secondary: #8F9396;
    --dtl-text-tertiary:  #C3C9CB;
    --dtl-track:          #EDEFF1;
    --dtl-accent:         #4C57C8;
  }
  [data-theme="dark"] .modal-overlay .detail-modal {
    --dtl-text-primary:   var(--text-primary);
    --dtl-text-secondary: var(--text-secondary);
    --dtl-text-tertiary:  var(--text-muted);
    --dtl-track:          var(--border);
    --dtl-accent:         #6C79DB;
  }

  /* Hero — §3.1 */
  .modal-overlay .detail-modal .modal-hero { padding: 20px 24px 0 !important; }
  .modal-overlay .hero-title-row { align-items: baseline; margin-top: 24px; }
  .modal-overlay .hero-name {
    font-size: 30px !important;
    line-height: 38px !important;
    font-weight: 700 !important;
  }
  .modal-overlay .hero-dex-num {
    font-size: 18px !important;
    line-height: 24px !important;
    font-weight: 700 !important;
    color: #fff !important;
    margin-top: 0;
  }
  .modal-overlay .hero-type-tag {
    padding: 4px 10px;
    font-size: 11px;
    line-height: 14px;
    font-weight: 500;
    letter-spacing: 0.2px;
    border: none;
    background: rgba(255,255,255,0.25);
  }
  /* pokéball décor — user-supplied glyph (public/pokeball-wm.png) used as
     a CSS mask so the background-color tints it: white watermark on the
     type color, same recolor trick as the Pikachu nav icon. Replaces the
     hand-drawn ring, so the ::before/::after strokes are switched off. */
  .modal-overlay .hero-ball-outline {
    width: 200px;
    height: 200px;
    left: 65%;
    bottom: 4px;
    border: none;
    border-radius: 0;
    background: rgba(255,255,255,0.16);
    -webkit-mask-image: url(/pokeball-wm.png);
    mask-image: url(/pokeball-wm.png);
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
  }
  .modal-overlay .hero-ball-outline::before,
  .modal-overlay .hero-ball-outline::after { display: none; }
  /* hero image — upsized to 240. The spec says a ~12pt dip, but PokeAPI
     artwork has generous transparent padding, so the visible pixels need
     a deeper -40 pull to actually be SEEN straddling the seam. */
  .modal-overlay .detail-modal .hero-art-wrap {
    min-height: 216px;
    margin-top: 4px;
    margin-bottom: -40px;
  }
  .modal-overlay .detail-modal .hero-art {
    width: 240px;
    max-height: 240px;
  }
  /* favorite toggle — spring bounce on activate */
  @keyframes fav-bounce {
    0% { transform: scale(1); } 40% { transform: scale(1.22); }
    70% { transform: scale(0.94); } 100% { transform: scale(1); }
  }
  .modal-overlay .hero-fav-btn.active svg { animation: fav-bounce 250ms ease-out; }

  /* Sheet — top padding clears the 40pt art overhang so tabs stay free */
  .modal-overlay .detail-sheet { padding: 48px 28px 28px !important; }

  /* Tab bar — full-width space-between, indigo 36×3 pill indicator */
  .modal-overlay .detail-sheet .detail-tabbar {
    justify-content: space-between;
    gap: 8px;
    border-bottom: none;
    margin: 0;
  }
  .modal-overlay .detail-sheet .detail-tab {
    padding: 4px 2px 12px !important;
    font-size: 14px !important;
    line-height: 20px !important;
    font-weight: 500 !important;
    color: var(--dtl-text-tertiary) !important;
  }
  .modal-overlay .detail-sheet .detail-tab:hover { color: var(--dtl-text-secondary) !important; }
  .modal-overlay .detail-sheet .detail-tab.active {
    color: var(--dtl-text-primary) !important;
    font-weight: 600 !important;
  }
  .modal-overlay .detail-sheet .detail-tab.active::after {
    left: 50%;
    right: auto;
    bottom: 0;
    transform: translateX(-50%);
    width: 36px;
    height: 3px;
    border-radius: 999px;
    background: var(--dtl-accent);
  }

  /* Tab content — slide-in per switch (§7), content top spacing (§4) */
  @keyframes tab-in {
    from { opacity: 0; transform: translateX(14px); }
    to   { opacity: 1; transform: none; }
  }
  .modal-overlay .tab-content-anim {
    padding-top: 24px;
    animation: tab-in 250ms cubic-bezier(0, 0, 0.2, 1);
  }

  /* About — two left-aligned columns, no dividers, 36pt rows (§4) */
  .modal-overlay .about-tab { padding-top: 0; }
  .modal-overlay .about-row {
    justify-content: flex-start;
    gap: 0;
    min-height: 36px;
    align-items: center;
    padding: 0;
    border-bottom: none;
    font-size: 14px;
    line-height: 22px;
  }
  .modal-overlay .about-label {
    flex: 0 0 110px;
    font-weight: 400;
    color: var(--dtl-text-secondary);
  }
  .modal-overlay .about-val {
    text-align: left;
    font-weight: 500;
    color: var(--dtl-text-primary);
  }
  .modal-overlay .about-section-title {
    font-size: 16px !important;
    line-height: 24px !important;
    font-weight: 600 !important;
    color: var(--dtl-text-primary) !important;
    margin: 28px 0 8px !important;
  }
  .modal-overlay .gender-gap { display: inline-block; width: 24px; }
  .modal-overlay .gender-m { color: #6C79DB; font-weight: 700; }
  .modal-overlay .gender-f { color: #F0649E; font-weight: 700; }

  /* Base Stats — 90/36/flex rows, 32pt tall, staggered fills (§5) */
  .modal-overlay .stat-bars { gap: 0; margin-top: 0; }
  .modal-overlay .stat-bar-row {
    grid-template-columns: 90px 36px 1fr;
    gap: 0;
    min-height: 32px;
  }
  .modal-overlay .stat-bar-label {
    font-size: 14px;
    line-height: 22px;
    font-weight: 400;
    color: var(--dtl-text-secondary);
  }
  .modal-overlay .stat-bar-total .stat-bar-label { color: var(--dtl-text-secondary); font-weight: 400; }
  .modal-overlay .stat-bar-num {
    font-size: 14px;
    line-height: 22px;
    font-weight: 500;
    color: var(--dtl-text-primary);
  }
  .modal-overlay .stat-bar-track {
    margin-left: 16px;
    background: var(--dtl-track);
  }
  @keyframes stat-grow { from { width: 0; } }
  .modal-overlay .stat-bar-fill {
    animation: stat-grow 600ms cubic-bezier(0, 0, 0.2, 1) backwards;
    animation-delay: var(--stagger, 0ms);
  }
  /* feedback colors alias the type palette (§1.2) */
  .modal-overlay .stat-bar-fill.good { background: #48D0B0; }
  .modal-overlay .stat-bar-fill.bad  { background: #FB6C6C; }
  .modal-overlay .stat-bar-total { margin-top: 0; }
  .modal-overlay .type-def-desc {
    font-size: 12px;
    line-height: 18px;
    color: var(--dtl-text-secondary);
    margin: 0 0 14px;
  }

  /* hero must feel like part of the card — no OS image-drag ghost, no
     selection rectangle, no tap highlight. Selection is disabled on the
     WHOLE hero because a drag starting on the name/background otherwise
     sweeps a selection box across the art (drag on the img itself is also
     blocked via draggable={false} + onDragStart preventDefault). */
  .modal-overlay .detail-modal .modal-hero,
  .modal-overlay .detail-modal .modal-hero * {
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .modal-overlay .detail-modal .hero-art {
    -webkit-user-drag: none;
    outline: none;
  }

  /* ══════════════════════════════════════════════════════════════
     Restored features in the redesigned hero: the 2D/3D switch sits
     beside the heart, and 3D mode swaps the flat artwork for the model
     viewer (the old full-hero 3D takeover is gone — the pastel card
     stays put so the layout never jumps).
     ══════════════════════════════════════════════════════════════ */
  /* One button, parked right after the name. Its label is the mode you get
     when you press it, so no second segment is needed. */
  .modal-overlay .detail-modal .hero-title-row .hero-3d-btn {
    align-self: center;
    margin-left: 10px;
    margin-right: auto;
    flex-shrink: 0;
    padding: 3px 11px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.32);
    background: rgba(255,255,255,0.2);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition: background 0.15s, color 0.15s, transform 0.12s;
  }
  .modal-overlay .detail-modal .hero-title-row .hero-3d-btn:hover { background: rgba(255,255,255,0.3); }
  .modal-overlay .detail-modal .hero-title-row .hero-3d-btn:active { transform: scale(0.94); }
  .modal-overlay .detail-modal .hero-title-row .hero-3d-btn.active {
    background: #fff;
    color: var(--dtl-text-primary, #303943);
    border-color: transparent;
  }
  /* 3D matches 2D: the model straddles the header/sheet seam with the
     pokéball outline showing through behind it, and the catch button keeps
     its usual corner. The hint sits ABOVE the model so the model itself is
     what hangs over the seam. */
  .modal-overlay .detail-modal .hero-3d-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    align-self: stretch;
    margin-top: 4px;
    margin-bottom: -40px;
    padding-bottom: 0;
    z-index: 2;
  }
  .modal-overlay .detail-modal .hero-3d-hint {
    margin-bottom: 6px;
    font-size: 11.5px;
    color: rgba(255,255,255,0.8);
    text-align: center;
    line-height: 1.5;
  }
  /* transparent + unclipped so the pokéball outline behind stays visible and
     the model can hang past the seam like the 2D artwork does */
  .modal-overlay .detail-modal .hero-3d-wrap .viewer-3d-wrap {
    background: transparent !important;
    overflow: visible !important;
  }

  /* Cry-style picker rides along in the type-pill row, styled to match
     those translucent pills rather than the old dark-hero chrome. */
  .modal-overlay .detail-modal .cry-picker-wrap { margin-left: 2px; }
  .modal-overlay .detail-modal .cry-picker-btn {
    background: rgba(255,255,255,0.22) !important;
    border: 1px solid rgba(255,255,255,0.28) !important;
    color: #fff !important;
    border-radius: 999px !important;
    padding: 4px 11px !important;
    font-size: 11px !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }
  .modal-overlay .detail-modal .cry-picker-label-text,
  .modal-overlay .detail-modal .cry-picker-value,
  .modal-overlay .detail-modal .cry-picker-arrow { color: #fff !important; }
  .modal-overlay .detail-modal .cry-picker-divider { background: rgba(255,255,255,0.4) !important; }
  .modal-overlay .detail-modal .cry-picker-menu {
    background: var(--bg-card) !important;
    border-radius: 12px !important;
    z-index: 20;
  }
  .modal-overlay .detail-modal .cry-picker-item { color: var(--dtl-text-primary) !important; }

  /* §8 — 44×44 minimum touch targets without shifting the visual layout */
  .modal-overlay .hero-back-btn,
  .modal-overlay .hero-fav-btn {
    min-width: 44px;
    min-height: 44px;
    margin: -8px;
  }

  /* §8 — reduce-motion strips the flourishes down to plain rendering */
  @media (prefers-reduced-motion: reduce) {
    .modal-overlay .stat-bar-fill,
    .modal-overlay .tab-content-anim,
    .modal-overlay .hero-fav-btn.active svg { animation: none; }
  }

  /* ══════════════════════════════════════════════════════════════
     Theming pass for the legacy tab content (Evolution / Moves /
     Type defenses): soft surfaces, pill controls, spec typography,
     pastel type colors — so every tab speaks the same language as
     the redesigned About/Base Stats.
     ══════════════════════════════════════════════════════════════ */
  .modal-overlay .detail-modal { --dtl-surface: #F4F6FB; }
  [data-theme="dark"] .modal-overlay .detail-modal { --dtl-surface: var(--bg-muted); }

  /* section heading used by the Evolution tab — same as About's */
  .modal-overlay .detail-sheet .modal-section-title {
    font-family: var(--font-display);
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
    color: var(--dtl-text-primary);
    text-transform: none;
    letter-spacing: 0;
    padding: 0;
    margin: 0 0 14px;
  }
  .modal-overlay .detail-sheet .modal-section-title::before { display: none; }
  .modal-overlay .detail-sheet .evo-loading {
    color: var(--dtl-text-secondary);
    font-size: 13px;
  }

  /* Moves — soft select, pill method tabs tinted with the type color */
  .modal-overlay .detail-sheet .moves-version-select {
    background: var(--dtl-surface);
    border: none;
    border-radius: 12px;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dtl-text-primary);
    box-shadow: none;
  }
  .modal-overlay .detail-sheet .moves-method-btn {
    background: transparent;
    border: none;
    border-radius: 999px;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dtl-text-secondary);
    box-shadow: none;
  }
  .modal-overlay .detail-sheet .moves-method-btn.active {
    background: var(--modal-accent);
    color: #fff;
  }
  .modal-overlay .detail-sheet .moves-count {
    background: var(--dtl-surface);
    color: var(--dtl-text-secondary);
    border-radius: 999px;
    font-weight: 600;
  }
  .modal-overlay .detail-sheet .moves-method-btn.active .moves-count {
    background: rgba(255,255,255,0.28);
    color: #fff;
  }

  /* Moves table — airy rows with hairline dividers, no boxed borders */
  .modal-overlay .detail-sheet .moves-table-wrap {
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .modal-overlay .detail-sheet .moves-table th {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--dtl-text-tertiary);
    background: transparent;
    border-bottom: 1px solid var(--dtl-track);
    padding: 8px 8px;
  }
  .modal-overlay .detail-sheet .moves-table td {
    border-bottom: 1px solid var(--dtl-track);
    background: transparent;
    padding: 10px 8px;
    font-size: 13px;
    color: var(--dtl-text-primary);
  }
  .modal-overlay .detail-sheet .move-row:hover td { background: var(--dtl-surface); }
  .modal-overlay .detail-sheet .move-name {
    font-weight: 600;
    color: var(--dtl-text-primary);
  }
  .modal-overlay .detail-sheet .move-desc { color: var(--dtl-text-secondary); }
  .modal-overlay .detail-sheet .move-lv,
  .modal-overlay .detail-sheet .move-method-label { color: var(--dtl-text-secondary); }
  .modal-overlay .detail-sheet .move-type-tag {
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.2px;
    text-transform: capitalize;
    color: #fff;
    box-shadow: none;
    border: none;
  }
  .modal-overlay .detail-sheet .move-category {
    border-radius: 999px;
    font-size: 10px;
    box-shadow: none;
  }

  /* (The old .stat-bar-* rules lived here — Base Stats now renders the
     .stat-row/.stat-fill markup further down, so they were dead code.) */

  /* ══════════════════════════════════════════════════════════════
     Type-color scope: the accent is confined to the header, the type
     badges, the Weaknesses chips and the Evolution cards. Section
     headings and the tab indicator stay neutral so the type color
     never bleeds into the stat-reading zone.
     ══════════════════════════════════════════════════════════════ */
  .modal-overlay .detail-sheet .about-section-title,
  .modal-overlay .detail-sheet .modal-section-title {
    color: var(--dtl-text-primary) !important;
  }
  .modal-overlay .detail-sheet .detail-tab.active::after {
    background: var(--dtl-accent);
  }

  /* ══════════════════════════════════════════════════════════════
     Base Stats v2 — circular stat badges, right-aligned values, and
     bars whose LENGTH means magnitude while COLOR means which stat.
     Stat colors are fixed per stat (set inline from STAT_META), never
     the type color; the vertical average marker replaces the old
     red/green signalling. Fresh class names (.stat-row/.stat-fill…)
     deliberately avoid App.css's !important .stat-bar-* rules.
     ══════════════════════════════════════════════════════════════ */
  .modal-overlay .detail-sheet .stat-rows { display: flex; flex-direction: column; }
  .modal-overlay .detail-sheet .stat-row {
    display: flex;
    align-items: center;
    min-height: 40px;
  }
  .modal-overlay .detail-sheet .stat-badge {
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.2px;
  }
  .modal-overlay .detail-sheet .stat-value {
    flex: 0 0 36px;
    text-align: right;
    padding-right: 2px;
    margin-left: 10px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dtl-text-primary);
    font-variant-numeric: tabular-nums;
  }
  .modal-overlay .detail-sheet .stat-track {
    position: relative;
    flex: 1;
    height: 6px;
    margin-left: 16px;
    border-radius: 999px;
    background: var(--dtl-track);
    overflow: hidden;
  }
  .modal-overlay .detail-sheet .stat-fill {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    border-radius: 999px;
    animation: stat-grow 600ms cubic-bezier(0, 0, 0.2, 1) backwards;
    animation-delay: var(--stagger, 0ms);
  }
  .modal-overlay .detail-sheet .stat-marker {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    border-radius: 1px;
    background: rgba(48, 57, 67, 0.25);
  }
  [data-theme="dark"] .modal-overlay .detail-sheet .stat-marker { background: rgba(255,255,255,0.3); }
  .modal-overlay .detail-sheet .stat-total-wrap { margin-top: 16px; }
  .modal-overlay .detail-sheet .stat-row.total .stat-track { height: 8px; }
  .modal-overlay .detail-sheet .stat-marker-note {
    font-size: 11.5px;
    color: var(--dtl-text-secondary);
    margin: 10px 0 0;
    padding-left: 74px;
  }

  /* Weaknesses — multiplier chip leads each row, circular type chips
     overlap in a stack, worst multiplier first. */
  .modal-overlay .detail-sheet .weak-section { margin-top: 28px; }
  .modal-overlay .detail-sheet .weak-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .modal-overlay .detail-sheet .weak-mult-chip {
    flex-shrink: 0;
    background: var(--dtl-track);
    color: var(--dtl-text-secondary);
    font-size: 11px;
    font-weight: 700;
    padding: 4px 11px;
    border-radius: 999px;
  }
  .modal-overlay .detail-sheet .weak-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    row-gap: 8px;
  }
  @keyframes weak-chip-in {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }
  /* Each chip is a whole type-icon SVG (already a colored disc + white
     glyph). The ring separates the overlapping stack; the light filter
     eases the official saturated colors toward this page's pastel feel. */
  .modal-overlay .detail-sheet .weak-type-chip {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    margin-right: -6px;
    display: block;
    cursor: default;
    box-shadow: 0 0 0 2px var(--bg-card);
    filter: saturate(0.88) brightness(1.06);
    animation: weak-chip-in 250ms ease-out backwards;
    animation-delay: var(--chip-delay, 0ms);
    transition: transform 0.12s;
    -webkit-user-drag: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .modal-overlay .detail-sheet .weak-type-chip:hover { z-index: 1; position: relative; }
  .modal-overlay .detail-sheet .weak-type-chip:active { transform: scale(0.94); }
  .modal-overlay .detail-sheet .weak-type-chip:focus-visible {
    outline: 2px solid var(--dtl-accent);
    outline-offset: 2px;
  }
  .modal-overlay .detail-sheet .weak-empty,
  .modal-overlay .detail-sheet .weak-note {
    font-size: 12px;
    color: var(--dtl-text-secondary);
    margin: 4px 0 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-overlay .detail-sheet .stat-fill,
    .modal-overlay .detail-sheet .weak-type-chip { animation: none; }
  }

  /* Type defenses — pastel pills, soft group labels (colors set inline) */
  .modal-overlay .detail-sheet .matchup-group-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.2px;
    text-transform: none;
    margin: 10px 0 6px;
  }
  .modal-overlay .detail-sheet .matchup-pill {
    border-radius: 999px;
    padding: 5px 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2px;
    text-transform: capitalize;
    color: #fff;
    box-shadow: none;
    border: none;
  }

  /* ══════════════════════════════════════════════════════════════
     Evolution v3 — vertical axis. A single base node, a chevron, then
     the next stage as either one centered node or a 2-column grid that
     wraps (Eevee's eight branches fit without overflowing). Every node
     carries its OWN type badges; nothing here reads --modal-accent,
     because branches are usually different types than the open Pokémon.
     ══════════════════════════════════════════════════════════════ */
  .modal-overlay .detail-sheet .evo-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 24px;
  }
  .modal-overlay .detail-sheet .evo-head-title {
    font-family: var(--font-display);
    font-size: 18px;
    line-height: 24px;
    font-weight: 700;
    color: var(--dtl-text-primary);
  }
  .modal-overlay .detail-sheet .evo-head-bar {
    display: block;
    width: 64px;
    height: 3px;
    margin-top: 8px;
    border-radius: 999px;
    background: var(--dtl-track);
  }

  /* Recursive stack: node → chevron → next stage, centered throughout */
  .modal-overlay .detail-sheet .evo-tree {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
  /* Shiny switch — flips every sprite in the chain at once */
  .modal-overlay .detail-sheet .evo-shiny-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border: none;
    border-radius: 999px;
    background: var(--dtl-track);
    color: var(--dtl-text-secondary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.12s;
  }
  .modal-overlay .detail-sheet .evo-shiny-btn:active { transform: scale(0.95); }
  .modal-overlay .detail-sheet .evo-shiny-btn.active {
    background: #F5CB44;
    color: #303943;
  }

  /* Chevron is also the "replay evolution" button for that step */
  .modal-overlay .detail-sheet .evo-chevron {
    color: var(--dtl-text-tertiary);
    margin: 14px 0;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.12s;
  }
  .modal-overlay .detail-sheet .evo-chevron:hover {
    background: var(--dtl-surface);
    color: var(--dtl-text-secondary);
  }
  .modal-overlay .detail-sheet .evo-chevron:active { transform: scale(0.9); }
  .modal-overlay .detail-sheet .evo-chevron:focus-visible {
    outline: 2px solid var(--dtl-accent);
    outline-offset: 2px;
  }
  @keyframes evo-chevron-pulse {
    0%, 100% { opacity: 1; transform: translateY(0); }
    50%      { opacity: 0.45; transform: translateY(3px); }
  }
  .modal-overlay .detail-sheet .evo-chevron.playing {
    color: var(--dtl-accent);
    animation: evo-chevron-pulse 700ms ease-in-out infinite;
  }
  .modal-overlay .detail-sheet .evo-single { width: 100%; }
  .modal-overlay .detail-sheet .evo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 16px;
    row-gap: 32px;
    width: 100%;
  }
  /* Odd branch count: the last node spans both columns and centers, which
     balances better than leaving a hole on the right. */
  .modal-overlay .detail-sheet .evo-grid > :last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .modal-overlay .detail-sheet .evo-node-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 10px;
    border-radius: 20px;
    background: transparent;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.12s, opacity 0.12s, background 0.15s;
  }
  .modal-overlay .detail-sheet .evo-node-card:hover { background: var(--dtl-surface); }
  .modal-overlay .detail-sheet .evo-node-card:active { transform: scale(0.96); opacity: 0.9; }
  .modal-overlay .detail-sheet .evo-node-card:focus-visible {
    outline: 2px solid var(--dtl-accent);
    outline-offset: 2px;
  }
  /* current form: tinted plate + ring, and it is not navigable */
  .modal-overlay .detail-sheet .evo-node-card.current {
    background: var(--dtl-surface);
    box-shadow: inset 0 0 0 2px var(--dtl-track);
    cursor: default;
  }
  .modal-overlay .detail-sheet .evo-node-card.current:active { transform: none; opacity: 1; }

  /* Sprite box: fills the column instead of sitting at a fixed 120px in a
     ~340px-wide grid cell. Sprites are scaled by real height and share a
     baseline, so the size jump between forms still reads at a glance. */
  .modal-overlay .detail-sheet .evo-morph {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 100%;
    max-width: 228px;
    aspect-ratio: 1;
    margin: 0 auto;
  }
  /* Base node and single-child steps span the full sheet, so they get more */
  .modal-overlay .detail-sheet .evo-single .evo-morph { max-width: 278px; }
  .modal-overlay .detail-sheet .evo-morph.base { max-width: 292px; }
  .modal-overlay .detail-sheet .evo-sprite {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transform-origin: bottom center;
    -webkit-user-drag: none;
    filter: drop-shadow(0 8px 14px rgba(48, 57, 67, 0.16));
  }
  .modal-overlay .detail-sheet .evo-morph .evo-sprite { position: absolute; inset: 0; }
  .modal-overlay .detail-sheet .evo-sprite-skeleton {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  /* In-game evolution flash: the previous form bleaches to a white
     silhouette, swells, and cross-dissolves into this form, then hands
     the frame back. Both layers run one 2s animation, no JS per frame. */
  @keyframes evo-morph-from {
    0%   { opacity: 1; filter: none; }
    12%  { opacity: 1; filter: brightness(0) invert(1) drop-shadow(0 0 12px rgba(255,255,255,0.9)); }
    38%  { opacity: 1; filter: brightness(0) invert(1) drop-shadow(0 0 18px rgba(255,255,255,0.9)); }
    42%  { opacity: 0; }
    100% { opacity: 0; }
  }
  @keyframes evo-morph-to {
    0%, 38%  { opacity: 0; filter: brightness(0) invert(1); }
    42%      { opacity: 1; filter: brightness(0) invert(1) drop-shadow(0 0 18px rgba(255,255,255,0.9)); }
    62%      { opacity: 1; filter: none; }
    100%     { opacity: 1; filter: none; }
  }
  .modal-overlay .detail-sheet .evo-sprite.morph-from {
    z-index: 2;
    animation: evo-morph-from 2000ms ease-in-out;
  }
  .modal-overlay .detail-sheet .evo-sprite.morph-to {
    animation: evo-morph-to 2000ms ease-in-out;
  }

  /* Per-node tools (replay evolution / play cry) */
  .modal-overlay .detail-sheet .evo-node-tools {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    gap: 4px;
    z-index: 3;
  }
  .modal-overlay .detail-sheet .evo-tool-btn {
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 50%;
    background: var(--dtl-track);
    color: var(--dtl-text-secondary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.75;
    transition: opacity 0.15s, transform 0.12s, background 0.15s;
  }
  .modal-overlay .detail-sheet .evo-node-card:hover .evo-tool-btn { opacity: 1; }
  .modal-overlay .detail-sheet .evo-tool-btn:hover { background: var(--dtl-text-tertiary); color: #fff; }
  .modal-overlay .detail-sheet .evo-tool-btn:active { transform: scale(0.9); }

  /* Size + stat-growth readouts */
  .modal-overlay .detail-sheet .evo-meta {
    margin-top: 3px;
    font-size: 11px;
    color: var(--dtl-text-tertiary);
    font-variant-numeric: tabular-nums;
  }
  .modal-overlay .detail-sheet .evo-growth { color: #F0913E; font-weight: 700; }
  .modal-overlay .detail-sheet .evo-bst {
    margin-top: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--dtl-text-secondary);
    font-variant-numeric: tabular-nums;
  }
  .modal-overlay .detail-sheet .evo-bst-delta { color: #4CC790; font-weight: 800; }
  .modal-overlay .detail-sheet .evo-topgain {
    margin-top: 2px;
    font-size: 10.5px;
    font-weight: 600;
    color: #6FC7EE;
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-overlay .detail-sheet .evo-sprite.morph-from,
    .modal-overlay .detail-sheet .evo-sprite.morph-to,
    .modal-overlay .detail-sheet .evo-chevron.playing { animation: none; }
    .modal-overlay .detail-sheet .evo-sprite.morph-from { opacity: 0; }
  }
  .modal-overlay .detail-sheet .evo-node-label {
    margin-top: 8px;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    color: var(--dtl-text-secondary);
    text-align: center;
    text-transform: capitalize;
  }
  .modal-overlay .detail-sheet .evo-node-num {
    font-weight: 500;
    color: var(--dtl-text-tertiary);
  }
  .modal-overlay .detail-sheet .evo-badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
  }
  /* solid type color; text color is set inline from a luminance check so
     Electric yellow gets dark text instead of unreadable white */
  .modal-overlay .detail-sheet .evo-badge {
    padding: 6px 18px;
    border-radius: 999px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 600;
    letter-spacing: 0.2px;
    text-transform: capitalize;
  }
  .modal-overlay .detail-sheet .evo-cond-chip {
    margin-top: 8px;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--dtl-track);
    color: var(--dtl-text-secondary);
    font-size: 10.5px;
    font-weight: 600;
    text-align: center;
  }

  /* Full-width nodes (base form + linear steps) go horizontal: sprite on
     the left, details on the right, so the row uses the whole sheet
     instead of leaving big gutters. Grid/branch nodes stay stacked —
     the wide flag is threaded from EvoTree and turns off as soon as a chain
     branches, since those nodes live in a narrow column. */
  .modal-overlay .detail-sheet .evo-node-info {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .modal-overlay .detail-sheet .evo-node-card.wide {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 22px;
    width: 100%;
    padding: 14px 18px;
  }
  .modal-overlay .detail-sheet .evo-node-card.wide .evo-morph {
    flex: 0 0 clamp(135px, 38%, 222px);
    max-width: none;
    margin: 0;
  }
  /* the first form reads smallest, so it gets a little more than the rest */
  .modal-overlay .detail-sheet .evo-node-card.wide .evo-morph.base {
    flex-basis: clamp(152px, 42%, 246px);
  }
  .modal-overlay .detail-sheet .evo-node-card.wide .evo-node-info {
    align-items: flex-start;
    text-align: left;
    gap: 2px;
  }
  .modal-overlay .detail-sheet .evo-node-card.wide .evo-node-label {
    margin-top: 0;
    font-size: 17px;
    line-height: 24px;
    color: var(--dtl-text-primary);
    font-weight: 700;
  }
  .modal-overlay .detail-sheet .evo-node-card.wide .evo-badges { justify-content: flex-start; }
  .modal-overlay .detail-sheet .evo-node-card.wide .evo-cond-chip { align-self: flex-start; }

  /* Weaknesses along the line — one compact row per form */
  .modal-overlay .detail-sheet .evo-weak-section { margin-top: 32px; }
  .modal-overlay .detail-sheet .evo-weak-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 8px 10px;
    border-radius: 12px;
  }
  .modal-overlay .detail-sheet .evo-weak-row.current { background: var(--dtl-surface); }
  .modal-overlay .detail-sheet .evo-weak-who {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 132px;
    min-width: 0;
  }
  .modal-overlay .detail-sheet .evo-weak-thumb {
    width: 34px;
    height: 34px;
    object-fit: contain;
    flex-shrink: 0;
    -webkit-user-drag: none;
  }
  .modal-overlay .detail-sheet .evo-weak-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--dtl-text-secondary);
    text-transform: capitalize;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .modal-overlay .detail-sheet .evo-weak-chips {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    row-gap: 8px;
  }
  .modal-overlay .detail-sheet .evo-weak-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .modal-overlay .detail-sheet .evo-weak-mult {
    font-size: 10.5px;
    font-weight: 800;
    color: var(--dtl-text-tertiary);
    letter-spacing: 0.2px;
  }
  /* 4× is the headline risk, so it gets flagged rather than blending in */
  .modal-overlay .detail-sheet .evo-weak-mult.quad {
    color: #fff;
    background: #E24B5B;
    padding: 2px 7px;
    border-radius: 999px;
  }
  .modal-overlay .detail-sheet .evo-weak-chip {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    margin-right: -5px;
    filter: saturate(0.88) brightness(1.06);
    -webkit-user-drag: none;
    box-shadow: 0 0 0 2px var(--bg-card);
  }
  .modal-overlay .detail-sheet .evo-weak-none {
    font-size: 12px;
    color: var(--dtl-text-tertiary);
  }

  @media (max-width: 380px) {
    .modal-overlay .detail-sheet .evo-grid { column-gap: 8px; }
    .modal-overlay .detail-sheet .evo-badge { padding: 5px 12px; font-size: 11px; }
    .modal-overlay .detail-sheet .evo-node-card.wide { gap: 12px; padding: 12px 10px; }
    .modal-overlay .detail-sheet .evo-weak-who { flex-basis: 100%; }
  }

/* ══════════════════════════════════════════════════════════════════════════
   Moves & Sprites tabs
   Both arrived carrying their own palette. Scoped under .detail-sheet so they
   inherit the modal's surfaces and hairlines, and so nothing here leaks out
   into the list view.
   ══════════════════════════════════════════════════════════════════════════ */
.modal-overlay .detail-sheet .moves-method-tabs {
  display: flex; gap: 4px; padding: 4px; margin-bottom: 14px;
  border-radius: 999px; background: var(--bg-muted);
  border: 1px solid var(--border);
  overflow-x: auto; scrollbar-width: none;
}
.modal-overlay .detail-sheet .moves-method-tabs::-webkit-scrollbar { display: none; }
.modal-overlay .detail-sheet .moves-method-btn {
  flex: 1 1 auto; padding: 7px 15px;
  border: none; border-radius: 999px; background: none;
  color: var(--text-secondary);
  font-size: 12.5px; font-weight: 700; white-space: nowrap; cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.modal-overlay .detail-sheet .moves-method-btn:hover { color: var(--text-primary); }
.modal-overlay .detail-sheet .moves-method-btn.active {
  background: var(--bg-card); color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.09);
}
.modal-overlay .detail-sheet .moves-method-btn:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
.modal-overlay .detail-sheet .moves-count {
  font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px;
}

.modal-overlay .detail-sheet .moves-table-wrap {
  border: 1px solid var(--border); border-radius: 14px;
  overflow: hidden; background: var(--bg-card);
}
.modal-overlay .detail-sheet .moves-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.modal-overlay .detail-sheet .move-row {
  border-bottom: 1px solid var(--border); transition: background 0.13s ease;
}
.modal-overlay .detail-sheet .move-row:last-child { border-bottom: none; }
.modal-overlay .detail-sheet .move-row:hover { background: var(--bg-muted); }
.modal-overlay .detail-sheet .move-row > * { padding: 10px 12px; vertical-align: middle; }

/* The level is the column people scan down, so it gets a fixed lane and
   tabular figures — proportional digits make a column of numbers wobble. */
.modal-overlay .detail-sheet .move-lv {
  width: 46px; text-align: center; font-weight: 800;
  font-variant-numeric: tabular-nums; color: var(--text-primary);
}
.modal-overlay .detail-sheet .move-num {
  font-variant-numeric: tabular-nums; color: var(--text-secondary); font-weight: 600;
}
.modal-overlay .detail-sheet .move-name {
  font-weight: 700; color: var(--text-primary); text-transform: capitalize;
}
.modal-overlay .detail-sheet .move-desc {
  color: var(--text-secondary); font-size: 12px; line-height: 1.55;
}
.modal-overlay .detail-sheet .move-method-label {
  font-size: 11.5px; font-weight: 600; color: var(--text-muted);
}
.modal-overlay .detail-sheet .move-type-cell,
.modal-overlay .detail-sheet .move-cat-cell { width: 1%; white-space: nowrap; }
.modal-overlay .detail-sheet .move-category {
  display: inline-block; padding: 3px 9px; border-radius: 999px;
  background: var(--bg-muted); color: var(--text-secondary);
  font-size: 11px; font-weight: 700; text-transform: capitalize;
}

/* Loading dims the row it belongs to instead of showing a spinner, so the
   table does not jump when the descriptions land. */
.modal-overlay .detail-sheet .move-loading-text { opacity: 0.55; font-style: italic; }
.modal-overlay .detail-sheet .moves-loading-dot {
  display: inline-block; width: 6px; height: 6px; margin-left: 6px;
  border-radius: 50%; background: var(--text-muted);
  animation: mv-dot 1s ease-in-out infinite;
}
@keyframes mv-dot { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }


@media (max-width: 560px) {
  .modal-overlay .detail-sheet .move-desc,
  .modal-overlay .detail-sheet .move-num { display: none; }
    }
@media (prefers-reduced-motion: reduce) {
  .modal-overlay .detail-sheet .moves-method-btn,
  .modal-overlay .detail-sheet .move-row { transition: none; }
    .modal-overlay .detail-sheet .moves-loading-dot { animation: none; }
}

/* ── Detail modal: names in Title Case ──────────────────────────────────────
   The API returns them lowercase; the grid cards already capitalise, and the
   two views disagreeing on the same Pokémon looked like a data fault. */
.modal-overlay .modal-hero h1,
.modal-overlay .modal-name,
.modal-overlay .detail-sheet .modal-name-row h1,
.modal-overlay .detail-sheet .evo-node-name,
.modal-overlay .detail-sheet .move-name { text-transform: capitalize; }

/* The dex number keeps the name company rather than competing with it. */
.modal-overlay .modal-hero .modal-dex,
.modal-overlay .modal-hero .modal-num { color: rgba(255,255,255,0.72); }

/* ── Move category: the soft pill used everywhere else ─────────────────────
   Was solid red with thin white text, which measured worst-in-app for
   contrast. Same tinted-ground / deep-ink formula as the type pills. */
.modal-overlay .detail-sheet .move-category {
  background: #eeece5;
  color: #6f6a5e;
  border: none;
  text-shadow: none;
  box-shadow: none;
  font-weight: 700;
}
.modal-overlay .detail-sheet .move-category[data-cat="physical"] { background: #fbe0cf; color: #a8541f; }
.modal-overlay .detail-sheet .move-category[data-cat="special"]  { background: #dfe8fb; color: #3f5c9e; }
.modal-overlay .detail-sheet .move-category[data-cat="status"]   { background: #eeece5; color: #6f6a5e; }
[data-theme="dark"] .modal-overlay .detail-sheet .move-category[data-cat="physical"] { background: rgba(168,84,31,0.26); color: #f0a878; }
[data-theme="dark"] .modal-overlay .detail-sheet .move-category[data-cat="special"]  { background: rgba(63,92,158,0.30); color: #a8c0f0; }
[data-theme="dark"] .modal-overlay .detail-sheet .move-category[data-cat="status"]   { background: rgba(238,236,229,0.14); color: #cfc9bd; }

/* ── Move type: the same soft chip as the grid cards ───────────────────────
   It was plain text beside a coloured category chip, so two facts of equal
   rank were drawn at different volumes. */
.modal-overlay .detail-sheet .move-type-tag {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
  letter-spacing: 0;
  text-shadow: none;
  box-shadow: none;
  border: none;
  background: color-mix(in srgb, var(--tt) 16%, #ffffff);
  color: color-mix(in srgb, var(--tt) 42%, #17151a);
}
[data-theme="dark"] .modal-overlay .detail-sheet .move-type-tag {
  background: color-mix(in srgb, var(--tt) 26%, transparent);
  color: color-mix(in srgb, var(--tt) 50%, #ffffff);
}

/* The count rides every sub-tab, including Level Up, so the row reads as one
   set of comparable numbers rather than two labelled and one not. */
.modal-overlay .detail-sheet .moves-count {
  display: inline-block;
  min-width: 18px;
  margin: 0 0 0 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.modal-overlay .detail-sheet .moves-method-btn.active .moves-count {
  background: color-mix(in srgb, var(--blue) 14%, transparent);
  color: var(--blue);
}

/* ── Section rule: one brand colour, not two ───────────────────────────────
   The heading underline was red and the tab indicator purple. */
.modal-overlay .detail-sheet .modal-section-title::after,
.modal-overlay .detail-sheet .detail-tab.active::after {
  background: #8f2f2a !important;
}
.modal-overlay .detail-sheet .detail-tab.active { color: #8f2f2a !important; }

/* Sprite labels: Title Case, matching every other label in the modal. */

/* ── Hero Pokéball: a texture, not a competing object ──────────────────────
   It sat half off the right edge and overlapped the sprite. Centred behind
   the artwork and dropped to a whisper, it does what a watermark is for. */
.modal-overlay .modal-hero .hero-ball,
.modal-overlay .modal-hero .modal-ball-wm,
.modal-overlay .modal-hero .hero-pokeball {
  left: 50% !important;
  right: auto !important;
  top: 50% !important;
  bottom: auto !important;
  transform: translate(-50%, -50%) !important;
  opacity: 0.1 !important;
}

/* Sprite evolution leads the tab now, so it gets the room to be read. */

/* The dex number sits with the name instead of shouting over it: close in
   size, well back in weight and opacity. */
.modal-overlay .modal-hero .modal-dex,
.modal-overlay .modal-hero .modal-num,
.modal-overlay .modal-hero .hero-dex {
  font-size: 1.35rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}

/* ══════════════════════════════════════════════════════════════════════════
   Moves tab — controls, sorting, accordion
   ══════════════════════════════════════════════════════════════════════════ */
.modal-overlay .detail-sheet .moves-version-row {
  display: flex; align-items: center; gap: 9px; flex-wrap: wrap; margin-bottom: 12px;
}

/* Version picker: the same pill as "All Types", replacing the one control in
   this modal the browser drew itself. */
.modal-overlay .detail-sheet .mv-ver { position: relative; flex: 0 0 auto; }
.modal-overlay .detail-sheet .mv-ver-btn {
  display: inline-flex; align-items: center; gap: 7px;
  height: 34px; padding: 0 13px;
  border: 1px solid var(--border-mid); border-radius: 999px;
  background: var(--bg-card); color: var(--text-primary);
  font-size: 12.5px; font-weight: 700; white-space: nowrap; cursor: pointer;
}
.modal-overlay .detail-sheet .mv-ver-btn:hover,
.modal-overlay .detail-sheet .mv-ver-btn.open { border-color: var(--blue); color: var(--blue); }
.modal-overlay .detail-sheet .mv-ver-btn:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
.modal-overlay .detail-sheet .mv-ver-list {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
  min-width: 190px; max-height: 260px; overflow-y: auto;
  margin: 0; padding: 5px; list-style: none;
  border: 1px solid var(--border); border-radius: 13px;
  background: var(--bg-card);
  box-shadow: 0 12px 28px rgba(0,0,0,0.16);
}
.modal-overlay .detail-sheet .mv-ver-opt {
  display: block; width: 100%; text-align: left;
  padding: 7px 11px; border: none; border-radius: 9px;
  background: none; color: var(--text-primary);
  font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.modal-overlay .detail-sheet .mv-ver-opt:hover { background: var(--bg-muted); }
.modal-overlay .detail-sheet .mv-ver-opt.on { background: var(--bg-muted); color: var(--blue); font-weight: 800; }
.modal-overlay .detail-sheet .mv-ver-opt:focus-visible { outline: 2px solid var(--blue); outline-offset: -2px; }

/* Move search: filters as you type, so there is no button to press. */
.modal-overlay .detail-sheet .mv-search {
  display: inline-flex; align-items: center; gap: 7px;
  height: 34px; padding: 0 13px; flex: 1 1 190px; min-width: 140px; max-width: 300px;
  border: 1px solid var(--border); border-radius: 999px;
  background: var(--bg-muted); color: var(--text-muted);
}
.modal-overlay .detail-sheet .mv-search:focus-within { border-color: var(--blue); background: var(--bg-card); }
.modal-overlay .detail-sheet .mv-search input {
  flex: 1 1 auto; min-width: 0;
  border: none; background: none; outline: none;
  color: var(--text-primary); font-size: 12.5px; font-family: inherit;
}
.modal-overlay .detail-sheet .mv-search input::placeholder { color: var(--text-muted); }

/* Sortable headers. The arrow only appears on the column doing the sorting —
   three static arrows would say every column is active. */
.modal-overlay .detail-sheet .mv-sort {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 0; border: none; background: none;
  color: inherit; font: inherit; cursor: pointer;
}
.modal-overlay .detail-sheet .mv-sort:hover { color: var(--text-primary); }
.modal-overlay .detail-sheet .mv-sort.on { color: var(--blue); font-weight: 800; }
.modal-overlay .detail-sheet .mv-sort:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; border-radius: 4px; }

/* ── Rows: one line each, description behind a press ──────────────────────
   With the description inline every row was ~78px and seven moves filled the
   screen, for a Pokemon that may know a hundred. */
.modal-overlay .detail-sheet .move-row { cursor: pointer; }
.modal-overlay .detail-sheet .move-row > * { padding: 11px 12px; }
.modal-overlay .detail-sheet .move-name-cell {
  display: flex; align-items: center; gap: 6px;
}
.modal-overlay .detail-sheet .move-caret {
  color: var(--text-muted); flex: 0 0 auto;
  transition: transform 0.16s ease;
}
.modal-overlay .detail-sheet .move-row.open .move-caret { transform: rotate(180deg); }
.modal-overlay .detail-sheet .move-row.open { background: var(--bg-muted); }
.modal-overlay .detail-sheet .move-row:focus-visible { outline: 2px solid var(--blue); outline-offset: -2px; }

.modal-overlay .detail-sheet .move-desc-row > td {
  padding: 0 12px 12px;
  background: var(--bg-muted);
  border-bottom: 1px solid var(--border);
}
.modal-overlay .detail-sheet .move-desc-row .move-desc {
  margin: 0;
  padding: 9px 11px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px; line-height: 1.6;
}
@media (prefers-reduced-motion: reduce) {
  .modal-overlay .detail-sheet .move-caret { transition: none; }
}

/* ══════════════════════════════════════════════════════════════════════════
   Sprites tab + hero navigation
   ══════════════════════════════════════════════════════════════════════════ */





@media (prefers-reduced-motion: reduce) {
}

/* ══════════════════════════════════════════════════════════════════════════
   Sprite Evolution — a time axis, not a strip of thumbnails
   Every column is a fixed width, so the game names cannot collide however
   long they are; the dots sit on one continuous line, which is what says
   "this is chronological" without a caption.
   ══════════════════════════════════════════════════════════════════════════ */
.modal-overlay .detail-sheet .st { margin-bottom: 4px; }

.modal-overlay .detail-sheet .st-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
}
.modal-overlay .detail-sheet .st-title {
  display: inline-flex; align-items: center; gap: 7px; margin: 0;
}
.modal-overlay .detail-sheet .st-controls { display: flex; gap: 8px; flex-wrap: wrap; }

/* Segmented controls, replacing the play button. Auto-advance added nothing
   once every era is on screen at once — pressing the era you want is faster
   than waiting for it to come round. */
.modal-overlay .detail-sheet .st-seg {
  display: inline-flex; gap: 2px; padding: 2px;
  border-radius: 999px; background: #f4f2ee;
}
[data-theme="dark"] .modal-overlay .detail-sheet .st-seg { background: rgba(255,255,255,0.07); }
.modal-overlay .detail-sheet .st-seg-btn {
  padding: 5px 12px; border: none; border-radius: 999px;
  background: none; color: var(--text-secondary);
  font-size: 11.5px; font-weight: 700; cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;
}
.modal-overlay .detail-sheet .st-seg-btn:hover { color: var(--text-primary); }
.modal-overlay .detail-sheet .st-seg-btn.on {
  background: #fff; color: #2a2521; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
[data-theme="dark"] .modal-overlay .detail-sheet .st-seg-btn.on { background: rgba(255,255,255,0.16); color: #f2f0ea; }
.modal-overlay .detail-sheet .st-seg-btn:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }

/* ── The rail ──────────────────────────────────────────────────────────── */
.modal-overlay .detail-sheet .st-rail-wrap { position: relative; }
.modal-overlay .detail-sheet .st-rail {
  position: relative;
  display: flex;
  gap: 4px;
  padding: 2px 30px;
  overflow-x: auto;
  /* The browser's own scrollbar was the only raw chrome left in this panel. */
  scrollbar-width: none;
  scroll-behavior: smooth;
}
.modal-overlay .detail-sheet .st-rail::-webkit-scrollbar { display: none; }
/* Edge fades say there is more either way, which is what the scrollbar used
   to do badly. */
.modal-overlay .detail-sheet .st-rail-wrap::before,
.modal-overlay .detail-sheet .st-rail-wrap::after {
  content: ""; position: absolute; top: 0; bottom: 0; width: 34px;
  pointer-events: none; z-index: 2;
}
.modal-overlay .detail-sheet .st-rail-wrap::before {
  left: 0; background: linear-gradient(90deg, var(--bg-card), transparent);
}
.modal-overlay .detail-sheet .st-rail-wrap::after {
  right: 0; background: linear-gradient(270deg, var(--bg-card), transparent);
}

/* One line behind every dot. Drawn once rather than as a border per cell, so
   it stays continuous across the gaps. */
.modal-overlay .detail-sheet .st-axis {
  position: absolute;
  left: 30px; right: 30px;
  top: 88px;
  height: 2px;
  background: #eae6de;
  z-index: 0;
}
[data-theme="dark"] .modal-overlay .detail-sheet .st-axis { background: rgba(255,255,255,0.1); }

/* Fixed width: the only thing that keeps "FireRed" from colliding with
   "HeartGold" whatever their lengths. */
.modal-overlay .detail-sheet .st-cell {
  position: relative; z-index: 1;
  flex: 0 0 auto;
  width: 68px;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 0 2px 4px;
  border: none; background: none; cursor: pointer;
}
.modal-overlay .detail-sheet .st-cell:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; border-radius: 10px; }

.modal-overlay .detail-sheet .st-gen {
  height: 13px; line-height: 13px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em;
  color: #a8442f; white-space: nowrap;
}
[data-theme="dark"] .modal-overlay .detail-sheet .st-gen { color: #e0876f; }

.modal-overlay .detail-sheet .st-box {
  width: 52px; height: 52px;
  display: grid; place-items: center;
  border-radius: 10px;
  background: #f6f4f0;
  border: 2px solid transparent;
  transition: transform 0.16s cubic-bezier(.22,1,.36,1), background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}
[data-theme="dark"] .modal-overlay .detail-sheet .st-box { background: rgba(255,255,255,0.06); }
.modal-overlay .detail-sheet .st-cell:hover .st-box { background: #efece6; }
.modal-overlay .detail-sheet .st-cell.on .st-box {
  transform: scale(1.18);
  background: #fff;
  border-color: #8f2f2a;
  box-shadow: 0 4px 12px rgba(143, 47, 42, 0.2);
}
[data-theme="dark"] .modal-overlay .detail-sheet .st-cell.on .st-box { background: #1c1b1f; }
.modal-overlay .detail-sheet .st-img {
  width: 46px; height: 46px; object-fit: contain; image-rendering: pixelated;
}
.modal-overlay .detail-sheet .st-none {
  font-size: 8.5px; font-weight: 600; line-height: 1.2;
  color: var(--text-muted); text-align: center; padding: 0 3px;
}

.modal-overlay .detail-sheet .st-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: #d8d3ca;
  margin-top: 5px;
  transition: background 0.16s ease, transform 0.16s ease;
}
[data-theme="dark"] .modal-overlay .detail-sheet .st-dot { background: rgba(255,255,255,0.22); }
.modal-overlay .detail-sheet .st-cell.on .st-dot { background: #8f2f2a; transform: scale(1.2); }

.modal-overlay .detail-sheet .st-year {
  font-size: 11px; color: #a09d95; font-variant-numeric: tabular-nums;
}
.modal-overlay .detail-sheet .st-game {
  max-width: 100%;
  font-size: 11.5px; font-weight: 600; color: #5a5550;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
[data-theme="dark"] .modal-overlay .detail-sheet .st-year { color: rgba(241,239,233,0.45); }
[data-theme="dark"] .modal-overlay .detail-sheet .st-game { color: rgba(241,239,233,0.72); }
.modal-overlay .detail-sheet .st-cell.on .st-game { color: #8f2f2a; font-weight: 800; }
[data-theme="dark"] .modal-overlay .detail-sheet .st-cell.on .st-game { color: #e0876f; }

/* Rail arrows sit over the fades. */
.modal-overlay .detail-sheet .st-arrow {
  position: absolute; top: 74px; z-index: 3;
  width: 26px; height: 26px;
  display: grid; place-items: center;
  border: 1px solid var(--border); border-radius: 50%;
  background: var(--bg-card); color: var(--text-secondary);
  cursor: pointer;
}
.modal-overlay .detail-sheet .st-arrow.left  { left: 0; }
.modal-overlay .detail-sheet .st-arrow.right { right: 0; }
.modal-overlay .detail-sheet .st-arrow:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-mid); }
.modal-overlay .detail-sheet .st-arrow:disabled { opacity: 0.35; cursor: default; }
.modal-overlay .detail-sheet .st-arrow:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }

/* ── Summary row ───────────────────────────────────────────────────────── */
.modal-overlay .detail-sheet .st-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-top: 10px; padding-top: 11px;
  border-top: 1px solid var(--border);
}
.modal-overlay .detail-sheet .st-now {
  display: inline-flex; align-items: baseline; gap: 6px; flex-wrap: wrap;
  font-size: 12.5px; color: var(--text-secondary);
}
.modal-overlay .detail-sheet .st-now b { color: var(--text-primary); font-weight: 800; }
.modal-overlay .detail-sheet .st-now-lbl { color: var(--text-muted); }
.modal-overlay .detail-sheet .st-now-sep { color: #d6d2ca; }
.modal-overlay .detail-sheet .st-foot-nav { display: inline-flex; gap: 7px; flex: 0 0 auto; }
.modal-overlay .detail-sheet .st-round {
  width: 32px; height: 32px;
  display: grid; place-items: center;
  border: none; border-radius: 50%;
  background: #f6f4f0; color: var(--text-secondary);
  cursor: pointer;
}
[data-theme="dark"] .modal-overlay .detail-sheet .st-round { background: rgba(255,255,255,0.08); }
.modal-overlay .detail-sheet .st-round:hover:not(:disabled) { color: var(--text-primary); }
.modal-overlay .detail-sheet .st-round:disabled { opacity: 0.35; cursor: default; }
.modal-overlay .detail-sheet .st-round:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }

/* ── Zoom ──────────────────────────────────────────────────────────────── */
.modal-overlay .st-zoom {
  position: fixed; inset: 0; z-index: 4000;
  display: grid; place-items: center; padding: 24px;
  background: rgba(16, 15, 18, 0.72);
}
.modal-overlay .st-zoom-box {
  position: relative; padding: 22px 22px 15px;
  border-radius: 20px; background: var(--bg-card);
  box-shadow: 0 20px 50px rgba(0,0,0,0.35); text-align: center;
}
.modal-overlay .st-zoom-img {
  width: min(280px, 60vw); height: auto; display: block;
  image-rendering: pixelated;
}
.modal-overlay .st-zoom-cap {
  margin-top: 8px; font-size: 12.5px; font-weight: 700; color: var(--text-primary);
}
.modal-overlay .st-zoom-close {
  position: absolute; top: 8px; right: 8px;
  width: 30px; height: 30px;
  display: grid; place-items: center;
  border: none; border-radius: 50%;
  background: var(--bg-muted); color: var(--text-secondary); cursor: pointer;
}
.modal-overlay .st-zoom-close:hover { background: var(--border); color: var(--text-primary); }
.modal-overlay .st-zoom-close:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .modal-overlay .detail-sheet .st-rail { scroll-behavior: auto; }
  .modal-overlay .detail-sheet .st-box,
  .modal-overlay .detail-sheet .st-dot,
  .modal-overlay .detail-sheet .st-seg-btn { transition: none; }
}
`;
