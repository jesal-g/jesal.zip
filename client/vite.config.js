import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Each HTML file is its own page: / and /leetcode
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        leetcode: fileURLToPath(new URL("leetcode.html", import.meta.url)),
      },
    },
  },
});
