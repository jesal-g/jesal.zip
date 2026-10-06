import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Window from "../components/Window";
import {
  RESULT_LABEL,
  applyAttempt,
  daysBetween,
  localDate,
  niceDate,
  relative,
  weekStart,
} from "./srs";
import { load, mergeBackup, save, toBackup } from "./storage";

const ReactiveBackground = lazy(() => import("../components/ReactiveBackground"));

const DIFF = { E: "Easy", M: "Medium", H: "Hard" };
const DIFF_CLASS = {
  E: "bg-green-100 text-green-800",
  M: "bg-yellow-100 text-yellow-800",
  H: "bg-red-100 text-red-800",
};
const RESULT_BUTTONS = [
  { result: "fail", label: "Failed", long: "Failed / read the solution", cls: "bg-red-500 hover:bg-red-600" },
  { result: "hint", label: "Struggled", long: "Struggled (hint or 30+ min)", cls: "bg-yellow-500 hover:bg-yellow-600" },
  { result: "ok", label: "Solved clean", long: "Solved clean", cls: "bg-green-500 hover:bg-green-600" },
];
const DOT = { fail: "bg-red-500", hint: "bg-yellow-500", ok: "bg-green-500" };

// Problem titles, difficulty and tags, loaded once from /public.
function useCatalog() {
  const [catalog, setCatalog] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/leetcode-catalog.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((c) => {
        const byId = new Map(c.rows.map((r) => [r[0], r]));
        const lookup = (num) => {
          const r = byId.get(Number(num));
          if (!r) return null;
          return {
            num: r[0],
            title: r[1],
            slug: r[2],
            diff: r[3],
            tags: r[4].map((i) => c.tags[i]),
            pattern: c.patterns[r[5]],
            paid: !!r[6],
          };
        };
        setCatalog({ lookup, maxId: c.maxId, count: c.count });
      })
      .catch(() => setFailed(true));
  }, []);
  return { catalog, failed };
}

function useToday() {
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const id = setInterval(() => setToday(localDate()), 60000);
    return () => clearInterval(id);
  }, []);
  return today;
}

const ProblemLink = ({ p }) => (
  <a
    href={`https://leetcode.com/problems/${p.slug}/`}
    target="_blank"
    rel="noopener noreferrer"
    className="font-bold text-blue-500 hover:underline break-words"
  >
    {p.title}
  </a>
);

const Pill = ({ children, className = "bg-gray-100 text-gray-700" }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}>{children}</span>
);

const LeetcodeApp = () => {
  const { catalog, failed: catalogFailed } = useCatalog();
  const today = useToday();
  const [{ ok: storageOk, problems: initial }] = useState(load);
  const [problems, setProblems] = useState(initial);
  const [saveFailed, setSaveFailed] = useState(!storageOk);
  const [num, setNum] = useState("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);
  const numRef = useRef(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  const commit = (next) => {
    setProblems(next);
    setSaveFailed(!save(next));
  };

  // Stored records joined with catalog details
  const all = useMemo(() => {
    const fill = (p) => {
      const m = catalog?.lookup(p.num);
      return {
        ...p,
        title: m?.title || `Problem ${p.num}`,
        slug: m?.slug || "",
        diff: m?.diff,
        pattern: m?.pattern || "Other",
        tags: m?.tags || [],
      };
    };
    return Object.values(problems).map(fill);
  }, [problems, catalog]);

  const active = all.filter((p) => !p.mastered && p.next);
  const byNext = (a, b) => a.next.localeCompare(b.next) || a.num - b.num;
  const due = active.filter((p) => p.next <= today).sort(byNext);
  const upcoming = active.filter((p) => p.next > today).sort(byNext);
  const next30 = upcoming.filter((p) => daysBetween(today, p.next) <= 30);
  const scheduleDays = [];
  for (const p of next30) {
    const last = scheduleDays.at(-1);
    if (last && last.date === p.next) last.items.push(p);
    else scheduleDays.push({ date: p.next, items: [p] });
  }
  const ws = weekStart();
  const newThisWeek = all.filter((p) => (p.attempts || [])[0]?.date >= ws).length;
  const inNextWeek = upcoming.filter((p) => daysBetween(today, p.next) <= 7).length;

  const record = (n, result, noteText = "") => {
    const key = String(n);
    const updated = applyAttempt(problems[key], Number(n), result, noteText.trim(), today);
    commit({ ...problems, [key]: updated });
    setToast(
      updated.mastered
        ? `#${n} mastered. Out of rotation.`
        : `#${n}: next review ${niceDate(updated.next)} (${relative(updated.next, today)})`
    );
  };

  const cleanNum = num.trim().replace(/^#/, "");
  const found = /^\d{1,5}$/.test(cleanNum) ? catalog?.lookup(cleanNum) : null;
  const tracked = found ? problems[String(found.num)] : null;

  const logNew = (result) => {
    if (!found) return;
    record(found.num, result, note);
    setNum("");
    setNote("");
    numRef.current?.focus();
  };

  const remove = (key) => {
    if (confirmDelete !== key) {
      setConfirmDelete(key);
      setTimeout(() => setConfirmDelete((c) => (c === key ? null : c)), 4000);
      return;
    }
    const next = { ...problems };
    delete next[key];
    commit(next);
    setConfirmDelete(null);
    setToast(`Deleted #${key}`);
  };

  const download = () => {
    const blob = new Blob([toBackup(problems)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leetcode-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { merged, added, updated } = mergeBackup(problems, await file.text());
      commit(merged);
      setToast(`Restored: ${added} added, ${updated} updated`);
    } catch {
      setToast("That file isn't a backup from this page.");
    }
  };

  const q = query.trim().toLowerCase();
  const tableRows = all
    .filter((p) => !q || String(p.num).includes(q) || p.title.toLowerCase().includes(q) || p.pattern.toLowerCase().includes(q))
    .sort((a, b) => a.mastered - b.mastered || String(a.next || "9").localeCompare(String(b.next || "9")));

  return (
    <div className="relative w-screen min-h-screen font-mono text-gray-900">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <Suspense fallback={null}>
          <ReactiveBackground />
        </Suspense>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 grid gap-6">
        <Window width="w-full" height="h-auto" title="📝 leetcode/README.md">
          <div className="grid gap-3">
            <a href="https://jesal.zip" className="text-sm text-blue-500 hover:underline">← jesal.zip</a>
            <h1 className="font-title text-3xl sm:text-4xl leading-tight bg-gradient-to-r from-teal-500 via-green-500 to-teal-500 bg-clip-text text-transparent">
              LEETCODE REVIEW QUEUE
            </h1>
            <p className="text-gray-700">
              Log a problem number and how it went. Anything you fail comes back tomorrow, then at
              3, 7, 14, 30 and 60 days as you solve it cleanly. Five clean solves in a row and it&apos;s mastered.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                [due.length, "due today"],
                [inNextWeek, "next 7 days"],
                [newThisWeek, "new this week"],
                [all.length, `tracked · ${all.filter((p) => p.mastered).length} mastered`],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg bg-gray-100 px-3 py-2">
                  <div className="text-2xl font-bold tabular-nums">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
            {saveFailed && (
              <p className="rounded-lg bg-red-100 text-red-800 px-3 py-2 text-sm">
                This browser isn&apos;t letting the page save (private window or blocked site data).
                Changes will be lost when you close the tab. Download a backup before you leave.
              </p>
            )}
            {catalogFailed && (
              <p className="rounded-lg bg-red-100 text-red-800 px-3 py-2 text-sm">
                Couldn&apos;t load problem details. Reload the page to try again.
              </p>
            )}
          </div>
        </Window>

        <Window width="w-full" height="h-auto" title={`🔁 due_today.txt (${due.length})`}>
          {due.length === 0 ? (
            <p className="text-gray-500">
              {all.length
                ? "No reviews due today. Do a new problem and log it below."
                : "Nothing here yet. Log your first attempt below, especially a failed one. Those are what this queue is for."}
            </p>
          ) : (
            <ul className="grid gap-3">
              {due.map((p) => {
                const late = p.next < today;
                const last = (p.attempts || []).at(-1);
                return (
                  <li
                    key={p.num}
                    className={`rounded-lg border p-3 grid gap-2 ${late ? "border-red-300 border-l-4 border-l-red-500" : "border-gray-200"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums text-gray-500">{p.num}</span>
                      <ProblemLink p={p} />
                      {p.diff && <Pill className={DIFF_CLASS[p.diff]}>{DIFF[p.diff]}</Pill>}
                      <Pill>{p.pattern}</Pill>
                    </div>
                    <div className={`text-xs ${late ? "text-red-600 font-bold" : "text-gray-500"}`}>
                      {late ? relative(p.next, today) : "due today"} · last: {last ? RESULT_LABEL[last.result] : "–"} · level {p.stage}/5
                    </div>
                    {p.note && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-500">Show my key insight (try first)</summary>
                        <p className="mt-1 whitespace-pre-wrap rounded bg-gray-100 px-3 py-2">{p.note}</p>
                      </details>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {RESULT_BUTTONS.map((b) => (
                        <button
                          key={b.result}
                          onClick={() => record(p.num, b.result)}
                          className={`${b.cls} text-white text-sm px-3 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Window>

        <Window width="w-full" height="h-auto" title="➕ log_attempt.sh">
          <div className="grid gap-3">
            <div className="grid sm:grid-cols-[9rem_1fr] gap-3 items-start">
              <label className="grid gap-1 text-sm text-gray-500 min-w-0">
                Problem number
                <input
                  ref={numRef}
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="146"
                  className="w-full min-w-0 text-lg text-gray-900 border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <div className={`min-h-[4rem] rounded border px-3 py-2 grid gap-1 content-center ${found ? "border-gray-300" : "border-dashed border-gray-300"}`}>
                {!cleanNum ? (
                  <span className="text-sm text-gray-500">Type a number to look up the problem.</span>
                ) : !catalog ? (
                  <span className="text-sm text-gray-500">Loading problem list…</span>
                ) : !found ? (
                  <span className="text-sm text-red-600">No problem #{cleanNum} in the list (covers #1 to #{catalog.maxId}).</span>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <ProblemLink p={found} />
                      <Pill className={DIFF_CLASS[found.diff]}>{DIFF[found.diff]}</Pill>
                      <Pill>{found.pattern}</Pill>
                      {found.paid && <Pill>Premium</Pill>}
                    </div>
                    <span className="text-xs text-gray-500">{found.tags.join(" · ")}</span>
                    {tracked && (
                      <span className="text-xs text-gray-500">
                        Already tracked{tracked.mastered ? " (mastered)" : `, next review ${niceDate(tracked.next)}`}. Logging now counts as a review.
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <label className="grid gap-1 text-sm text-gray-500">
              Key insight (optional, hidden at review time until you choose to show it)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="What you'd tell yourself next time"
                className="text-gray-900 border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {RESULT_BUTTONS.map((b) => (
                <button
                  key={b.result}
                  onClick={() => logNew(b.result)}
                  disabled={!found}
                  className={`${b.cls} text-white text-sm px-3 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
                >
                  {b.long}
                </button>
              ))}
            </div>
          </div>
        </Window>

        <Window width="w-full" height="h-auto" title="🗓️ schedule.ics (next 30 days)">
          {scheduleDays.length === 0 ? (
            <p className="text-gray-500">
              {upcoming.length
                ? `Nothing in the next 30 days. ${upcoming.length} scheduled later.`
                : "Nothing scheduled yet. Every problem you log gets a review date here."}
            </p>
          ) : (
            <div className="grid divide-y divide-gray-200">
              {scheduleDays.map((d) => (
                <div key={d.date} className="grid sm:grid-cols-[8.5rem_1fr] gap-1 sm:gap-3 py-2">
                  <div>
                    <div className="font-bold text-sm">{niceDate(d.date)}</div>
                    <div className="text-xs text-gray-500">
                      {relative(d.date, today)} · {d.items.length} problem{d.items.length > 1 ? "s" : ""}
                    </div>
                  </div>
                  <ul className="grid gap-1 min-w-0">
                    {d.items.map((p) => (
                      <li key={p.num} className="flex flex-wrap items-baseline gap-2 text-sm">
                        <span className="tabular-nums text-gray-500">{p.num}</span>
                        <ProblemLink p={p} />
                        {p.diff && <Pill className={DIFF_CLASS[p.diff]}>{DIFF[p.diff]}</Pill>}
                        <span className="text-xs text-gray-500">level {p.stage}/5</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {upcoming.length > next30.length && (
                <p className="pt-2 text-xs text-gray-500">{upcoming.length - next30.length} more scheduled after 30 days.</p>
              )}
            </div>
          )}
        </Window>

        <Window width="w-full" height="h-auto" title={`📚 all_problems.csv (${all.length})`}>
          <div className="grid gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search number, title or pattern"
              aria-label="Search problems"
              className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">History</th>
                    <th className="py-2 pr-3">Level</th>
                    <th className="py-2 pr-3">Next</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tableRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-gray-500">
                        {all.length ? "No problems match." : "Logged problems show up here."}
                      </td>
                    </tr>
                  )}
                  {tableRows.map((p) => (
                    <tr key={p.num} className="whitespace-nowrap">
                      <td className="py-2 pr-3 tabular-nums">{p.num}</td>
                      <td className="py-2 pr-3">
                        <ProblemLink p={p} /> <span className="text-xs text-gray-500">{p.pattern}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="inline-flex gap-1">
                          {(p.attempts || []).slice(-8).map((a, i) => (
                            <span
                              key={i}
                              title={`${a.date}: ${RESULT_LABEL[a.result]}`}
                              className={`inline-block w-2.5 h-2.5 rounded-full ${DOT[a.result]}`}
                            />
                          ))}
                        </span>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{p.mastered ? "done" : `${p.stage}/5`}</td>
                      <td className="py-2 pr-3">{p.mastered ? "mastered" : niceDate(p.next)}</td>
                      <td className="py-2">
                        <button onClick={() => remove(String(p.num))} className="text-xs text-gray-500 underline hover:text-red-600">
                          {confirmDelete === String(p.num) ? "Confirm delete" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Window>

        <Window width="w-full" height="h-auto" title="💾 backup.json">
          <div className="grid gap-3 text-sm">
            <p className="text-gray-700">
              Your problems are saved in this browser only. Download a backup now and then, and restore it to
              move your queue to another device. Restoring merges: for a problem in both, the more recent copy wins.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={download} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded">
                Download backup
              </button>
              <button onClick={() => fileRef.current?.click()} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1.5 rounded">
                Restore from backup
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={restore} className="hidden" />
            </div>
            {catalog && (
              <p className="text-xs text-gray-500">
                Problem details cover LeetCode #1 to #{catalog.maxId} ({catalog.count.toLocaleString()} problems).
              </p>
            )}
          </div>
        </Window>
      </main>

      <div
        role="status"
        aria-live="polite"
        className={`fixed left-1/2 -translate-x-1/2 bottom-5 max-w-[calc(100%-2rem)] bg-gray-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg transition-opacity ${toast ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {toast}
      </div>
    </div>
  );
};

export default LeetcodeApp;
