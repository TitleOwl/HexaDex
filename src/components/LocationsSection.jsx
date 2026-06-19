import { useState, useEffect, useMemo } from "react";

// ─── Region maps & metadata ────────────────────────────────
// Each region has: a key, display name, emoji, map image URL, color theme
const REGIONS = {
  kanto: {
    name: { en: "Kanto", th: "คันโต", ja: "カントー" },
    emoji: "🗾",
    color: "#ef4444",
    mapUrl: "https://archives.bulbagarden.net/media/upload/thumb/0/0e/HGSS_Kanto.png/500px-HGSS_Kanto.png",
    mapAspect: "4/3",
  },
  johto: {
    name: { en: "Johto", th: "โจโตะ", ja: "ジョウト" },
    emoji: "🏯",
    color: "#84cc16",
    mapUrl: "https://archives.bulbagarden.net/media/upload/thumb/a/aa/JohtoMap.png/500px-JohtoMap.png",
    mapAspect: "3/2",
  },
  hoenn: {
    name: { en: "Hoenn", th: "โฮเอ็น", ja: "ホウエン" },
    emoji: "🌊",
    color: "#a31a16",
    mapUrl: "https://archives.bulbagarden.net/media/upload/thumb/2/28/Hoenn_ORAS.png/500px-Hoenn_ORAS.png",
    mapAspect: "4/3",
  },
  sinnoh: {
    name: { en: "Sinnoh", th: "ชินโนห์", ja: "シンオウ" },
    emoji: "🏔️",
    color: "#6366f1",
    mapUrl: "https://archives.bulbagarden.net/media/upload/thumb/0/03/Sinnoh_BDSP_artwork.png/500px-Sinnoh_BDSP_artwork.png",
    mapAspect: "3/4",
  },
  unova: {
    name: { en: "Unova", th: "อูโนวา", ja: "イッシュ" },
    emoji: "🏙️",
    color: "#b5302d",
    mapUrl: "https://archives.bulbagarden.net/media/upload/thumb/3/3b/Unova_B2W2_alt.png/500px-Unova_B2W2_alt.png",
    mapAspect: "3/4",
  },
  kalos: {
    name: { en: "Kalos", th: "คาลอส", ja: "カロス" },
    emoji: "🗼",
    color: "#ec4899",
    mapUrl: "https://archives.bulbagarden.net/media/upload/thumb/d/d4/Kalos_alt.png/500px-Kalos_alt.png",
    mapAspect: "4/3",
  },
  alola: {
    name: { en: "Alola", th: "อโลลา", ja: "アローラ" },
    emoji: "🏝️",
    color: "#f59e0b",
    mapUrl: "https://archives.bulbagarden.net/media/upload/thumb/d/dc/Alola_USUM_artwork.png/500px-Alola_USUM_artwork.png",
    mapAspect: "1/1",
  },
  galar: {
    name: { en: "Galar", th: "กาลาร์", ja: "ガラル" },
    emoji: "🏰",
    color: "#900603",
    mapUrl: "https://archives.bulbagarden.net/media/upload/thumb/3/3a/Galar_artwork.png/500px-Galar_artwork.png",
    mapAspect: "3/4",
  },
  hisui: {
    name: { en: "Hisui", th: "ฮิซุย", ja: "ヒスイ" },
    emoji: "⛩️",
    color: "#14b8a6",
    mapUrl: "https://archives.bulbagarden.net/media/upload/thumb/9/9d/Hisui_artwork.png/500px-Hisui_artwork.png",
    mapAspect: "4/3",
  },
  paldea: {
    name: { en: "Paldea", th: "ปัลเดีย", ja: "パルデア" },
    emoji: "🌅",
    color: "#f97316",
    mapUrl: "https://archives.bulbagarden.net/media/upload/thumb/e/e1/Paldea_artwork.png/500px-Paldea_artwork.png",
    mapAspect: "4/3",
  },
};

// ─── Version → Region mapping ─────────────────────────────
const VERSION_TO_REGION = {
  "red": "kanto", "blue": "kanto", "yellow": "kanto",
  "firered": "kanto", "leafgreen": "kanto",
  "lets-go-pikachu": "kanto", "lets-go-eevee": "kanto",
  "gold": "johto", "silver": "johto", "crystal": "johto",
  "heartgold": "johto", "soulsilver": "johto",
  "ruby": "hoenn", "sapphire": "hoenn", "emerald": "hoenn",
  "omega-ruby": "hoenn", "alpha-sapphire": "hoenn",
  "diamond": "sinnoh", "pearl": "sinnoh", "platinum": "sinnoh",
  "brilliant-diamond": "sinnoh", "shining-pearl": "sinnoh",
  "black": "unova", "white": "unova",
  "black-2": "unova", "white-2": "unova",
  "x": "kalos", "y": "kalos",
  "sun": "alola", "moon": "alola",
  "ultra-sun": "alola", "ultra-moon": "alola",
  "sword": "galar", "shield": "galar",
  "legends-arceus": "hisui",
  "scarlet": "paldea", "violet": "paldea",
};

// ─── Coordinate database (% of map dimensions) ────────────
// Position markers approximately where each location is on the region map.
// Format: { regionKey: { areaName: { x: %, y: % } } }
const LOCATION_COORDS = {
  kanto: {
    "pallet-town":         { x: 22, y: 86 },
    "route-1":             { x: 22, y: 77 },
    "viridian-city":       { x: 22, y: 73 },
    "route-2":             { x: 22, y: 65 },
    "viridian-forest":     { x: 22, y: 58 },
    "pewter-city":         { x: 22, y: 50 },
    "route-3":             { x: 32, y: 48 },
    "mt-moon":             { x: 40, y: 48 },
    "route-4":             { x: 50, y: 48 },
    "cerulean-city":       { x: 60, y: 48 },
    "route-24":            { x: 60, y: 40 },
    "route-25":            { x: 72, y: 38 },
    "route-5":             { x: 60, y: 55 },
    "route-6":             { x: 60, y: 67 },
    "vermilion-city":      { x: 60, y: 73 },
    "route-11":            { x: 70, y: 73 },
    "diglett-cave":        { x: 35, y: 73 },
    "route-9":             { x: 72, y: 48 },
    "route-10":            { x: 78, y: 56 },
    "rock-tunnel":         { x: 78, y: 60 },
    "lavender-town":       { x: 75, y: 65 },
    "route-8":             { x: 65, y: 65 },
    "route-7":             { x: 55, y: 65 },
    "celadon-city":        { x: 48, y: 65 },
    "saffron-city":        { x: 58, y: 60 },
    "route-12":            { x: 78, y: 73 },
    "route-13":            { x: 72, y: 80 },
    "route-14":            { x: 65, y: 82 },
    "route-15":            { x: 60, y: 83 },
    "fuchsia-city":        { x: 55, y: 86 },
    "safari-zone":         { x: 50, y: 84 },
    "route-19":            { x: 55, y: 92 },
    "route-20":            { x: 38, y: 92 },
    "seafoam-islands":     { x: 30, y: 92 },
    "cinnabar-island":     { x: 22, y: 94 },
    "pokemon-mansion":     { x: 22, y: 92 },
    "route-21":            { x: 22, y: 90 },
    "route-22":            { x: 12, y: 70 },
    "route-23":            { x: 8, y: 50 },
    "victory-road":        { x: 5, y: 45 },
    "indigo-plateau":      { x: 5, y: 38 },
    "pokemon-tower":       { x: 75, y: 64 },
    "power-plant":         { x: 80, y: 50 },
    "cerulean-cave":       { x: 62, y: 44 },
  },
  johto: {
    "new-bark-town":       { x: 88, y: 50 },
    "route-29":            { x: 80, y: 50 },
    "cherrygrove-city":    { x: 72, y: 50 },
    "route-30":            { x: 70, y: 42 },
    "route-31":            { x: 65, y: 40 },
    "violet-city":         { x: 60, y: 38 },
    "sprout-tower":        { x: 60, y: 33 },
    "route-32":            { x: 60, y: 48 },
    "union-cave":          { x: 60, y: 55 },
    "route-33":            { x: 53, y: 60 },
    "azalea-town":         { x: 48, y: 60 },
    "ilex-forest":         { x: 42, y: 60 },
    "route-34":            { x: 40, y: 52 },
    "goldenrod-city":      { x: 40, y: 45 },
    "route-35":            { x: 40, y: 38 },
    "national-park":       { x: 43, y: 33 },
    "route-36":            { x: 50, y: 30 },
    "route-37":            { x: 56, y: 25 },
    "ecruteak-city":       { x: 55, y: 22 },
    "burned-tower":        { x: 53, y: 20 },
    "tin-tower":           { x: 57, y: 20 },
    "route-38":            { x: 47, y: 22 },
    "route-39":            { x: 38, y: 22 },
    "olivine-city":        { x: 30, y: 25 },
    "route-40":            { x: 28, y: 35 },
    "whirl-islands":       { x: 22, y: 38 },
    "route-41":            { x: 18, y: 30 },
    "cianwood-city":       { x: 10, y: 25 },
    "route-42":            { x: 60, y: 18 },
    "mt-mortar":           { x: 65, y: 18 },
    "mahogany-town":       { x: 72, y: 18 },
    "lake-of-rage":        { x: 75, y: 12 },
    "route-43":            { x: 73, y: 22 },
    "route-44":            { x: 80, y: 25 },
    "ice-path":            { x: 85, y: 28 },
    "blackthorn-city":     { x: 88, y: 32 },
    "dragons-den":         { x: 90, y: 30 },
    "route-45":            { x: 88, y: 22 },
    "route-46":            { x: 85, y: 45 },
    "dark-cave":           { x: 70, y: 35 },
    "ruins-of-alph":       { x: 58, y: 45 },
    "route-27":            { x: 92, y: 50 },
    "route-28":            { x: 95, y: 40 },
    "mt-silver":           { x: 96, y: 45 },
    "tohjo-falls":         { x: 94, y: 52 },
  },
  hoenn: {
    "littleroot-town":     { x: 18, y: 68 },
    "route-101":           { x: 18, y: 62 },
    "oldale-town":         { x: 18, y: 58 },
    "route-103":           { x: 28, y: 56 },
    "route-102":           { x: 22, y: 58 },
    "petalburg-city":      { x: 14, y: 58 },
    "route-104":           { x: 14, y: 48 },
    "petalburg-woods":     { x: 14, y: 45 },
    "rustboro-city":       { x: 14, y: 38 },
    "route-116":           { x: 22, y: 38 },
    "rusturf-tunnel":      { x: 28, y: 38 },
    "verdanturf-town":     { x: 32, y: 42 },
    "route-117":           { x: 38, y: 42 },
    "mauville-city":       { x: 42, y: 42 },
    "route-110":           { x: 42, y: 50 },
    "trick-house":         { x: 44, y: 52 },
    "slateport-city":      { x: 42, y: 60 },
    "route-109":           { x: 42, y: 68 },
    "route-118":           { x: 50, y: 42 },
    "route-119":           { x: 55, y: 35 },
    "fortree-city":        { x: 60, y: 32 },
    "route-120":           { x: 65, y: 35 },
    "route-121":           { x: 70, y: 38 },
    "safari-zone":         { x: 75, y: 38 },
    "lilycove-city":       { x: 75, y: 45 },
    "route-122":           { x: 75, y: 52 },
    "mt-pyre":             { x: 72, y: 58 },
    "route-123":           { x: 68, y: 42 },
    "route-124":           { x: 82, y: 45 },
    "mossdeep-city":       { x: 88, y: 45 },
    "route-125":           { x: 90, y: 50 },
    "shoal-cave":          { x: 92, y: 38 },
    "route-127":           { x: 88, y: 55 },
    "route-128":           { x: 88, y: 62 },
    "sootopolis-city":     { x: 82, y: 60 },
    "route-126":           { x: 75, y: 60 },
    "route-129":           { x: 82, y: 70 },
    "route-130":           { x: 75, y: 75 },
    "route-131":           { x: 65, y: 75 },
    "pacifidlog-town":     { x: 60, y: 75 },
    "route-132":           { x: 55, y: 75 },
    "route-133":           { x: 50, y: 78 },
    "route-134":           { x: 45, y: 80 },
    "ever-grande-city":    { x: 85, y: 78 },
    "victory-road":        { x: 88, y: 80 },
    "pokemon-league":      { x: 92, y: 82 },
    "meteor-falls":        { x: 22, y: 32 },
    "route-115":           { x: 14, y: 30 },
    "route-105":           { x: 8, y: 50 },
    "route-106":           { x: 5, y: 38 },
    "dewford-town":        { x: 22, y: 72 },
    "route-107":           { x: 28, y: 70 },
    "route-108":           { x: 35, y: 68 },
    "abandoned-ship":      { x: 38, y: 65 },
    "route-111":           { x: 42, y: 30 },
    "desert-ruins":        { x: 42, y: 25 },
    "route-112":           { x: 38, y: 30 },
    "mt-chimney":          { x: 38, y: 25 },
    "fiery-path":          { x: 38, y: 30 },
    "route-113":           { x: 45, y: 25 },
    "fallarbor-town":      { x: 50, y: 25 },
    "route-114":           { x: 45, y: 22 },
    "jagged-pass":         { x: 42, y: 32 },
    "lavaridge-town":      { x: 38, y: 35 },
    "new-mauville":        { x: 45, y: 45 },
    "seafloor-cavern":     { x: 92, y: 65 },
    "sky-pillar":          { x: 60, y: 75 },
    "cave-of-origin":      { x: 82, y: 60 },
  },
};

// ─── Normalize PokeAPI location names to lookup keys ──────
// PokeAPI: "kanto-route-1-area" → "route-1"
//          "viridian-forest-area" → "viridian-forest"
function normalizeLocationName(raw) {
  let name = raw.replace(/-area$/, "");
  // Strip leading region prefix if present
  const regionPrefixes = ["kanto-", "johto-", "hoenn-", "sinnoh-", "unova-",
                          "kalos-", "alola-", "galar-", "hisui-", "paldea-"];
  for (const prefix of regionPrefixes) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length);
      break;
    }
  }
  return name;
}

function prettyAreaName(area) {
  return area.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Version → game color ────────────────────────────────
const VERSION_COLORS = {
  "red": "#ef4444", "blue": "#900603", "yellow": "#facc15",
  "firered": "#dc2626", "leafgreen": "#16a34a",
  "lets-go-pikachu": "#fbbf24", "lets-go-eevee": "#a3826b",
  "gold": "#d4af37", "silver": "#94a3b8", "crystal": "#06b6d4",
  "heartgold": "#fbbf24", "soulsilver": "#cbd5e1",
  "ruby": "#dc2626", "sapphire": "#6e0402", "emerald": "#10b981",
  "omega-ruby": "#dc2626", "alpha-sapphire": "#6e0402",
  "diamond": "#7dd3fc", "pearl": "#f9a8d4", "platinum": "#94a3b8",
  "brilliant-diamond": "#7dd3fc", "shining-pearl": "#f9a8d4",
  "black": "#1e293b", "white": "#e2e8f0",
  "black-2": "#1e293b", "white-2": "#e2e8f0",
  "x": "#900603", "y": "#ef4444",
  "sun": "#f59e0b", "moon": "#6366f1",
  "ultra-sun": "#f59e0b", "ultra-moon": "#6366f1",
  "sword": "#06b6d4", "shield": "#ec4899",
  "legends-arceus": "#14b8a6",
  "scarlet": "#dc2626", "violet": "#b5302d",
};

export default function LocationsSection({ pokemonId, lang, s }) {
  const [locs, setLocs]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState(null);
  const [hoveredArea, setHoveredArea] = useState(null);

  useEffect(() => {
    setLoading(true); setLocs(null);
    fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}/encounters`)
      .then(r => r.json())
      .then(data => { setLocs(data); setLoading(false); })
      .catch(() => { setLocs([]); setLoading(false); });
  }, [pokemonId]);

  // ─── Group encounters by region ─────────────────────────
  const byRegion = useMemo(() => {
    if (!locs?.length) return {};
    const grouped = {};
    locs.forEach(loc => {
      const areaRaw = loc.location_area.name;
      const area = normalizeLocationName(areaRaw);
      // Determine region from any version
      const versionSamples = new Set();
      loc.version_details.forEach(vd => versionSamples.add(vd.version.name));

      // Pick the first region we can identify
      let regionKey = null;
      for (const v of versionSamples) {
        if (VERSION_TO_REGION[v]) {
          regionKey = VERSION_TO_REGION[v];
          break;
        }
      }
      if (!regionKey) regionKey = "unknown";

      if (!grouped[regionKey]) grouped[regionKey] = [];

      // Aggregate version details
      const versions = {};
      loc.version_details.forEach(vd => {
        const vname = vd.version.name;
        let minLv = 99, maxLv = 0;
        const methods = new Set();
        vd.encounter_details.forEach(ed => {
          if (ed.min_level < minLv) minLv = ed.min_level;
          if (ed.max_level > maxLv) maxLv = ed.max_level;
          methods.add(ed.method.name);
        });
        versions[vname] = {
          chance: vd.max_chance, minLv, maxLv,
          methods: [...methods].map(m => m.replace(/-/g, " ")).join(", "),
        };
      });

      // Coordinates (if known)
      const coords = LOCATION_COORDS[regionKey]?.[area] ?? null;

      grouped[regionKey].push({ area, areaRaw, versions, coords });
    });
    return grouped;
  }, [locs]);

  const regionKeys = Object.keys(byRegion);

  // Set initial active region when data arrives
  useEffect(() => {
    if (regionKeys.length > 0 && !activeRegion) {
      setActiveRegion(regionKeys[0]);
    }
  }, [regionKeys.join(","), activeRegion]);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
        <div style={{
          width: 40, height: 40, margin: "0 auto 12px",
          border: "3px solid #e2e8f0",
          borderTopColor: "#06b6d4",
          borderRadius: "50%",
          animation: "loc-spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes loc-spin { to { transform: rotate(360deg); } }`}</style>
        {s.evoLoading}
      </div>
    );
  }

  if (!locs?.length) {
    return (
      <div style={{
        padding: "32px 20px",
        textAlign: "center",
        background: "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
        borderRadius: 19,
        color: "#64748b",
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🗺️</div>
        <div style={{ fontWeight: 600 }}>{s.noLocations}</div>
      </div>
    );
  }

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;
  const activeData = activeRegion ? byRegion[activeRegion] : null;
  const activeRegionInfo = activeRegion ? REGIONS[activeRegion] : null;

  return (
    <div>
      <div className="modal-section-title">{s.locations}</div>

      {/* ─── Region tabs ─── */}
      <div style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        padding: "4px 0 14px",
        marginBottom: 8,
      }}>
        {regionKeys.map(rkey => {
          const info = REGIONS[rkey];
          const isActive = activeRegion === rkey;
          const count = byRegion[rkey].length;
          const name = info ? info.name[lang] ?? info.name.en : t("ไม่ระบุ", "Other");
          const emoji = info?.emoji ?? "📍";
          const color = info?.color ?? "#94a3b8";
          return (
            <button
              key={rkey}
              onClick={() => setActiveRegion(rkey)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: isActive ? `2px solid ${color}` : "2px solid transparent",
                background: isActive
                  ? `linear-gradient(135deg, ${color}22, ${color}44)`
                  : "var(--loc-tab-bg, #f1f5f9)",
                color: isActive ? color : "var(--loc-tab-color, #475569)",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: isActive ? `0 4px 14px ${color}55` : "none",
                letterSpacing: 0.3,
              }}>
              <span style={{ fontSize: 16 }}>{emoji}</span>
              <span>{name}</span>
              <span style={{
                padding: "2px 8px",
                borderRadius: 999,
                background: isActive ? color : "#94a3b8",
                color: "white",
                fontSize: 10,
                fontWeight: 900,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Active region: Map + locations ─── */}
      {activeData && activeRegionInfo && (
        <div style={{
          background: "var(--loc-card-bg, white)",
          borderRadius: 20,
          padding: 16,
          border: "1.5px solid var(--loc-card-border, #e2e8f0)",
          boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
        }}>
          {/* Stylized SVG Map */}
          <div style={{
            position: "relative",
            borderRadius: 17,
            overflow: "hidden",
            marginBottom: 14,
            aspectRatio: "4/3",
            boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.05)",
          }}>
            <RegionMapSVG regionKey={activeRegion} regionInfo={activeRegionInfo} lang={lang} />

            {/* Markers overlay */}
            <div style={{ position: "absolute", inset: 0 }}>
              {activeData.filter(it => it.coords).map((it, i) => {
                const isHovered = hoveredArea === it.area;
                return (
                  <div
                    key={`${it.area}-${i}`}
                    style={{
                      position: "absolute",
                      left: `${it.coords.x}%`,
                      top: `${it.coords.y}%`,
                      transform: "translate(-50%, -50%)",
                      cursor: "pointer",
                      zIndex: isHovered ? 10 : 1,
                    }}
                    onMouseEnter={() => setHoveredArea(it.area)}
                    onMouseLeave={() => setHoveredArea(null)}
                  >
                    {/* Pulsing pin */}
                    <div style={{
                      width: isHovered ? 22 : 14,
                      height: isHovered ? 22 : 14,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, white 0%, white 30%, ${activeRegionInfo.color} 30%, ${activeRegionInfo.color} 100%)`,
                      border: "2.5px solid white",
                      boxShadow: `0 0 0 3px ${activeRegionInfo.color}, 0 3px 10px rgba(0,0,0,0.4)`,
                      transition: "all 0.2s",
                      animation: "loc-pin-pulse 2s ease-in-out infinite",
                    }} />
                    {isHovered && (
                      <div style={{
                        position: "absolute",
                        bottom: "calc(100% + 10px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(15,23,42,0.95)",
                        color: "white",
                        padding: "7px 12px",
                        borderRadius: 11,
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
                        pointerEvents: "none",
                        textTransform: "capitalize",
                      }}>
                        📍 {prettyAreaName(it.area)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <style>{`
              @keyframes loc-pin-pulse {
                0%, 100% { box-shadow: 0 0 0 3px ${activeRegionInfo.color}, 0 0 0 6px ${activeRegionInfo.color}44, 0 3px 10px rgba(0,0,0,0.4); }
                50%      { box-shadow: 0 0 0 3px ${activeRegionInfo.color}, 0 0 0 14px ${activeRegionInfo.color}00, 0 3px 10px rgba(0,0,0,0.4); }
              }
            `}</style>

            {/* Region badge */}
            <div style={{
              position: "absolute",
              top: 12, left: 12,
              background: "rgba(15,23,42,0.85)",
              color: "white",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              backdropFilter: "blur(8px)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}>
              <span style={{ fontSize: 18 }}>{activeRegionInfo.emoji}</span>
              <span>{activeRegionInfo.name[lang] ?? activeRegionInfo.name.en}</span>
            </div>

            {/* Spawn count */}
            <div style={{
              position: "absolute",
              top: 12, right: 12,
              background: activeRegionInfo.color,
              color: "white",
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}>
              <span>📍</span>
              <span>{activeData.filter(it => it.coords).length}/{activeData.length}</span>
            </div>
          </div>

          {/* Encounter list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeData.map((it, idx) => {
              const isHovered = hoveredArea === it.area;
              const hasCoords = !!it.coords;
              return (
                <div
                  key={`${it.area}-${idx}`}
                  onMouseEnter={() => hasCoords && setHoveredArea(it.area)}
                  onMouseLeave={() => setHoveredArea(null)}
                  style={{
                    padding: 12,
                    borderRadius: 15,
                    background: isHovered
                      ? `linear-gradient(135deg, ${activeRegionInfo?.color ?? "#06b6d4"}11, ${activeRegionInfo?.color ?? "#06b6d4"}22)`
                      : "var(--loc-item-bg, #f8fafc)",
                    border: isHovered
                      ? `2px solid ${activeRegionInfo?.color ?? "#06b6d4"}55`
                      : "2px solid transparent",
                    transition: "all 0.2s",
                    cursor: hasCoords ? "pointer" : "default",
                  }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}>
                    {hasCoords && (
                      <div style={{
                        width: 10, height: 10,
                        borderRadius: "50%",
                        background: activeRegionInfo?.color ?? "#06b6d4",
                        flexShrink: 0,
                        boxShadow: `0 0 0 3px ${activeRegionInfo?.color ?? "#06b6d4"}33`,
                      }} />
                    )}
                    {!hasCoords && (
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>📍</span>
                    )}
                    <span style={{
                      fontWeight: 800,
                      fontSize: 14,
                      color: "var(--loc-area-color, #1e293b)",
                      textTransform: "capitalize",
                    }}>
                      {prettyAreaName(it.area)}
                    </span>
                  </div>

                  {/* Version badges */}
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}>
                    {Object.entries(it.versions).map(([vname, vdata]) => (
                      <div key={vname} style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: VERSION_COLORS[vname] ?? "#94a3b8",
                        color: ["white", "yellow", "silver", "shining-pearl", "white-2"].includes(vname)
                          ? "#1e293b" : "white",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0.3,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                      }}>
                        <span style={{ textTransform: "capitalize" }}>
                          {vname.replace(/-/g, " ")}
                        </span>
                        <span style={{ opacity: 0.85 }}>
                          Lv {vdata.minLv}{vdata.minLv !== vdata.maxLv ? `-${vdata.maxLv}` : ""}
                        </span>
                        <span style={{
                          padding: "1px 5px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.3)",
                          fontSize: 9,
                        }}>
                          {vdata.chance}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        :root {
          --loc-tab-bg: #f1f5f9;
          --loc-tab-color: #475569;
          --loc-card-bg: white;
          --loc-card-border: #e2e8f0;
          --loc-item-bg: #f8fafc;
          --loc-area-color: #1e293b;
        }
        [data-theme="dark"] {
          --loc-tab-bg: #2a2627;
          --loc-tab-color: rgba(241,239,233,0.7);
          --loc-card-bg: #1c1b1c;
          --loc-card-border: rgba(255,255,255,0.08);
          --loc-item-bg: #201e1f;
          --loc-area-color: #f1efe9;
        }
      `}</style>
    </div>
  );
}


// ════════════════════════════════════════════════════════════
// RegionMapSVG — Cartoon flat-design region maps
// Style inspired by Pokemon GO Tour map illustrations
// ════════════════════════════════════════════════════════════

// ─── Reusable SVG components ───────────────────────────────
const TreeIcon = ({ x, y, size = 1, light = false }) => (
  <g transform={`translate(${x}, ${y}) scale(${size})`}>
    <rect x="-1" y="2" width="2" height="3" fill="#5a3819" />
    <polygon points="0,-10 -7,3 7,3" fill={light ? "#4f9c2a" : "#2f7820"} />
    <polygon points="0,-7 -5,3 5,3" fill={light ? "#5fa726" : "#3d8e1d"} />
  </g>
);

const Forest = ({ x, y, count = 5 }) => {
  // Cluster of trees, slightly varied positions
  const trees = [];
  for (let i = 0; i < count; i++) {
    const dx = ((i % 3) - 1) * 9;
    const dy = (Math.floor(i / 3)) * 6;
    const s = 0.9 + (i % 2) * 0.2;
    trees.push(<TreeIcon key={i} x={dx} y={dy} size={s} light={i % 3 === 1} />);
  }
  return <g transform={`translate(${x}, ${y})`}>{trees}</g>;
};

const PineForest = ({ x, y, count = 6 }) => {
  // Tall pine triangles in clusters (like Viridian Forest in reference)
  const trees = [];
  for (let i = 0; i < count; i++) {
    const dx = ((i % 4) - 1.5) * 10;
    const dy = (Math.floor(i / 4)) * 14;
    trees.push(
      <g key={i} transform={`translate(${dx}, ${dy})`}>
        <polygon points="0,-18 -8,5 8,5" fill="#3d7028" />
        <polygon points="0,-12 -6,5 6,5" fill="#4f8c2a" />
      </g>
    );
  }
  return <g transform={`translate(${x}, ${y})`}>{trees}</g>;
};

const Mountain = ({ x, y, size = 1, big = false }) => (
  <g transform={`translate(${x}, ${y}) scale(${size})`}>
    {big ? (
      <>
        <polygon points="-20,10 0,-20 20,10" fill="#b06840" />
        <polygon points="-20,10 0,-20 -2,10" fill="#8a4f29" />
        <polygon points="-7,-3 0,-12 7,-3" fill="#fef9eb" />
      </>
    ) : (
      <>
        <polygon points="-12,5 0,-12 12,5" fill="#c4754c" />
        <polygon points="-12,5 0,-12 -1,5" fill="#8a4f29" />
      </>
    )}
  </g>
);

const HillRange = ({ x, y }) => (
  // Brown rounded hills (like in northern Kanto)
  <g transform={`translate(${x}, ${y})`}>
    <ellipse cx="-15" cy="3" rx="14" ry="8" fill="#b06840" />
    <ellipse cx="-15" cy="3" rx="14" ry="8" fill="#a35e36" clipPath="inset(0 50% 0 0)" />
    <ellipse cx="0" cy="0" rx="16" ry="10" fill="#b06840" />
    <ellipse cx="15" cy="3" rx="13" ry="8" fill="#b06840" />
  </g>
);

const PokemonCenter = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    <rect x="-7" y="-1" width="14" height="6" fill="#f5f0e8" stroke="#5a4422" strokeWidth="0.3" />
    <polygon points="-8,-1 8,-1 0,-8" fill="#e54a3e" stroke="#a82d24" strokeWidth="0.3" />
    <text x="0" y="-3" textAnchor="middle" fontSize="5" fontWeight="900" fill="white">P</text>
  </g>
);

const SmallCloud = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity="0.95">
    <ellipse cx="0" cy="0" rx="14" ry="5" fill="white" />
    <ellipse cx="-7" cy="-3" rx="6" ry="5" fill="white" />
    <ellipse cx="6" cy="-3" rx="7" ry="4" fill="white" />
  </g>
);

const Wave = ({ x, y, w = 18 }) => (
  <path
    d={`M ${x} ${y} q ${w/4} -2 ${w/2} 0 t ${w/2} 0`}
    fill="none"
    stroke="white"
    strokeWidth="1.5"
    strokeLinecap="round"
    opacity="0.55"
  />
);

const SandyPath = ({ x, y, w = 30, h = 0 }) => {
  // Dotted yellow path (like Cinnabar→Pallet sea route)
  const dots = [];
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    dots.push(
      <circle key={i}
        cx={x + (w / (steps - 1)) * i}
        cy={y + (h / (steps - 1)) * i}
        r="2" fill="#e8b46a" opacity="0.85" />
    );
  }
  return <g>{dots}</g>;
};

// Generic landmass with shadow effect
const Landmass = ({ d, lightColor = "#a4dc35", darkColor = "#7aba1d" }) => (
  <>
    <path d={d} fill={lightColor} stroke={darkColor} strokeWidth="1.5" />
    {/* Inner shadow simulating depth (right & bottom darker) */}
    <path d={d} fill="none" stroke={darkColor} strokeWidth="3" opacity="0.4"
      style={{ filter: "drop-shadow(2px 2px 0 rgba(0,0,0,0.05))" }} />
  </>
);

// Region label (corner)
const RegionLabel = ({ name }) => (
  <g>
    <text x="380" y="285" textAnchor="end" fontSize="22" fontWeight="900"
      fill="white" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
      {name}
    </text>
  </g>
);

function RegionMapSVG({ regionKey, regionInfo, lang }) {
  const regionName = regionInfo.name[lang] ?? regionInfo.name.en;
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block", background: "#52d1d2" }}
    >
      {/* Wave decorations across the ocean */}
      <g>
        <Wave x={15} y={25} />
        <Wave x={340} y={45} />
        <Wave x={10} y={285} />
        <Wave x={350} y={278} />
        <Wave x={300} y={150} w={14} />
      </g>

      {/* Corner clouds */}
      <SmallCloud x={60} y={20} scale={0.9} />
      <SmallCloud x={345} y={30} scale={0.7} />
      <SmallCloud x={30} y={270} scale={0.7} />

      {/* Region-specific content */}
      {regionKey === "kanto"  && <KantoMap />}
      {regionKey === "johto"  && <JohtoMap />}
      {regionKey === "hoenn"  && <HoennMap />}
      {regionKey === "sinnoh" && <SinnohMap />}
      {regionKey === "unova"  && <UnovaMap />}
      {regionKey === "kalos"  && <KalosMap />}
      {regionKey === "alola"  && <AlolaMap />}
      {regionKey === "galar"  && <GalarMap />}
      {regionKey === "hisui"  && <HisuiMap />}
      {regionKey === "paldea" && <PaldeaMap />}

      {/* Region name label */}
      <RegionLabel name={regionName} />
    </svg>
  );
}

// ─── KANTO MAP ─────────────────────────────────────────────
function KantoMap() {
  return (
    <g>
      {/* Main landmass (lime green) */}
      <Landmass d="
        M 60 30
        Q 50 50 65 90
        L 70 130
        Q 60 170 75 210
        L 85 245
        Q 105 265 145 268
        L 195 270
        Q 235 272 270 268
        L 320 262
        Q 350 250 360 220
        L 365 180
        Q 365 145 355 110
        L 350 75
        Q 335 45 305 35
        L 230 30
        Q 150 25 90 28
        Q 70 26 60 30 Z
      " />

      {/* Cinnabar Island (south peninsula) */}
      <Landmass d="
        M 70 275
        Q 65 290 80 295
        L 100 295
        Q 115 290 110 275
        Q 95 270 70 275 Z
      " />

      {/* Sevii Islands (small bottom-left islands) */}
      <SandyPath x={75} y={278} w={20} h={5} />
      <SandyPath x={85} y={285} w={25} h={3} />

      {/* Brown hills/mountains (top center - Mt. Moon area) */}
      <Mountain x={170} y={72} size={1.3} big />
      <Mountain x={210} y={75} size={1.1} />
      <HillRange x={270} y={75} />

      {/* Pine forest (top-left - Viridian Forest, like in reference) */}
      <PineForest x={85} y={88} count={8} />

      {/* Safari Zone area (center) - small fenced patch */}
      <g transform="translate(225, 130)">
        <rect x="-22" y="-12" width="44" height="30" fill="#7aba1d" stroke="#4f8c2a" strokeWidth="1" />
        <ellipse cx="-5" cy="0" rx="8" ry="5" fill="#52d1d2" opacity="0.8" />
        <circle cx="10" cy="8" r="3" fill="#3d8e1d" />
      </g>

      {/* Pokemon Centers at key cities */}
      <PokemonCenter x={88} y={150} />   {/* Pewter */}
      <PokemonCenter x={240} y={144} />  {/* Cerulean */}
      <PokemonCenter x={192} y={195} />  {/* Celadon */}
      <PokemonCenter x={240} y={219} />  {/* Vermilion */}
      <PokemonCenter x={300} y={195} />  {/* Lavender */}
      <PokemonCenter x={220} y={258} />  {/* Fuchsia */}

      {/* Lake (Cerulean Cave area) */}
      <ellipse cx="280" cy="148" rx="14" ry="8" fill="#52d1d2" stroke="#2f9c9c" strokeWidth="1" />

      {/* Scattered trees */}
      <TreeIcon x={130} y={135} size={0.9} />
      <TreeIcon x={155} y={140} size={1.0} light />
      <TreeIcon x={140} y={185} size={0.9} />
      <TreeIcon x={170} y={205} size={1.0} light />
      <TreeIcon x={195} y={235} size={0.9} />
      <TreeIcon x={170} y={250} size={1.0} light />
      <TreeIcon x={250} y={75} size={0.9} />
      <TreeIcon x={320} y={120} size={1.0} />
      <TreeIcon x={330} y={170} size={0.9} light />
      <TreeIcon x={335} y={230} size={1.0} />
      <TreeIcon x={290} y={255} size={0.9} />

      {/* Power Plant (top-right tower like in reference) */}
      <g transform="translate(345, 95)">
        <rect x="-3" y="0" width="6" height="14" fill="#9ca3af" stroke="#475569" strokeWidth="0.5" />
        <rect x="-5" y="-2" width="10" height="3" fill="#475569" />
        <line x1="-2" y1="-5" x2="-2" y2="-2" stroke="#475569" strokeWidth="0.5" />
        <line x1="2" y1="-5" x2="2" y2="-2" stroke="#475569" strokeWidth="0.5" />
      </g>
    </g>
  );
}

// ─── JOHTO MAP ─────────────────────────────────────────────
function JohtoMap() {
  return (
    <g>
      {/* Main horizontal landmass */}
      <Landmass d="
        M 40 100
        Q 28 130 45 165
        L 80 200
        Q 130 220 195 215
        L 270 210
        Q 320 200 355 175
        L 370 140
        Q 375 105 360 80
        L 330 60
        Q 280 50 220 55
        L 130 60
        Q 80 65 55 80
        Q 38 88 40 100 Z
      " />

      {/* Mountains (east - Mt. Silver area) */}
      <Mountain x={335} y={95} size={1.4} big />

      {/* Brown hills */}
      <HillRange x={120} y={75} />

      {/* Bell Tower (purple tower - Tin Tower) */}
      <g transform="translate(170, 115)">
        <rect x="-3" y="-2" width="6" height="14" fill="#a78bfa" stroke="#900603" strokeWidth="0.5" />
        <polygon points="-5,-2 5,-2 0,-12" fill="#900603" stroke="#5b21b6" strokeWidth="0.5" />
        <rect x="-3" y="2" width="6" height="1" fill="#900603" />
        <rect x="-3" y="6" width="6" height="1" fill="#900603" />
      </g>

      {/* Lake of Rage */}
      <ellipse cx="295" cy="105" rx="12" ry="7" fill="#52d1d2" stroke="#2f9c9c" strokeWidth="1" />

      {/* National Park (Ilex Forest area) */}
      <g transform="translate(140, 150)">
        <rect x="-18" y="-10" width="36" height="22" fill="#7aba1d" stroke="#4f8c2a" strokeWidth="1" />
      </g>

      {/* Pine forests (Ilex) */}
      <PineForest x={140} y={148} count={6} />

      {/* Pokemon Centers */}
      <PokemonCenter x={240} y={150} />   {/* Goldenrod */}
      <PokemonCenter x={155} y={123} />   {/* Violet */}
      <PokemonCenter x={290} y={147} />   {/* Mahogany */}
      <PokemonCenter x={350} y={130} />   {/* Blackthorn */}
      <PokemonCenter x={120} y={150} />   {/* Azalea */}
      <PokemonCenter x={75} y={130} />    {/* Olivine */}

      {/* Trees scattered */}
      <TreeIcon x={90} y={110} size={0.9} light />
      <TreeIcon x={210} y={90} size={0.9} />
      <TreeIcon x={250} y={185} size={1.0} light />
      <TreeIcon x={310} y={180} size={0.9} />
      <TreeIcon x={195} y={180} size={0.9} light />
      <TreeIcon x={60} y={155} size={0.9} />
      <TreeIcon x={280} y={75} size={1.0} />
    </g>
  );
}

// ─── HOENN MAP ─────────────────────────────────────────────
function HoennMap() {
  return (
    <g>
      {/* Main landmass (wide with islands) */}
      <Landmass d="
        M 30 130
        Q 22 165 50 200
        L 90 225
        Q 140 235 200 225
        L 280 220
        Q 330 205 355 175
        L 365 140
        Q 358 110 325 100
        L 250 88
        Q 180 88 130 100
        L 70 110
        Q 35 115 30 130 Z
      " />

      {/* Northern landmass */}
      <Landmass d="
        M 130 50
        Q 110 70 130 88
        L 170 92
        Q 215 92 240 80
        L 248 60
        Q 235 42 215 45
        L 175 45
        Q 145 45 130 50 Z
      " />

      {/* Southern islands */}
      <Landmass d="M 195 255 Q 188 270 210 272 L 240 270 Q 252 263 245 252 Q 220 248 195 255 Z" />
      <Landmass d="M 285 252 Q 280 263 295 265 L 315 262 Q 322 255 318 248 Q 300 246 285 252 Z" />
      <Landmass d="M 145 255 Q 140 270 165 272 L 185 265 Q 180 252 165 252 Q 152 251 145 255 Z" />

      {/* Volcano (Mt. Chimney) */}
      <g transform="translate(190, 132)">
        <polygon points="-22,15 0,-22 22,15" fill="#b06840" stroke="#8a4f29" strokeWidth="1" />
        <polygon points="-22,15 0,-22 -2,15" fill="#8a4f29" />
        <ellipse cx="0" cy="-22" rx="7" ry="3" fill="#dc2626" />
        <circle cx="-3" cy="-30" r="3" fill="#94a3b8" opacity="0.6" />
        <circle cx="5" cy="-35" r="4" fill="#94a3b8" opacity="0.5" />
        <circle cx="0" cy="-43" r="5" fill="#94a3b8" opacity="0.4" />
      </g>

      {/* Pokemon Centers */}
      <PokemonCenter x={170} y={185} />  {/* Mauville */}
      <PokemonCenter x={170} y={70} />   {/* Rustboro */}
      <PokemonCenter x={300} y={180} />  {/* Lilycove */}
      <PokemonCenter x={170} y={225} />  {/* Slateport */}

      {/* Forest (Petalburg Woods) */}
      <PineForest x={90} y={170} count={5} />

      {/* Trees scattered */}
      <TreeIcon x={70} y={195} size={0.9} />
      <TreeIcon x={140} y={195} size={1.0} light />
      <TreeIcon x={240} y={170} size={0.9} />
      <TreeIcon x={290} y={140} size={1.0} light />
      <TreeIcon x={330} y={160} size={0.9} />
      <TreeIcon x={155} y={75} size={0.9} light />
      <TreeIcon x={220} y={70} size={0.9} />
      <TreeIcon x={130} y={210} size={1.0} light />
    </g>
  );
}

// ─── SINNOH MAP ────────────────────────────────────────────
function SinnohMap() {
  return (
    <g>
      {/* Main landmass (vertical with central mountain) */}
      <Landmass d="
        M 100 35
        Q 78 60 88 100
        L 88 160
        Q 100 200 130 230
        L 175 262
        Q 225 270 270 252
        L 310 222
        Q 332 182 322 140
        L 312 90
        Q 290 50 250 38
        L 180 30
        Q 130 28 100 35 Z
      " />

      {/* Mt. Coronet (huge central mountain dividing east/west) */}
      <g transform="translate(205, 120)">
        <polygon points="-50,55 0,-65 50,55" fill="#b06840" stroke="#8a4f29" strokeWidth="1" />
        <polygon points="-50,55 0,-65 -3,55" fill="#8a4f29" />
        <polygon points="-15,-10 0,-30 15,-10" fill="#fef9eb" />
      </g>

      {/* Snow at top (Snowpoint area) */}
      <ellipse cx="200" cy="50" rx="35" ry="6" fill="white" opacity="0.85" />

      {/* Three sacred lakes */}
      <ellipse cx="135" cy="130" rx="10" ry="6" fill="#52d1d2" stroke="#2f9c9c" strokeWidth="1" />
      <ellipse cx="275" cy="130" rx="10" ry="6" fill="#52d1d2" stroke="#2f9c9c" strokeWidth="1" />
      <ellipse cx="205" cy="225" rx="12" ry="7" fill="#52d1d2" stroke="#2f9c9c" strokeWidth="1" />

      {/* Pokemon Centers */}
      <PokemonCenter x={125} y={170} />  {/* Eterna */}
      <PokemonCenter x={285} y={170} />  {/* Hearthome */}
      <PokemonCenter x={155} y={235} />  {/* Jubilife */}
      <PokemonCenter x={270} y={215} />  {/* Veilstone */}
      <PokemonCenter x={125} y={90} />   {/* Snowpoint */}

      {/* Forests */}
      <PineForest x={140} y={195} count={5} />
      <PineForest x={285} y={195} count={5} />

      {/* Trees */}
      <TreeIcon x={110} y={70} size={0.9} />
      <TreeIcon x={285} y={70} size={0.9} light />
      <TreeIcon x={150} y={240} size={1.0} />
      <TreeIcon x={260} y={245} size={0.9} light />
    </g>
  );
}

// ─── UNOVA MAP ─────────────────────────────────────────────
function UnovaMap() {
  return (
    <g>
      {/* Northern landmass */}
      <Landmass d="
        M 75 25
        Q 60 50 70 80
        L 78 105
        Q 105 122 152 122
        L 220 120
        Q 280 120 322 100
        L 340 70
        Q 332 40 305 32
        L 245 22
        Q 175 20 130 22
        Q 90 22 75 25 Z
      " />

      {/* Southern landmass */}
      <Landmass d="
        M 60 175
        Q 50 200 70 230
        L 110 255
        Q 175 270 235 258
        L 285 245
        Q 312 220 320 195
        L 312 175
        Q 285 158 245 162
        L 175 165
        Q 110 162 80 168
        Q 65 168 60 175 Z
      " />

      {/* Castelia skyline */}
      <g transform="translate(200, 75)">
        <rect x="-12" y="-3" width="5" height="18" fill="#475569" />
        <rect x="-5" y="-12" width="5" height="27" fill="#475569" />
        <rect x="3" y="-7" width="5" height="22" fill="#475569" />
        <rect x="11" y="-15" width="5" height="30" fill="#475569" />
        <rect x="-12" y="-3" width="5" height="2" fill="#fef3c7" />
        <rect x="-5" y="-12" width="5" height="2" fill="#fef3c7" />
        <rect x="3" y="-7" width="5" height="2" fill="#fef3c7" />
        <rect x="11" y="-15" width="5" height="2" fill="#fef3c7" />
      </g>

      {/* River connecting north-south */}
      <path d="M 195 122 Q 205 145 200 175" stroke="#52d1d2" strokeWidth="6" fill="none" strokeLinecap="round" />

      {/* Mountains */}
      <Mountain x={105} y={75} size={1.0} />
      <Mountain x={305} y={210} size={1.1} big />

      {/* Pokemon Centers */}
      <PokemonCenter x={110} y={95} />
      <PokemonCenter x={285} y={85} />
      <PokemonCenter x={150} y={225} />
      <PokemonCenter x={250} y={215} />

      {/* Trees */}
      <TreeIcon x={130} y={55} size={0.9} />
      <TreeIcon x={265} y={55} size={0.9} light />
      <TreeIcon x={140} y={195} size={1.0} />
      <TreeIcon x={250} y={195} size={0.9} light />
      <TreeIcon x={170} y={250} size={0.9} />
      <TreeIcon x={220} y={245} size={1.0} light />
    </g>
  );
}

// ─── KALOS MAP ─────────────────────────────────────────────
function KalosMap() {
  return (
    <g>
      {/* Star-shaped landmass */}
      <Landmass d="
        M 200 25
        L 230 100
        L 320 80
        L 270 145
        L 340 200
        L 250 198
        L 240 270
        L 200 220
        L 160 270
        L 150 198
        L 60 200
        L 130 145
        L 80 80
        L 170 100 Z
      " />

      {/* Lumiose Tower (Eiffel-like, center) */}
      <g transform="translate(200, 155)">
        <polygon points="-8,15 8,15 4,-15 -4,-15" fill="#a78bfa" stroke="#900603" strokeWidth="0.8" />
        <line x1="0" y1="-15" x2="0" y2="-30" stroke="#900603" strokeWidth="2" />
        <circle cx="0" cy="-30" r="2" fill="#fbbf24" />
        {/* Crossbeams */}
        <line x1="-6" y1="0" x2="6" y2="0" stroke="#900603" strokeWidth="0.5" />
        <line x1="-7" y1="8" x2="7" y2="8" stroke="#900603" strokeWidth="0.5" />
      </g>

      {/* Mountain (north - Mt. Chamber) */}
      <Mountain x={200} y={60} size={1.0} />

      {/* Pokemon Centers (on star arms) */}
      <PokemonCenter x={155} y={120} />
      <PokemonCenter x={250} y={120} />
      <PokemonCenter x={155} y={210} />
      <PokemonCenter x={250} y={210} />
      <PokemonCenter x={200} y={235} />

      {/* Trees on arms */}
      <TreeIcon x={270} y={100} size={0.9} light />
      <TreeIcon x={130} y={100} size={0.9} />
      <TreeIcon x={285} y={185} size={1.0} />
      <TreeIcon x={120} y={185} size={1.0} light />
      <TreeIcon x={215} y={245} size={0.9} />
      <TreeIcon x={185} y={245} size={0.9} light />
      <TreeIcon x={195} y={130} size={0.8} />
      <TreeIcon x={205} y={185} size={0.8} light />
    </g>
  );
}

// ─── ALOLA MAP ─────────────────────────────────────────────
function AlolaMap() {
  return (
    <g>
      {/* Sun decoration top-left */}
      <circle cx="50" cy="50" r="18" fill="#fbbf24" />
      <g stroke="#fbbf24" strokeWidth="2.5" opacity="0.8">
        <line x1="50" y1="20" x2="50" y2="28" />
        <line x1="50" y1="72" x2="50" y2="80" />
        <line x1="20" y1="50" x2="28" y2="50" />
        <line x1="72" y1="50" x2="80" y2="50" />
        <line x1="29" y1="29" x2="34" y2="34" />
        <line x1="66" y1="66" x2="71" y2="71" />
        <line x1="71" y1="29" x2="66" y2="34" />
        <line x1="29" y1="71" x2="34" y2="66" />
      </g>

      {/* Melemele Island (top-left) */}
      <Landmass d="M 100 95 Q 80 115 100 135 L 130 145 Q 160 138 165 110 L 150 88 Q 120 80 100 95 Z" />

      {/* Akala Island (center-left, biggest) */}
      <Landmass d="M 140 170 Q 110 190 130 220 L 170 240 Q 210 240 225 220 L 230 188 Q 218 160 185 155 L 155 158 Q 140 165 140 170 Z" />

      {/* Ula'ula Island (center-right) */}
      <Landmass d="M 240 95 Q 220 125 230 165 L 250 205 Q 290 220 330 200 L 360 175 Q 372 135 358 105 L 328 80 Q 290 70 260 80 Q 245 85 240 95 Z" />

      {/* Poni Island (bottom-right) */}
      <Landmass d="M 255 235 Q 245 255 270 270 L 300 275 Q 325 268 330 248 L 320 228 Q 295 222 275 230 Q 257 230 255 235 Z" />

      {/* Mt. Lanakila (snowy) */}
      <g transform="translate(290, 110)">
        <polygon points="-18,12 0,-15 18,12" fill="#fef9eb" stroke="#94a3b8" strokeWidth="1" />
        <polygon points="-18,12 0,-15 -2,12" fill="#cbd5e1" />
      </g>

      {/* Palm trees on each island */}
      <g transform="translate(115, 115)">
        <line x1="0" y1="0" x2="0" y2="-8" stroke="#5a3819" strokeWidth="2" />
        <ellipse cx="-4" cy="-10" rx="5" ry="3" fill="#3d8e1d" />
        <ellipse cx="4" cy="-10" rx="5" ry="3" fill="#4f9c2a" />
      </g>
      <g transform="translate(180, 200)">
        <line x1="0" y1="0" x2="0" y2="-8" stroke="#5a3819" strokeWidth="2" />
        <ellipse cx="-4" cy="-10" rx="5" ry="3" fill="#3d8e1d" />
        <ellipse cx="4" cy="-10" rx="5" ry="3" fill="#4f9c2a" />
      </g>
      <g transform="translate(290, 175)">
        <line x1="0" y1="0" x2="0" y2="-8" stroke="#5a3819" strokeWidth="2" />
        <ellipse cx="-4" cy="-10" rx="5" ry="3" fill="#3d8e1d" />
        <ellipse cx="4" cy="-10" rx="5" ry="3" fill="#4f9c2a" />
      </g>
      <g transform="translate(290, 252)">
        <line x1="0" y1="0" x2="0" y2="-8" stroke="#5a3819" strokeWidth="2" />
        <ellipse cx="-4" cy="-10" rx="5" ry="3" fill="#3d8e1d" />
        <ellipse cx="4" cy="-10" rx="5" ry="3" fill="#4f9c2a" />
      </g>

      {/* Pokemon Centers */}
      <PokemonCenter x={125} y={115} />
      <PokemonCenter x={180} y={195} />
      <PokemonCenter x={285} y={140} />
      <PokemonCenter x={295} y={250} />

      {/* Sandy paths between islands */}
      <SandyPath x={165} y={150} w={20} h={20} />
      <SandyPath x={220} y={180} w={25} h={5} />
      <SandyPath x={240} y={225} w={20} h={15} />
    </g>
  );
}

// ─── GALAR MAP ─────────────────────────────────────────────
function GalarMap() {
  return (
    <g>
      {/* Vertical UK-shaped landmass */}
      <Landmass d="
        M 145 30
        Q 115 50 125 85
        L 142 115
        Q 125 138 135 165
        L 158 205
        Q 145 235 165 262
        L 200 278
        Q 245 272 258 248
        L 250 218
        Q 268 192 258 165
        L 240 135
        Q 258 110 250 80
        L 232 50
        Q 210 28 180 28
        Q 158 25 145 30 Z
      " />

      {/* Castle (Wyndon - top) */}
      <g transform="translate(195, 55)">
        <rect x="-10" y="-5" width="20" height="14" fill="#a78bfa" stroke="#900603" strokeWidth="0.8" />
        <polygon points="-12,-5 -6,-5 -6,-12 -10,-12 Z" fill="#900603" />
        <polygon points="-3,-5 3,-5 3,-15 -3,-15 Z" fill="#900603" />
        <polygon points="6,-5 12,-5 12,-12 8,-12 Z" fill="#900603" />
        <rect x="-2" y="3" width="3" height="5" fill="#fef3c7" />
      </g>

      {/* Mountain (wild area - center) */}
      <Mountain x={195} y={155} size={1.3} big />

      {/* Pokemon Centers */}
      <PokemonCenter x={170} y={100} />
      <PokemonCenter x={215} y={130} />
      <PokemonCenter x={195} y={195} />
      <PokemonCenter x={215} y={240} />

      {/* Forest */}
      <PineForest x={195} y={220} count={5} />

      {/* Snow at top */}
      <ellipse cx="170" cy="42" rx="3" ry="1.5" fill="white" />
      <ellipse cx="200" cy="38" rx="3" ry="1.5" fill="white" />
      <ellipse cx="225" cy="44" rx="3" ry="1.5" fill="white" />

      {/* Trees */}
      <TreeIcon x={155} y={85} size={0.9} />
      <TreeIcon x={235} y={85} size={0.9} light />
      <TreeIcon x={160} y={185} size={1.0} />
      <TreeIcon x={235} y={180} size={1.0} light />
      <TreeIcon x={170} y={255} size={0.9} />
      <TreeIcon x={230} y={255} size={0.9} light />
    </g>
  );
}

// ─── HISUI MAP (wild Sinnoh) ──────────────────────────────
function HisuiMap() {
  return (
    <g>
      {/* Sun decoration */}
      <circle cx="345" cy="55" r="14" fill="#fbbf24" opacity="0.85" />
      <g stroke="#fbbf24" strokeWidth="2" opacity="0.6">
        <line x1="345" y1="30" x2="345" y2="36" />
        <line x1="320" y1="55" x2="326" y2="55" />
      </g>

      {/* Main landmass */}
      <Landmass d="
        M 75 30
        Q 55 60 65 100
        L 75 160
        Q 90 210 135 240
        L 195 265
        Q 250 270 305 240
        L 340 200
        Q 350 140 330 90
        L 310 50
        Q 270 30 220 30
        L 135 28
        Q 95 28 75 30 Z
      " />

      {/* Big Mt. Coronet */}
      <g transform="translate(205, 130)">
        <polygon points="-50,50 0,-50 50,50" fill="#b06840" stroke="#8a4f29" strokeWidth="1" />
        <polygon points="-50,50 0,-50 -3,50" fill="#8a4f29" />
        <polygon points="-15,-5 0,-25 15,-5" fill="#fef9eb" />
      </g>

      {/* Lakes (Hisui's untamed nature) */}
      <ellipse cx="170" cy="240" rx="14" ry="7" fill="#52d1d2" stroke="#2f9c9c" strokeWidth="1" />
      <ellipse cx="290" cy="195" rx="10" ry="6" fill="#52d1d2" stroke="#2f9c9c" strokeWidth="1" />

      {/* Pine forests (wild/dense) */}
      <PineForest x={105} y={180} count={7} />
      <PineForest x={300} y={170} count={6} />
      <PineForest x={210} y={230} count={5} />

      {/* Pokemon Centers (Jubilife Village mainly) */}
      <PokemonCenter x={155} y={220} />
      <PokemonCenter x={280} y={155} />

      {/* Trees */}
      <TreeIcon x={130} y={75} size={0.9} />
      <TreeIcon x={280} y={75} size={0.9} light />
      <TreeIcon x={100} y={150} size={1.0} />
      <TreeIcon x={310} y={130} size={1.0} light />
      <TreeIcon x={250} y={250} size={0.9} />
    </g>
  );
}

// ─── PALDEA MAP ────────────────────────────────────────────
function PaldeaMap() {
  return (
    <g>
      {/* Sun decoration */}
      <circle cx="345" cy="55" r="15" fill="#fbbf24" opacity="0.9" />
      <g stroke="#fbbf24" strokeWidth="2" opacity="0.7">
        <line x1="345" y1="30" x2="345" y2="36" />
        <line x1="320" y1="55" x2="326" y2="55" />
        <line x1="364" y1="55" x2="370" y2="55" />
      </g>

      {/* Main round landmass */}
      <Landmass d="
        M 100 50
        Q 55 90 70 145
        L 80 195
        Q 110 245 175 265
        L 230 268
        Q 290 250 320 215
        L 340 170
        Q 348 115 320 80
        L 290 52
        Q 245 30 195 32
        Q 130 32 100 50 Z
      " />

      {/* Giant central volcano (Area Zero crater - largest mountain) */}
      <g transform="translate(205, 135)">
        <polygon points="-55,55 0,-50 55,55" fill="#b06840" stroke="#8a4f29" strokeWidth="1" />
        <polygon points="-55,55 0,-50 -3,55" fill="#8a4f29" />
        <polygon points="-25,5 0,-25 25,5" fill="#71717a" />
        <polygon points="-25,5 0,-25 -3,5" fill="#52525b" />
        {/* Area Zero hole at top */}
        <ellipse cx="0" cy="-48" rx="8" ry="3" fill="#1e1b4b" opacity="0.7" />
      </g>

      {/* Cacti (desert vibe) */}
      <g transform="translate(125, 105)">
        <rect x="-1.5" y="-12" width="3" height="14" fill="#3d8e1d" />
        <rect x="-6" y="-7" width="3" height="6" fill="#3d8e1d" />
        <rect x="3" y="-9" width="3" height="6" fill="#3d8e1d" />
      </g>
      <g transform="translate(295, 110)">
        <rect x="-1.5" y="-12" width="3" height="14" fill="#3d8e1d" />
        <rect x="-6" y="-7" width="3" height="6" fill="#3d8e1d" />
      </g>
      <g transform="translate(110, 235)">
        <rect x="-1.5" y="-10" width="3" height="12" fill="#3d8e1d" />
        <rect x="-5" y="-6" width="3" height="5" fill="#3d8e1d" />
      </g>

      {/* Pokemon Centers */}
      <PokemonCenter x={140} y={205} />
      <PokemonCenter x={275} y={205} />
      <PokemonCenter x={205} y={245} />

      {/* Forest patch */}
      <Forest x={135} y={185} count={4} />
      <Forest x={285} y={175} count={4} />

      {/* Trees */}
      <TreeIcon x={170} y={230} size={1.0} light />
      <TreeIcon x={245} y={230} size={1.0} />
      <TreeIcon x={300} y={150} size={0.9} light />
    </g>
  );
}