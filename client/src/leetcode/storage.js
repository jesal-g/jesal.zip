// Browser storage for the review queue. Everything lives in one localStorage key
// on this device; backups move it between devices.

const KEY = "jesal.zip/leetcode/v1";

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ok: true, problems: {} };
    const data = JSON.parse(raw);
    return { ok: true, problems: data.problems || {} };
  } catch {
    return { ok: false, problems: {} };
  }
}

export function save(problems) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, problems }));
    return true;
  } catch {
    return false;
  }
}

export function toBackup(problems) {
  return JSON.stringify(
    { app: "jesal.zip/leetcode", version: 1, exported: new Date().toISOString(), problems },
    null,
    2
  );
}

const lastDate = (p) => (p.attempts || []).at(-1)?.date || "";

// Merge a backup into the current data. For a problem in both, keep whichever
// copy was attempted more recently (ties go to the one with more attempts).
export function mergeBackup(current, text) {
  const data = JSON.parse(text);
  const incoming = data && typeof data.problems === "object" ? data.problems : null;
  if (!incoming) throw new Error("not a backup");
  const merged = { ...current };
  let added = 0;
  let updated = 0;
  for (const [key, p] of Object.entries(incoming)) {
    if (!p || !Number.isInteger(p.num) || !Array.isArray(p.attempts)) continue;
    const mine = merged[key];
    if (!mine) {
      merged[key] = p;
      added++;
    } else if (
      lastDate(p) > lastDate(mine) ||
      (lastDate(p) === lastDate(mine) && p.attempts.length > (mine.attempts || []).length)
    ) {
      merged[key] = p;
      updated++;
    }
  }
  return { merged, added, updated };
}
