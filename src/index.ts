import { serve } from "bun";
import { mkdirSync } from "node:fs";
import index from "./index.html";

import { openDb } from "./server/db";
import { seedTransactions } from "./server/seed";
import { accountingRoutes } from "./server/routes";

// SQLite needs the directory to exist before it can create the file.
mkdirSync("data", { recursive: true });
const db = openDb();
seedTransactions(db);

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    ...accountingRoutes(db),
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
