import { defineConfig } from "vite";

// Vite config geared for a single-file Lovelace card build.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "scrolling-banner-card.js",
    },
    rollupOptions: {
      // Ensure we ship a single JS file (no chunks)
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
