import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Heavy, clearly-separable vendors are split into their own chunks so the
    // initial entry stays small and rarely-used libraries (editor, charts, math)
    // only download when a route that needs them is visited.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // No "charts" chunk: recharts/d3/victory-vendor are removed — their
          // one importer (ui/chart.tsx) was itself imported by nothing.
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "editor";
          // No manualChunk for katex: forcing it into a named chunk made
          // Rollup emit STATIC imports of that chunk from every page that
          // might lazily need it, defeating the lazy load. Left alone,
          // Rollup gives the dynamic import its own async chunk.
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "query";
          if (
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/react/") ||
            id.includes("/scheduler/")
          ) {
            return "react-vendor";
          }
          return undefined;
        },
      },
    },
  },
}));
