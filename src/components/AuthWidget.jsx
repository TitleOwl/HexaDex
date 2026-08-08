import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  LogIn, LogOut, Eye, EyeOff, Cake, Pencil, ChevronLeft, Heart, Flame, Target,
  User, Settings, Moon, Sun,
} from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { catchApi, favoritesApi } from "../auth.js";
import { birthdayToPokemonId, artworkUrl } from "../utils.js";
import HexaDexLogo from "./HexaDexLogo.jsx";

const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);
const today = () => new Date().toISOString().slice(0, 10);

// Curated so the picker stays a small, recognizable grid instead of all 1025.
const STARTERS = [
  { id: 1, name: "Bulbasaur" }, { id: 4, name: "Charmander" }, { id: 7, name: "Squirtle" },
  { id: 152, name: "Chikorita" }, { id: 155, name: "Cyndaquil" }, { id: 158, name: "Totodile" },
  { id: 252, name: "Treecko" }, { id: 255, name: "Torchic" }, { id: 258, name: "Mudkip" },
  { id: 387, name: "Turtwig" }, { id: 390, name: "Chimchar" }, { id: 393, name: "Piplup" },
];

function TextField({ label, ...inputProps }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input-wrap">
        <input className="auth-input" {...inputProps} />
        <span className="auth-input-ring" />
      </div>
    </label>
  );
}

function PasswordField({ label, value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input-wrap">
        <input
          className="auth-input auth-input-has-toggle"
          type={show ? "text" : "password"}
          value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
        />
        <button type="button" className="auth-input-toggle" tabIndex={-1} onClick={() => setShow((v) => !v)}>
          {show ? <EyeOff size={16} strokeWidth={2.2} /> : <Eye size={16} strokeWidth={2.2} />}
        </button>
        <span className="auth-input-ring" />
      </div>
    </label>
  );
}

function LoginForm({ lang, onSubmit, submitting, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  return (
    <form className="auth-form" onSubmit={(e) => { e.preventDefault(); onSubmit(username, password, rememberMe); }}>
      <TextField label={t(lang, "Username", "ชื่อผู้ใช้", "ユーザー名")}
        value={username} onChange={(e) => setUsername(e.target.value)}
        autoComplete="username" placeholder={t(lang, "e.g. ash_ketchum", "เช่น ash_ketchum", "例: ash_ketchum")} />
      <PasswordField label={t(lang, "Password", "รหัสผ่าน", "パスワード")}
        value={password} onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password" placeholder="••••••" />

      <div className="auth-form-row">
        <label className="auth-checkbox">
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
          <span>{t(lang, "Remember me", "จำฉันไว้", "ログイン状態を保持")}</span>
        </label>
        <button type="button" className="auth-forgot-link" onClick={() => setShowForgot((v) => !v)}>
          {t(lang, "Forgot Password?", "ลืมรหัสผ่าน?", "パスワードをお忘れですか？")}
        </button>
      </div>
      {showForgot && (
        <div className="auth-notice">
          {t(lang,
            "Password recovery isn't available yet — accounts here aren't linked to an email. Create a new account instead.",
            "ระบบยังไม่รองรับการกู้คืนรหัสผ่าน (บัญชีไม่ได้ผูกอีเมลไว้) กรุณาสมัครบัญชีใหม่แทนครับ",
            "アカウントはメールに紐づいていないため、パスワード再設定は現在ご利用いただけません。新しいアカウントを作成してください。")}
        </div>
      )}

      {error && <div className="auth-error">{error}</div>}
      <button className="auth-submit-btn" type="submit" disabled={submitting}>
        {submitting ? t(lang, "Logging in…", "กำลังเข้าสู่ระบบ…", "ログイン中…") : t(lang, "Log in", "เข้าสู่ระบบ", "ログイン")}
      </button>
    </form>
  );
}

function RegisterForm({ lang, onSubmit, submitting, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  return (
    <form className="auth-form" onSubmit={(e) => { e.preventDefault(); onSubmit(username, password, confirm); }}>
      <TextField label={t(lang, "Username", "ชื่อผู้ใช้", "ユーザー名")}
        value={username} onChange={(e) => setUsername(e.target.value)}
        autoComplete="username" placeholder={t(lang, "3-20 letters/numbers", "3-20 ตัวอักษร/ตัวเลข", "3〜20文字の英数字")} />
      <PasswordField label={t(lang, "Password", "รหัสผ่าน", "パスワード")}
        value={password} onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password" placeholder={t(lang, "At least 6 characters", "อย่างน้อย 6 ตัวอักษร", "6文字以上")} />
      <PasswordField label={t(lang, "Confirm password", "ยืนยันรหัสผ่าน", "パスワード（確認）")}
        value={confirm} onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password" placeholder="••••••" />
      {error && <div className="auth-error">{error}</div>}
      <button className="auth-submit-btn" type="submit" disabled={submitting}>
        {submitting ? t(lang, "Creating account…", "กำลังสมัคร…", "登録中…") : t(lang, "Create account", "สมัครสมาชิก", "アカウント作成")}
      </button>
    </form>
  );
}

function AuthHero({ title, subtitle, onClose, overlap = false }) {
  return (
    <div className={`auth-hero${overlap ? " auth-hero-has-overlap" : ""}`}>
      <button className="modal-close auth-close" onClick={onClose}>✕</button>
      <div className="auth-hero-mark"><HexaDexLogo variant="mark" size={30} animated={false} /></div>
      <div className="auth-hero-title">{title}</div>
      <div className="auth-hero-sub">{subtitle}</div>
    </div>
  );
}

function StatTile({ icon: Icon, value, label }) {
  return (
    <div className="auth-stat-tile">
      <Icon size={15} strokeWidth={2.2} />
      <div className="auth-stat-value">{value}</div>
      <div className="auth-stat-label">{label}</div>
    </div>
  );
}

function BirthdaySection({ lang, birthday, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(birthday || "");

  useEffect(() => { setValue(birthday || ""); }, [birthday]);

  if (editing) {
    return (
      <div className="auth-birthday-edit">
        <input type="date" className="auth-date-input" value={value} max={today()}
          onChange={(e) => setValue(e.target.value)} />
        <div className="auth-birthday-edit-actions">
          <button type="button" className="auth-mini-btn" disabled={saving} onClick={() => setEditing(false)}>
            {t(lang, "Cancel", "ยกเลิก", "キャンセル")}
          </button>
          <button type="button" className="auth-mini-btn primary" disabled={!value || saving}
            onClick={async () => { await onSave(value); setEditing(false); }}>
            {saving ? t(lang, "Saving…", "กำลังบันทึก…", "保存中…") : t(lang, "Save", "บันทึก", "保存")}
          </button>
        </div>
      </div>
    );
  }

  if (birthday) {
    const destinyId = birthdayToPokemonId(birthday);
    return (
      <div className="auth-destiny-card">
        <img className="auth-destiny-art" src={artworkUrl(destinyId)} alt="" loading="lazy" />
        <div className="auth-destiny-text">
          <div className="auth-destiny-label">{t(lang, "Your Destiny Pokémon", "โปเกม่อนคู่ดวงของคุณ", "あなたの運命のポケモン")}</div>
          <div className="auth-destiny-date">{birthday}</div>
        </div>
        <button type="button" className="auth-destiny-edit" onClick={() => setEditing(true)} title={t(lang, "Edit", "แก้ไข", "編集")}>
          <Pencil size={13} strokeWidth={2.2} />
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="auth-add-birthday-btn" onClick={() => setEditing(true)}>
      <Cake size={15} strokeWidth={2.2} />
      {t(lang, "Add your birthday → get your Destiny Pokémon", "เพิ่มวันเกิด → รับโปเกม่อนคู่ดวง", "誕生日を追加 → 運命のポケモンを見る")}
    </button>
  );
}

function StarterGrid({ lang, current, onPick, onBack, saving }) {
  return (
    <div className="auth-sub-screen">
      <button type="button" className="auth-back-btn" onClick={onBack}>
        <ChevronLeft size={15} strokeWidth={2.4} />{t(lang, "Back", "ย้อนกลับ", "戻る")}
      </button>
      <div className="auth-sub-title">{t(lang, "Choose your starter", "เลือกโปเกม่อนเริ่มต้น", "スターターを選ぼう")}</div>
      <div className="auth-starter-grid">
        {STARTERS.map((s) => (
          <button key={s.id} type="button" disabled={saving}
            className={`auth-starter-item${current === s.id ? " active" : ""}`}
            onClick={() => onPick(s.id)}
          >
            <img src={artworkUrl(s.id)} alt={s.name} loading="lazy" />
            <span>{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Compact anchored dropdown (avatar → Profile/Log in, Settings, Dark Mode,
// Log out) — mirrors Header.jsx's MoreMenu overlay+dropdown pattern.
function ProfileMenu({
  lang, user, theme, toggleTheme, autoMode, settingsHasUpdate,
  onProfile, onSettings, onLogout, onClose,
}) {
  return (
    <>
      <div className="profile-menu-overlay" onClick={onClose} />
      <div className="profile-menu-dropdown">
        <button type="button" className="profile-menu-item" onClick={onProfile}>
          <span className="profile-menu-item-icon">
            {user ? <User size={18} strokeWidth={2.2} /> : <LogIn size={18} strokeWidth={2.2} />}
          </span>
          <span className="profile-menu-item-label">
            {user ? t(lang, "Profile", "โปรไฟล์", "プロフィール") : t(lang, "Log in", "เข้าสู่ระบบ", "ログイン")}
          </span>
        </button>
        <span className="profile-menu-divider" />
        <button type="button" className="profile-menu-item" onClick={onSettings}>
          <span className="profile-menu-item-icon"><Settings size={18} strokeWidth={2.2} /></span>
          <span className="profile-menu-item-label">{t(lang, "Settings", "ตั้งค่า", "設定")}</span>
          {settingsHasUpdate && <span className="profile-menu-dot" />}
        </button>
        <span className="profile-menu-divider" />
        <div className="profile-menu-item profile-menu-item-static">
          <span className="profile-menu-item-icon">
            {theme === "dark" ? <Moon size={18} strokeWidth={2.2} /> : <Sun size={18} strokeWidth={2.2} />}
          </span>
          <span className="profile-menu-item-label">{t(lang, "Dark Mode", "ธีมมืด", "ダークモード")}</span>
          <button type="button" className={`profile-menu-switch${theme === "dark" ? " on" : ""}`}
            onClick={toggleTheme} aria-label="Toggle dark mode"
            title={autoMode ? `Auto (${theme})` : theme}>
            <span className="profile-menu-switch-knob" />
          </button>
        </div>
        {user && (
          <>
            <span className="profile-menu-divider" />
            <button type="button" className="profile-menu-item profile-menu-item-danger" onClick={onLogout}>
              <span className="profile-menu-item-icon"><LogOut size={18} strokeWidth={2.2} /></span>
              <span className="profile-menu-item-label">{t(lang, "Log out", "ออกจากระบบ", "ログアウト")}</span>
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default function AuthWidget({ lang = "en", theme, toggleTheme, autoMode, onOpenSettings, settingsHasUpdate }) {
  const { user, loading, login, register, logout, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [subScreen, setSubScreen] = useState("home"); // home | starter
  const [savingField, setSavingField] = useState(false);
  const [favCount, setFavCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    if (!open) { setError(""); setTab("login"); setSubScreen("home"); }
  }, [open]);

  // Lock background scroll while open — and compensate for the vertical
  // scrollbar disappearing (which otherwise shifts the whole page sideways
  // the instant the modal opens, since the header/content reflow into the
  // space the scrollbar track used to occupy).
  useEffect(() => {
    if (!open) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  // FavoriteLoginToast (and anything else) can ask this widget to pop open
  // the login modal without needing the open-state lifted up to a parent.
  useEffect(() => {
    const onOpenLogin = () => { setTab("login"); setOpen(true); };
    window.addEventListener("auth:open-login", onOpenLogin);
    return () => window.removeEventListener("auth:open-login", onOpenLogin);
  }, []);

  const showProfile = !!user;

  // Read stats once the profile view is actually visible. Favorites are
  // server-saved for logged-in users, so pull the count from there.
  useEffect(() => {
    if (!open || !showProfile) return;
    favoritesApi.list().then((d) => setFavCount(d.favorites?.length ?? 0)).catch(() => setFavCount(0));
    try { setStreak(JSON.parse(localStorage.getItem("pkdx_streak") ?? "{}").streak ?? 0); } catch { setStreak(0); }
  }, [open, showProfile]);

  // Just for the "Caught" stat tile — the full Top-10 ranking now lives in
  // the catch game itself (CatchLeaderboard.jsx), not in this modal.
  useEffect(() => {
    if (!open || !showProfile) return;
    catchApi.leaderboard().then(setLeaderboard).catch(() => setLeaderboard(null));
  }, [open, showProfile]);

  const handleLogin = async (username, password, rememberMe) => {
    setSubmitting(true); setError("");
    try {
      await login(username, password, rememberMe);
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (username, password, confirm) => {
    setSubmitting(true); setError("");
    try {
      await register(username, password, confirm);
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBirthday = async (birthday) => {
    setSavingField(true);
    try { await updateProfile({ birthday }); } catch { /* silently keep old value on failure */ }
    setSavingField(false);
  };

  const handlePickStarter = async (starter) => {
    setSavingField(true);
    try {
      await updateProfile({ starter });
      setSubScreen("home");
    } catch { /* keep the picker open on failure */ }
    setSavingField(false);
  };

  if (loading) return <div className="auth-btn auth-btn-skeleton" />;

  const myCatchCount = leaderboard?.me?.count ?? null;

  const heroTitle = subScreen === "starter"
    ? t(lang, "Choose your starter", "เลือกโปเกม่อนเริ่มต้น", "スターターを選ぼう")
    : showProfile
    ? t(lang, "Your Profile", "โปรไฟล์ของคุณ", "プロフィール")
    : t(lang, "Welcome, Trainer", "ยินดีต้อนรับ เทรนเนอร์", "ようこそ、トレーナー");
  const heroSub = subScreen === "starter"
    ? t(lang, "Shown next to your name", "ใช้แสดงแทน avatar ของคุณ", "アバターとして表示されます")
    : showProfile
    ? t(lang, "Manage your trainer account", "จัดการบัญชีเทรนเนอร์ของคุณ", "トレーナーアカウントを管理")
    : t(lang, "Log in or create a free account", "เข้าสู่ระบบ หรือสมัครสมาชิกฟรี", "ログインまたは無料登録");

  return (
    <>
      <div className="profile-menu-wrap">
        <button
          className={`auth-btn${user ? " auth-btn-user" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          title={user ? user.username : t(lang, "Log in", "เข้าสู่ระบบ", "ログイン")}
        >
          {user
            ? (
              <span className="auth-avatar">
                {user.starter
                  ? <img src={artworkUrl(user.starter)} alt="" />
                  : user.username.charAt(0).toUpperCase()}
              </span>
            )
            : <LogIn size={17} strokeWidth={2.2} />}
        </button>
        {menuOpen && (
          <ProfileMenu lang={lang} user={user} theme={theme} toggleTheme={toggleTheme} autoMode={autoMode}
            settingsHasUpdate={settingsHasUpdate}
            onProfile={() => { setMenuOpen(false); setOpen(true); }}
            onSettings={() => { setMenuOpen(false); onOpenSettings?.(); }}
            onLogout={() => { setMenuOpen(false); logout(); }}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
      {open && createPortal(
        <div className="auth-overlay" onClick={() => setOpen(false)}>
          <div className="auth-drawer" onClick={(e) => e.stopPropagation()}>
            {!showProfile && subScreen === "home" ? (
              <div className="auth-plain-card">
                <button type="button" className="auth-plain-close" onClick={() => setOpen(false)}>✕</button>
                <div className="auth-plain-title">
                  {tab === "login"
                    ? t(lang, "Account Login", "เข้าสู่ระบบ", "アカウントログイン")
                    : t(lang, "Create Account", "สมัครสมาชิก", "アカウント作成")}
                </div>
                {tab === "login"
                  ? <LoginForm lang={lang} onSubmit={handleLogin} submitting={submitting} error={error} />
                  : <RegisterForm lang={lang} onSubmit={handleRegister} submitting={submitting} error={error} />}
                <div className="auth-plain-footer">
                  <div className="auth-switch">
                    {tab === "login" ? (
                      <>
                        {t(lang, "New here?", "ยังไม่มีบัญชี?", "初めてですか？")}
                        <button type="button" onClick={() => { setTab("register"); setError(""); }}>
                          {t(lang, "Create an account", "สร้างบัญชีใหม่", "アカウントを作成")}
                        </button>
                      </>
                    ) : (
                      <>
                        {t(lang, "Already have an account?", "มีบัญชีอยู่แล้ว?", "すでにアカウントをお持ちですか？")}
                        <button type="button" onClick={() => { setTab("login"); setError(""); }}>
                          {t(lang, "Log in", "เข้าสู่ระบบ", "ログイン")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <AuthHero title={heroTitle} subtitle={heroSub} onClose={() => setOpen(false)}
                  overlap={showProfile && subScreen === "home"} />
                <div className="auth-body">
                  {subScreen === "starter" ? (
                    <StarterGrid lang={lang} current={user?.starter} saving={savingField}
                      onPick={handlePickStarter} onBack={() => setSubScreen("home")} />
                  ) : (
                    <div className="auth-profile">
                      <div className="auth-profile-avatar">
                        {user.starter ? <img src={artworkUrl(user.starter)} alt="" /> : user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="auth-profile-name">{user.username}</div>
                      <div className="auth-profile-id-badge">
                        <span>{t(lang, "Trainer ID", "รหัสเทรนเนอร์", "トレーナーID")}</span>
                        <strong>{user.trainerId}</strong>
                      </div>

                      <div className="auth-stats-grid">
                        <StatTile icon={Heart} value={favCount} label={t(lang, "Favorites", "รายการโปรด", "お気に入り")} />
                        <StatTile icon={Flame} value={streak} label={t(lang, "Streak", "สตรีค", "連続記録")} />
                        <StatTile icon={Target} value={myCatchCount ?? 0} label={t(lang, "Caught", "จับแล้ว", "捕獲数")} />
                      </div>

                      <BirthdaySection lang={lang} birthday={user.birthday} saving={savingField} onSave={handleSaveBirthday} />

                      <div className="auth-profile-links">
                        <button type="button" className="auth-mini-btn" onClick={() => setSubScreen("starter")}>
                          {t(lang, "Change starter", "เปลี่ยนตัวเริ่มต้น", "スターター変更")}
                        </button>
                      </div>

                      <button className="auth-logout-btn" onClick={() => { logout(); setOpen(false); }}>
                        <LogOut size={15} strokeWidth={2.2} />
                        {t(lang, "Log out", "ออกจากระบบ", "ログアウト")}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
