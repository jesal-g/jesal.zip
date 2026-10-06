import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import LeetcodeApp from "./LeetcodeApp.jsx";
import "../index.css";
import "../styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    <Analytics />
    <LeetcodeApp />
  </>
);
