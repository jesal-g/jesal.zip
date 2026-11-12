import json, os, sys
# Builds public/pattern-list.json: the NeetCode 150 roadmap plus every problem on Sean
# Prashad's LeetCode Patterns list, each under one NeetCode roadmap pattern.
# Usage:
#   git clone --depth 1 https://github.com/neetcode-gh/leetcode.git neetcode-gh
#   git clone --depth 1 https://github.com/seanprashad/leetcode-patterns.git leetcode-patterns
#   python3 scripts/build_pattern_list.py neetcode-gh leetcode-patterns public/leetcode-catalog.json \
#       public/neetcode-catalog.json public/pattern-list.json
# Problems are listed by their NeetCode slug. Sean's problems that NeetCode doesn't have keep
# their LeetCode slug (site "leetcode"). Pattern: NeetCode's own (from .problemSiteData.json),
# else PATTERN below. Sean's LeetCode topic tags are kept for filtering.
ROADMAP = [
    "Arrays & Hashing", "Two Pointers", "Stack", "Binary Search", "Sliding Window", "Linked List",
    "Trees", "Tries", "Heap / Priority Queue", "Backtracking", "Graphs", "1-D Dynamic Programming",
    "Intervals", "Greedy", "Advanced Graphs", "2-D Dynamic Programming", "Bit Manipulation",
    "Math & Geometry",
]
# Sean's problems that NeetCode gives no pattern for (by LeetCode slug)
PATTERN = {
    "3sum-closest": "Two Pointers", "backspace-string-compare": "Two Pointers",
    "substring-with-concatenation-of-all-words": "Sliding Window",
    "maximum-average-subarray-i": "Sliding Window", "subarray-product-less-than-k": "Sliding Window",
    "sudoku-solver": "Backtracking", "combination-sum-iii": "Backtracking",
    "factor-combinations": "Backtracking", "generalized-abbreviation": "Backtracking",
    "letter-case-permutation": "Backtracking",
    "binary-tree-level-order-traversal-ii": "Trees", "minimum-depth-of-binary-tree": "Trees",
    "path-sum-ii": "Trees", "path-sum-iii": "Trees", "binary-tree-paths": "Trees",
    "lowest-common-ancestor-of-a-binary-tree": "Trees", "average-of-levels-in-binary-tree": "Trees",
    "maximum-binary-tree": "Trees", "all-nodes-distance-k-in-binary-tree": "Trees",
    "linked-list-cycle-ii": "Linked List", "odd-even-linked-list": "Linked List",
    "search-a-2d-matrix-ii": "Binary Search", "find-smallest-letter-greater-than-target": "Binary Search",
    "peak-index-in-a-mountain-array": "Binary Search",
    "minimum-height-trees": "Graphs",
    "count-of-range-sum": "Arrays & Hashing", "find-all-duplicates-in-an-array": "Arrays & Hashing",
    "sort-characters-by-frequency": "Arrays & Hashing",
    "count-unique-characters-of-all-substrings-of-a-given-string": "Arrays & Hashing",
    "rearrange-string-k-distance-apart": "Heap / Priority Queue",
    "find-k-pairs-with-smallest-sums": "Heap / Priority Queue",
    "kth-smallest-element-in-a-sorted-matrix": "Heap / Priority Queue",
    "sliding-window-median": "Heap / Priority Queue",
    "smallest-range-covering-elements-from-k-lists": "Heap / Priority Queue",
    "word-squares": "Tries", "design-search-autocomplete-system": "Tries",
    "longest-word-in-dictionary": "Tries", "prefix-and-suffix-search": "Tries",
    "index-pairs-of-a-string": "Tries",
    "minimum-number-of-arrows-to-burst-balloons": "Intervals", "employee-free-time": "Intervals",
    "interval-list-intersections": "Intervals",
    "convert-1d-array-into-2d-array": "Math & Geometry",
}
NC150, SEAN = 1, 2

nc_repo, sean_repo, lc_path, nc_path, out = sys.argv[1:6]
site = json.load(open(os.path.join(nc_repo, ".problemSiteData.json")))
sean = json.load(open(os.path.join(sean_repo, "src/data/questions.json")))["data"]
lc = json.load(open(lc_path))
nc = json.load(open(nc_path))
lc_by_slug = {r[2]: r for r in lc["rows"]}
lc_by_num = {r[0]: r for r in lc["rows"]}
nc_row = {r[0]: r for r in nc["rows"]}
nc_by_num = {}
for r in nc["rows"]:  # prefer NeetCode's renamed version over a copy under the LeetCode slug
    n = r[4]
    if n and (n not in nc_by_num or nc_by_num[n] == lc_by_num[n][2]):
        nc_by_num[n] = r[0]
site_pattern = {x["link"].strip("/"): x["pattern"] for x in site if x["pattern"] in ROADMAP}

items = {}  # id -> row dict
def add(lc_slug, flag, order, title=None, diff=None, tags=(), premium=False):
    r = lc_by_slug.get(lc_slug)
    ncs = nc_by_num.get(r[0]) if r else None
    if ncs:
        key, where, name = ncs, "neetcode", nc_row[ncs][1]
    else:
        key, where, name = lc_slug, "leetcode", title or (r and r[1]) or lc_slug
    pattern = site_pattern.get(lc_slug) or PATTERN.get(lc_slug)
    if pattern not in ROADMAP:
        sys.exit(f"no roadmap pattern for {lc_slug}")
    it = items.setdefault(key, {"id": key, "site": where, "title": name, "diff": diff or (r and r[3]),
                                "pattern": pattern, "flags": 0, "order": order, "tags": [], "premium": False})
    it["flags"] |= flag
    it["order"] = min(it["order"], order)
    it["tags"] = sorted(set(it["tags"]) | set(tags))
    it["premium"] = it["premium"] or premium

for i, x in enumerate(s for s in site if s.get("neetcode150")):
    add(x["link"].strip("/"), NC150, i)
for i, q in enumerate(sean):
    add(q["slug"], SEAN, 1000 + i, q["title"], q["difficulty"][0], q["pattern"], bool(q["premium"]))

tags = sorted({t for it in items.values() for t in it["tags"]})
rows = sorted(items.values(), key=lambda it: (ROADMAP.index(it["pattern"]), it["order"]))
json.dump({
    "patterns": ROADMAP,
    "tags": tags,
    # [id, site, title, difficulty E/M/H, pattern index, flags (1 NeetCode 150, 2 Sean), tag indexes, premium]
    "rows": [[it["id"], it["site"], it["title"], it["diff"], ROADMAP.index(it["pattern"]), it["flags"],
              [tags.index(t) for t in it["tags"]], 1 if it["premium"] else 0] for it in rows],
}, open(out, "w"), separators=(",", ":"))
print(len(rows), "problems:", sum(1 for r in rows if r["flags"] & NC150), "NeetCode 150,",
      sum(1 for r in rows if r["flags"] & SEAN), "Sean,", sum(1 for r in rows if r["site"] == "leetcode"), "LeetCode only")
