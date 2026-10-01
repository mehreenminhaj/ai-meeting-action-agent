import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'meetingmind-ai-default-secure-secret-key-32b',
  encryptionKey: (process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef').slice(0, 32),
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  jiraBaseUrl: process.env.JIRA_BASE_URL || '',
  jiraUserEmail: process.env.JIRA_USER_EMAIL || '',
  jiraApiToken: process.env.JIRA_API_TOKEN || '',
  jiraDefaultProjectKey: process.env.JIRA_DEFAULT_PROJECT_KEY || 'PROJ',
  notionApiKey: process.env.NOTION_API_KEY || '',
  notionDefaultDatabaseId: process.env.NOTION_DEFAULT_DATABASE_ID || '',
  smtpHost: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || 'notifications@meetingmind.ai',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  n8nWebhookBaseUrl: process.env.N8N_WEBHOOK_BASE_URL || '',
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET || 'n8n-shared-secret',
};

// Cryptographic helpers for password hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// AES-256-GCM encryption for storing sensitive credentials at rest
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(CONFIG.encryptionKey, 'utf-8'), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSecret(encryptedPayload: string): string {
  try {
    const [ivHex, authTagHex, encryptedHex] = encryptedPayload.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) return '';
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(CONFIG.encryptionKey, 'utf-8'),
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

// Token session helper
export function generateAuthToken(payload: { userId: string; email: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const data = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', CONFIG.jwtSecret)
    .update(`${header}.${data}`)
    .digest('base64url');
  return `${header}.${data}.${signature}`;
}

export function verifyAuthToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    const [header, data, signature] = token.split('.');
    if (!header || !data || !signature) return null;
    const expectedSignature = crypto
      .createHmac('sha256', CONFIG.jwtSecret)
      .update(`${header}.${data}`)
      .digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { userId: payload.userId, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
