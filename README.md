# jesal.zip

Personal site at [jesal.zip](https://jesal.zip), plus a LeetCode review queue at
[jesal.zip/leetcode](https://jesal.zip/leetcode). React + Vite + Tailwind, deployed on Vercel.

## Pages

| URL | Entry | What it is |
| --- | --- | --- |
| `jesal.zip` | `client/index.html` → `src/main.jsx` | Click the zip, it "unzips" into draggable windows (README, photo, resume) over a p5 noise background. |
| `jesal.zip/leetcode` | `client/leetcode/index.html` → `src/leetcode/main.jsx` | Spaced-repetition tracker for LeetCode. Data stays in the visitor's browser. |

The page lives at `leetcode/index.html`, so `/leetcode` works on any static host. `client/vercel.json`
also maps the root of `leet.jesal.zip` to it, which starts working once that subdomain is
added under the Vercel project's Domains settings and pointed at Vercel in DNS.

## Develop

```sh
cd client
npm install
npm run dev      # http://localhost:5173 and http://localhost:5173/leetcode/
npm run lint
npm run build    # outputs client/dist
```

## LeetCode catalog

`client/public/leetcode-catalog.json` holds problem number, title, slug, difficulty, topic
tags and a pattern name for each problem (no problem statements). To refresh it with newer
problems, download the two source files listed at the top of
`client/scripts/build_leetcode_catalog.py` and run:

```sh
python3 client/scripts/build_leetcode_catalog.py leetcode_questions.json problemSiteData.json client/public/leetcode-catalog.json
```
