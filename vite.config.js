import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ─── HexaDex production build config ─────────────────────
// Optimizes:
//   • Bundle splitting (vendor / app chunks for better caching)
//   • Minification (esbuild — fast)
//   • Asset inlining (small images → base64)
//   • Source maps OFF in production (smaller, faster)
//   • Removes console.log in prod (cleaner DevTools, slight perf)
// https://vitejs.dev/config/

export default defineConfig({
  plugins: [react()],

  build: {
    target: "es2020",
    minify: "esbuild",
    cssMinify: true,
    sourcemap: false,        // disable source maps in prod (smaller bundles)
    assetsInlineLimit: 4096, // inline assets <4KB as base64
    chunkSizeWarningLimit: 1500, // suppress warnings for large chunks

    rollupOptions: {
      output: {
        // Split vendor code into separate chunks for better browser caching
        // (vendor changes rarely → cached across deploys)
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
            return "vendor";
          }
        },
        // Use content hash so cache busts when content changes
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },

  // Strip console.* and debugger statements in production builds
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
    legalComments: "none",
  },

  // Dev server
  server: {
    port: 5173,
    host: true,        // expose on LAN (useful for mobile testing)
    strictPort: false,
  },

  // Preview server (after `npm run build && npm run preview`)
  preview: {
    port: 4173,
    host: true,
  },
});
