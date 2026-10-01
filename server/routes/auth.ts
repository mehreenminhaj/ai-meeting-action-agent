import { Router } from 'express';
import { db } from '../db/database.js';
import { hashPassword, verifyPassword, generateAuthToken, verifyAuthToken } from '../config.js';
import { User } from '../types.js';

export const authRouter = Router();

// Middleware to extract authenticated user
export function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For convenience in local dev, provide default demo user if header missing
    const defaultUser = db.getUsers()[0];
    req.user = defaultUser;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired authentication session' });
  }

  const user = db.getUsers().find((u) => u.id === payload.userId);
  if (!user || user.accountStatus !== 'active') {
    return res.status(401).json({ error: 'User account not active' });
  }

  req.user = user;
  next();
}

// POST /api/v1/auth/register
authRouter.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = db.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const now = new Date().toISOString();
  const newUser: User = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    role: 'member',
    createdAt: now,
    updatedAt: now,
    accountStatus: 'active',
  };

  db.addUser(newUser);

  // Automatically attach to default workspace
  const defaultWs = db.getWorkspaces()[0];
  if (defaultWs) {
    db.addWorkspaceMember({
      id: `mem-${newUser.id}`,
      workspaceId: defaultWs.id,
      userId: newUser.id,
      displayName: newUser.name,
      email: newUser.email,
      role: 'member',
      aliases: [newUser.name.split(' ')[0]],
      activeStatus: 'active',
      notificationPreferences: { emailOnAssignment: true, emailOnSummary: true, slackNotifications: true },
      joinedAt: now,
    });
  }

  const token = generateAuthToken({ userId: newUser.id, email: newUser.email, role: newUser.role });

  return res.status(201).json({
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    token,
  });
});

// POST /api/v1/auth/login
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateAuthToken({ userId: user.id, email: user.email, role: user.role });

  return res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  });
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/v1/auth/me
authRouter.get('/me', requireAuth, (req: any, res) => {
  const user = req.user;
  const workspaces = db.getWorkspaces();
  return res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
    workspaces,
    currentWorkspace: workspaces[0],
  });
});
