import { useState, useEffect, useRef, useCallback } from "react";
import { Music2, X, Play, Pause, SkipForward, SkipBack, Volume1, Volume2, VolumeX, AlertTriangle } from "lucide-react";

// ─── Calm Town/Route Music from archive.org ──────────────────
// Pokemon Showdown's battle music moved entirely to CatchBattleMusic.
// MusicPlayer now plays peaceful town/route themes for chill browsing.

const ARCHIVE = "https://archive.org/download";

const REGION_MUSIC = {
  1: [ // Kanto — pkmn-rgby-soundtrack — Disc 1/XX - Name.mp3
    { name: "Pallet Town",     url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/03%20-%20Pallet%20Town.mp3` },
    { name: "Route 1",         url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/11%20-%20Route%201.mp3` },
    { name: "Pokemon Center",  url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/15%20-%20Pokemon%20Center.mp3` },
    { name: "Pewter City",     url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/16%20-%20Pewter%20City.mp3` },
    { name: "Viridian Forest", url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/19%20-%20Viridian%20Forest.mp3` },
    { name: "Route 24",        url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/27%20-%20Route%2024.mp3` },
    { name: "Cerulean City",   url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/30%20-%20Cerulean%20City.mp3` },
    { name: "Vermilion City",  url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/35%20-%20Vermilion%20City.mp3` },
    { name: "Lavender Town",   url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/39%20-%20Lavender%20Town.mp3` },
    { name: "Celadon City",    url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/41%20-%20Celadon%20City.mp3` },
  ],
  2: [ // Johto — pkmn-gsc-soundtrack — Disc 1/1-XX. Name.mp3
    { name: "New Bark Town",    url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-05.%20New%20Bark%20Town.mp3` },
    { name: "Route 29",         url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-08.%20Route%2029.mp3` },
    { name: "Cherrygrove City", url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-12.%20Cherrygrove%20City.mp3` },
    { name: "Route 30",         url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-16.%20Route%2030.mp3` },
    { name: "Violet City",      url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-23.%20Violet%20City.mp3` },
    { name: "Azalea Town",      url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-32.%20Azalea%20Town.mp3` },
    { name: "Goldenrod City",   url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-40.%20Goldenrod%20City.mp3` },
    { name: "Cycling",          url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-43.%20Cycling.mp3` },
    { name: "National Park",    url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-45.%20National%20Park.mp3` },
    { name: "Ecruteak City",    url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-48.%20Ecruteak%20City.mp3` },
    { name: "Route 38",         url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-53.%20Route%2038.mp3` },
  ],
  3: [ // Hoenn — pkmn-oras-ost — Disc 1/XX - Name.mp3
    { name: "Littleroot Town",  url: `${ARCHIVE}/pkmn-oras-ost/Disc%201/05%20-%20Littleroot%20Town.mp3` },
    { name: "Route 101",        url: `${ARCHIVE}/pkmn-oras-ost/Disc%201/11%20-%20Route%20101.mp3` },
    { name: "Oldale Town",      url: `${ARCHIVE}/pkmn-oras-ost/Disc%201/12%20-%20Oldale%20Town.mp3` },
    { name: "Petalburg City",   url: `${ARCHIVE}/pkmn-oras-ost/Disc%201/23%20-%20Petalburg%20City.mp3` },
    { name: "Route 104",        url: `${ARCHIVE}/pkmn-oras-ost/Disc%201/26%20-%20Route%20104.mp3` },
    { name: "Dewford Town",     url: `${ARCHIVE}/pkmn-oras-ost/Disc%201/35%20-%20Dewford%20Town.mp3` },
    { name: "Slateport City",   url: `${ARCHIVE}/pkmn-oras-ost/Disc%201/38%20-%20Slateport%20City.mp3` },
    { name: "Verdanturf Town",  url: `${ARCHIVE}/pkmn-oras-ost/Disc%201/44%20-%20Verdanturf%20Town.mp3` },
  ],
  4: [ // Sinnoh — pkmn-dppt-soundtrack — Disc 1/XX - Name (Day).mp3
    { name: "Twinleaf Town",   url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/05%20-%20Twinleaf%20Town%20%28Day%29.mp3` },
    { name: "Route 201",       url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/07%20-%20Route%20201%20%28Day%29.mp3` },
    { name: "Lake",            url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/08%20-%20Lake.mp3` },
    { name: "Sandgem Town",    url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/14%20-%20Sandgem%20Town%20%28Day%29.mp3` },
    { name: "Jubilife City",   url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/23%20-%20Jubilife%20City%20%28Day%29.mp3` },
    { name: "Oreburgh City",   url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/30%20-%20Oreburgh%20City%20%28Day%29.mp3` },
    { name: "Floaroma Town",   url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/38%20-%20Floaroma%20Town%20%28Day%29.mp3` },
    { name: "Eterna City",     url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/45%20-%20Eterna%20City%20%28Day%29.mp3` },
    { name: "Hearthome City",  url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/54%20-%20Hearthome%20City%20%28Day%29.mp3` },
    { name: "Solaceon Town",   url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/57%20-%20Solaceon%20Town%20%28Day%29.mp3` },
    { name: "Veilstone City",  url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/60%20-%20Veilstone%20City%20%28Day%29.mp3` },
    { name: "Snowpoint City",  url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/64%20-%20Snowpoint%20City%20%28Day%29.mp3` },
  ],
  5: [ // Unova — pkmn-black-white-soundtrack — Disc 1/XX - Name.mp3
    { name: "Nuvema Town",     url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/07%20-%20Nuvema%20Town.mp3` },
    { name: "Route 1",         url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/14%20-%20Route%201.mp3` },
    { name: "Accumula Town",   url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/18%20-%20Accumula%20Town.mp3` },
    { name: "Route 2 (Spring)",url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/24%20-%20Route%202%20%28Spring%29.mp3` },
    { name: "Striaton City",   url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/32%20-%20Striaton%20City.mp3` },
    { name: "Nacrene City",    url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/43%20-%20Nacrene%20City.mp3` },
    { name: "Skyarrow Bridge", url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/52%20-%20Skyarrow%20Bridge.mp3` },
    { name: "Castelia City",   url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/53%20-%20Castelia%20City.mp3` },
  ],
  6: [ // Kalos — pkmn-xy-soundtrack — Disc 1/XX - Name .mp3 (some have trailing space)
    { name: "Vaniville Town",  url: `${ARCHIVE}/pkmn-xy-soundtrack/Disc%201/05%20-%20Vaniville%20Town%20.mp3` },
    { name: "Route 1",         url: `${ARCHIVE}/pkmn-xy-soundtrack/Disc%201/06%20-%20Route%201%20.mp3` },
    { name: "Aquacorde Town",  url: `${ARCHIVE}/pkmn-xy-soundtrack/Disc%201/07%20-%20Aquacorde%20Town%20.mp3` },
    { name: "Santalune City",  url: `${ARCHIVE}/pkmn-xy-soundtrack/Disc%201/23%20-%20Santalune%20City.mp3` },
    { name: "Lumiose City",    url: `${ARCHIVE}/pkmn-xy-soundtrack/Disc%201/37%20-%20Lumiose%20City%20.mp3` },
    { name: "Camphrier Town",  url: `${ARCHIVE}/pkmn-xy-soundtrack/Disc%201/43%20-%20Camphrier%20Town.mp3` },
    { name: "Parfum Palace",   url: `${ARCHIVE}/pkmn-xy-soundtrack/Disc%201/45%20-%20Parfum%20Palace.mp3` },
  ],
  7: [ // Alola — pkmn-sun-moon-ost — Disc 1/XX - Name.mp3
    { name: "Alola Region",       url: `${ARCHIVE}/pkmn-sun-moon-ost/Disc%201/03%20-%20Alola%20Region.mp3` },
    { name: "Route 1",            url: `${ARCHIVE}/pkmn-sun-moon-ost/Disc%201/08%20-%20Route%201.mp3` },
    { name: "Iki Town (Day)",     url: `${ARCHIVE}/pkmn-sun-moon-ost/Disc%201/09%20-%20Iki%20Town%20%28Day%29.mp3` },
    { name: "Iki Town (Night)",   url: `${ARCHIVE}/pkmn-sun-moon-ost/Disc%201/10%20-%20Iki%20Town%20%28Night%29.mp3` },
    { name: "Hau'oli City (Day)", url: `${ARCHIVE}/pkmn-sun-moon-ost/Disc%201/44%20-%20Hau%27oli%20City%20%28Day%29.mp3` },
    { name: "Hau'oli City (Night)",url: `${ARCHIVE}/pkmn-sun-moon-ost/Disc%201/45%20-%20Hau%27oli%20City%20%28Night%29.mp3` },
    { name: "Route 2",            url: `${ARCHIVE}/pkmn-sun-moon-ost/Disc%202/01%20-%20Route%202.mp3` },
  ],
};

// Fallback pool for "All Regions" / Gen 8 / Gen 9 (URLs verified against archive.org metadata)
const ALL_TRACKS = [
  { name: "Pallet Town",    url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/03%20-%20Pallet%20Town.mp3`, region: 1 },
  { name: "Lavender Town",  url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/39%20-%20Lavender%20Town.mp3`, region: 1 },
  { name: "Celadon City",   url: `${ARCHIVE}/pkmn-rgby-soundtrack/Disc%201/41%20-%20Celadon%20City.mp3`, region: 1 },
  { name: "New Bark Town",  url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-05.%20New%20Bark%20Town.mp3`, region: 2 },
  { name: "Goldenrod City", url: `${ARCHIVE}/pkmn-gsc-soundtrack/Disc%201/1-40.%20Goldenrod%20City.mp3`, region: 2 },
  { name: "Littleroot Town",url: `${ARCHIVE}/pkmn-oras-ost/Disc%201/05%20-%20Littleroot%20Town.mp3`, region: 3 },
  { name: "Twinleaf Town",  url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/05%20-%20Twinleaf%20Town%20%28Day%29.mp3`, region: 4 },
  { name: "Lake",           url: `${ARCHIVE}/pkmn-dppt-soundtrack/Disc%201/08%20-%20Lake.mp3`, region: 4 },
  { name: "Nuvema Town",    url: `${ARCHIVE}/pkmn-black-white-soundtrack/Disc%201/07%20-%20Nuvema%20Town.mp3`, region: 5 },
  { name: "Vaniville Town", url: `${ARCHIVE}/pkmn-xy-soundtrack/Disc%201/05%20-%20Vaniville%20Town%20.mp3`, region: 6 },
  { name: "Alola Region",   url: `${ARCHIVE}/pkmn-sun-moon-ost/Disc%201/03%20-%20Alola%20Region.mp3`, region: 7 },
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

function pickRandom(pool, excludeUrl, failedUrls = new Set()) {
  const available = pool.filter(t => t.url !== excludeUrl && !failedUrls.has(t.url));
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
  // All failed → pick anything except current
  const fallback = pool.filter(t => t.url !== excludeUrl);
  if (fallback.length > 0) return fallback[Math.floor(Math.random() * fallback.length)];
  return pool[0];
}

export default function MusicPlayer({ currentGen, lang = "en", inline = false }) {
  const audioRef = useRef(null);
  const userInteractedRef = useRef(false);
  const wasPlayingBeforeCatchRef = useRef(false);
  const failedUrlsRef = useRef(new Set()); // track broken URLs this session
  const currentTrackRef = useRef(null);    // mirror of currentTrack for use in callbacks

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
  const pickTrackForGen = useCallback((gen, excludeUrl, failedUrls) => {
    const failed = failedUrls ?? failedUrlsRef.current;
    if (gen && REGION_MUSIC[gen]) {
      const pool = REGION_MUSIC[gen];
      const available = pool.filter(t => t.url !== excludeUrl && !failed.has(t.url));
      if (available.length > 0) return pickRandom(available, null);
      // All region tracks are broken → fall back to ALL_TRACKS
      const fallback = ALL_TRACKS.filter(t => t.url !== excludeUrl && !failed.has(t.url));
      if (fallback.length > 0) return pickRandom(fallback, null);
      // Last resort: anything in the region regardless of failed status
      return pickRandom(pool, excludeUrl);
    }
    return pickRandom(ALL_TRACKS, excludeUrl, failed);
  }, []);

  // ─── Initialize first track on mount ───────────────────────
  useEffect(() => {
    if (!currentTrack) {
      setCurrentTrack(pickTrackForGen(currentGen, null));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Mirror currentTrack to ref so callbacks always read latest ─
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // ─── Switch track when currentGen changes ──────────────────
  useEffect(() => {
    failedUrlsRef.current = new Set(); // reset failed list on region switch
    const newTrack = pickTrackForGen(currentGen, currentTrackRef.current?.url, new Set());
    if (newTrack && newTrack.url !== currentTrackRef.current?.url) {
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
  const handlePlay = () => setPlaying(true);
  const handlePause = () => setPlaying(false);
  const handleEnded = () => {
    const next = pickTrackForGen(currentGen, currentTrackRef.current?.url);
    setCurrentTrack(next);
    setLoadError(false);
  };
  const handleError = () => {
    // Mark this URL as broken so we never pick it again this session
    const badUrl = currentTrackRef.current?.url;
    if (badUrl) failedUrlsRef.current.add(badUrl);

    const pool = currentGen && REGION_MUSIC[currentGen]
      ? REGION_MUSIC[currentGen]
      : ALL_TRACKS;
    const remaining = pool.filter(t => !failedUrlsRef.current.has(t.url));

    // If every track in the region is broken, fall back to ALL_TRACKS
    if (remaining.length === 0) {
      const fallback = ALL_TRACKS.filter(t => !failedUrlsRef.current.has(t.url));
      if (fallback.length === 0) {
        setLoadError(true); // completely out of options
        return;
      }
      const next = pickRandom(fallback, null);
      setCurrentTrack(next);
      setLoadError(false);
      return;
    }

    setLoadError(true);
    setTimeout(() => {
      const next = pickTrackForGen(currentGen, badUrl);
      setCurrentTrack(next);
      setLoadError(false);
    }, 800);
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
    const newTrack = pickTrackForGen(currentGen, currentTrackRef.current?.url);
    setCurrentTrack(newTrack);
    setLoadError(false);
  };

  // ─── Region label ──────────────────────────────────────────
  const regionLabel = currentGen && REGION_NAMES[currentGen]
    ? REGION_NAMES[currentGen][lang] ?? REGION_NAMES[currentGen].en
    : (lang === "th" ? "สุ่ม" : lang === "ja" ? "ランダム" : "Random");

  // `inline` renders the player as a single navbar control instead of the
  // floating corner card. Same audio element and same state — only the shell
  // differs, so playback survives and there is one player, not two.
  if (inline) {
    const label = currentTrack?.name
      ? `${currentTrack.name} · ${regionLabel}`
      : regionLabel;
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
        <button
          type="button"
          className={`nav-music${playing ? " playing" : ""}`}
          onClick={togglePlay}
          // The track name on hover, so the control says what it will play
          // rather than leaving the user to press it and find out.
          title={playing
            ? `${lang === "th" ? "หยุดเพลง" : lang === "ja" ? "音楽を停止" : "Pause music"} — ${label}`
            : `${lang === "th" ? "เล่นเพลง" : lang === "ja" ? "音楽を再生" : "Play music"} — ${label}`}
          aria-label={playing ? "Pause music" : "Play music"}
          aria-pressed={playing}
        >
          <Music2 size={15} strokeWidth={2.3} />
          {playing && <span className="nav-music-dot" aria-hidden />}
        </button>
      </>
    );
  }

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
              background: "var(--glass-bg-strong, var(--bg-card))",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-md)",
              backdropFilter: "blur(10px)",
            }}
          >
            <span className="music-toggle-icon" style={{ color: "var(--blue)", display: "inline-flex" }}>
              <Music2 size={17} strokeWidth={2.2} />
            </span>
            <span className="music-toggle-region">
              {currentGen ? `Gen ${currentGen}` : regionLabel}
            </span>
            {playing && <span className="music-toggle-playing" />}
          </button>
        ) : (
          <div className="music-player-panel">
            <div className="music-player-header">
              <span className="music-player-title" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <Music2 size={16} strokeWidth={2.2} style={{ color: "var(--blue)" }} /> BGM
                <span className="music-player-region-badge">
                  {currentGen ? `Gen ${currentGen}` : regionLabel}
                </span>
              </span>
              <button
                className="music-player-close"
                onClick={() => setExpanded(false)}
                title="Minimize"
              >
                <X size={15} strokeWidth={2.4} />
              </button>
            </div>

            <div className="music-player-now">
              {loadError ? (
                <span className="music-player-error" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={13} strokeWidth={2.2} />
                  {lang === "th" ? "โหลดไม่ได้ ข้าม..." : "Load failed · skipping..."}
                </span>
              ) : currentTrack ? (
                <span className="music-player-track">
                  <span className={`music-eq${playing ? " playing" : ""}`} aria-hidden>
                    <i /><i /><i /><i />
                  </span>
                  <span className="music-track-name">{currentTrack.name}</span>
                </span>
              ) : (
                <span className="music-player-loading">
                  {lang === "th" ? "กำลังโหลด..." : "Loading..."}
                </span>
              )}
            </div>

            <div className="music-player-controls">
              <button onClick={skipTrack} title="Previous" className="music-ctrl-btn">
                <SkipBack size={16} strokeWidth={2.2} />
              </button>
              <button
                onClick={togglePlay}
                title={playing ? "Pause" : "Play"}
                className="music-ctrl-btn music-ctrl-play"
              >
                {playing ? <Pause size={18} strokeWidth={2.2} fill="currentColor" /> : <Play size={18} strokeWidth={2.2} fill="currentColor" />}
              </button>
              <button onClick={skipTrack} title="Next" className="music-ctrl-btn">
                <SkipForward size={16} strokeWidth={2.2} />
              </button>
              <button
                onClick={() => setMuted(m => !m)}
                title={muted ? "Unmute" : "Mute"}
                className="music-ctrl-btn music-ctrl-mute"
              >
                {muted ? <VolumeX size={16} strokeWidth={2.2} /> : volume > 0.5 ? <Volume2 size={16} strokeWidth={2.2} /> : <Volume1 size={16} strokeWidth={2.2} />}
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
