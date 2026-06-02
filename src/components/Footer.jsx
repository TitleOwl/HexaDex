export default function Footer({ lang }) {
  const credits = lang==="th"
    ? "ข้อมูลจาก PokéAPI · โมเดล 3D จาก Pokemon-3D-api · ชื่อจาก sindresorhus/pokemon"
    : lang==="ja"
    ? "データ: PokéAPI · 3Dモデル: Pokemon-3D-api · 名前: sindresorhus/pokemon"
    : "Data from PokéAPI · 3D models from Pokemon-3D-api · Names from sindresorhus/pokemon";
  const disclaimer = lang==="th"
    ? "Pokémon และตัวละครทั้งหมดเป็น © Nintendo / Creatures Inc. / GAME FREAK inc."
    : lang==="ja"
    ? "ポケモン および全ての関連キャラクターは © Nintendo / Creatures Inc. / GAME FREAK inc."
    : "Pokémon and all related characters are © Nintendo / Creatures Inc. / GAME FREAK inc.";

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-logo">
          <div className="logo-ball" style={{ width: 24, height: 24 }} />
          <span>HexaDex</span>
        </div>
        <p className="footer-credits">{credits}</p>
        <p className="footer-disclaimer">{disclaimer}</p>
        <p className="footer-built">Built with React · Vite · ❤️</p>
      </div>
    </footer>
  );
}