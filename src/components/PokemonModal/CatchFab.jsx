// The one catch button, in the same hero corner for both 2D and 3D.
// Previously this markup was copy-pasted into PokemonModal/index.jsx and
// CatchHintBelow3D.jsx, so any change had to be made twice.
//
// The pokéball is served from /poke-ball.png rather than raw.githubusercontent
// — the remote host is slow or outright blocked on some networks, which left
// the button visually empty with no fallback.
export default function CatchFab({ onClick, lang }) {
  const label = lang === "th" ? "ลองจับ!" : lang === "ja" ? "捕まえる！" : "Try Catch!";
  const hint  = lang === "th" ? "ลองจับโปเกม่อนนี้!"
    : lang === "ja" ? "捕まえてみよう！"
    : "Try catching this Pokémon!";

  return (
    <button
      type="button"
      className="catch-fab"
      onClick={onClick}
      title={hint}
      aria-label={hint}
    >
      <span className="catch-fab-ball">
        <img
          src="/poke-ball.png"
          width="32"
          height="32"
          alt=""
          draggable={false}
          style={{
            imageRendering: "pixelated",
            animation: "catch-cta-ball-spin 4s linear infinite",
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
          }}
        />
      </span>
      <span className="catch-fab-label">{label}</span>
    </button>
  );
}
