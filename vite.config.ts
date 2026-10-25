import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the site works at https://<user>.github.io/<any-repo-name>/
  base: './',
  build: {
    // Keep the fonts as separate files rather than inlining them as base64.
    assetsInlineLimit: 0,
  },
});
