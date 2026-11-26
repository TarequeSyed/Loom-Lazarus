import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static site, same-origin assets only. `base: "./"` keeps asset paths relative so the
// build works from any static host sub-path (hosting is decided later, plan decision D-7).
// P2 features are switched off with `VITE_DISABLE_P2=1`, read in the app as
// `import.meta.env.VITE_DISABLE_P2`.
export default defineConfig({
  base: "./",
  plugins: [react()],
  worker: { format: "es" },
  build: { outDir: "dist", sourcemap: true },
});