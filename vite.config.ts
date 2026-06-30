// @lovable.dev/vite-tanstack-config already includes the following - do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// On Lovable, the nitro preset is force-pinned to Cloudflare.
// Outside Lovable (e.g. Netlify CI: NETLIFY=true), we target the Netlify preset
// so the SSR handler is emitted as a Netlify Function and static assets land in `dist/`.
const isNetlify = process.env.NETLIFY === "true" || !!process.env.NETLIFY_BUILD_BASE;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  nitro: isNetlify ? { preset: "netlify" } : undefined,
});
