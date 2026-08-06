// Small helper: catch FAB for 3D mode (placed in 3D viewer area)
export default function CatchHintBelow3D({ setCatchOpen, lang }) {
  return (
    <button className="catch-fab catch-fab-3d" onClick={() => setCatchOpen(true)}
      title={lang==="th" ? "ลองจับโปเกม่อนนี้!"
           : lang==="ja" ? "捕まえてみよう！"
           : "Try catching this Pokémon!"}>
      <span className="catch-fab-ball">
        <img
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
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
      <span className="catch-fab-label">
        {lang==="th" ? "ลองจับ!"
         : lang==="ja" ? "捕まえる！"
         : "Try Catch!"}
      </span>
    </button>
  );
}
