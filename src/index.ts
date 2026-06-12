import { serve } from "bun";
import { mkdirSync } from "node:fs";
import index from "./index.html";

import { openDb } from "./server/db";
import { seedTransactions } from "./server/seed";
import { ensureTheoryGroupTables } from "./server/theory-groups";
import { ensureAttestationTables } from "./server/ausbildungsnachweis";
import { buildApiRoutes } from "./server/app-routes";

// SQLite needs the directory to exist before it can create the file.
mkdirSync("data", { recursive: true });
const db = openDb();
seedTransactions(db);
// Runs after the students/instructors seeds so seed groups pick up real names.
ensureTheoryGroupTables(db);
ensureAttestationTables(db);

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    ...buildApiRoutes(db),
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
