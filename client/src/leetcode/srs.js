// Spaced-repetition schedule and date helpers for the LeetCode review queue.
// Dates are local calendar days as "YYYY-MM-DD" strings, so a review "due today"
// means today in the visitor's own time zone.

// Days until the next review at each level. A clean solve moves up one level;
// a clean solve at the last level retires the problem as mastered.
export const GAPS = [1, 3, 7, 14, 30, 60];
export const MAX_LEVEL = GAPS.length - 1;

export const RESULT_LABEL = { fail: "Failed", hint: "Struggled", ok: "Clean" };

export function schedule(level, result, date) {
  if (result === "fail") return { stage: 0, next: addDays(date, 1), mastered: false };
  if (result === "hint") {
    return { stage: level, next: addDays(date, Math.min(3, GAPS[level])), mastered: false };
  }
  if (level >= MAX_LEVEL) return { stage: GAPS.length, next: null, mastered: true };
  return { stage: level + 1, next: addDays(date, GAPS[level + 1]), mastered: false };
}

export function localDate(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parse(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

export function daysBetween(a, b) {
  return Math.round((parse(b) - parse(a)) / 864e5);
}

export function weekStart(d = new Date()) {
  const s = new Date(d);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday
  return localDate(s);
}

export function niceDate(iso) {
  return parse(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function relative(iso, today) {
  const n = daysBetween(today, iso);
  if (n < 0) return `${-n}d overdue`;
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  return `in ${n} days`;
}

// Apply one attempt to a stored record (or create one) and return the new record.
export function applyAttempt(record, num, result, note, today) {
  if (!record) {
    const s = schedule(0, result, today);
    return {
      num,
      note: note || "",
      attempts: [{ date: today, result }],
      stage: s.stage,
      next: s.next,
      mastered: false,
      added: today,
    };
  }
  const level = record.mastered ? MAX_LEVEL : record.stage || 0;
  const s = schedule(level, result, today);
  return {
    ...record,
    note: note || record.note || "",
    attempts: [...(record.attempts || []), { date: today, result }].slice(-40),
    stage: s.stage,
    next: s.next,
    mastered: s.mastered,
  };
}
