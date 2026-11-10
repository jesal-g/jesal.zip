import { useState } from "react";
import Window from "../components/Window";
import { localDate, niceDate } from "./srs";
import { describe } from "./catalog";
import ProblemSearch from "./ProblemSearch";

const BUTTONS = [
  { result: "fail", label: "Failed", cls: "bg-red-500 hover:bg-red-600" },
  { result: "hint", label: "Struggled", cls: "bg-yellow-500 hover:bg-yellow-600" },
  { result: "ok", label: "Solved clean", cls: "bg-green-500 hover:bg-green-600" },
];

function InboxItem({ entry, catalog, tracked, onRate, onDismiss }) {
  const [note, setNote] = useState("");
  const problem = { id: entry.slug, site: entry.site || "neetcode" };
  const d = describe(catalog, problem);
  const solved = entry.source === "neetcode" ? localDate(new Date(entry.at)) : null;
  return (
    <li className="rounded-lg border border-gray-200 p-3 grid gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{solved ? `Solved on NeetCode · ${niceDate(solved)}` : "Added by hand, rating counts for today"}</span>
        {tracked && <span>· already tracked, rating counts as a review</span>}
        <button onClick={() => onDismiss(entry)} className="ml-auto underline hover:text-red-600">
          Dismiss
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-500 hover:underline">
          {d.title}
        </a>
        <span className="text-xs text-gray-500">{d.pattern}</span>
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
            onClick={() => onRate(entry, problem, b.result, note, solved)}
            className={`${b.cls} text-white text-sm px-3 py-1 rounded`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </li>
  );
}

const InboxWindow = ({ inbox, catalog, problems, onRate, onDismiss, onAddPast, onSync, syncNote }) => (
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
          {inbox.map((entry) => (
            <InboxItem
              key={entry.id}
              entry={entry}
              catalog={catalog}
              tracked={Boolean(problems[entry.slug])}
              onRate={onRate}
              onDismiss={onDismiss}
            />
          ))}
        </ul>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-500">Add problems you did before</summary>
        <div className="mt-2">
          <ProblemSearch catalog={catalog} onPick={(p) => onAddPast([p.id])} label="Pick a problem to add it to the inbox" />
        </div>
      </details>
    </div>
  </Window>
);

export default InboxWindow;
