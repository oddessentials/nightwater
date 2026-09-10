import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // The renderer and its effects load together before the first frame.
    chunkSizeWarningLimit: 750,
  },
});
