import { serve } from "bun";
import { mkdirSync } from "node:fs";
import index from "./index.html";

import { openDb } from "./server/db";
import { appointmentRequestRoutes } from "./server/appointment-requests";
import { branchRoutes } from "./server/branches";
import { campaignRoutes } from "./server/campaigns";
import { chatRoutes } from "./server/chat";
import { ensureTheoryGroupTables, theoryGroupRoutes } from "./server/theory-groups";
import { reviewRoutes } from "./server/reviews";
import { schoolProfileRoutes } from "./server/school-profile";
import { statisticsRoutes } from "./server/statistics";
import { seedTransactions } from "./server/seed";
import {
  accountingRoutes,
  archiveRoutes,
  calendarEventRoutes,
  instructorRoutes,
  pricePlanRoutes,
  studentRoutes,
  vehicleRoutes,
} from "./server/routes";

// SQLite needs the directory to exist before it can create the file.
mkdirSync("data", { recursive: true });
const db = openDb();
seedTransactions(db);
// Runs after the students/instructors seeds so seed groups pick up real names.
ensureTheoryGroupTables(db);

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    ...accountingRoutes(db),
    ...archiveRoutes(db),
    ...calendarEventRoutes(db),
    ...instructorRoutes(db),
    ...pricePlanRoutes(db),
    ...studentRoutes(db),
    ...vehicleRoutes(db),
    ...appointmentRequestRoutes(db),
    ...branchRoutes(db),
    ...campaignRoutes(db),
    ...chatRoutes(db),
    ...reviewRoutes(db),
    ...theoryGroupRoutes(db),
    ...schoolProfileRoutes(db),
    ...statisticsRoutes(db),
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
