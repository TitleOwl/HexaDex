import { useState, useEffect, useRef, useCallback } from "react";

// ─── Calm Town/Route Music from archive.org ──────────────────
// Pokemon Showdown's battle music moved entirely to CatchBattleMusic.
// MusicPlayer now plays peaceful town/route themes for chill browsing.

const ARCHIVE = "https://archive.org/download";

const REGION_MUSIC = {
  1: [ // Kanto - pkmn-rgby-soundtrack
    { name: "Pallet Town",      url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/03%20-%20Pallet%20Town.mp3` },
    { name: "Route 1",          url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/11%20-%20Route%201.mp3` },
    { name: "Pewter City",      url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/16%20-%20Pewter%20City.mp3` },
    { name: "Viridian Forest",  url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/19%20-%20Viridian%20Forest.mp3` },
    { name: "Mt. Moon",         url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/26%20-%20Mt.%20Moon.mp3` },
    { name: "Cerulean City",    url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/30%20-%20Cerulean%20City.mp3` },
    { name: "Vermilion City",   url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/35%20-%20Vermilion%20City.mp3` },
    { name: "Lavender Town",    url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/39%20-%20Lavender%20Town.mp3` },
    { name: "Celadon City",     url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/41%20-%20Celadon%20City.mp3` },
    { name: "Cycling",          url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%202/04%20-%20Cycling.mp3` },
    { name: "Pokemon Center",   url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/15%20-%20Pokemon%20Center.mp3` },
    { name: "Route 24",         url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/27%20-%20Route%2024.mp3` },
  ],
  2: [ // Johto - pkmn-gsc-soundtrack
    { name: "New Bark Town",    url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/03%20-%20New%20Bark%20Town.mp3` },
    { name: "Route 29",         url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/06%20-%20Route%2029.mp3` },
    { name: "Cherrygrove City", url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/07%20-%20Cherrygrove%20City.mp3` },
    { name: "Violet City",      url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/12%20-%20Violet%20City.mp3` },
    { name: "Azalea Town",      url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/17%20-%20Azalea%20Town.mp3` },
    { name: "Goldenrod City",   url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/22%20-%20Goldenrod%20City.mp3` },
    { name: "Ecruteak City",    url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/28%20-%20Ecruteak%20City.mp3` },
    { name: "Bell Tower",       url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/29%20-%20Tin%20Tower.mp3` },
    { name: "National Park",    url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/25%20-%20National%20Park.mp3` },
    { name: "Pallet Town",      url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/03%20-%20Pallet%20Town.mp3` },
  ],
  3: [ // Hoenn - pkmn-oras-ost
    { name: "Littleroot Town",  url: `${ARCHIVE}/pkmn-oras-ost/05%20Littleroot%20Town.mp3` },
    { name: "Route 101",        url: `${ARCHIVE}/pkmn-oras-ost/10%20Route%20101.mp3` },
    { name: "Oldale Town",      url: `${ARCHIVE}/pkmn-oras-ost/11%20Oldale%20Town.mp3` },
    { name: "Petalburg City",   url: `${ARCHIVE}/pkmn-oras-ost/22%20Petalburg%20City.mp3` },
    { name: "Rustboro City",    url: `${ARCHIVE}/pkmn-oras-ost/26%20Rustboro%20City.mp3` },
    { name: "Dewford Town",     url: `${ARCHIVE}/pkmn-oras-ost/30%20Dewford%20Town.mp3` },
    { name: "Slateport City",   url: `${ARCHIVE}/pkmn-oras-ost/35%20Slateport%20City.mp3` },
    { name: "Mauville City",    url: `${ARCHIVE}/pkmn-oras-ost/38%20Mauville%20City.mp3` },
    { name: "Lavaridge Town",   url: `${ARCHIVE}/pkmn-oras-ost/43%20Lavaridge%20Town.mp3` },
    { name: "Sootopolis City",  url: `${ARCHIVE}/pkmn-oras-ost/56%20Sootopolis%20City.mp3` },
  ],
  4: [ // Sinnoh - pkmn-dppt-soundtrack
    { name: "Twinleaf Town (Day)",  url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/05%20-%20Twinleaf%20Town%20%28Day%29.mp3` },
    { name: "Route 201 (Day)",      url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/07%20-%20Route%20201%20%28Day%29.mp3` },
    { name: "Lake",                 url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/08%20-%20Lake.mp3` },
    { name: "Sandgem Town (Day)",   url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/14%20-%20Sandgem%20Town%20%28Day%29.mp3` },
    { name: "Jubilife City (Day)",  url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/19%20-%20Jubilife%20City%20%28Day%29.mp3` },
    { name: "Oreburgh City (Day)",  url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/24%20-%20Oreburgh%20City%20%28Day%29.mp3` },
    { name: "Eterna City (Day)",    url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/31%20-%20Eterna%20City%20%28Day%29.mp3` },
    { name: "Hearthome City (Day)", url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/38%20-%20Hearthome%20City%20%28Day%29.mp3` },
    { name: "Snowpoint City",       url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%202/12%20-%20Snowpoint%20City.mp3` },
  ],
  5: [ // Unova - pkmn-black-white-soundtrack
    { name: "Nuvema Town",      url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/07%20-%20Nuvema%20Town.mp3` },
    { name: "Route 1",          url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/14%20-%20Route%201.mp3` },
    { name: "Accumula Town",    url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/18%20-%20Accumula%20Town.mp3` },
    { name: "Striaton City",    url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/20%20-%20Striaton%20City.mp3` },
    { name: "Nacrene City",     url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/26%20-%20Nacrene%20City.mp3` },
    { name: "Castelia City",    url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/31%20-%20Castelia%20City.mp3` },
    { name: "Nimbasa City",     url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/35%20-%20Nimbasa%20City.mp3` },
    { name: "Driftveil City",   url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%202/05%20-%20Driftveil%20City.mp3` },
    { name: "Mistralton City",  url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%202/12%20-%20Mistralton%20City.mp3` },
  ],
  6: [ // Kalos - pkmn-xy-soundtrack
    { name: "Vaniville Town",   url: `${ARCHIVE}/pkmn-xy-soundtrack/03%20Vaniville%20Town.mp3` },
    { name: "Route 1",          url: `${ARCHIVE}/pkmn-xy-soundtrack/05%20Route%201.mp3` },
    { name: "Aquacorde Town",   url: `${ARCHIVE}/pkmn-xy-soundtrack/07%20Aquacorde%20Town.mp3` },
    { name: "Santalune City",   url: `${ARCHIVE}/pkmn-xy-soundtrack/12%20Santalune%20City.mp3` },
    { name: "Lumiose City",     url: `${ARCHIVE}/pkmn-xy-soundtrack/24%20Lumiose%20City.mp3` },
    { name: "Cyllage City",     url: `${ARCHIVE}/pkmn-xy-soundtrack/30%20Cyllage%20City.mp3` },
    { name: "Shalour City",     url: `${ARCHIVE}/pkmn-xy-soundtrack/36%20Shalour%20City.mp3` },
    { name: "Coumarine City",   url: `${ARCHIVE}/pkmn-xy-soundtrack/41%20Coumarine%20City.mp3` },
  ],
  7: [ // Alola - pkmn-sun-moon-ost
    { name: "Alola Region",     url: `${ARCHIVE}/pkmn-sun-moon-ost/03%20Alola%20Region.mp3` },
    { name: "Route 1",          url: `${ARCHIVE}/pkmn-sun-moon-ost/08%20Route%201.mp3` },
    { name: "Iki Town (Day)",   url: `${ARCHIVE}/pkmn-sun-moon-ost/09%20Iki%20Town%20%28Day%29.mp3` },
    { name: "Iki Town (Night)", url: `${ARCHIVE}/pkmn-sun-moon-ost/10%20Iki%20Town%20%28Night%29.mp3` },
    { name: "Hau'oli City",     url: `${ARCHIVE}/pkmn-sun-moon-ost/13%20Hau%27oli%20City.mp3` },
    { name: "Heahea City",      url: `${ARCHIVE}/pkmn-sun-moon-ost/19%20Heahea%20City.mp3` },
    { name: "Paniola Town",     url: `${ARCHIVE}/pkmn-sun-moon-ost/22%20Paniola%20Town.mp3` },
    { name: "Konikoni City",    url: `${ARCHIVE}/pkmn-sun-moon-ost/27%20Konikoni%20City.mp3` },
    { name: "Malie City (Day)", url: `${ARCHIVE}/pkmn-sun-moon-ost/35%20Malie%20City%20%28Day%29.mp3` },
    { name: "Seafolk Village",  url: `${ARCHIVE}/pkmn-sun-moon-ost/43%20Seafolk%20Village.mp3` },
  ],
};

// All known-working tracks for "All Regions" mode + Gen 8/9 fallback
const ALL_TRACKS = [
  // Kanto (verified)
  { name: "Pallet Town",    url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/03%20-%20Pallet%20Town.mp3`, region: 1 },
  { name: "Route 1",        url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/11%20-%20Route%201.mp3`, region: 1 },
  { name: "Lavender Town",  url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/39%20-%20Lavender%20Town.mp3`, region: 1 },
  { name: "Celadon City",   url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/41%20-%20Celadon%20City.mp3`, region: 1 },
  // Sinnoh (verified)
  { name: "Twinleaf Town",  url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/05%20-%20Twinleaf%20Town%20%28Day%29.mp3`, region: 4 },
  { name: "Route 201",      url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/07%20-%20Route%20201%20%28Day%29.mp3`, region: 4 },
  { name: "Lake (Sinnoh)",  url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/08%20-%20Lake.mp3`, region: 4 },
];

const REGION_NAMES = {
  1: { en: "Kanto",  th: "คันโต",   ja: "カントー" },
  2: { en: "Johto",  th: "โจโต้",    ja: "ジョウト" },
  3: { en: "Hoenn",  th: "โฮเอน",  ja: "ホウエン" },
  4: { en: "Sinnoh", th: "ซินโน",   ja: "シンオウ" },
  5: { en: "Unova",  th: "อูโนวา",  ja: "イッシュ" },
  6: { en: "Kalos",  th: "คาลอส",  ja: "カロス" },
  7: { en: "Alola",  th: "อโลล่า",   ja: "アローラ" },
  8: { en: "Galar",  th: "กาลาร์",   ja: "ガラル" },
  9: { en: "Paldea", th: "ปัลเดีย",   ja: "パルデア" },
};

function pickRandom(pool, excludeUrl) {
  const filtered = pool.filter(t => t.url !== excludeUrl);
  if (filtered.length === 0) return pool[Math.floor(Math.random() * pool.length)];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export default function MusicPlayer({ currentGen, lang = "en" }) {
  const audioRef = useRef(null);
  const userInteractedRef = useRef(false);
  const wasPlayingBeforeCatchRef = useRef(false);
  const skipCountRef = useRef(0); // prevent infinite skip loops

  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [volume, setVolume] = useState(() => {
    try { return parseFloat(localStorage.getItem("pkdx_music_volume") ?? "0.3"); }
    catch { return 0.3; }
  });
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("pkdx_music_muted") === "true"; }
    catch { return false; }
  });
  const [loadError, setLoadError] = useState(false);
  const [hiddenForCatch, setHiddenForCatch] = useState(false);

  // ─── Pick track based on currentGen ────────────────────────
  const pickTrackForGen = useCallback((gen, excludeUrl) => {
    if (gen && REGION_MUSIC[gen]) {
      return pickRandom(REGION_MUSIC[gen], excludeUrl);
    }
    return pickRandom(ALL_TRACKS, excludeUrl);
  }, []);

  // ─── Initialize first track on mount ───────────────────────
  useEffect(() => {
    if (!currentTrack) {
      setCurrentTrack(pickTrackForGen(currentGen, null));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Switch track when currentGen changes ──────────────────
  useEffect(() => {
    const newTrack = pickTrackForGen(currentGen, currentTrack?.url);
    if (newTrack && newTrack.url !== currentTrack?.url) {
      skipCountRef.current = 0;
      setCurrentTrack(newTrack);
      setLoadError(false);
    }
  }, [currentGen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-play when track changes (user already interacted) ─
  useEffect(() => {
    if (audioRef.current && currentTrack && userInteractedRef.current) {
      const t = setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 100);
      return () => clearTimeout(t);
    }
  }, [currentTrack]);

  // ─── Volume & mute ─────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    try { localStorage.setItem("pkdx_music_volume", String(volume)); } catch {}
  }, [volume]);
  useEffect(() => {
    try { localStorage.setItem("pkdx_music_muted", String(muted)); } catch {}
  }, [muted]);

  // ─── Auto-play after first user interaction ────────────────
  useEffect(() => {
    const handler = () => {
      if (userInteractedRef.current) return;
      userInteractedRef.current = true;
      if (audioRef.current && currentTrack && !muted) {
        audioRef.current.play().catch(() => {});
      }
    };
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [currentTrack, muted]);

  // ─── Listen to catch:open / catch:close events ─────────────
  useEffect(() => {
    const handleCatchOpen = () => {
      setHiddenForCatch(true);
      if (audioRef.current && !audioRef.current.paused) {
        wasPlayingBeforeCatchRef.current = true;
        audioRef.current.pause();
      } else {
        wasPlayingBeforeCatchRef.current = false;
      }
    };
    const handleCatchClose = () => {
      setHiddenForCatch(false);
      if (wasPlayingBeforeCatchRef.current && audioRef.current) {
        audioRef.current.play().catch(() => {});
        wasPlayingBeforeCatchRef.current = false;
      }
    };
    window.addEventListener("catch:open", handleCatchOpen);
    window.addEventListener("catch:close", handleCatchClose);
    return () => {
      window.removeEventListener("catch:open", handleCatchOpen);
      window.removeEventListener("catch:close", handleCatchClose);
    };
  }, []);

  // ─── Audio handlers ────────────────────────────────────────
  const handlePlay = () => { setPlaying(true); skipCountRef.current = 0; };
  const handlePause = () => setPlaying(false);
  const handleEnded = () => {
    const next = pickTrackForGen(currentGen, currentTrack?.url);
    setCurrentTrack(next);
    setLoadError(false);
  };
  const handleError = () => {
    skipCountRef.current += 1;
    // Stop skipping after 5 failed attempts (avoid infinite loop)
    if (skipCountRef.current > 5) {
      setLoadError(true);
      console.warn("MusicPlayer: too many failed loads, stopping auto-skip");
      return;
    }
    setLoadError(true);
    setTimeout(() => {
      const next = pickTrackForGen(currentGen, currentTrack?.url);
      setCurrentTrack(next);
      setLoadError(false);
    }, 1200);
  };

  // ─── Controls ──────────────────────────────────────────────
  const togglePlay = () => {
    if (!audioRef.current) return;
    userInteractedRef.current = true;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => setLoadError(true));
  };

  const skipTrack = () => {
    userInteractedRef.current = true;
    skipCountRef.current = 0;
    const newTrack = pickTrackForGen(currentGen, currentTrack?.url);
    setCurrentTrack(newTrack);
    setLoadError(false);
  };

  // ─── Region label ──────────────────────────────────────────
  const regionLabel = currentGen && REGION_NAMES[currentGen]
    ? REGION_NAMES[currentGen][lang] ?? REGION_NAMES[currentGen].en
    : (lang === "th" ? "สุ่ม" : lang === "ja" ? "ランダム" : "Random");

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
      />

      <div className={`music-player ${expanded ? "expanded" : ""}`}
        style={hiddenForCatch ? { display: "none" } : undefined}>
        {!expanded ? (
          <button
            className="music-player-toggle"
            onClick={() => setExpanded(true)}
            title={lang === "th" ? "เปิดเครื่องเล่นเพลง" : "Open music player"}
            style={{
              background: "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
              color: "white",
              border: "none",
              boxShadow: "0 6px 22px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="music-toggle-icon">🎵</span>
            <span className="music-toggle-region">
              {currentGen ? `Gen ${currentGen}` : regionLabel}
            </span>
            {playing && <span className="music-toggle-playing">♪</span>}
          </button>
        ) : (
          <div className="music-player-panel">
            <div className="music-player-header">
              <span className="music-player-title">
                🎵 BGM
                <span className="music-player-region-badge">
                  {currentGen ? `Gen ${currentGen}` : regionLabel}
                </span>
              </span>
              <button
                className="music-player-close"
                onClick={() => setExpanded(false)}
                title="Minimize"
              >
                ✕
              </button>
            </div>

            <div className="music-player-now">
              {loadError ? (
                <span className="music-player-error">
                  ⚠️ {lang === "th" ? "โหลดไม่ได้ ข้าม..." : "Load failed · skipping..."}
                </span>
              ) : currentTrack ? (
                <span className="music-player-track">{currentTrack.name}</span>
              ) : (
                <span className="music-player-loading">
                  {lang === "th" ? "กำลังโหลด..." : "Loading..."}
                </span>
              )}
            </div>

            <div className="music-player-controls">
              <button onClick={skipTrack} title="Previous" className="music-ctrl-btn">
                ⏮
              </button>
              <button
                onClick={togglePlay}
                title={playing ? "Pause" : "Play"}
                className="music-ctrl-btn music-ctrl-play"
              >
                {playing ? "⏸" : "▶"}
              </button>
              <button onClick={skipTrack} title="Next" className="music-ctrl-btn">
                ⏭
              </button>
              <button
                onClick={() => setMuted(m => !m)}
                title={muted ? "Unmute" : "Mute"}
                className="music-ctrl-btn music-ctrl-mute"
              >
                {muted ? "🔇" : volume > 0.5 ? "🔊" : volume > 0 ? "🔉" : "🔈"}
              </button>
            </div>

            <div className="music-player-volume">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (muted) setMuted(false);
                }}
                className="music-volume-slider"
              />
              <span className="music-volume-pct">{Math.round((muted ? 0 : volume) * 100)}%</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}