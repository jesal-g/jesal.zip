import { lazy, Suspense } from "react";

// leet.jesal.zip serves the same build as jesal.zip; pick the page by hostname so the
// subdomain doesn't depend on host-level rewrites.
const isLeet = typeof window !== "undefined" && window.location.hostname.startsWith("leet.");
const Page = isLeet
  ? lazy(() => import("./leetcode/LeetcodeApp.jsx"))
  : lazy(() => import("./App.jsx"));

if (isLeet) document.title = "leetcode · jesal.zip";

const Root = () => (
  <Suspense fallback={null}>
    <Page />
  </Suspense>
);

export default Root;
