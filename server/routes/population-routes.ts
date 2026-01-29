import { Router } from "express";
import { storage } from "../storage";
import { insertPopulationTrackingSchema, insertRegionPopulationTrackingSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get current total population with daily change
router.get("/current", async (req, res) => {
  try {
    const { region } = req.query;
    
    // Use the new getCurrentPopulationData method that includes change calculation
    const populationData = await storage.getCurrentPopulationData(region as string);
    
    res.json({
      success: true,
      data: populationData
    });
  } catch (error) {
    console.error("Error fetching current population:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch current population data"
    });
  }
});

// Get population for a specific date
router.get("/date/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const populationData = await storage.getPopulationByDate(date);
    
    if (!populationData) {
      return res.status(404).json({
        success: false,
        error: "No population data found for this date"
      });
    }

    // Calculate change from previous day
    const change = await storage.calculatePopulationChange(date);
    
    res.json({
      success: true,
      data: {
        ...populationData,
        change
      }
    });
  } catch (error) {
    console.error("Error fetching population by date:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch population data"
    });
  }
});

// Store population snapshot for current date
router.post("/snapshot", async (req, res) => {
  try {
    const data = insertPopulationTrackingSchema.parse(req.body);
    const result = await storage.savePopulationSnapshot(data.date, data.total_population);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error saving population snapshot:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save population snapshot"
    });
  }
});

// Calculate current population from water scheme data and store snapshot
router.post("/calculate-and-store", async (req, res) => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Calculate total population from water scheme data
    const totalPopulation = await storage.calculateTotalPopulation();
    
    // Store the snapshot
    const snapshot = await storage.savePopulationSnapshot(currentDate, totalPopulation);
    
    // Get the change from previous day
    const change = await storage.calculatePopulationChange(currentDate);
    
    res.json({
      success: true,
      data: {
        ...snapshot,
        change,
        message: `Population snapshot saved for ${currentDate}. Total population: ${totalPopulation.toLocaleString()}`
      }
    });
  } catch (error) {
    console.error("Error calculating and storing population:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate and store population data"
    });
  }
});

// Get regional population data
router.get("/region/:region", async (req, res) => {
  try {
    const { region } = req.params;
    const { date } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split('T')[0];
    
    const regionData = await storage.getRegionalPopulation(region, targetDate);
    
    res.json({
      success: true,
      data: regionData
    });
  } catch (error) {
    console.error("Error fetching regional population:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch regional population data"
    });
  }
});

// Store regional population snapshot
router.post("/region/snapshot", async (req, res) => {
  try {
    const data = insertRegionPopulationTrackingSchema.parse(req.body);
    const population = data.population || data.total_population || 0;
    const result = await storage.saveRegionPopulationSnapshot(data.date, data.region, population);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error saving regional population snapshot:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save regional population snapshot"
    });
  }
});

// Calculate and store all regional population snapshots for current date
router.post("/region/calculate-all", async (req, res) => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Calculate and store regional populations
    const results = await storage.saveAllRegionPopulationSnapshots(currentDate);
    
    res.json({
      success: true,
      data: results,
      message: `Regional population snapshots saved for ${results.length} regions on ${currentDate}`
    });
  } catch (error) {
    console.error("Error calculating regional populations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate regional population data"
    });
  }
});

// Get previous day population data for comparison
router.get("/previous", async (req, res) => {
  try {
    const { region } = req.query;
    
    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    let previousData;
    
    if (region && region !== "all") {
      // Get regional previous day data
      previousData = await storage.getRegionalPopulation(region as string, yesterdayDate);
    } else {
      // Get total previous day data
      previousData = await storage.getPopulationByDate(yesterdayDate);
    }
    
    res.json(previousData || null);
  } catch (error) {
    console.error("Error fetching previous day population:", error);
    res.json(null); // Return null if no previous data exists
  }
});

// Get population history (last 30 days)
router.get("/history", async (req, res) => {
  try {
    const { days = "30" } = req.query;
    const numDays = parseInt(days as string);
    
    const history = await storage.getPopulationHistory(numDays);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("Error fetching population history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch population history"
    });
  }
});

// Get weekly trend data for mini charts
router.get("/weekly-trend", async (req, res) => {
  try {
    const trendData = await storage.getWeeklyPopulationTrend();
    
    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error("Error fetching weekly trend:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch weekly trend data"
    });
  }
});

// Get regional population history
router.get("/region/:region/history", async (req, res) => {
  try {
    const { region } = req.params;
    const { days = "30" } = req.query;
    const numDays = parseInt(days as string);
    
    const history = await storage.getRegionalPopulationHistory(region, numDays);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("Error fetching regional population history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch regional population history"
    });
  }
});

export default router;