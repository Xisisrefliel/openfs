/* Builds the distributable macOS bundle: release/OpenFS-darwin-<arch>/OpenFS.app
   (`bun run app`). Only the built artifacts are shipped — the main-process
   bundle is self-contained (node:sqlite is a Node builtin), so the .app
   needs no node_modules. */

import { packager } from "@electron/packager";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

import { $ } from "bun";

const root = path.resolve(import.meta.dirname, "..");
const staging = path.join(root, ".build", "app-staging");
const out = path.join(root, "release");

console.log("→ building renderer (dist/) and main (dist-electron/)…");
await $`bun run build`.cwd(root).quiet();
await $`bun run build:electron`.cwd(root).quiet();

console.log("→ staging app payload…");
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
cpSync(path.join(root, "dist"), path.join(staging, "dist"), {
  recursive: true,
});
cpSync(path.join(root, "dist-electron"), path.join(staging, "dist-electron"), {
  recursive: true,
});

const { version } = (await Bun.file(path.join(root, "package.json")).json()) as {
  version: string;
};
await Bun.write(
  path.join(staging, "package.json"),
  JSON.stringify(
    {
      name: "openfs",
      productName: "OpenFS",
      version,
      main: "dist-electron/main.js",
      type: "module",
    },
    null,
    2
  )
);

console.log("→ packaging OpenFS.app…");
const paths = await packager({
  dir: staging,
  out,
  name: "OpenFS",
  appBundleId: "de.fahrschule-guel.openfs",
  appCategoryType: "public.app-category.business",
  platform: "darwin",
  arch: process.arch === "arm64" ? "arm64" : "x64",
  overwrite: true,
  // The protocol.handle static file serving (net.fetch on file://) is
  // not asar-aware — ship the payload unpacked. Testing phase anyway.
  asar: false,
});

console.log(`✓ ${paths.join("\n  ")}`);
