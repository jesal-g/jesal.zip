import json, os, sys
# Builds public/neetcode-catalog.json: every NeetCode problem (by its neetcode.io slug)
# with a title, difficulty and pattern for the tracker page. Only metadata is kept.
# Usage:
#   git clone --depth 1 https://github.com/neetcode-gh/leetcode.git neetcode-gh
#   python3 scripts/build_neetcode_catalog.py neetcode-gh public/leetcode-catalog.json public/neetcode-catalog.json
# NeetCode's problem list: the file names in neetcode-gh/articles (one per neetcode.io problem).
# Many NeetCode problems use the LeetCode slug; for those, title and difficulty come from the
# LeetCode catalog and the pattern from neetcode-gh/.problemSiteData.json. NeetCode renamed the
# rest; SAME_AS lists which LeetCode problem each renamed one is, used only for difficulty and
# pattern (and for converting old records saved by LeetCode number). Renamed problems not in
# SAME_AS keep a title made from the slug and no difficulty.
SAME_AS = {
    "anagram-groups": 49, "binary-tree-diameter": 543,
    "binary-tree-from-preorder-and-inorder-traversal": 105, "buy-and-sell-crypto": 121,
    "buy-and-sell-crypto-with-cooldown": 309, "cheapest-flight-path": 787,
    "combination-target-sum": 39, "combination-target-sum-ii": 40,
    "combinations-of-a-phone-number": 17, "copy-linked-list-with-random-pointer": 138,
    "count-connected-components": 323, "count-number-of-islands": 200, "count-paths": 62,
    "count-squares": 2013, "count-subsequences": 115, "depth-of-binary-tree": 104,
    "design-twitter-feed": 355, "design-word-search-data-structure": 211,
    "duplicate-integer": 217, "eating-bananas": 875, "find-duplicate-integer": 287,
    "find-median-in-a-data-stream": 295, "find-target-in-rotated-sorted-array": 33,
    "foreign-dictionary": 269, "implement-prefix-tree": 208, "insert-new-interval": 57,
    "invert-a-binary-tree": 226, "is-anagram": 242, "is-palindrome": 125,
    "islands-and-treasure": 286, "kth-largest-integer-in-a-stream": 703,
    "kth-smallest-integer-in-bst": 230, "level-order-traversal-of-binary-tree": 102,
    "linked-list-cycle-detection": 141, "longest-increasing-path-in-matrix": 329,
    "longest-repeating-substring-with-replacement": 424,
    "longest-substring-without-duplicates": 3,
    "lowest-common-ancestor-in-binary-search-tree": 235, "max-water-container": 11,
    "meeting-schedule": 252, "meeting-schedule-ii": 253, "merge-k-sorted-linked-lists": 23,
    "merge-triplets-to-form-target": 1899, "merge-two-sorted-linked-lists": 21,
    "min-cost-to-connect-points": 1584, "minimum-interval-including-query": 1851,
    "minimum-stack": 155, "minimum-window-with-characters": 76, "non-cyclical-number": 202,
    "number-of-one-bits": 191, "permutation-string": 567, "pow-x-n": 50,
    "products-of-array-discluding-self": 238, "reconstruct-flight-path": 332,
    "remove-node-from-end-of-linked-list": 19, "reorder-linked-list": 143,
    "reverse-a-linked-list": 206, "rotate-matrix": 48, "rotting-fruit": 994,
    "same-binary-tree": 100, "search-2d-matrix": 74, "search-for-word": 79,
    "search-for-word-ii": 212, "set-zeroes-in-matrix": 73, "string-encode-and-decode": 271,
    "subtree-of-a-binary-tree": 572, "task-scheduling": 621, "three-integer-sum": 15,
    "top-k-elements-in-list": 347, "two-integer-sum": 1, "two-integer-sum-ii": 167,
    "valid-binary-search-tree": 98, "valid-tree": 261, "validate-parentheses": 20,
}
SMALL = {"a", "an", "and", "in", "of", "or", "the", "to", "with", "from", "for", "ii", "iii"}

def title_from(slug):
    words = slug.split("-")
    return " ".join(w.upper() if w in ("ii", "iii", "iv") else w if (i and w in SMALL) else w.capitalize()
                    for i, w in enumerate(words))

repo, lc_path, out = sys.argv[1:4]
lc = json.load(open(lc_path))
by_num = {r[0]: r for r in lc["rows"]}
by_slug = {r[2]: r for r in lc["rows"]}
site = json.load(open(os.path.join(repo, ".problemSiteData.json")))
site_pattern = {x["link"].strip("/"): x["pattern"] for x in site}
slugs = sorted(f[:-3] for f in os.listdir(os.path.join(repo, "articles")) if f.endswith(".md") and f != "README.md")
missing = [s for s in SAME_AS if s not in slugs]
if missing: sys.exit(f"SAME_AS names problems with no article: {missing}")

patterns, rows = [], []
def idx(p):
    if p is None: return None
    if p not in patterns: patterns.append(p)
    return patterns.index(p)
for s in slugs:
    r = by_num.get(SAME_AS[s]) if s in SAME_AS else by_slug.get(s)
    if r:
        title = title_from(s) if s in SAME_AS else r[1]
        pat = site_pattern.get(r[2]) or lc["patterns"][r[5]]
        rows.append([s, title, r[3], idx(pat), r[0]])
    else:
        rows.append([s, title_from(s), None, None, None])
json.dump({"patterns": patterns, "rows": rows, "count": len(rows)}, open(out, "w"), separators=(",", ":"))
print(len(rows), "problems,", sum(1 for r in rows if r[2]), "with difficulty")
