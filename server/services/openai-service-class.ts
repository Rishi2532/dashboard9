/**
 * OpenAI Service Class
 * Provides structured interface for OpenAI API interactions
 */

import OpenAI from "openai";
import { config } from "../config";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    // Initialize the OpenAI client with API key from environment
    this.openai = new OpenAI({ apiKey: config.apiKeys.openai });
  }

  /**
   * Process a natural language query to extract intent and parameters
   */
  async processQuery(query: string, language: string = "en") {
    // Prepare the system prompt with context about the water dashboard
    const systemPrompt = `
      You are an assistant for a Maharashtra Water Dashboard. 
      The dashboard shows data about water infrastructure projects across different regions in Maharashtra.
      Regions include: Nagpur, Chhatrapati Sambhajinagar, Pune, Konkan, Amravati, Nashik.
      Extract the intent and parameters from the user's query. Focus on identifying:
      1. The intent (filter_by_region, show_statistics, compare_regions, etc.)
      2. Region names mentioned
      3. Metrics of interest (villages, schemes, ESR tanks, flow meters, etc.)
      4. Time period if mentioned

      Return a structured JSON response with 'intent' and 'parameters' fields.
    `;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
    });

    // Parse and return the response
    try {
      // Ensure content is a string to satisfy TypeScript
      const messageContent = response.choices[0]?.message?.content;
      const content =
        typeof messageContent === "string" ? messageContent : "{}";
      return JSON.parse(content);
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      return {
        intent: "unknown",
        parameters: {},
        rawResponse: response.choices[0]?.message?.content
          ? String(response.choices[0].message.content)
          : "",
      };
    }
  }

  /**
   * Process audio data to convert speech to text
   * (This method will need adjustment in actual server deployment)
   */
  async processAudio(audioData: string, language: string = "en") {
    try {
      console.log("Processing audio data");

      // Note: This is stubbed for now since OpenAI audio transcription requires
      // actual file handling that's environment-specific

      // In production, we would:
      // 1. Save the base64 audio to a temporary file
      // 2. Create a ReadStream for that file
      // 3. Pass that to the OpenAI API

      // Simulated response for now
      return "This is simulated speech transcription. In production, this would use the OpenAI Whisper API.";
    } catch (error: unknown) {
      console.error("Error processing audio:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to process audio: ${errorMessage}`);
    }
  }
}

export default OpenAIService;
