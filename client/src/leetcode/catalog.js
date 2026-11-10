import { useEffect, useState } from "react";

// NeetCode problem list (slug, title, difficulty, pattern), loaded once from /public.
// Problems are identified by their neetcode.io slug, e.g. "duplicate-integer".

export const SLUG = /^(?=.*[a-z])[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SMALL = new Set(["a", "an", "and", "in", "of", "or", "the", "to", "with", "from", "for"]);
export const titleFromSlug = (slug) =>
  slug
    .split("-")
    .map((w, i) => (/^i+$|^iv$/.test(w) ? w.toUpperCase() : i && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");

export const problemUrl = (p) =>
  p.site === "leetcode" ? `https://leetcode.com/problems/${p.id}/` : `https://neetcode.io/problems/${p.id}`;

// A neetcode.io link or a bare slug typed or pasted by hand -> slug, or null.
export function slugFromInput(text) {
  const t = text.trim().toLowerCase();
  const m = /neetcode\.io\/problems\/([a-z0-9-]+)/.exec(t);
  const slug = m ? m[1] : t;
  return SLUG.test(slug) && slug.length <= 120 ? slug : null;
}

export function useCatalog() {
  const [catalog, setCatalog] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/neetcode-catalog.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((c) => {
        const toProblem = (r) => ({
          id: r[0],
          site: "neetcode",
          title: r[1],
          diff: r[2] || null,
          pattern: r[3] === null ? null : c.patterns[r[3]],
        });
        const bySlug = new Map(c.rows.map((r) => [r[0], r]));
        const lookup = (slug) => (bySlug.has(slug) ? toProblem(bySlug.get(slug)) : null);
        // Title search; every typed word has to appear in the title or slug
        const search = (q, limit = 8) => {
          const words = q.trim().toLowerCase().split(/[\s-]+/).filter(Boolean);
          if (!words.length) return [];
          return c.rows
            .filter((r) => words.every((w) => r[1].toLowerCase().includes(w) || r[0].includes(w)))
            .slice(0, limit)
            .map(toProblem);
        };
        setCatalog({ lookup, search, count: c.count });
      })
      .catch(() => setFailed(true));
  }, []);
  return { catalog, failed };
}

// Details for a stored record or inbox entry ({id, site}).
export function describe(catalog, p) {
  const m = p.site === "leetcode" ? null : catalog?.lookup(p.id);
  return {
    title: m?.title || titleFromSlug(p.id),
    diff: m?.diff || null,
    pattern: m?.pattern || (p.site === "leetcode" ? "LeetCode only" : "Other"),
    url: problemUrl(p),
  };
}
