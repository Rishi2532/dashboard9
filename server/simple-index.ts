import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { randomBytes } from "crypto";
import { initializeDatabase } from "./simple-db";
import { SimpleStorage } from "./simple-storage";

// Create Express application
const app = express();

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Create global storage instance
const storage = new SimpleStorage();
global.storage = storage;

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

// Initialize database and start server
(async () => {
  try {
    // Initialize database
    await initializeDatabase();
    console.log("Database initialized successfully");
    
    // Add simple API routes for testing
    app.get("/api/health", (req, res) => {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });
    
    app.get("/api/regions", async (req, res) => {
      try {
        const regions = await storage.getAllRegions();
        res.json(regions);
      } catch (error) {
        console.error("Error fetching regions:", error);
        res.status(500).json({ error: "Failed to fetch regions" });
      }
    });
    
    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Error:", err);
      res.status(status).json({ message });
    });
    
    // Serve static files from public folder
    app.use(express.static("public"));
    
    // Start the server
    const port = 5000;
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();