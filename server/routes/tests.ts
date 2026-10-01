import { Router } from 'express';
import { automatedTestRunner } from '../services/testRunner.js';
import { requireAuth } from './auth.js';

export const testRouter = Router();

// POST /api/v1/tests/run
testRouter.post('/run', requireAuth, async (req, res) => {
  try {
    const summary = await automatedTestRunner.runAllSuites();
    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: `Test suite execution failed: ${err.message}` });
  }
});
