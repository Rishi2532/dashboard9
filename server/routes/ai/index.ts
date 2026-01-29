/**
 * AI Routes Index
 * Export all AI-related routes
 */

import { Router } from 'express';
import openaiRoutes from './openai-routes';

const router = Router();

// Mount OpenAI routes on /api/ai
router.use('/', openaiRoutes);

export default router;