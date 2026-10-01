import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CONFIG } from './server/config.js';
import { authRouter } from './server/routes/auth.js';
import { workspaceRouter } from './server/routes/workspaces.js';
import { meetingRouter } from './server/routes/meetings.js';
import { actionRouter } from './server/routes/actions.js';
import { integrationRouter } from './server/routes/integrations.js';
import { dashboardRouter } from './server/routes/dashboard.js';
import { automationRouter } from './server/routes/automation.js';
import { testRouter } from './server/routes/tests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // CORS for dev convenience
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-MeetingMind-Secret');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'MeetingMind AI',
      timestamp: new Date().toISOString(),
      nodeEnv: CONFIG.nodeEnv,
      aiProvider: CONFIG.aiProvider,
      geminiConfigured: Boolean(CONFIG.geminiApiKey || process.env.GEMINI_API_KEY),
    });
  });

  // Mount versioned API routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/workspaces', workspaceRouter);
  app.use('/api/v1', meetingRouter);
  app.use('/api/v1/actions', actionRouter);
  app.use('/api/v1/integrations', integrationRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/automation', automationRouter);
  app.use('/api/v1/tests', testRouter);

  // In development, hook up Vite dev server middleware
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware mounted successfully.');
  } else {
    // In production, serve dist folder
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  const PORT = CONFIG.port || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MeetingMind AI full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
