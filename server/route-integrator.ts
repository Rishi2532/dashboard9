/**
 * Route Integrator
 * This module adds our AI routes to the Express application
 */

import type { Express } from "express";
import aiRoutes from "./routes/ai";

/**
 * Integrates AI routes into the Express application
 * @param app Express application
 */
export function integrateAIRoutes(app: Express): void {
  // Mount AI routes on /api/ai
  app.use("/api/ai", aiRoutes);
  
  console.log("AI routes integrated successfully");
}

export default integrateAIRoutes;