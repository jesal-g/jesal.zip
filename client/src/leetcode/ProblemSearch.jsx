import { useState } from "react";
import { slugFromInput, titleFromSlug } from "./catalog";

const DIFF = { E: "Easy", M: "Medium", H: "Hard" };

// Find a NeetCode problem by name. A pasted neetcode.io link or slug also works,
// for problems newer than the built-in list.
const ProblemSearch = ({ catalog, onPick, label, placeholder = "Search NeetCode, e.g. duplicate integer", inputRef }) => {
  const [q, setQ] = useState("");
  const results = catalog ? catalog.search(q) : [];
  const typed = slugFromInput(q);
  const extra = typed && !results.some((p) => p.id === typed) && /neetcode\.io|-/.test(q) ? typed : null;
  const pick = (p) => {
    onPick(p);
    setQ("");
  };
  return (
    <div className="grid gap-2 min-w-0">
      <label className="grid gap-1 text-sm text-gray-500 min-w-0">
        {label}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (results[0] || extra)) {
              e.preventDefault();
              pick(results[0] || { id: extra, site: "neetcode", title: titleFromSlug(extra) });
            }
          }}
          autoComplete="off"
          placeholder={placeholder}
          className="w-full min-w-0 text-gray-900 border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      {q.trim() && (
        <ul className="grid gap-1">
          {!catalog && <li className="text-sm text-gray-500">Loading problem list…</li>}
          {results.map((p) => (
            <li key={p.id}>
              <button onClick={() => pick(p)} className="text-left text-sm w-full rounded px-2 py-1 hover:bg-blue-50">
                <b>{p.title}</b>{" "}
                <span className="text-xs text-gray-500">
                  {[DIFF[p.diff], p.pattern].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
          {extra && (
            <li>
              <button
                onClick={() => pick({ id: extra, site: "neetcode", title: titleFromSlug(extra) })}
                className="text-left text-sm w-full rounded px-2 py-1 hover:bg-blue-50"
              >
                Use <b>{extra}</b> <span className="text-xs text-gray-500">(not in the list)</span>
              </button>
            </li>
          )}
          {catalog && !results.length && !extra && (
            <li className="text-sm text-gray-500">No matches. You can also paste a neetcode.io problem link.</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default ProblemSearch;
