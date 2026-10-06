// Calls to the /api functions. Errors carry the server's message and HTTP status.

async function call(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const getSession = () => call("/api/session");
export const login = (code) => call("/api/login", { method: "POST", body: { code } });
export const logout = () => call("/api/logout", { method: "POST" });
export const getProblems = () => call("/api/problems").then((d) => d.problems || {});
export const saveRecords = (records) => call("/api/problems", { method: "PUT", body: { records } });
export const deleteProblem = (num) => call(`/api/problems?num=${num}`, { method: "DELETE" });
