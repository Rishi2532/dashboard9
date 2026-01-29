import express from "express";
import { z } from "zod";

// Create the router
const router = express.Router();

// Define the request validation schema for translation
const translateRequestSchema = z.object({
  text: z.string().min(1).max(1000),
  targetLanguage: z.string().min(2).max(5),
});

// Predefined language labels for demonstration
const languageLabels: Record<string, string> = {
  hi: "(हिन्दी)",
  mr: "(मराठी)",
  gu: "(ગુજરાતી)",
  pa: "(ਪੰਜਾਬੀ)",
  bn: "(বাংলা)",
  ta: "(தமிழ்)",
  te: "(తెలుగు)",
  kn: "(ಕನ್ನಡ)",
  ml: "(മലയാളം)",
};

// API endpoint for text translation
router.post("/translate", async (req, res) => {
  try {
    // Validate request body
    const { text, targetLanguage } = translateRequestSchema.parse(req.body);

    // Simulate translation - In a production app, this would use the Google Translate API
    // or another translation service
    const label = languageLabels[targetLanguage] || `(${targetLanguage})`;
    const translatedText = `${text} ${label}`;

    // Return the result
    res.json({
      originalText: text,
      translatedText,
      targetLanguage,
    });
  } catch (error) {
    console.error("Translation error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid translation request",
        errors: error.errors,
      });
    }
    res.status(500).json({ message: "Translation failed" });
  }
});

export default router;