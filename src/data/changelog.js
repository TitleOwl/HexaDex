// ═══════════════════════════════════════════════════════════════════════
// changelog.js — Real-time changelog from GitHub Commits API
// ───────────────────────────────────────────────────────────────────────
// Auto-computes version using semantic versioning:
//   feat:   → minor bump (resets patch)   1.0.0 → 1.1.0
//   fix/ui/perf/security → patch bump      1.0.0 → 1.0.1
//   chore/other → no bump
//
// Display only — no links to GitHub
// Cache 30 min to respect API rate limit (60 req/hr)
// ═══════════════════════════════════════════════════════════════════════

const GITHUB_REPO = "TitleOwl/HexaDex";
const SINCE_DATE  = "2026-06-04T00:00:00Z"; // baseline launch date
const BASELINE_VERSION = { major: 1, minor: 0, patch: 0 };

// ─── Conventional commit type detection ──────────────────────────────
function parseCommitType(message) {
  const m = message.toLowerCase().trim();

  // Standard conventional commit prefixes
  if (m.match(/^(feat|feature|add|new)[:\s(]/)) return "feature";
  if (m.match(/^(fix|bug|hotfix)[:\s(]/))        return "fix";
  if (m.match(/^(style|ui|css|design)[:\s(]/))   return "ui";
  if (m.match(/^(perf|optimize|speed)[:\s(]/))   return "perf";
  if (m.match(/^(security|sec|csp)[:\s(]/))      return "security";
  if (m.match(/^(chore|docs|refactor|build|ci|test)[:\s(]/)) return "chore";

  // Smart keyword fallback
  if (m.match(/(security|csp|api[\s-]?key|auth|secure|hack)/)) return "security";
  if (m.match(/(responsive|mobile|design|theme|color|layout|css)/)) return "ui";
  if (m.match(/(speed|optimize|cache|perf|fast)/)) return "perf";
  if (m.match(/^(fix|bug|broken|error|issue)/))    return "fix";
  if (m.match(/^(add|new|implement)/))              return "feature";

  return "other";
}

// ─── Clean up commit message ─────────────────────────────────────────
function cleanMessage(msg) {
  return msg
    .replace(/^(feat|fix|style|ui|perf|security|chore|docs|refactor|build|ci|test|sec)(\([^)]+\))?[:\s]+/i, '')
    .split('\n')[0]
    .trim()
    .replace(/^./, c => c.toUpperCase());
}

// ─── Semantic version computation ────────────────────────────────────
// Walk commits oldest → newest, applying bumps
function computeVersion(commits) {
  let { major, minor, patch } = BASELINE_VERSION;

  // Reverse to chronological order (oldest first)
  const ordered = [...commits].reverse();

  for (const c of ordered) {
    switch (c.type) {
      case "feature":
        minor++;
        patch = 0;  // reset patch on minor bump (semver)
        break;
      case "fix":
      case "security":
      case "ui":
      case "perf":
        patch++;
        break;
      // chore / other don't bump version
    }
  }

  return `${major}.${minor}.${patch}`;
}

// ─── Cache layer ─────────────────────────────────────────────────────
const CACHE_KEY = "pkdx_changelog_cache_v2";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function setCached(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      ...payload,
    }));
  } catch {}
}

// ─── Synchronous getters (read from cache) ───────────────────────────
export function getCurrentVersion() {
  try {
    const cached = getCached();
    return cached?.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

export function getLatestCommitDate() {
  try {
    const cached = getCached();
    return cached?.date || "2026-06-04";
  } catch {
    return "2026-06-04";
  }
}

// ─── Main async fetch ────────────────────────────────────────────────
export async function fetchChangelog(forceRefresh = false) {
  // 1. Try cache first
  if (!forceRefresh) {
    const cached = getCached();
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return {
        commits: cached.commits || [],
        version: cached.version || "1.0.0",
        date:    cached.date || "2026-06-04",
        fromCache: true,
        error: null,
      };
    }
  }

  // 2. Fetch from GitHub
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=100&since=${SINCE_DATE}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github+json' },
    });

    if (!res.ok) {
      const cached = getCached();
      if (cached?.commits) {
        return {
          commits: cached.commits,
          version: cached.version || "1.0.0",
          date:    cached.date || "2026-06-04",
          fromCache: true,
          error: `GitHub API ${res.status}`,
        };
      }
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const raw = await res.json();

    const commits = raw
      .filter(c => !c.commit.message.toLowerCase().startsWith('merge '))
      .map(c => ({
        sha:     c.sha.slice(0, 7),
        type:    parseCommitType(c.commit.message),
        message: cleanMessage(c.commit.message),
        date:    c.commit.author.date.split('T')[0],
        time:    c.commit.author.date,
        author:  c.commit.author?.name || "unknown",
      }));

    const version = computeVersion(commits);
    const date    = commits[0]?.date || "2026-06-04";

    setCached({ commits, version, date });

    return { commits, version, date, fromCache: false, error: null };

  } catch (e) {
    console.error('Failed to fetch changelog:', e);
    const cached = getCached();
    if (cached?.commits) {
      return {
        commits: cached.commits,
        version: cached.version || "1.0.0",
        date:    cached.date || "2026-06-04",
        fromCache: true,
        error: e.message,
      };
    }
    return { commits: [], version: "1.0.0", date: "2026-06-04", fromCache: false, error: e.message };
  }
}

// ─── Group commits by date ───────────────────────────────────────────
export function groupByDate(commits) {
  const groups = {};
  commits.forEach(c => {
    if (!groups[c.date]) groups[c.date] = [];
    groups[c.date].push(c);
  });
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

// ─── Count commits by type (for stats) ───────────────────────────────
export function getCommitStats(commits) {
  const stats = { feature: 0, fix: 0, ui: 0, perf: 0, security: 0, chore: 0, other: 0 };
  commits.forEach(c => {
    if (stats[c.type] !== undefined) stats[c.type]++;
  });
  return stats;
}

// ─── Unseen detection ────────────────────────────────────────────────
export function hasUnseenVersion() {
  try {
    const lastSeen = localStorage.getItem("pkdx_last_seen_commit");
    const cached   = getCached();
    if (!cached?.commits?.length) return false;
    const latestSha = cached.commits[0].sha;
    return lastSeen !== latestSha;
  } catch {
    return false;
  }
}

export function markVersionSeen() {
  try {
    const cached = getCached();
    if (cached?.commits?.length) {
      localStorage.setItem("pkdx_last_seen_commit", cached.commits[0].sha);
    }
  } catch {}
}

// ─── Pre-warm on app start ───────────────────────────────────────────
export function prewarmChangelog() {
  fetchChangelog().catch(() => {});
}