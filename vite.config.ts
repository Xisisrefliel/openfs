/**
 * NOTE: This project builds and serves with Bun (`Bun.serve` + HTML imports),
 * not Vite. This minimal config exists only so tooling that expects a Vite
 * project (e.g. the shadcn CLI) can detect the framework and resolve the
 * `@/*` path alias. It is not used by the dev/build pipeline.
 */
import path from "node:path";

export default {
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dir ?? __dirname, "./src"),
    },
  },
};
