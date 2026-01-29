import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Accept self-signed certificates for VS Code development
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with connection retry options
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Attempt to connect for up to 5 seconds
});

// Add error handler to avoid crashes on connection issues
pool.on("error", (err: Error) => {
  console.error("Unexpected database error on idle client", err);
  // Don't crash the application on connection errors
});

export const db = drizzle(pool, { schema });
