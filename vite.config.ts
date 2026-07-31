import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
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
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory-vendor")) {
            return "charts";
          }
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "editor";
          if (id.includes("katex")) return "katex";
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
