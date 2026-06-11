/* ------------------------------------------------------------------ */
/* Electron main process.                                              */
/*                                                                     */
/* No localhost server: the renderer loads app://bundle/ and every     */
/* request — static assets and /api/* alike — goes through             */
/* protocol.handle(), which speaks the same Request/Response pair as   */
/* Bun.serve(). The API route factories from src/server run unchanged  */
/* on the shared router; SQLite runs on node:sqlite via the adapter    */
/* in src/server/sqlite.ts.                                            */
/* ------------------------------------------------------------------ */

import { app, BrowserWindow, net, protocol, shell } from "electron";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildApiRoutes } from "../src/server/app-routes";
import { openDb } from "../src/server/db";
import { createRouter } from "../src/server/router";
import { seedTransactions } from "../src/server/seed";
import { ensureTheoryGroupTables } from "../src/server/theory-groups";
import type { Database } from "../src/server/sqlite";

const APP_ORIGIN = "app://bundle";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      codeCache: true,
    },
  },
]);

/* In development the database lives in ./data next to the repo (same
   file the Bun dev server uses); packaged builds keep it in userData. */
function databasePath(): string {
  const dir = app.isPackaged
    ? path.join(app.getPath("userData"), "data")
    : path.join(app.getAppPath(), "data");
  mkdirSync(dir, { recursive: true });
  return path.join(dir, "fahrschule.db");
}

function resolveStatic(distDir: string, pathname: string): string {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  const file = path.normalize(path.join(distDir, relative));
  if (
    file.startsWith(distDir + path.sep) &&
    existsSync(file) &&
    statSync(file).isFile()
  ) {
    return file;
  }
  // SPA fallback: client-side routes (e.g. /fahrschueler) reload fine.
  return path.join(distDir, "index.html");
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: !process.env.ELECTRON_SMOKE,
    // No native title bar — the renderer's own header strip is the top of
    // the window. On macOS the traffic lights are inset to align with the
    // shell controls (sidebar toggle + history arrows) next to them.
    ...(process.platform === "darwin"
      ? {
          titleBarStyle: "hidden" as const,
          // Standard macOS big-toolbar placement (Safari, Notes): equal
          // 20px inset from the top-left corner; the shell controls row
          // centers itself on the lights (App.tsx shifts to pt-1).
          trafficLightPosition: { x: 20, y: 20 },
        }
      : {}),
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  // The renderer is a pure SPA — anything leaving app:// opens externally.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(APP_ORIGIN)) {
      event.preventDefault();
      if (/^https?:/.test(url)) void shell.openExternal(url);
    }
  });

  void win.loadURL(`${APP_ORIGIN}/`);
  return win;
}

let db: Database | null = null;

void app.whenReady().then(() => {
  db = openDb(databasePath());
  seedTransactions(db);
  // Runs after the students/instructors seeds so seed groups pick up real names.
  ensureTheoryGroupTables(db);

  const route = createRouter(buildApiRoutes(db));
  const distDir = path.join(app.getAppPath(), "dist");

  protocol.handle("app", async request => {
    const matched = await route(request);
    if (matched) return matched;
    const file = resolveStatic(distDir, new URL(request.url).pathname);
    return net.fetch(pathToFileURL(file).toString());
  });

  const win = createWindow();
  if (process.env.ELECTRON_SMOKE) runSmokeTest(win);
  if (process.env.ELECTRON_CLICK_PROBE) runClickProbe(win);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" || process.env.ELECTRON_SMOKE) app.quit();
});

app.on("will-quit", () => {
  db?.close();
  db = null;
});

/* ELECTRON_CLICK_PROBE=1: shows the window at (0,0) and reports the
   sidebar state every second, so an external real mouse click (e.g. via
   AppleScript) can prove that native drag regions don't swallow the
   sidebar toggle. Exits after 12s. */
function runClickProbe(win: BrowserWindow) {
  win.setPosition(0, 0);
  win.webContents.once("did-finish-load", () => {
    const read = () =>
      win.webContents
        .executeJavaScript(
          `(() => {
            const mid = el => {
              const r = el?.getBoundingClientRect();
              return r ? { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } : null;
            };
            return {
              state: document.querySelector('[data-slot="sidebar"][data-state]')?.getAttribute("data-state") ?? "?",
              path: location.pathname,
              trigger: mid(document.querySelector('[data-slot="sidebar-trigger"]')),
              headerButton: mid(document.querySelector("header button")),
            };
          })()`
        )
        .then(result => console.log("[probe]", JSON.stringify(result)))
        .catch(error => console.log("[probe] ERR", error));
    void read();
    const timer = setInterval(read, 1000);
    setTimeout(() => {
      clearInterval(timer);
      app.exit(0);
    }, 12_000);
  });
}

/* ELECTRON_SMOKE=1: headless self-check used by `bun run electron:smoke` —
   asserts the API answers through app:// and React actually rendered. */
function runSmokeTest(win: BrowserWindow) {
  win.webContents.once("did-finish-load", async () => {
    try {
      const result = (await win.webContents.executeJavaScript(`
        (async () => {
          const response = await fetch("/api/students");
          const body = await response.json();
          await new Promise(resolve => setTimeout(resolve, 1500));
          return {
            status: response.status,
            students: Array.isArray(body.students) ? body.students.length : -1,
            rendered: (document.getElementById("root")?.children.length ?? 0) > 0,
          };
        })()
      `)) as { status: number; students: number; rendered: boolean };
      const ok = result.status === 200 && result.students >= 0 && result.rendered;
      const screenshot = await win.webContents.capturePage();
      const { writeFileSync } = await import("node:fs");
      writeFileSync("/tmp/electron-smoke.png", screenshot.toPNG());
      console.log(`[smoke] ${ok ? "PASS" : "FAIL"} ${JSON.stringify(result)}`);
      app.exit(ok ? 0 : 1);
    } catch (error) {
      console.error("[smoke] FAIL", error);
      app.exit(1);
    }
  });
}
