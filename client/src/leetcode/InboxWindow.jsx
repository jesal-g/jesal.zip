import { useState } from "react";
import Window from "../components/Window";
import { localDate, niceDate } from "./srs";

const DIFF = { E: "Easy", M: "Medium", H: "Hard" };
const BUTTONS = [
  { result: "fail", label: "Failed", cls: "bg-red-500 hover:bg-red-600" },
  { result: "hint", label: "Struggled", cls: "bg-yellow-500 hover:bg-yellow-600" },
  { result: "ok", label: "Solved clean", cls: "bg-green-500 hover:bg-green-600" },
];

const prettySlug = (slug) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Pick the LeetCode problem a renamed NeetCode problem corresponds to.
function MatchPicker({ entry, catalog, onPick }) {
  const [q, setQ] = useState(prettySlug(entry.slug).split(" ").slice(0, 2).join(" "));
  const results = catalog ? catalog.search(q) : [];
  return (
    <div className="grid gap-2">
      <p className="text-sm text-gray-700">
        NeetCode calls this <b>{prettySlug(entry.slug)}</b>. Which LeetCode problem is it? You only pick once.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search LeetCode title or number"
        aria-label="Search LeetCode problems"
        className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <ul className="grid gap-1">
        {results.map((p) => (
          <li key={p.num}>
            <button
              onClick={() => onPick(entry.slug, p.num)}
              className="text-left text-sm w-full rounded px-2 py-1 hover:bg-blue-50"
            >
              <span className="tabular-nums text-gray-500">{p.num}</span> <b>{p.title}</b>{" "}
              <span className="text-xs text-gray-500">{DIFF[p.diff]}</span>
            </button>
          </li>
        ))}
        {q && results.length === 0 && <li className="text-sm text-gray-500">No matches.</li>}
      </ul>
    </div>
  );
}

function InboxItem({ entry, num, catalog, tracked, onRate, onMap, onDismiss }) {
  const [note, setNote] = useState("");
  const solved = localDate(new Date(entry.at));
  const p = num ? catalog?.lookup(num) : null;
  return (
    <li className="rounded-lg border border-gray-200 p-3 grid gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{entry.source === "neetcode" ? `Solved on NeetCode · ${niceDate(solved)}` : "Added from your past problems"}</span>
        {tracked && <span>· already tracked, rating counts as a review</span>}
        <button onClick={() => onDismiss(entry)} className="ml-auto underline hover:text-red-600">
          Dismiss
        </button>
      </div>
      {!num ? (
        <MatchPicker entry={entry} catalog={catalog} onPick={onMap} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular-nums text-gray-500">{num}</span>
            {p ? (
              <a
                href={`https://leetcode.com/problems/${p.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-500 hover:underline"
              >
                {p.title}
              </a>
            ) : (
              <b>Problem {num}</b>
            )}
            {p && <span className="text-xs text-gray-500">{p.pattern}</span>}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Key insight and how it went (optional)"
            className="text-sm text-gray-900 border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-2">
            {BUTTONS.map((b) => (
              <button
                key={b.result}
                onClick={() => onRate(entry, num, b.result, note, entry.source === "neetcode" ? solved : null)}
                className={`${b.cls} text-white text-sm px-3 py-1 rounded`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </>
      )}
    </li>
  );
}

const InboxWindow = ({ inbox, map, catalog, problems, onRate, onMap, onDismiss, onAddPast, onSync, syncNote }) => {
  const [past, setPast] = useState("");
  const resolve = (e) => e.num ?? map[e.slug] ?? (e.slug && catalog?.lookupSlug(e.slug)?.num) ?? null;
  const submitPast = (e) => {
    e.preventDefault();
    const nums = (past.match(/\d+/g) || []).map(Number);
    if (nums.length) onAddPast(nums).then((ok) => ok && setPast(""));
  };
  return (
    <Window width="w-full" height="h-auto" title={`📥 to_rate.txt (${inbox.length})`}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>New NeetCode submissions show up here to rate. {syncNote}</span>
          <button onClick={onSync} className="ml-auto underline hover:text-gray-800">
            Check NeetCode now
          </button>
        </div>
        {inbox.length > 0 && (
          <ul className="grid gap-3">
            {inbox.map((entry) => {
              const num = resolve(entry);
              return (
                <InboxItem
                  key={entry.id}
                  entry={entry}
                  num={num}
                  catalog={catalog}
                  tracked={num ? Boolean(problems[String(num)]) : false}
                  onRate={onRate}
                  onMap={onMap}
                  onDismiss={onDismiss}
                />
              );
            })}
          </ul>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500">Add problems you did before</summary>
          <form onSubmit={submitPast} className="mt-2 grid gap-2">
            <textarea
              value={past}
              onChange={(e) => setPast(e.target.value)}
              rows={2}
              placeholder="LeetCode numbers, any separator: 1, 49, 146 217"
              className="text-gray-900 border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="justify-self-start bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded">
              Add to inbox
            </button>
          </form>
        </details>
      </div>
    </Window>
  );
};

export default InboxWindow;
