/* Renderer/SPA production build. The Tailwind plugin only auto-loads
   for the dev server ([serve.static] in bunfig.toml) — the `bun build`
   CLI ignores it, which yields unstyled output. Bun.build() lets us
   pass the plugin explicitly. Used by web prod and the Electron app. */

import tailwind from "bun-plugin-tailwind";

const result = await Bun.build({
  entrypoints: ["./src/index.html"],
  outdir: "dist",
  target: "browser",
  minify: true,
  sourcemap: "linked",
  define: { "process.env.NODE_ENV": '"production"' },
  env: "BUN_PUBLIC_*",
  plugins: [tailwind],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
console.log(`Built ${result.outputs.length} files → dist/`);
