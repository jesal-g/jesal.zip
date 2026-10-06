import json, ast, re, sys
# Builds public/leetcode-catalog.json (problem number, title, slug, difficulty,
# topic tags, pattern) for the /leetcode page. Only metadata is kept.
# Usage: python3 scripts/build_leetcode_catalog.py <leetcode_questions.json> <neetcode problemSiteData.json> public/leetcode-catalog.json
#   leetcode_questions.json: github.com/noworneverev/leetcode-api (data/leetcode_questions.json)
#   problemSiteData.json:    github.com/neetcode-gh/leetcode (.problemSiteData.json), for pattern names
q = json.load(open(sys.argv[1])); ns = json.load(open(sys.argv[2]))
nsp = {x['link'].strip('/'): x['pattern'] for x in ns}
PRI = [("Trie","Tries"),("Backtracking","Backtracking"),("Dynamic Programming","Dynamic Programming"),
 ("Union Find","Graphs"),("Topological Sort","Graphs"),("Graph","Graphs"),("Shortest Path","Graphs"),
 ("Binary Search Tree","Trees"),("Binary Tree","Trees"),("Tree","Trees"),("Heap (Priority Queue)","Heap / Priority Queue"),
 ("Linked List","Linked List"),("Sliding Window","Sliding Window"),("Binary Search","Binary Search"),
 ("Monotonic Stack","Stack"),("Stack","Stack"),("Two Pointers","Two Pointers"),("Greedy","Greedy"),
 ("Bit Manipulation","Bit Manipulation"),("Design","Design"),("Breadth-First Search","Graphs"),("Depth-First Search","Graphs"),
 ("Geometry","Math & Geometry"),("Math","Math & Geometry"),("Database","Database"),("Hash Table","Arrays & Hashing"),
 ("Array","Arrays & Hashing"),("String","Arrays & Hashing")]
tags, pats, rows = [], [], []
def idx(lst, v):
    if v not in lst: lst.append(v)
    return lst.index(v)
for item in q:
    x = item['data']['question']
    fid = x['questionFrontendId']
    if not fid.isdigit(): continue
    slug = x['url'].rstrip('/').split('/')[-1]
    tt = x['topicTags'] or []
    if isinstance(tt, str):
        try: tt = ast.literal_eval(tt)
        except Exception: tt = []
    try: tg = [t['name'] for t in tt]
    except Exception: tg = []
    pat = nsp.get(slug) or next((p for t, p in PRI if t in tg), "Other")
    rows.append([int(fid), x['title'], slug, x['difficulty'][0], [idx(tags, t) for t in tg], idx(pats, pat), 1 if x['isPaidOnly'] in (True,'True') else 0])
rows.sort()
json.dump({"tags": tags, "patterns": pats, "rows": rows, "maxId": rows[-1][0], "count": len(rows)}, open(sys.argv[3], 'w'), separators=(',',':'))
print(len(rows), rows[-1][0], len(tags), pats, sum(1 for r in rows if r[1] and r[0] in (146,)))
