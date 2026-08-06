import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Trophy, Target } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { catchApi } from "../auth.js";

const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

// Standalone Top-10 catch ranking — opened from the catch counter badge in
// CatchAnimation.jsx. Reuses the .auth-lb-* row styles (generic, not tied
// to the auth modal) but has its own overlay/card so it can layer above
// the fullscreen catch game (z-index 9999) rather than the auth modal.
export default function CatchLeaderboard({ lang = "en", onClose }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catchApi.leaderboard().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  return createPortal(
    <div className="catch-lb-overlay" onClick={onClose}>
      <div className="catch-lb-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="catch-lb-close" onClick={onClose}>
          <X size={16} strokeWidth={2.4} />
        </button>
        <div className="catch-lb-title">
          <Trophy size={19} strokeWidth={2.2} />
          {t(lang, "Top Trainers", "10 อันดับนักจับสูงสุด", "トップトレーナー")}
        </div>
        <div className="catch-lb-sub">
          {t(lang, "Ranked by total catches", "จัดอันดับตามจำนวนที่จับได้", "総捕獲数でランキング")}
        </div>

        {loading ? (
          <div className="auth-lb-msg">{t(lang, "Loading…", "กำลังโหลด…", "読み込み中…")}</div>
        ) : !data?.top?.length ? (
          <div className="auth-lb-msg">{t(lang, "No catches recorded yet — be the first!", "ยังไม่มีใครจับเลย เป็นคนแรกสิ!", "まだ誰も捕まえていません！")}</div>
        ) : (
          <ol className="auth-lb-list">
            {data.top.map((row, i) => (
              <li key={row.username} className={`auth-lb-row${data.me && row.username === data.me.username ? " me" : ""}`}>
                <span className="auth-lb-rank">{i + 1}</span>
                <span className="auth-lb-avatar">{row.username.charAt(0).toUpperCase()}</span>
                <span className="auth-lb-name">{row.username}</span>
                <span className="auth-lb-count"><Target size={12} strokeWidth={2.4} />{row.count}</span>
              </li>
            ))}
          </ol>
        )}

        {data?.me && !data.me.inTop10 && (
          <ol className="auth-lb-list auth-lb-you">
            <li className="auth-lb-row me">
              <span className="auth-lb-rank">#{data.me.rank}</span>
              <span className="auth-lb-avatar">{data.me.username.charAt(0).toUpperCase()}</span>
              <span className="auth-lb-name">{t(lang, "You", "คุณ", "あなた")}</span>
              <span className="auth-lb-count"><Target size={12} strokeWidth={2.4} />{data.me.count}</span>
            </li>
          </ol>
        )}

        {!user && (
          <div className="auth-lb-guest-banner">
            {t(lang, "Log in to save your catches and join the leaderboard", "เข้าสู่ระบบเพื่อบันทึกสถิติการจับและติดอันดับ", "ログインして記録を保存しよう")}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
