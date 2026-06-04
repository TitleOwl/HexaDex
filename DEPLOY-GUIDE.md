# 🚀 HexaDex Deploy Guide

End-to-end deployment to Vercel + Security setup

---

## 📋 Pre-Deploy Checklist

### Step 1: Local Verification

```bash
cd ~/HexaDex

# 1. Test production build
npm run build

# 2. Preview production build locally
npm run preview
# Opens http://localhost:4173 — test everything works
```

If build fails → fix errors first before proceeding.

### Step 2: Files Check

```bash
# Ensure .env.local is gitignored
cat .gitignore | grep -i env
# Must show: .env.local (or .env*)

# If missing, add it:
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore
echo "dist" >> .gitignore
echo "node_modules" >> .gitignore

# Verify NO API keys are hardcoded in source:
grep -rn "GEMINI\|API_KEY\|AQ\." src/ --exclude-dir=node_modules | grep -v "import.meta.env"
# Should return empty (only env-based references)
```

### Step 3: Update Files in This Bundle

Copy these to your project:
- `vercel.json` → `~/HexaDex/vercel.json` (security headers)
- `src/data/changelog.js` → `~/HexaDex/src/data/changelog.js`
- `src/components/Changelog.jsx` → `~/HexaDex/src/components/Changelog.jsx`
- `src/responsive.css` → `~/HexaDex/src/responsive.css`

### Step 4: Import responsive.css in main.jsx

```jsx
// ~/HexaDex/src/main.jsx
import './App.css'
import './responsive.css'   // ← ADD THIS LINE
```

---

## 🌐 Deploy to Vercel (Method A: GitHub)

### 1. Push to GitHub

```bash
cd ~/HexaDex
git add .
git commit -m "Pre-deploy: responsive design + security headers + changelog"
git push origin main
```

### 2. Connect Vercel

1. Go to https://vercel.com/new
2. Import your `HexaDex` repository
3. Framework Preset: **Vite** (auto-detected)
4. Build Command: `npm run build`
5. Output Directory: `dist`

### 3. Add Environment Variables

In Vercel project → **Settings → Environment Variables**

| Name | Value | Environments |
|---|---|---|
| `GEMINI_API_KEY` | Your `AQ.xxxxxxxx` key | Production, Preview, Development |

### 4. Deploy

Click **Deploy** → wait 2-3 minutes → your site is live at `https://YOUR-PROJECT.vercel.app`

---

## 🌐 Deploy to Vercel (Method B: CLI)

```bash
# Install Vercel CLI globally
npm i -g vercel

cd ~/HexaDex
vercel login        # auth via browser
vercel              # follow prompts (link to project)
vercel --prod       # deploy to production

# Add env var via CLI:
vercel env add GEMINI_API_KEY production
# (paste your AQ.xxx key when prompted)

# Redeploy after env var:
vercel --prod
```

---

## 🔒 Security Setup

### 1. Restrict Gemini API Key (CRITICAL)

Go to https://aistudio.google.com/apikey → click your key:

1. **HTTP referrers restriction:**
   - Add `https://YOUR-PROJECT.vercel.app/*`
   - Add `https://*.vercel.app/*` (for preview deployments)
   - Add `http://localhost:5173/*` (for dev)

2. **API restrictions:**
   - Restrict to "Generative Language API" only

This prevents anyone who finds your key from using it on other sites.

### 2. Security Headers (auto via vercel.json)

✅ Already configured in `vercel.json`:

| Header | Purpose |
|---|---|
| `Content-Security-Policy` | Blocks unauthorized scripts/connections |
| `Strict-Transport-Security` | Forces HTTPS for 1 year |
| `X-Frame-Options: SAMEORIGIN` | Prevents clickjacking |
| `X-Content-Type-Options: nosniff` | Prevents MIME type sniffing |
| `Referrer-Policy` | Limits referrer info leaking |
| `Permissions-Policy` | Restricts browser APIs (camera/mic/geo only on your domain) |

### 3. Verify Security After Deploy

Open https://securityheaders.com → paste your URL → should get **A** or **A+** grade.

Also test:
- https://observatory.mozilla.org/ — Mozilla security scan
- https://www.ssllabs.com/ssltest/ — SSL/TLS test (Vercel = A+ by default)

### 4. Dependency Audit

```bash
cd ~/HexaDex
npm audit
# Fix any high/critical vulnerabilities:
npm audit fix
```

### 5. Production Build Check

```bash
npm run build

# Search built bundle for accidental key leaks:
grep -r "AQ\." dist/ 2>/dev/null
# Should return EMPTY — if not, you have a leak!
```

---

## 🎯 Changelog Integration

### Add to Settings Menu

Find your settings/more menu in `Header.jsx` and add a "What's New" button.

**Quick integration in App.jsx:**

```jsx
// 1. Import at top
import Changelog from "./components/Changelog.jsx";
import { hasUnseenVersion } from "./data/changelog.js";

// 2. Add state inside App() function
const [showChangelog, setShowChangelog] = useState(false);
const [hasUpdate, setHasUpdate] = useState(false);

// 3. Check on mount
useEffect(() => {
  setHasUpdate(hasUnseenVersion());
}, []);

// 4. Pass to Header (or wherever you have settings):
// <Header
//   onOpenChangelog={() => { setShowChangelog(true); setHasUpdate(false); }}
//   hasUpdate={hasUpdate}
//   ...
// />

// 5. Render the modal (add at bottom of JSX, near other modals):
{showChangelog && (
  <Changelog lang={lang} onClose={() => setShowChangelog(false)} />
)}
```

### In Header — Add the menu button

```jsx
// In your existing settings/menu code, add:
<button
  onClick={onOpenChangelog}
  className="header-menu-item"
  style={{ position: "relative" }}
>
  📋 {lang === "th" ? "อัปเดตล่าสุด" : "What's New"}
  {hasUpdate && (
    <span style={{
      position: "absolute", top: 4, right: 4,
      width: 8, height: 8, borderRadius: "50%",
      background: "#ef4444",
      boxShadow: "0 0 6px rgba(239, 68, 68, 0.6)",
    }} />
  )}
</button>
```

### Future Updates — Adding new versions

When you release a new version, edit `src/data/changelog.js`:

```js
export const APP_VERSION = "1.1.0";  // ← bump version
export const APP_BUILD_DATE = "2026-XX-XX";

export const CHANGELOG = [
  {
    version: "1.1.0",
    date: "2026-XX-XX",
    badge: { en: "NEW", th: "ใหม่", ja: "新規" },
    badgeColor: "#10b981",
    title: { en: "Your update title", th: "...", ja: "..." },
    changes: [
      { type: "feature", text: { en: "...", th: "...", ja: "..." } },
      { type: "fix",     text: { en: "...", th: "...", ja: "..." } },
    ],
  },
  // ↑ Prepend new versions at the top
  // ↓ Old versions stay below
  { version: "1.0.0", ... },
];
```

When users open the app:
- If they haven't seen this version → red dot appears on settings button
- They click "What's New" → see the changelog → dot disappears

---

## ✅ Post-Deploy Checklist

After your first deploy, verify:

- [ ] Site loads at `https://YOUR-PROJECT.vercel.app`
- [ ] All pages work: Pokédex, Team, GO Tools, Games
- [ ] SnapSearch (camera) works — Gemini API responds
- [ ] Theme toggle (light/dark) works
- [ ] Mobile responsive (test on real phone)
- [ ] PWA manifest loads (`/manifest.json` accessible)
- [ ] No console errors (F12 → Console)
- [ ] Security headers — check at https://securityheaders.com
- [ ] Update `vercel.json` — replace `YOUR-DOMAIN.vercel.app` with actual domain
- [ ] Gemini API key restricted by HTTP referrer
- [ ] Changelog modal opens from settings
- [ ] Custom domain (optional) — Vercel → Settings → Domains

---

## 🆘 Troubleshooting

### Build fails on Vercel

Check the build log:
- Missing env var? → add `GEMINI_API_KEY` in Vercel settings
- TypeScript error? → run `npm run build` locally first to reproduce
- Out of memory? → contact Vercel support (rare for Vite)

### SnapSearch doesn't work in production

- Check Vercel function logs: Project → Functions → `api/detect-pokemon`
- Verify env var exists: Settings → Environment Variables → `GEMINI_API_KEY` ✓
- Check Gemini API key has correct referrer restriction

### CSP errors in console

If you see "blocked by CSP" errors, you may need to add more domains to the `connect-src` or `img-src` in `vercel.json`. Common ones:
- Add `https://cdn.jsdelivr.net` for jsdelivr CDN
- Add `https://api.github.com` if you use GitHub API

After editing `vercel.json` → redeploy.

### Update vercel.json domain

Edit `vercel.json` → find `YOUR-DOMAIN.vercel.app` → replace with your actual domain → push to GitHub → auto-redeploy.

---

## 🎉 You're Production-Ready!

Your HexaDex is now:
- ✅ Deployed on Vercel
- ✅ HTTPS-only with security headers (A+ grade)
- ✅ API keys protected server-side
- ✅ Changelog feature for users to see updates
- ✅ Responsive on all devices
- ✅ Version-controlled with notification system

Happy launching! 🎮
