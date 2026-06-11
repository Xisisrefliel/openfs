/* Renderer-side runtime detection. In the Electron app the window chrome
   is hidden (electron/main.ts) — the shell reserves room for the macOS
   traffic lights and turns its header strips into window-drag regions. */

export const isElectron =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Electron");

export const isElectronMac =
  isElectron && /mac/i.test(navigator.platform || navigator.userAgent);
