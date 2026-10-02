import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL ?? "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.tsx"],
    css: true,
    // "basic" prints the same per-file results and final summary as the
    // default reporter but does NOT redraw an animated progress UI, so the
    // terminal scrollback stays clean on terminals that don't clear TTY frames.
    reporter: "basic",
    // jsdom 25 cannot parse modern CSS like `@layer` and logs a noisy
    // "Could not parse CSS stylesheet" block for every injected stylesheet.
    // The tests still pass; suppress that known, harmless message.
    onConsoleLog(log: string) {
      if (log.includes("Could not parse CSS stylesheet")) return false;
      return undefined;
    },
  },
});
