# jesal.zip

Personal site at [jesal.zip](https://jesal.zip), plus a LeetCode review queue at
[leet.jesal.zip](https://leet.jesal.zip). React + Vite + Tailwind, deployed on Vercel.

## Pages

| URL | Entry | What it is |
| --- | --- | --- |
| `jesal.zip` | `client/index.html` → `src/main.jsx` | Click the zip, it "unzips" into draggable windows (README, photo, resume) over a p5 noise background. |
| `leet.jesal.zip` | `client/leetcode.html` → `src/leetcode/main.jsx` | Spaced-repetition tracker for LeetCode. Data stays in the visitor's browser. |

`client/vercel.json` maps `leet.jesal.zip/` to `leetcode.html` and redirects
`jesal.zip/leetcode` to the subdomain. The subdomain also has to be added under the Vercel
project's Domains settings.

## Develop

```sh
cd client
npm install
npm run dev      # http://localhost:5173 and http://localhost:5173/leetcode.html
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
