import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Finance in Action preview (docs/company-models/implementation-brief-v3.1.md,
  // constraint 3). VITE_FIA_PREVIEW=true turns on the v3.1 viewer and its
  // SYNTHETIC fixtures. It becomes a compile-time constant so that, unset,
  // the viewer and the fixtures are dead code Rollup drops: no chunk of them
  // reaches dist/. scripts/assert-no-synthetic.mjs checks that after the build.
  define: {
    __FIA_PREVIEW__: JSON.stringify(loadEnv(mode, process.cwd(), "VITE_").VITE_FIA_PREVIEW === "true"),
    // The Kawasan Industri world (docs/world/PRD-kawasan-industri.md §7.1):
    // VITE_WORLD_KAWASAN=true builds the world behind the chain map's slot.
    // Unset, the schematic renders exactly as before and the world's
    // modules are dead code Rollup drops (scripts/world/assert-world-flag.mjs).
    __WORLD_KAWASAN__: JSON.stringify(loadEnv(mode, process.cwd(), "VITE_").VITE_WORLD_KAWASAN === "true"),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // With the world on, its poster is the landing page's largest paint and
    // would otherwise be discovered only after three lazy chunks; the preload
    // makes it discoverable in the initial document (Lighthouse, gate 2).
    {
      name: "world-poster-preload",
      transformIndexHtml(html) {
        if (loadEnv(mode, process.cwd(), "VITE_").VITE_WORLD_KAWASAN !== "true") return html;
        return html.replace("</head>", '    <link rel="preload" as="image" href="/world/poster-far.svg" fetchpriority="high" />\n  </head>');
      },
    },
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
        // The world engine's own code (src/world/engine and the scene it
        // builds) is the chunk whose entry is engine/index.ts; named so the
        // build output says what it is instead of "index".
        chunkFileNames: (chunk) => (chunk.facadeModuleId?.endsWith("/src/world/engine/index.ts") ? "assets/world-scene-[hash].js" : "assets/[name]-[hash].js"),
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // No "charts" chunk: recharts/d3/victory-vendor are removed — their
          // one importer (ui/chart.tsx) was itself imported by nothing.
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "editor";
          // No manualChunk for katex: forcing it into a named chunk made
          // Rollup emit STATIC imports of that chunk from every page that
          // might lazily need it, defeating the lazy load. Left alone,
          // Rollup gives the dynamic import its own async chunk.
          // The Kawasan Industri world's renderer. Its only importer is the
          // world's lazily imported engine, so none of these chunks is ever
          // part of the initial bundle (docs/world/PRD-kawasan-industri.md §10);
          // a phone fetches them on its first touch, a wide screen after the
          // poster's paint. Three chunks instead of one (gate 4, O8): all are
          // needed for the engine's first frame and are requested together,
          // so they download and compile in parallel and a change to one
          // leaves the others cached. three.core is the scene graph, maths and
          // geometry; three.module the WebGL renderer and its shader library;
          // the addons the orbit controls and the fat lines.
          if (id.includes("/node_modules/three/build/three.core")) return "three-core";
          if (id.includes("/node_modules/three/build/")) return "three-renderer";
          if (id.includes("/node_modules/three/")) return "three-addons";
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
