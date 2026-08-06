import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";

const AUTO_DISMISS_MS = 4200;
const EXIT_MS = 280;

// Nudges guests toward logging in right after they favorite a Pokémon —
// their like only lives in this tab's memory until they do. `pulse` is a
// counter bumped by the caller each time it should (re)appear.
export default function FavoriteLoginToast({ pulse, lang, onLogin }) {
  const [phase, setPhase] = useState("hidden"); // hidden | in | leaving
  const timers = useRef([]);

  useEffect(() => {
    if (!pulse) return;
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setPhase("leaving"), AUTO_DISMISS_MS),
      setTimeout(() => setPhase("hidden"), AUTO_DISMISS_MS + EXIT_MS),
    ];
    setPhase("in");
    return () => timers.current.forEach(clearTimeout);
  }, [pulse]);

  if (phase === "hidden") return null;

  const t = (th, en, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

  const dismiss = () => {
    timers.current.forEach(clearTimeout);
    setPhase("leaving");
    timers.current = [setTimeout(() => setPhase("hidden"), EXIT_MS)];
  };

  return (
    <div
      className={`fav-login-toast${phase === "leaving" ? " leaving" : ""}`}
      role="status"
      onClick={dismiss}
    >
      <div className="fav-login-toast-icon">
        <Heart size={16} strokeWidth={2.4} fill="currentColor" />
      </div>
      <div className="fav-login-toast-body">
        <div className="fav-login-toast-title">
          {t("บันทึกไว้ชั่วคราวเท่านั้น", "Only saved for now", "一時的な保存です")}
        </div>
        <div className="fav-login-toast-sub">
          {t("เข้าสู่ระบบเพื่อเก็บโปเกมอนตัวโปรดไว้ถาวร", "Log in to keep your favorites for good", "ログインしてお気に入りを保存しましょう")}
        </div>
      </div>
      <button
        type="button"
        className="fav-login-toast-cta"
        onClick={(e) => { e.stopPropagation(); dismiss(); onLogin(); }}
      >
        {t("เข้าสู่ระบบ", "Log in", "ログイン")}
      </button>
    </div>
  );
}
