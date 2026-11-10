import { useState } from "react";
import Window from "../components/Window";
import { localDate, niceDate } from "./srs";

const BUTTONS = [
  { result: "fail", label: "Failed", cls: "bg-red-500 hover:bg-red-600" },
  { result: "hint", label: "Struggled", cls: "bg-yellow-500 hover:bg-yellow-600" },
  { result: "ok", label: "Solved clean", cls: "bg-green-500 hover:bg-green-600" },
];

function InboxItem({ entry, catalog, tracked, onRate, onDismiss }) {
  const [note, setNote] = useState("");
  const num = entry.num;
  const solved = entry.source === "solved" ? localDate(new Date(entry.at)) : null;
  const p = catalog?.lookup(num);
  return (
    <li className="rounded-lg border border-gray-200 p-3 grid gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{solved ? `Solved ${niceDate(solved)}` : "Added by number, rating counts for today"}</span>
        {tracked && <span>· already tracked, rating counts as a review</span>}
        <button onClick={() => onDismiss(entry)} className="ml-auto underline hover:text-red-600">
          Dismiss
        </button>
      </div>
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
            onClick={() => onRate(entry, num, b.result, note, solved)}
            className={`${b.cls} text-white text-sm px-3 py-1 rounded`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </li>
  );
}

const InboxWindow = ({ inbox, catalog, problems, onRate, onDismiss, onAddPast, note }) => {
  const [past, setPast] = useState("");
  const submitPast = (e) => {
    e.preventDefault();
    const nums = (past.match(/\d+/g) || []).map(Number);
    if (nums.length) onAddPast(nums).then((ok) => ok && setPast(""));
  };
  return (
    <Window width="w-full" height="h-auto" title={`📥 to_rate.txt (${inbox.length})`}>
      <div className="grid gap-3">
        {note && <p className="text-xs text-gray-500">{note}</p>}
        {inbox.length > 0 && (
          <ul className="grid gap-3">
            {inbox.map((entry) => (
              <InboxItem
                key={entry.id}
                entry={entry}
                catalog={catalog}
                tracked={Boolean(problems[String(entry.num)])}
                onRate={onRate}
                onDismiss={onDismiss}
              />
            ))}
          </ul>
        )}
        <details className="text-sm" open={inbox.length === 0}>
          <summary className="cursor-pointer text-gray-500">Add problems by LeetCode number to rate later</summary>
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
