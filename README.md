# jesal.zip

Personal site at [jesal.zip](https://jesal.zip), plus a LeetCode review queue at
[jesal.zip/leetcode](https://jesal.zip/leetcode). React + Vite + Tailwind, deployed on Vercel.

## Pages

| URL | Entry | What it is |
| --- | --- | --- |
| `jesal.zip` | `client/index.html` → `src/main.jsx` | Click the zip, it "unzips" into draggable windows (README, photo, resume) over a p5 noise background. |
| `jesal.zip/leetcode` | `client/leetcode/index.html` → `src/leetcode/main.jsx` | Spaced-repetition tracker for LeetCode, saved to a database behind a Google Authenticator login. |

The page lives at `leetcode/index.html`, so `/leetcode` works on any static host.
`leet.jesal.zip` serves the same build: `src/Root.jsx` checks the hostname and renders the
tracker instead of the home page. The subdomain is a CNAME at Porkbun pointing to Vercel,
plus an entry under the Vercel project's Domains settings.

## LeetCode backend

`client/api/` holds Vercel serverless functions (login, session, problems) backed by Upstash
Redis. Only one person can sign in: whoever has the authenticator secret.

Setup, once:

1. In Vercel, open the project's **Storage** tab, create an **Upstash Redis** database and
   connect it to this project. That adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
2. Run `node client/scripts/totp-setup.mjs`. Add `TOTP_SECRET` and `SESSION_SECRET` under
   **Settings → Environment Variables** (Production), and add the setup key to Google
   Authenticator.
3. Redeploy. Sign in at `/leetcode` with a code; the device stays signed in for 60 days.

**NeetCode sync:** NeetCode's GitHub sync commits each solve to the public
`jesal-g/neetcode-submissions` repo as "Add: <slug> - submission-N". `GET /api/inbox` reads new
commits (at most every 2 minutes, no token needed) into a "to rate" inbox. NeetCode renames
many problems, so the first time a slug doesn't match a LeetCode slug the page asks which
problem it is and remembers the answer (`lc:ncmap`). Past problems can be added by number.

Changing `SESSION_SECRET` signs out every device. Changing `TOTP_SECRET` means re-adding it to
your authenticator. `npm run test:api` (in `client/`) tests the functions against a fake Redis.

## Develop

```sh
cd client
npm install
npm run dev      # http://localhost:5173 and http://localhost:5173/leetcode/ (no /api)
npx vercel dev   # same, with the /api functions
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
