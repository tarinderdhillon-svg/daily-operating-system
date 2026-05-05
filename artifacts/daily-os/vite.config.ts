import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.PORT ?? "3000";
const port    = Number(rawPort);
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // Replit-specific dev plugins — only load when running inside Replit
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default()
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    // Output directly into api-server/public so esbuild copies it to dist/public
    outDir: path.resolve(import.meta.dirname, "../api-server/public"),
    emptyOutDir: true,
    // Chunk splitting — mobile gets smaller initial JS, loads rest in parallel
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only split what we know — let everything else fall through to Rollup
          if (id.includes("/node_modules/react-dom/"))        return "vendor-react";
          if (id.includes("/node_modules/react/"))            return "vendor-react";
          if (id.includes("/node_modules/scheduler/"))        return "vendor-react";
          if (id.includes("/node_modules/@tanstack/"))        return "vendor-query";
          if (id.includes("/node_modules/lucide-react/"))     return "vendor-icons";
          if (id.includes("/node_modules/date-fns/"))         return "vendor-date";
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
