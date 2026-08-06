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
  .modal-overlay .sprite-cell {
    background: white !important;
    border: 2px solid #e5e0d5 !important;
    border-radius: 14px !important;
    padding: 14px 8px 10px !important;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    transition: all 0.2s;
  }
  .modal-overlay .sprite-cell:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
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
  [data-theme="dark"] .modal-overlay .sprite-cell {
    background: #1f1d20 !important;
    border-color: #2c2926 !important;
    color: #efece4 !important;
  }
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
    background: rgba(18, 18, 22, 0.42) !important;
    backdrop-filter: blur(16px) saturate(150%) !important;
    -webkit-backdrop-filter: blur(16px) saturate(150%) !important;
    border: 1px solid rgba(255, 255, 255, 0.22) !important;
    color: #fff !important;
    cursor: pointer !important;
    overflow: hidden !important;
    transition: width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                padding 0.35s, transform 0.2s,
                box-shadow 0.35s, background 0.25s !important;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28) !important;
    z-index: 4 !important;
    white-space: nowrap !important;
  }
  .modal-overlay .catch-fab:hover {
    width: 170px !important;
    padding-right: 18px !important;
    transform: scale(1.04) !important;
    background: rgba(30, 30, 36, 0.55) !important;
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.4) !important;
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
    animation: catch-fab-pulse 2.2s ease-in-out infinite !important;
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
`;
