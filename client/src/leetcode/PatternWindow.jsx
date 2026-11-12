import { useEffect, useMemo, useState } from "react";
import Window from "../components/Window";
import ProblemSearch from "./ProblemSearch";
import { describe } from "./catalog";
import { niceDate } from "./srs";

// Problems grouped by pattern: the NeetCode 150 roadmap plus Sean Prashad's LeetCode
// Patterns list (public/pattern-list.json), your own additions and moves (/api/patterns),
// and anything else you've logged. Shows difficulty and whether you've attempted each one.

const DIFF = { E: "Easy", M: "Medium", H: "Hard" };
const DIFF_CLASS = { E: "bg-green-100 text-green-800", M: "bg-yellow-100 text-yellow-800", H: "bg-red-100 text-red-800" };
const DOT = { fail: "bg-red-500", hint: "bg-yellow-500", ok: "bg-green-500" };
const NC150 = 1;
const SEAN = 2;
const NEW = "__new__";

function usePatternList() {
  const [list, setList] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/pattern-list.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setList)
      .catch(() => setFailed(true));
  }, []);
  return { list, failed };
}

// Pick an existing pattern or type a new one. Calls onDone(name) or onCancel().
function PatternPicker({ patterns, initial, onDone, onCancel, doneLabel = "Save" }) {
  const [choice, setChoice] = useState(patterns.includes(initial) ? initial : patterns[0]);
  const [name, setName] = useState("");
  const value = choice === NEW ? name.trim() : choice;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        aria-label="Pattern"
        className="text-sm border border-gray-300 rounded px-2 py-1"
      >
        {patterns.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value={NEW}>New pattern…</option>
      </select>
      {choice === NEW && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Pattern name"
          aria-label="New pattern name"
          className="text-sm border border-gray-300 rounded px-2 py-1"
        />
      )}
      <button
        onClick={() => value && onDone(value)}
        disabled={!value}
        className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded disabled:opacity-40"
      >
        {doneLabel}
      </button>
      {onCancel && (
        <button onClick={onCancel} className="text-xs text-gray-500 underline">
          Cancel
        </button>
      )}
    </div>
  );
}

function statusOf(rec, today) {
  if (!rec) return { key: "new", text: "Not attempted" };
  if (rec.mastered) return { key: "mastered", text: "Mastered" };
  if (rec.next <= today) return { key: "due", text: "Review due" };
  return { key: "attempted", text: `Next review ${niceDate(rec.next)}` };
}

function Row({ p, patterns, onLog, onMove, onReset, moving, setMoving }) {
  return (
    <li className="py-2 grid gap-1">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-500 hover:underline">
          {p.title}
        </a>
        {p.diff && <span className={`text-xs px-2 py-0.5 rounded-full ${DIFF_CLASS[p.diff]}`}>{DIFF[p.diff]}</span>}
        {p.flags & NC150 ? <span className="text-xs text-gray-500">NC150</span> : null}
        {p.flags & SEAN ? <span className="text-xs text-gray-500">Sean</span> : null}
        {p.premium && <span className="text-xs text-gray-500">Premium</span>}
        {p.mine && <span className="text-xs text-gray-500">{p.listed ? "moved by you" : "added by you"}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        <span className={`inline-flex items-center gap-1 ${p.status.key === "due" ? "text-red-600 font-bold" : ""}`}>
          {(p.rec?.attempts || []).slice(-5).map((a, i) => (
            <span key={i} title={`${a.date}`} className={`inline-block w-2 h-2 rounded-full ${DOT[a.result]}`} />
          ))}
          {p.status.text}
        </span>
        <button onClick={() => onLog(p)} className="underline hover:text-blue-600">
          Log
        </button>
        <button onClick={() => setMoving(moving ? null : p.id)} className="underline hover:text-blue-600">
          {moving ? "Close" : "Move"}
        </button>
        {p.mine && (
          <button onClick={() => onReset(p)} className="underline hover:text-red-600">
            {p.listed ? "Undo move" : "Remove from list"}
          </button>
        )}
      </div>
      {moving && (
        <PatternPicker
          patterns={patterns}
          initial={p.pattern}
          onDone={(name) => {
            onMove(p, name);
            setMoving(null);
          }}
          onCancel={() => setMoving(null)}
        />
      )}
    </li>
  );
}

const PatternWindow = ({ catalog, problems, custom, today, onLog, onSetPattern, onResetPattern }) => {
  const { list, failed } = usePatternList();
  const [source, setSource] = useState("all");
  const [diff, setDiff] = useState("all");
  const [status, setStatus] = useState("all");
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(() => new Set());
  const [moving, setMoving] = useState(null);
  const [adding, setAdding] = useState(null); // problem picked in the add form

  // Every problem: built-in list, then your additions and moves, then other tracked problems
  const entries = useMemo(() => {
    if (!list) return [];
    const byId = new Map();
    for (const [id, site, title, d, pi, flags, tagIdx, premium] of list.rows) {
      byId.set(id, {
        id,
        site,
        title,
        diff: d,
        pattern: list.patterns[pi],
        flags,
        tags: tagIdx.map((i) => list.tags[i]),
        premium: Boolean(premium),
        listed: true,
      });
    }
    for (const c of Object.values(custom)) {
      const base = byId.get(c.id);
      if (base) byId.set(c.id, { ...base, pattern: c.pattern, mine: true });
      else {
        const d = describe(catalog, c);
        byId.set(c.id, { id: c.id, site: c.site, title: d.title, diff: d.diff, pattern: c.pattern, flags: 0, tags: [], mine: true });
      }
    }
    for (const rec of Object.values(problems)) {
      if (byId.has(rec.id)) continue;
      const d = describe(catalog, rec);
      byId.set(rec.id, { id: rec.id, site: rec.site, title: d.title, diff: d.diff, pattern: d.pattern, flags: 0, tags: [], tracked: true });
    }
    return [...byId.values()].map((p) => {
      const rec = problems[p.id];
      return { ...p, rec, status: statusOf(rec, today), url: describe(catalog, p).url };
    });
  }, [list, custom, problems, catalog, today]);

  const patterns = useMemo(() => {
    const base = list ? list.patterns : [];
    const extra = [...new Set(entries.map((p) => p.pattern))].filter((p) => !base.includes(p)).sort();
    return [...base, ...extra];
  }, [list, entries]);

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = entries.filter(
    (p) =>
      (source === "all" ||
        (source === "nc150" && p.flags & NC150) ||
        (source === "sean" && p.flags & SEAN) ||
        (source === "mine" && (p.mine || p.tracked))) &&
      (diff === "all" || p.diff === diff) &&
      (status === "all" ||
        (status === "attempted" ? p.status.key !== "new" : p.status.key === status)) &&
      (!tag || p.tags.includes(tag)) &&
      words.every((w) => p.title.toLowerCase().includes(w) || p.pattern.toLowerCase().includes(w))
  );
  const filtering = source !== "all" || diff !== "all" || status !== "all" || Boolean(tag) || words.length > 0;
  const attempted = entries.filter((p) => p.rec).length;
  const tagCounts = useMemo(() => {
    const m = new Map();
    for (const p of entries) for (const t of p.tags) m.set(t, (m.get(t) || 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [entries]);

  const toggle = (name) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });

  const select = "text-sm border border-gray-300 rounded px-2 py-1";
  return (
    <Window width="w-full" height="h-auto" title={`🧭 patterns.md (${attempted}/${entries.length} attempted)`}>
      <div className="grid gap-3">
        <p className="text-sm text-gray-700">
          The NeetCode 150 roadmap and Sean Prashad&apos;s LeetCode Patterns list, under NeetCode&apos;s patterns. Problems
          NeetCode doesn&apos;t have link to LeetCode.
        </p>
        {failed && <p className="text-sm text-red-600">Couldn&apos;t load the pattern list. Reload to try again.</p>}
        <div className="flex flex-wrap gap-2">
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="List" className={select}>
            <option value="all">All lists</option>
            <option value="nc150">NeetCode 150</option>
            <option value="sean">Sean&apos;s list</option>
            <option value="mine">Added or logged by you</option>
          </select>
          <select value={diff} onChange={(e) => setDiff(e.target.value)} aria-label="Difficulty" className={select}>
            <option value="all">Any difficulty</option>
            <option value="E">Easy</option>
            <option value="M">Medium</option>
            <option value="H">Hard</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className={select}>
            <option value="all">Any status</option>
            <option value="new">Not attempted</option>
            <option value="attempted">Attempted</option>
            <option value="due">Review due</option>
            <option value="mastered">Mastered</option>
          </select>
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Topic tag" className={select}>
            <option value="">Any topic tag</option>
            {tagCounts.map(([t, n]) => (
              <option key={t} value={t}>
                {t} ({n})
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            aria-label="Search patterns"
            className={`${select} flex-1 min-w-[8rem]`}
          />
        </div>

        <div className="grid divide-y divide-gray-200">
          {patterns.map((name) => {
            const all = entries.filter((p) => p.pattern === name);
            const rows = shown.filter((p) => p.pattern === name);
            if (!rows.length && (filtering || !all.length)) return null;
            const done = all.filter((p) => p.rec).length;
            const isOpen = filtering || open.has(name);
            return (
              <div key={name} className="py-1">
                <button onClick={() => toggle(name)} className="w-full text-left py-1 flex items-center gap-3">
                  <span className="text-gray-500 w-3">{isOpen ? "▾" : "▸"}</span>
                  <span className="font-bold text-sm flex-1">{name}</span>
                  <span className="text-xs text-gray-500 tabular-nums">
                    {filtering ? `${rows.length} shown · ` : ""}
                    {done}/{all.length}
                  </span>
                  <span className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <span className="block h-full bg-green-500" style={{ width: `${all.length ? (100 * done) / all.length : 0}%` }} />
                  </span>
                </button>
                {isOpen && (
                  <ul className="grid divide-y divide-gray-100 pl-6">
                    {rows.map((p) => (
                      <Row
                        key={p.id}
                        p={p}
                        patterns={patterns}
                        onLog={onLog}
                        onMove={(prob, pattern) => onSetPattern(prob, pattern)}
                        onReset={onResetPattern}
                        moving={moving === p.id}
                        setMoving={setMoving}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {list && filtering && shown.length === 0 && <p className="py-2 text-sm text-gray-500">No problems match.</p>}
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500">Add a problem to a pattern</summary>
          <div className="mt-2 grid gap-2">
            <ProblemSearch catalog={catalog} onPick={setAdding} label="NeetCode problem" />
            {adding && (
              <div className="grid gap-2 rounded border border-gray-200 p-2">
                <span>
                  <b>{adding.title}</b>
                  {entries.find((p) => p.id === adding.id)?.listed && (
                    <span className="text-xs text-gray-500"> · already listed, this moves it</span>
                  )}
                </span>
                <PatternPicker
                  patterns={patterns}
                  initial={entries.find((p) => p.id === adding.id)?.pattern || adding.pattern}
                  doneLabel="Add"
                  onDone={(name) => {
                    onSetPattern(adding, name);
                    setOpen((s) => new Set(s).add(name));
                    setAdding(null);
                  }}
                  onCancel={() => setAdding(null)}
                />
              </div>
            )}
          </div>
        </details>
      </div>
    </Window>
  );
};

export default PatternWindow;
