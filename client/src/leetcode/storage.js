// Backups, plus problems left in this browser's localStorage by the earlier
// browser-only version of the page (offered for upload once you sign in).

const LEGACY_KEY = "jesal.zip/leetcode/v1";

export function loadLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    return raw ? JSON.parse(raw).problems || {} : {};
  } catch {
    return {};
  }
}

export function clearLegacy() {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // nothing to clear
  }
}

export function toBackup(problems) {
  return JSON.stringify(
    { app: "jesal.zip/leetcode", version: 1, exported: new Date().toISOString(), problems },
    null,
    2
  );
}

export function parseBackup(text) {
  const data = JSON.parse(text);
  if (!data || typeof data.problems !== "object") throw new Error("not a backup");
  return data.problems;
}

const lastDate = (p) => (p.attempts || []).at(-1)?.date || "";

// Records from `incoming` that are new or more recent than what `current` has.
// For a problem in both, the copy attempted more recently wins (ties: more attempts).
export function newerRecords(current, incoming) {
  const out = [];
  for (const [key, p] of Object.entries(incoming || {})) {
    if (!p || !Number.isInteger(p.num) || !Array.isArray(p.attempts)) continue;
    const mine = current[key];
    if (
      !mine ||
      lastDate(p) > lastDate(mine) ||
      (lastDate(p) === lastDate(mine) && p.attempts.length > (mine.attempts || []).length)
    ) {
      out.push(p);
    }
  }
  return out;
}
