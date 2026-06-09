import { useEffect, useRef } from "react";

// ─── ALL Pokemon Showdown battle/trainer/rival themes ────────
// Moved here from MusicPlayer per user request. These intense
// battle tracks now fire when the catch screen is open.
const BASE_URL = "https://play.pokemonshowdown.com/audio";

// Pool of battle themes for each generation.
// When user opens catch screen, a random track from the pool is picked.
const CATCH_POOLS = {
  1: [ // Kanto
    `${BASE_URL}/hgss-kanto-trainer.mp3`,
    `${BASE_URL}/bw2-kanto-gym-leader.mp3`,
    `${BASE_URL}/spl-elite4.mp3`,
  ],
  2: [ // Johto
    `${BASE_URL}/hgss-johto-trainer.mp3`,
    `${BASE_URL}/spl-elite4.mp3`,
  ],
  3: [ // Hoenn
    `${BASE_URL}/oras-trainer.mp3`,
    `${BASE_URL}/oras-rival.mp3`,
    `${BASE_URL}/colosseum-miror-b.mp3`,
    `${BASE_URL}/xd-miror-b.mp3`,
  ],
  4: [ // Sinnoh
    `${BASE_URL}/dpp-trainer.mp3`,
    `${BASE_URL}/dpp-rival.mp3`,
  ],
  5: [ // Unova
    `${BASE_URL}/bw-trainer.mp3`,
    `${BASE_URL}/bw-rival.mp3`,
    `${BASE_URL}/bw-subway-trainer.mp3`,
    `${BASE_URL}/bw2-rival.mp3`,
    `${BASE_URL}/bw2-homika-dogars.mp3`,
  ],
  6: [ // Kalos
    `${BASE_URL}/xy-trainer.mp3`,
    `${BASE_URL}/xy-rival.mp3`,
  ],
  7: [ // Alola
    `${BASE_URL}/sm-trainer.mp3`,
    `${BASE_URL}/sm-rival.mp3`,
  ],
};

// All tracks combined (for Gen 8, 9 fallback + "epic mode")
const ALL_BATTLE = Object.values(CATCH_POOLS).flat();

// Map pokemon.id → generation
function getPokemonGen(id) {
  if (id <= 151)  return 1;
  if (id <= 251)  return 2;
  if (id <= 386)  return 3;
  if (id <= 493)  return 4;
  if (id <= 649)  return 5;
  if (id <= 721)  return 6;
  if (id <= 809)  return 7;
  if (id <= 905)  return 8;
  return 9;
}

function pickRandom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Volume reduction factor ────────────────────────────────
// Catch music is mixed at 50% of user's MusicPlayer volume,
// then capped at 40% absolute so it never overpowers SFX
const CATCH_VOLUME_FACTOR = 0.5;
const CATCH_VOLUME_CAP = 0.4;

function getCatchVolume() {
  let userVol = 0.3;
  let muted = false;
  try {
    userVol = parseFloat(localStorage.getItem("pkdx_music_volume") ?? "0.3");
    muted = localStorage.getItem("pkdx_music_muted") === "true";
  } catch {}
  if (muted) return 0;
  return Math.min(userVol * CATCH_VOLUME_FACTOR, CATCH_VOLUME_CAP);
}

/**
 * CatchBattleMusic — plays a random battle theme matched to
 * the Pokemon's generation. Mounting:
 *  • Dispatches 'catch:open' → pauses MusicPlayer
 *  • Plays a random battle theme at reduced volume (looping)
 *
 * Unmounting:
 *  • Stops the battle theme
 *  • Dispatches 'catch:close' → MusicPlayer resumes
 *
 * Usage in CatchAnimation.jsx:
 *   <CatchBattleMusic pokemonId={pokemon.id} />
 *
 * Volume: capped at 40% to stay below SFX. Mute syncs with MusicPlayer.
 * Returns null (invisible component).
 */
export default function CatchBattleMusic({ pokemonId, enabled = true }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!enabled || !pokemonId) return;

    const gen = getPokemonGen(pokemonId);
    const pool = CATCH_POOLS[gen] ?? ALL_BATTLE;

    // Shuffle pool so each retry tries a different track
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    // Tell MusicPlayer to pause background music
    window.dispatchEvent(new CustomEvent("catch:open"));

    let cancelled = false;

    // Try each URL in order; move to next on autoplay block or network error
    const tryPlay = (idx) => {
      if (cancelled || idx >= shuffled.length) return;
      const url = shuffled[idx];
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = getCatchVolume();
      audio.preload = "auto";
      audioRef.current = audio;

      audio.play().catch(() => tryPlay(idx + 1));
      audio.addEventListener("error", () => { audio.pause(); tryPlay(idx + 1); });
    };

    tryPlay(0);

    // Live volume sync — poll localStorage every 500ms while mounted
    const volInterval = setInterval(() => {
      if (audioRef.current) {
        audioRef.current.volume = getCatchVolume();
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(volInterval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      // Tell MusicPlayer to resume background music
      window.dispatchEvent(new CustomEvent("catch:close"));
    };
  }, [pokemonId, enabled]);

  // ─── Pause trainer music during "Pokemon caught!" celebration ──
  // catchSounds.playGotcha() dispatches these events
  useEffect(() => {
    let wasPlaying = false;
    const handleStart = () => {
      if (audioRef.current && !audioRef.current.paused) {
        wasPlaying = true;
        audioRef.current.pause();
      }
    };
    const handleEnd = () => {
      if (wasPlaying && audioRef.current) {
        audioRef.current.play().catch(() => {});
        wasPlaying = false;
      }
    };
    window.addEventListener("catch:success-start", handleStart);
    window.addEventListener("catch:success-end", handleEnd);
    return () => {
      window.removeEventListener("catch:success-start", handleStart);
      window.removeEventListener("catch:success-end", handleEnd);
    };
  }, []);

  return null;
}