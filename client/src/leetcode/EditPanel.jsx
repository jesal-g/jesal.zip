import { useState } from "react";
import { RESULT_LABEL, niceDate, replay } from "./srs";

// Edit one problem's attempt history and note. Saving recomputes its level and
// next review from the edited history.
const EditPanel = ({ record, onSave, onCancel }) => {
  const [attempts, setAttempts] = useState(record.attempts.map((a) => ({ ...a })));
  const [note, setNote] = useState(record.note || "");
  const update = (i, field, value) =>
    setAttempts((list) => list.map((a, j) => (j === i ? { ...a, [field]: value } : a)));
  const valid = attempts.length > 0 && attempts.every((a) => /^\d{4}-\d{2}-\d{2}$/.test(a.date));
  const preview = valid ? replay(record, attempts) : null;

  return (
    <div className="grid gap-3 rounded-lg bg-gray-50 border border-gray-200 p-3 whitespace-normal">
      <div className="text-xs uppercase tracking-wide text-gray-500">Attempts</div>
      <ul className="grid gap-2">
        {attempts.map((a, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="date"
              value={a.date}
              onChange={(e) => update(i, "date", e.target.value)}
              aria-label={`Attempt ${i + 1} date`}
              className="border border-gray-300 rounded px-2 py-1"
            />
            <select
              value={a.result}
              onChange={(e) => update(i, "result", e.target.value)}
              aria-label={`Attempt ${i + 1} result`}
              className="border border-gray-300 rounded px-2 py-1"
            >
              {Object.entries(RESULT_LABEL).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setAttempts((list) => list.filter((_, j) => j !== i))}
              className="text-xs text-gray-500 underline hover:text-red-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {attempts.length === 0 && (
        <p className="text-sm text-gray-500">No attempts left. Cancel, or use Delete to remove the problem.</p>
      )}
      <label className="grid gap-1 text-xs text-gray-500">
        Key insight
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="text-sm text-gray-900 border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      {preview && (
        <p className="text-xs text-gray-500">
          After saving: level {preview.mastered ? "done" : `${preview.stage}/5`},{" "}
          {preview.mastered ? "mastered" : `next review ${niceDate(preview.next)}`}.
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ ...preview, note: note.trim() })}
          disabled={!valid}
          className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save changes
        </button>
        <button onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm px-3 py-1 rounded">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default EditPanel;
