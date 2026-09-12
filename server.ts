import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { sanitizeAiResult } from './src/utils/trademarkSanitizer';
import { getKeywordFormatPromptInstructions, formatKeywordsByMode } from './src/utils/keywordFormatter';
import { getTextLengthPromptInstructions, fitTextToCharLimit, stripPunctuation } from './src/utils/textLengthFormatter';
import { KeywordFormat } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

// High limit for base64 image uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasDefaultApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Category schema and reference mapping
const MICROSTOCK_CATEGORIES: Record<number, string> = {
  1: 'Animals',
  2: 'Buildings and Architecture',
  3: 'Business',
  4: 'Drinks',
  5: 'The Environment',
  6: 'States of Mind',
  7: 'Food',
  8: 'Graphic Resources',
  9: 'Hobbies and Leisure',
  10: 'Industry',
  11: 'Landscapes',
  12: 'Lifestyle',
  13: 'People',
  14: 'Plants and Flowers',
  15: 'Culture and Religion',
  16: 'Science',
  17: 'Social Issues',
  18: 'Sports',
  19: 'Technology',
  20: 'Transport',
  21: 'Travel',
};

// Test API key endpoint
app.post('/api/test-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return res.status(400).json({ ok: false, error: 'Please enter an API key to test.' });
    }

    const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '').trim();
    const ai = new GoogleGenAI({
      apiKey: cleanKey,
    });

    const testModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
    let succeeded = false;
    let lastErr: any = null;

    for (const model of testModels) {
      try {
        const testResponse = await ai.models.generateContent({
          model,
          contents: 'Say OK',
        });
        if (testResponse.text) {
          succeeded = true;
          break;
        }
      } catch (err: any) {
        lastErr = err;
        const errMsg = err?.message || String(err);
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          return res.status(429).json({
            ok: false,
            error: 'API quota or rate limit exceeded for this key. Please check your Google AI Studio quota.',
            quotaExceeded: true,
          });
        }
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401')) {
          return res.status(401).json({
            ok: false,
            error: 'Invalid API key. Please check that you copied the complete key correctly from Google AI Studio.',
            invalidKey: true,
          });
        }
      }
    }

    if (succeeded) {
      return res.json({ ok: true, message: 'Gemini API key is active and responding!' });
    }

    return res.status(500).json({
      ok: false,
      error: lastErr?.message || 'Failed to verify key with Gemini.',
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        ok: false,
        error: 'API quota or rate limit exceeded for this key. Please check your Google Cloud / AI Studio quota.',
        quotaExceeded: true,
      });
    }
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401')) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid API key. Please check that you copied the complete key correctly from Google AI Studio.',
        invalidKey: true,
      });
    }
    return res.status(500).json({
      ok: false,
      error: errMsg || 'Failed to verify API key with Gemini.',
    });
  }
});

// ==========================================
// SECURE 30-DAY LICENSE KEY SYSTEM
// ==========================================
const ADMIN_SECRET_PASSWORD = process.env.ADMIN_SECRET_PASSWORD || 'genzaistudiohridoy2026@@##';
const DATA_DIR = path.join(process.cwd(), 'data');
const LICENSES_FILE = path.join(DATA_DIR, 'licenses.json');

interface ServerLicenseItem {
  key: string;
  createdAt: string;
  status: 'unused' | 'active' | 'expired';
  activatedAt?: string | null;
  expiresAt?: string | null;
  activatedBy?: string | null;
}

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LICENSES_FILE)) {
      fs.writeFileSync(LICENSES_FILE, JSON.stringify([], null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error ensuring data directory:', err);
  }
}

function loadLicenses(): ServerLicenseItem[] {
  ensureDataDirectory();
  try {
    const raw = fs.readFileSync(LICENSES_FILE, 'utf8');
    const list: ServerLicenseItem[] = JSON.parse(raw);
    let changed = false;
    const now = Date.now();
    for (const lic of list) {
      if (lic.status === 'active' && lic.expiresAt) {
        if (new Date(lic.expiresAt).getTime() <= now) {
          lic.status = 'expired';
          changed = true;
        }
      }
    }
    if (changed) {
      fs.writeFileSync(LICENSES_FILE, JSON.stringify(list, null, 2), 'utf8');
    }
    return list;
  } catch (err) {
    console.error('Failed to load licenses:', err);
    return [];
  }
}

function saveLicenses(list: ServerLicenseItem[]) {
  ensureDataDirectory();
  try {
    fs.writeFileSync(LICENSES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save licenses:', err);
  }
}

function generateRandomKey(existingKeys: Set<string>): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let key = '';
  do {
    const segments: string[] = [];
    for (let s = 0; s < 4; s++) {
      let segment = '';
      for (let c = 0; c < 4; c++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    key = segments.join('-');
  } while (existingKeys.has(key));
  return key;
}

const LICENSE_SECRET = process.env.LICENSE_SECRET || 'genmeta-30d-secure-salt-2026-auth';

function createLicenseToken(key: string, activatedAt: string, expiresAt: string, clientId: string): string {
  const payload = `${key}|${activatedAt}|${expiresAt}|${clientId}`;
  const signature = crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}|${signature}`).toString('base64');
}

function verifyLicenseToken(token: string): { valid: boolean; key?: string; activatedAt?: string; expiresAt?: string; clientId?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [key, activatedAt, expiresAt, clientId, signature] = decoded.split('|');
    if (!key || !activatedAt || !expiresAt || !clientId || !signature) return { valid: false };
    const expected = crypto.createHmac('sha256', LICENSE_SECRET).update(`${key}|${activatedAt}|${expiresAt}|${clientId}`).digest('hex');
    if (signature !== expected) return { valid: false };
    if (new Date(expiresAt).getTime() <= Date.now()) return { valid: false };
    return { valid: true, key, activatedAt, expiresAt, clientId };
  } catch {
    return { valid: false };
  }
}

function isLicenseValid(rawKey?: string, rawToken?: string): { valid: boolean; license?: ServerLicenseItem; error?: string } {
  const cleanKey = typeof rawKey === 'string' ? rawKey.trim().toUpperCase() : '';
  const now = Date.now();

  // 1. Verify via signed token if provided
  if (rawToken && typeof rawToken === 'string') {
    const verified = verifyLicenseToken(rawToken);
    if (verified.valid && verified.key && verified.expiresAt) {
      const expTime = new Date(verified.expiresAt).getTime();
      if (expTime > now) {
        const licenses = loadLicenses();
        let found = licenses.find((l) => l.key.toUpperCase() === verified.key!.toUpperCase());
        if (!found) {
          found = {
            key: verified.key,
            createdAt: verified.activatedAt || new Date().toISOString(),
            status: 'active',
            activatedAt: verified.activatedAt || new Date().toISOString(),
            expiresAt: verified.expiresAt,
            activatedBy: verified.clientId,
          };
          licenses.push(found);
          saveLicenses(licenses);
        }
        return { valid: true, license: found };
      }
    }
  }

  if (!cleanKey) {
    return { valid: false, error: 'A valid 30-day License Key is required.' };
  }
  const licenses = loadLicenses();
  const found = licenses.find((l) => l.key.toUpperCase() === cleanKey);
  if (!found) {
    return { valid: false, error: 'License key not found.' };
  }
  if (found.status === 'unused') {
    return { valid: false, error: 'This license key has not been activated yet.' };
  }
  const expTime = found.expiresAt ? new Date(found.expiresAt).getTime() : 0;
  if (found.status === 'expired' || expTime <= now) {
    return { valid: false, error: 'This license has expired after 30 days of use.' };
  }
  return { valid: true, license: found };
}

// 1. Verify Admin Secret Password
app.post('/api/admin/verify-password', (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ ok: false, error: 'Password is required.' });
  }
  if (password.trim() === ADMIN_SECRET_PASSWORD) {
    return res.json({ ok: true, message: 'Admin authenticated successfully.' });
  }
  return res.status(401).json({ ok: false, error: 'Incorrect secret password.' });
});

// 2. Get All Licenses (Admin Only)
app.post('/api/admin/licenses', (req, res) => {
  const password = req.headers['x-admin-password'] || req.body?.password;
  if (password !== ADMIN_SECRET_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: Incorrect secret password.' });
  }
  const licenses = loadLicenses();
  return res.json({ ok: true, licenses });
});

// 3. Generate New License Key (Admin Only)
app.post('/api/admin/generate-license', (req, res) => {
  const password = req.headers['x-admin-password'] || req.body?.password;
  if (password !== ADMIN_SECRET_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: Incorrect secret password.' });
  }
  const licenses = loadLicenses();
  const existing = new Set(licenses.map((l) => l.key.toUpperCase()));
  const key = generateRandomKey(existing);
  const newLicense: ServerLicenseItem = {
    key,
    createdAt: new Date().toISOString(),
    status: 'unused',
    activatedAt: null,
    expiresAt: null,
    activatedBy: null,
  };
  licenses.unshift(newLicense);
  saveLicenses(licenses);
  return res.json({ ok: true, license: newLicense });
});

// 4. Delete License Key (Admin Only)
app.post('/api/admin/delete-license', (req, res) => {
  const password = req.headers['x-admin-password'] || req.body?.password;
  const { key } = req.body;
  if (password !== ADMIN_SECRET_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: Incorrect secret password.' });
  }
  if (!key) {
    return res.status(400).json({ ok: false, error: 'License key is required.' });
  }
  let licenses = loadLicenses();
  licenses = licenses.filter((l) => l.key.toUpperCase() !== String(key).trim().toUpperCase());
  saveLicenses(licenses);
  return res.json({ ok: true });
});

// 5. Activate User License (One-Time Activation, 30 Days)
app.post('/api/license/activate', (req, res) => {
  const { key, clientId } = req.body;
  if (!key || typeof key !== 'string' || !key.trim()) {
    return res.status(400).json({ ok: false, error: 'Please enter a license key to activate.' });
  }
  const cleanKey = key.trim().toUpperCase();
  const licenses = loadLicenses();
  const index = licenses.findIndex((l) => l.key.toUpperCase() === cleanKey);

  if (index === -1) {
    return res.status(404).json({
      ok: false,
      error: 'Invalid license key. Please check the key or contact developer support.',
    });
  }

  const license = licenses[index];
  const now = Date.now();
  const currentClientId = clientId || license.activatedBy || 'client_' + crypto.randomBytes(6).toString('hex');

  // Check if already active
  if (license.status === 'active') {
    const expTime = license.expiresAt ? new Date(license.expiresAt).getTime() : 0;
    if (expTime <= now) {
      license.status = 'expired';
      saveLicenses(licenses);
      return res.status(400).json({
        ok: false,
        error: 'This license key has expired after 30 days.',
        isExpired: true,
      });
    }

    // Active key: guarantee persistent access for full 30 days
    license.activatedBy = currentClientId;
    saveLicenses(licenses);

    const daysRemaining = Math.max(1, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));
    const hoursRemaining = Math.max(1, Math.ceil((expTime - now) / (1000 * 60 * 60)));
    const token = createLicenseToken(license.key, license.activatedAt || new Date(now).toISOString(), license.expiresAt!, currentClientId);

    return res.json({
      ok: true,
      message: 'License active for 30 days on this device.',
      token,
      license: {
        key: license.key,
        status: license.status,
        activatedAt: license.activatedAt,
        expiresAt: license.expiresAt,
        daysRemaining,
        hoursRemaining,
      },
    });
  }

  if (license.status === 'expired') {
    return res.status(400).json({
      ok: false,
      error: 'This license key has already expired.',
      isExpired: true,
    });
  }

  // Activate unused key for 30 days
  const activatedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

  license.status = 'active';
  license.activatedAt = activatedAt;
  license.expiresAt = expiresAt;
  license.activatedBy = currentClientId;

  licenses[index] = license;
  saveLicenses(licenses);

  const token = createLicenseToken(license.key, activatedAt, expiresAt, currentClientId);

  return res.json({
    ok: true,
    message: 'License activated successfully! 30-day access unlocked.',
    token,
    license: {
      key: license.key,
      status: license.status,
      activatedAt: license.activatedAt,
      expiresAt: license.expiresAt,
      daysRemaining: 30,
      hoursRemaining: 720,
    },
  });
});

// 6. Verify User License (Client check on startup & interval)
app.post('/api/license/verify', (req, res) => {
  const { key, token, clientId } = req.body;
  const now = Date.now();
  const cleanKey = typeof key === 'string' ? key.trim().toUpperCase() : '';

  // 1. Check token if provided
  if (token && typeof token === 'string') {
    const verified = verifyLicenseToken(token);
    if (verified.valid && verified.key && verified.expiresAt) {
      const expTime = new Date(verified.expiresAt).getTime();
      if (expTime > now) {
        const daysRemaining = Math.max(1, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));
        const hoursRemaining = Math.max(1, Math.ceil((expTime - now) / (1000 * 60 * 60)));
        return res.json({
          ok: true,
          valid: true,
          token,
          license: {
            key: verified.key,
            status: 'active',
            activatedAt: verified.activatedAt || new Date().toISOString(),
            expiresAt: verified.expiresAt,
            daysRemaining,
            hoursRemaining,
          },
        });
      }
    }
  }

  if (!cleanKey) {
    return res.json({ ok: false, valid: false, error: 'No license key provided.' });
  }

  const licenses = loadLicenses();
  const found = licenses.find((l) => l.key.toUpperCase() === cleanKey);

  if (!found) {
    return res.json({ ok: false, valid: false, error: 'License key not found.' });
  }

  if (found.status === 'unused') {
    return res.json({ ok: false, valid: false, error: 'License has not been activated yet.' });
  }

  const expTime = found.expiresAt ? new Date(found.expiresAt).getTime() : 0;

  if (found.status === 'expired' || expTime <= now) {
    if (found.status !== 'expired') {
      found.status = 'expired';
      saveLicenses(licenses);
    }
    return res.json({
      ok: false,
      valid: false,
      isExpired: true,
      error: 'License expired after 30 days. Please activate a new key.',
    });
  }

  const daysRemaining = Math.max(1, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(1, Math.ceil((expTime - now) / (1000 * 60 * 60)));
  const verifiedToken = createLicenseToken(
    found.key,
    found.activatedAt || new Date(now).toISOString(),
    found.expiresAt!,
    clientId || found.activatedBy || 'client_user'
  );

  return res.json({
    ok: true,
    valid: true,
    token: verifiedToken,
    license: {
      key: found.key,
      status: found.status,
      activatedAt: found.activatedAt,
      expiresAt: found.expiresAt,
      daysRemaining,
      hoursRemaining,
    },
  });
});

// Image analysis endpoint using Gemini Multimodal Vision
app.post('/api/analyze', async (req, res) => {
  try {
    const { image, mimeType, filename, options } = req.body;

    // Secure License Enforcement
    const licenseKey = (req.headers['x-license-key'] as string) || options?.licenseKey;
    const licenseToken = (req.headers['x-license-token'] as string) || options?.licenseToken;
    const licenseCheck = isLicenseValid(licenseKey, licenseToken);
    if (!licenseCheck.valid) {
      return res.status(403).json({
        error: licenseCheck.error || 'A valid 30-day License Key is required to run AI generation.',
        requiresLicense: true,
      });
    }

    if (!image) {
      return res.status(400).json({ error: 'No image data provided. Please upload a valid image.' });
    }

    const generationMode = options?.generationMode || 'both'; // 'image_to_prompt' | 'metadata' | 'both'
    const titleLengthMode = options?.titleLengthMode || (options?.titleLength === 'auto' ? 'auto' : 'fixed');
    const targetTitleLength = options?.titleLength === 'auto' ? 'auto' : (Number(options?.titleLength) || 130);
    const targetDescLength = Math.min(Math.max(Number(options?.descriptionLength) || 60, 20), 500);
    const { titlePrompt, descPrompt } = getTextLengthPromptInstructions(titleLengthMode, targetTitleLength, targetDescLength);
    const keywordCount = Math.min(Math.max(Number(options?.keywordCount) || 49, 10), 50);
    const keywordFormat = (options?.keywordFormat || 'single') as KeywordFormat;
    const kwInstructions = getKeywordFormatPromptInstructions(keywordFormat, keywordCount);

    // Clean base64 string
    const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
    // Normalize mimeType for Gemini Vision API (Gemini Vision accepts image/jpeg, image/png, image/webp)
    let cleanMimeType = mimeType || 'image/jpeg';
    if (cleanMimeType.includes('svg') || cleanMimeType.includes('eps')) {
      cleanMimeType = 'image/png';
    } else if (cleanMimeType.startsWith('video/')) {
      cleanMimeType = 'image/jpeg'; // video snapshot frame
    } else if (!['image/jpeg', 'image/png', 'image/webp'].includes(cleanMimeType)) {
      cleanMimeType = 'image/jpeg';
    }

    // Collect candidate API keys (user custom keys first, then server environment key as fallback)
    const sanitizeKey = (k: any): string => {
      if (typeof k !== 'string') return '';
      return k.trim().replace(/^["']|["']$/g, '').trim();
    };

    const candidateKeys: string[] = [];
    if (Array.isArray(options?.apiKeys)) {
      options.apiKeys.forEach((k: any) => {
        const cleaned = sanitizeKey(k);
        if (cleaned && !candidateKeys.includes(cleaned)) candidateKeys.push(cleaned);
      });
    }
    if (options?.apiKey) {
      const cleaned = sanitizeKey(options.apiKey);
      if (cleaned && !candidateKeys.includes(cleaned)) {
        candidateKeys.unshift(cleaned);
      }
    }
    if (process.env.GEMINI_API_KEY) {
      const cleaned = sanitizeKey(process.env.GEMINI_API_KEY);
      if (cleaned && !candidateKeys.includes(cleaned)) {
        candidateKeys.push(cleaned);
      }
    }

    if (candidateKeys.length === 0) {
      return res.status(400).json({
        error: 'No Gemini API key provided. Please add your Gemini API key in Settings > API Configuration.',
        requiresApiKey: true,
      });
    }

    let promptText = '';
    let responseSchema: any = null;

    if (generationMode === 'image_to_prompt') {
      promptText = `
You are an elite AI image prompt engineer and creative visual director.
Analyze this image using your multimodal vision capability.

STRICT MICROSTOCK TRADEMARK & COPYRIGHT PROHIBITION:
- NEVER include ANY trademarked brand names, company names, logos, registered product names, or copyrighted character names (e.g., Apple, iPhone, iPad, MacBook, Nike, Adidas, Puma, Samsung, Sony, Canon, Nikon, Disney, Marvel, DC, Pokémon, LEGO, Barbie, Coca-Cola, Pepsi, Starbucks, McDonald's, Toyota, BMW, Mercedes, Ferrari, Tesla, etc.) in the prompt or analysis!
- ALWAYS substitute with neutral, generic commercial stock descriptions (e.g., "modern smartphone", "athletic sneakers", "luxury sports car", "chilled cola drink", "toy building bricks", "superhero character", etc.).

TASK:
1. Conduct a deep visual breakdown of the image:
   - Main subject, visible objects, composition, color palette, lighting, background, camera angle/perspective, artistic style/medium, and key defining details.
   - STRICT NO-HALLUCINATION RULE: Only identify what is genuinely visible. Never invent unseen objects or people.
2. Generate an accurate IMAGE-TO-PROMPT for recreation:
   - Write a rich, detailed recreation prompt for modern AI generators (Midjourney v6, FLUX, Stable Diffusion).
   - Detail the subject, framing, position, textures, materials, lighting atmosphere, and artistic style.
   - ABSOLUTE CRITICAL RULE: DO NOT include any filename, extension (.jpg, .png), or file paths inside the prompt.
`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          analysis: {
            type: Type.OBJECT,
            properties: {
              main_subject: { type: Type.STRING, description: 'Primary subject visible' },
              objects: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Visible objects' },
              composition: { type: Type.STRING, description: 'Composition and framing' },
              colors: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Dominant colors' },
              lighting: { type: Type.STRING, description: 'Lighting setup and mood' },
              background: { type: Type.STRING, description: 'Background elements' },
              perspective: { type: Type.STRING, description: 'Perspective and angle' },
              style: { type: Type.STRING, description: 'Artistic medium or style' },
              important_details: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Defining fine details' },
            },
            required: ['main_subject', 'composition', 'style'],
          },
          prompt: {
            type: Type.STRING,
            description: 'AI recreation prompt. Pure text with NO filenames or extensions.',
          },
        },
        required: ['analysis', 'prompt'],
      };
    } else if (generationMode === 'metadata') {
      promptText = `
You are a master microstock metadata specialist (Adobe Stock, Shutterstock, Dreamstime, 123RF, Alamy, Freepik).
Analyze this image using your multimodal vision capability.

STRICT MICROSTOCK TRADEMARK & COPYRIGHT PROHIBITION:
- Microstock agencies REJECT images with trademarked brand names. NEVER include ANY trademarked company names, agency names, brand logos, or copyrighted characters (e.g., Apple, iPhone, MacBook, Nike, Adidas, Puma, Samsung, Sony, Canon, Nikon, Disney, Marvel, DC, Pokemon, LEGO, Barbie, Coca-Cola, Pepsi, Starbucks, McDonald's, Toyota, BMW, Mercedes, Ferrari, Adobe, Shutterstock, Freepik, etc.) in Title, Description, or Keywords!
- ALWAYS use generic commercial descriptions.

TASK:
Generate commercial microstock metadata:
1. TITLE: ${titlePrompt}
2. DESCRIPTION: ${descPrompt}
3. KEYWORDS: Exactly ${keywordCount} relevant, high-converting microstock keywords.
${kwInstructions}
   - Prioritize main subjects first, then visible objects, styles, colors, concepts, and mood.
   - NO trademarked terms, no brand names, no irrelevant terms.
4. CATEGORY: Best matching category ID (1-21) and category name:
   1: Animals, 2: Buildings and Architecture, 3: Business, 4: Drinks, 5: The Environment, 6: States of Mind, 7: Food, 8: Graphic Resources, 9: Hobbies and Leisure, 10: Industry, 11: Landscapes, 12: Lifestyle, 13: People, 14: Plants and Flowers, 15: Culture and Religion, 16: Science, 17: Social Issues, 18: Sports, 19: Technology, 20: Transport, 21: Travel.
`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          analysis: {
            type: Type.OBJECT,
            properties: {
              main_subject: { type: Type.STRING, description: 'Brief subject description' },
              composition: { type: Type.STRING, description: 'Brief composition' },
              style: { type: Type.STRING, description: 'Style or medium' },
            },
            required: ['main_subject', 'style'],
          },
          metadata: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Commercial microstock title' },
              description: { type: Type.STRING, description: 'Stock description' },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Microstock keywords' },
              category: { type: Type.INTEGER, description: 'Category ID number between 1 and 21' },
              categoryName: { type: Type.STRING, description: 'Category name' },
            },
            required: ['title', 'description', 'keywords', 'category'],
          },
        },
        required: ['metadata'],
      };
    } else {
      // Both (Prompt + Metadata)
      promptText = `
You are a master microstock metadata specialist (Adobe Stock, Shutterstock, Dreamstime, 123RF, Alamy, Freepik) and an expert AI prompt engineer.
Carefully examine the provided image using your multimodal vision capability.

STRICT MICROSTOCK TRADEMARK & COPYRIGHT PROHIBITION (LEGAL COMPLIANCE):
- NEVER output ANY trademarked brand names, company names, logos, product series, copyrighted characters, franchises, or agency names in the Prompt, Title, Description, or Keywords!
- Banned examples: Apple, iPhone, iPad, MacBook, Microsoft, Windows, Xbox, Google, Android, Samsung, Galaxy, Sony, PlayStation, Canon, Nikon, Nike, Jordan, Adidas, Puma, Gucci, Rolex, Coca-Cola, Pepsi, Starbucks, McDonald's, Toyota, BMW, Mercedes-Benz, Ferrari, Tesla, LEGO, Barbie, Pokémon, Disney, Marvel, DC, Star Wars, Netflix, YouTube, Adobe, Shutterstock, Freepik, etc.
- ALWAYS describe subjects using neutral, generic commercial terminology (e.g., 'modern smartphone', 'sleek laptop', 'athletic running shoes', 'carbonated cola soda', 'luxury sports car', 'toy construction bricks', 'superhero character', etc.).

TASK REQUIREMENTS:
1. Conduct a rigorous visual analysis of the image:
   - Identify main subject, specific visible objects, positions, composition, primary and accent colors, lighting conditions, background, perspective/angle, artistic style (photograph, 3D render, vector illustration, flat icon, watercolor, sketch, digital painting, etc.), and fine details.
   - STRICT NO-HALLUCINATION RULE: Only identify what is genuinely visible. Never invent unseen elements.

2. Generate an accurate IMAGE-TO-PROMPT for recreation:
   - Construct a high-fidelity image recreation prompt for image generation models (Midjourney, FLUX, Stable Diffusion).
   - Include: subject, objects, composition, position, shapes, scale, perspective, palette, lighting, texture, materials, background, and artistic style.
   - ABSOLUTE CRITICAL CONSTRAINT: DO NOT include the image's filename, file extension (like .jpg, .png), or any file references inside the prompt! The prompt must be pure descriptive text.

3. Generate MICROSTOCK METADATA:
   - TITLE: ${titlePrompt}
   - DESCRIPTION: ${descPrompt}
   - KEYWORDS: Exactly ${keywordCount} highly relevant, prioritized microstock keywords.
${kwInstructions}
     - Start with the most vital subjects, then visible objects, styles, colors, mood, concepts.
     - No keyword stuffing, NO trademarked terms, no irrelevant terms.
   - CATEGORY: Choose the single best matching microstock Category ID from the standard stock taxonomy:
     1: Animals, 2: Buildings and Architecture, 3: Business, 4: Drinks, 5: The Environment, 6: States of Mind, 7: Food, 8: Graphic Resources (illustrations, vectors, icons, seasonal/holidays, backgrounds), 9: Hobbies and Leisure, 10: Industry, 11: Landscapes, 12: Lifestyle, 13: People, 14: Plants and Flowers, 15: Culture and Religion, 16: Science, 17: Social Issues, 18: Sports, 19: Technology, 20: Transport, 21: Travel.
`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          analysis: {
            type: Type.OBJECT,
            properties: {
              main_subject: { type: Type.STRING, description: 'Primary subject visible' },
              objects: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of visible objects' },
              composition: { type: Type.STRING, description: 'Composition and arrangement' },
              colors: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Dominant colors' },
              lighting: { type: Type.STRING, description: 'Type of lighting and shadows' },
              background: { type: Type.STRING, description: 'Visible background elements' },
              perspective: { type: Type.STRING, description: 'Camera angle and perspective' },
              style: { type: Type.STRING, description: 'Artistic medium or style' },
              important_details: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Key fine details' },
            },
            required: ['main_subject', 'composition', 'style'],
          },
          prompt: {
            type: Type.STRING,
            description: 'Image generation prompt. MUST NOT CONTAIN ANY FILENAME OR EXTENSION.',
          },
          metadata: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Commercial microstock title' },
              description: { type: Type.STRING, description: 'Accurate stock description' },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Microstock keywords list' },
              category: { type: Type.INTEGER, description: 'Category ID number between 1 and 21' },
              categoryName: { type: Type.STRING, description: 'Category name matching category ID' },
            },
            required: ['title', 'description', 'keywords', 'category'],
          },
        },
        required: ['analysis', 'prompt', 'metadata'],
      };
    }

    // Attempt generation with key rotation and fallback vision models
    const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.8-flash'];
    let lastError: any = null;
    let responseText: string | undefined = undefined;
    let hitQuota = false;
    let hitInvalidKey = false;

    for (let k = 0; k < candidateKeys.length; k++) {
      const currentKey = candidateKeys[k];
      const ai = new GoogleGenAI({
        apiKey: currentKey,
      });

      let keySuccess = false;

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMimeType,
                    data: base64Data,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
            config: {
              temperature: typeof options?.temperature === 'number' ? options.temperature : 0.2,
              responseMimeType: 'application/json',
              responseSchema,
            },
          });

          if (response.text) {
            responseText = response.text;
            keySuccess = true;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            hitQuota = true;
            console.warn(`API key (${k + 1}/${candidateKeys.length}) quota/rate limit reached on ${modelName}. Rotating...`);
            break; // Move to next key immediately
          } else if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401')) {
            hitInvalidKey = true;
            console.warn(`API key (${k + 1}/${candidateKeys.length}) invalid on ${modelName}. Rotating...`);
            break; // Move to next key
          }
        }
      }

      if (keySuccess) {
        break;
      }
    }

    if (!responseText) {
      if (hitQuota) {
        return res.status(429).json({
          error:
            'Gemini API quota or rate limit reached (HTTP 429). Please add another free Gemini API key in Settings > API Configuration to rotate automatically.',
          quotaExceeded: true,
        });
      }
      if (hitInvalidKey) {
        return res.status(401).json({
          error: 'Invalid Gemini API key provided. Please verify your API key in Settings > API Configuration.',
          invalidKey: true,
        });
      }
      return res.status(500).json({
        error: lastError?.message || 'Failed to analyze image with Gemini Vision.',
      });
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    parsed.generationMode = generationMode;

    if (!parsed.analysis) {
      parsed.analysis = {
        main_subject: parsed.metadata?.title || filename || 'Subject',
        objects: [],
        composition: 'Standard composition',
        colors: [],
        lighting: 'Natural lighting',
        background: 'Clean background',
        perspective: 'Eye-level',
        style: 'Stock visual',
        important_details: [],
      };
    } else {
      if (!parsed.analysis.objects) parsed.analysis.objects = [];
      if (!parsed.analysis.colors) parsed.analysis.colors = [];
      if (!parsed.analysis.important_details) parsed.analysis.important_details = [];
    }

    if (generationMode === 'image_to_prompt') {
      // ONLY prompt should be generated
      delete parsed.metadata;
      if (!parsed.prompt) {
        parsed.prompt = `${parsed.analysis?.style || 'High quality'} depiction of ${parsed.analysis?.main_subject || filename}`;
      }
    } else if (generationMode === 'metadata') {
      // ONLY metadata should be generated
      delete parsed.prompt;
      if (parsed.metadata) {
        parsed.metadata.filename = filename || 'image.jpg';
        if (!parsed.metadata.categoryName && MICROSTOCK_CATEGORIES[parsed.metadata.category]) {
          parsed.metadata.categoryName = MICROSTOCK_CATEGORIES[parsed.metadata.category];
        }
        if (!Array.isArray(parsed.metadata.keywords)) {
          parsed.metadata.keywords = [];
        }
      }
    } else {
      // Both prompt and metadata
      if (!parsed.prompt) {
        parsed.prompt = `${parsed.analysis?.style || 'High quality'} depiction of ${parsed.analysis?.main_subject || filename}`;
      }
      if (!parsed.metadata) {
        parsed.metadata = {
          filename: filename || 'image.jpg',
          title: parsed.analysis?.main_subject || '',
          description: parsed.prompt ? parsed.prompt.slice(0, 160) : '',
          keywords: [],
          category: 8,
          categoryName: 'Graphic Resources',
        };
      } else {
        parsed.metadata.filename = filename || 'image.jpg';
        if (!parsed.metadata.categoryName && MICROSTOCK_CATEGORIES[parsed.metadata.category]) {
          parsed.metadata.categoryName = MICROSTOCK_CATEGORIES[parsed.metadata.category];
        }
        if (!Array.isArray(parsed.metadata.keywords)) {
          parsed.metadata.keywords = [];
        }
      }
    }

    // Sanitize prompt to ensure no filename was accidentally included
    if (filename && parsed.prompt) {
      const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const filenameRegex = new RegExp(escapedFilename, 'gi');
      parsed.prompt = parsed.prompt.replace(filenameRegex, '').replace(/\s{2,}/g, ' ').trim();
    }

    // Apply strict microstock trademark & copyright sanitizer (zero tolerance for brand names)
    sanitizeAiResult(parsed);

    // Strictly enforce Keyword Format (single, double, mixed, auto)
    if (parsed.metadata && Array.isArray(parsed.metadata.keywords)) {
      const contextHints = [
        parsed.metadata.title || '',
        parsed.metadata.description || '',
        parsed.analysis?.main_subject || '',
        ...(parsed.analysis?.objects || []),
      ];
      parsed.metadata.keywords = formatKeywordsByMode(
        parsed.metadata.keywords,
        keywordFormat,
        keywordCount,
        contextHints
      );
    }

    // Strictly enforce Title and Description character limits and strip all punctuation
    if (parsed.metadata) {
      if (parsed.metadata.title) {
        if (targetTitleLength !== 'auto') {
          parsed.metadata.title = fitTextToCharLimit(parsed.metadata.title, Number(targetTitleLength), 'title');
        } else {
          parsed.metadata.title = stripPunctuation(parsed.metadata.title);
        }
      }
      if (parsed.metadata.description) {
        parsed.metadata.description = fitTextToCharLimit(parsed.metadata.description, targetDescLength, 'description');
      }
    }

    return res.json(parsed);
  } catch (error: any) {
    const rawMsg = error?.message || String(error);
    const isQuota = rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED');
    const isAuth = rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('401');

    if (isQuota) {
      console.warn('Gemini API quota reached (429).');
      return res.status(429).json({
        error:
          'Gemini API quota or rate limit reached. Please add your Gemini API Key in Settings > API Configuration to continue.',
        quotaExceeded: true,
      });
    }

    if (isAuth) {
      console.warn('Invalid Gemini API key (401).');
      return res.status(401).json({
        error: 'Invalid Gemini API key provided. Please check your API key in Settings > API Configuration.',
        invalidKey: true,
      });
    }

    console.error('Error analyzing image with Gemini:', rawMsg);
    return res.status(500).json({
      error: rawMsg || 'Failed to analyze image with Gemini Vision.',
    });
  }
});

// Test Mistral API Key endpoint
app.post('/api/test-mistral-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const cleanKey = apiKey ? String(apiKey).trim().replace(/^["']|["']$/g, '').trim() : '';

    if (!cleanKey) {
      return res.status(400).json({ ok: false, error: 'No API key provided' });
    }

    const testRes = await fetch('https://api.mistral.ai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    if (testRes.ok) {
      return res.json({ ok: true, message: 'Mistral API key is active and verified successfully!' });
    }

    const data: any = await testRes.json().catch(() => ({}));
    if (testRes.status === 401 || data.detail?.includes('Invalid') || data.message?.includes('Unauthorized')) {
      return res.status(401).json({ ok: false, error: 'Invalid Mistral API key. Check https://console.mistral.ai/api-keys' });
    }
    if (testRes.status === 429) {
      return res.status(429).json({ ok: false, error: 'Mistral API rate limit or quota exceeded.' });
    }

    return res.status(testRes.status).json({ ok: false, error: data.detail || data.message || `Mistral error (${testRes.status})` });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'Server error testing Mistral key' });
  }
});

// Mistral Vision image analysis proxy
app.post('/api/analyze-mistral', async (req, res) => {
  try {
    const { image, mimeType, filename, options, apiKey } = req.body;

    // Secure License Enforcement
    const licenseKey = (req.headers['x-license-key'] as string) || options?.licenseKey;
    const licenseToken = (req.headers['x-license-token'] as string) || options?.licenseToken;
    const licenseCheck = isLicenseValid(licenseKey, licenseToken);
    if (!licenseCheck.valid) {
      return res.status(403).json({
        error: licenseCheck.error || 'A valid 30-day License Key is required to run AI generation.',
        requiresLicense: true,
      });
    }

    const cleanKey = apiKey ? String(apiKey).trim().replace(/^["']|["']$/g, '').trim() : '';

    if (!cleanKey) {
      return res.status(400).json({ error: 'No Mistral API key provided.' });
    }

    const generationMode = options?.generationMode || 'both';
    const titleLengthMode = options?.titleLengthMode || (options?.titleLength === 'auto' ? 'auto' : 'fixed');
    const targetTitleLength = options?.titleLength === 'auto' ? 'auto' : (Number(options?.titleLength) || 130);
    const targetDescLength = Math.min(Math.max(Number(options?.descriptionLength) || 60, 20), 500);
    const { titlePrompt, descPrompt } = getTextLengthPromptInstructions(titleLengthMode, targetTitleLength, targetDescLength);
    const kwCount = Math.min(Math.max(Number(options?.keywordCount) || 35, 10), 50);
    const kwFormat = (options?.keywordFormat || 'single') as KeywordFormat;
    const kwInstructions = getKeywordFormatPromptInstructions(kwFormat, kwCount);

    let prompt = '';
    if (generationMode === 'image_to_prompt') {
      prompt = `You are an elite AI image prompt engineer.
Analyze this image using multimodal vision.
STRICT TRADEMARK PROHIBITION: Never include ANY trademarked brand names or copyrighted characters (Apple, Nike, Disney, Marvel, Sony, etc.). Always use generic terms.
1. Conduct visual analysis (main subject, objects, composition, colors, lighting, background, perspective, style).
2. Generate an accurate IMAGE-TO-PROMPT for AI recreation (Midjourney v6, FLUX.1, SDXL).
CRITICAL: DO NOT include filename or file extensions in the prompt!

Respond strictly in valid JSON:
{
  "analysis": {
    "main_subject": "...",
    "objects": ["..."],
    "composition": "...",
    "colors": ["..."],
    "lighting": "...",
    "background": "...",
    "perspective": "...",
    "style": "...",
    "important_details": ["..."]
  },
  "prompt": "Detailed AI recreation prompt here..."
}`;
    } else if (generationMode === 'metadata') {
      prompt = `You are an expert microstock metadata specialist.
Analyze this image and generate commercial stock metadata.
STRICT TRADEMARK PROHIBITION: Never include brand names or copyrighted names (Apple, Nike, Adidas, Disney, Marvel, etc.) in title, description, or keywords!
1. Title: ${titlePrompt}
2. Description: ${descPrompt}
3. Exactly ${kwCount} keywords.
${kwInstructions}
4. Category: ID 1-21 (8 for Graphic Resources).

Respond strictly in valid JSON:
{
  "analysis": {
    "main_subject": "...",
    "objects": ["..."],
    "composition": "...",
    "colors": ["..."],
    "lighting": "...",
    "background": "...",
    "perspective": "...",
    "style": "...",
    "important_details": ["..."]
  },
  "metadata": {
    "title": "Commercial title here",
    "description": "Stock description here...",
    "keywords": ["keyword1", "keyword2", "..."],
    "category": 8,
    "categoryName": "Graphic Resources"
  }
}`;
    } else {
      prompt = `You are an expert microstock specialist and prompt engineer.
Analyze this image.
STRICT TRADEMARK PROHIBITION: Zero tolerance for trademarks or copyrighted brands (Apple, iPhone, Nike, Adidas, Disney, Marvel, etc.). Use generic terms only!
1. Visual analysis (main subject, style, composition, lighting, colors).
2. IMAGE-TO-PROMPT for Midjourney/FLUX (no filenames or extensions!).
3. Commercial metadata: Title (${titlePrompt}), Description (${descPrompt}), ${kwCount} keywords.
${kwInstructions}
4. Category ID 1-21.

Respond strictly in valid JSON:
{
  "analysis": {
    "main_subject": "...",
    "objects": ["..."],
    "composition": "...",
    "colors": ["..."],
    "lighting": "...",
    "background": "...",
    "perspective": "...",
    "style": "...",
    "important_details": ["..."]
  },
  "prompt": "Detailed AI recreation prompt here...",
  "metadata": {
    "title": "Commercial title here",
    "description": "Stock description here...",
    "keywords": ["keyword1", "keyword2", "..."],
    "category": 8,
    "categoryName": "Graphic Resources"
  }
}`;
    }

    const preferredModel = options?.model || 'mistral-small-latest';
    const modelsToTry = [preferredModel, 'mistral-medium-latest', 'mistral-small-latest', 'pixtral-12b-2409'];

    let mistralRes: any = null;
    let lastErr = '';

    for (const m of modelsToTry) {
      try {
        const fetchRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cleanKey}`,
          },
          body: JSON.stringify({
            model: m,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: image },
                ],
              },
            ],
            max_tokens: 1500,
            temperature: 0.2,
          }),
        });

        if (fetchRes.ok) {
          mistralRes = await fetchRes.json();
          break;
        } else {
          const errData: any = await fetchRes.json().catch(() => ({}));
          lastErr = errData.detail || errData.message || `Mistral status ${fetchRes.status}`;
          if (fetchRes.status === 401) {
            return res.status(401).json({ error: 'Invalid Mistral API Key', invalidKey: true });
          }
          if (fetchRes.status === 429) {
            return res.status(429).json({ error: 'Mistral rate limit exceeded', quotaExceeded: true });
          }
        }
      } catch (err: any) {
        lastErr = err.message;
      }
    }

    if (!mistralRes) {
      return res.status(500).json({ error: lastErr || 'Mistral Vision analysis failed.' });
    }

    const rawText = mistralRes.choices?.[0]?.message?.content || '{}';
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

    const parsed = JSON.parse(cleanJson.trim());
    parsed.generationMode = generationMode;

    if (generationMode === 'image_to_prompt') {
      delete parsed.metadata;
    } else if (generationMode === 'metadata') {
      delete parsed.prompt;
      if (parsed.metadata) {
        parsed.metadata.filename = filename || 'image.jpg';
        if (!parsed.metadata.categoryName) parsed.metadata.categoryName = 'Graphic Resources';
      }
    } else {
      if (parsed.metadata) {
        parsed.metadata.filename = filename || 'image.jpg';
        if (!parsed.metadata.categoryName) parsed.metadata.categoryName = 'Graphic Resources';
      }
    }

    if (filename && parsed.prompt) {
      const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const filenameRegex = new RegExp(escapedFilename, 'gi');
      parsed.prompt = parsed.prompt.replace(filenameRegex, '').replace(/\s{2,}/g, ' ').trim();
    }

    // Apply strict microstock trademark & copyright sanitizer (zero tolerance for brand names)
    sanitizeAiResult(parsed);

    // Strictly enforce Keyword Format (single, double, mixed, auto)
    if (parsed.metadata && Array.isArray(parsed.metadata.keywords)) {
      const contextHints = [
        parsed.metadata.title || '',
        parsed.metadata.description || '',
        parsed.analysis?.main_subject || '',
        ...(parsed.analysis?.objects || []),
      ];
      parsed.metadata.keywords = formatKeywordsByMode(
        parsed.metadata.keywords,
        kwFormat,
        kwCount,
        contextHints
      );
    }

    // Strictly enforce Title and Description character limits and strip all punctuation
    if (parsed.metadata) {
      if (parsed.metadata.title) {
        if (targetTitleLength !== 'auto') {
          parsed.metadata.title = fitTextToCharLimit(parsed.metadata.title, Number(targetTitleLength), 'title');
        } else {
          parsed.metadata.title = stripPunctuation(parsed.metadata.title);
        }
      }
      if (parsed.metadata.description) {
        parsed.metadata.description = fitTextToCharLimit(parsed.metadata.description, targetDescLength, 'description');
      }
    }

    return res.json(parsed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Server error analyzing image with Mistral' });
  }
});

// ==========================================
// THIRDPARTY PROVIDERS (OpenRouter, DeepSeek, Groq, OpenAI)
// ==========================================

const PROVIDER_CONFIGS: Record<string, { baseUrl: string; testEndpoint: string; defaultModel: string }> = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    testEndpoint: 'https://openrouter.ai/api/v1/auth/key',
    defaultModel: 'google/gemini-2.0-flash-001',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    testEndpoint: 'https://api.deepseek.com/v1/models',
    defaultModel: 'deepseek-chat',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    testEndpoint: 'https://api.groq.com/openai/v1/models',
    defaultModel: 'llama-3.2-11b-vision-preview',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    testEndpoint: 'https://api.openai.com/v1/models',
    defaultModel: 'gpt-4o-mini',
  },
  zai: {
    baseUrl: 'https://api.z.ai/api/paas/v4',
    testEndpoint: 'https://api.z.ai/api/paas/v4/models',
    defaultModel: 'glm-4v-flash',
  },
  thehive: {
    baseUrl: 'https://api.thehive.ai/api/v3',
    testEndpoint: 'https://api.thehive.ai/api/v3/models',
    defaultModel: 'hive-vision-language-model',
  },
  huggingface: {
    baseUrl: 'https://api-inference.huggingface.co/v1',
    testEndpoint: 'https://huggingface.co/api/whoami-v2',
    defaultModel: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
  },
  github: {
    baseUrl: 'https://models.inference.ai.azure.com',
    testEndpoint: 'https://models.inference.ai.azure.com/models',
    defaultModel: 'gpt-4o-mini',
  },
  sambanova: {
    baseUrl: 'https://api.sambanova.ai/v1',
    testEndpoint: 'https://api.sambanova.ai/v1/models',
    defaultModel: 'Llama-3.2-11B-Vision-Instruct',
  },
  cerebras: {
    baseUrl: 'https://api.cerebras.ai/v1',
    testEndpoint: 'https://api.cerebras.ai/v1/models',
    defaultModel: 'llama3.1-8b',
  },
};

// Test third-party API key endpoint
app.post('/api/test-provider-key', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    if (!provider || !PROVIDER_CONFIGS[provider]) {
      return res.status(400).json({ ok: false, error: 'Unknown AI provider specified.' });
    }
    const cleanKey = apiKey ? String(apiKey).trim().replace(/^["']|["']$/g, '').trim() : '';
    if (!cleanKey) {
      return res.status(400).json({ ok: false, error: `Please enter an API key for ${String(provider).toUpperCase()}.` });
    }

    const config = PROVIDER_CONFIGS[provider];
    const headers: Record<string, string> = {
      Authorization: `Bearer ${cleanKey}`,
      'Content-Type': 'application/json',
    };
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://genmeta.app';
      headers['X-Title'] = 'Gen-z Ai Studio';
    }

    let testRes = await fetch(config.testEndpoint, {
      method: 'GET',
      headers,
    });

    if (!testRes.ok && provider === 'thehive' && testRes.status === 401) {
      headers.Authorization = `token ${cleanKey}`;
      testRes = await fetch(config.testEndpoint, {
        method: 'GET',
        headers,
      });
    }

    if (testRes.ok) {
      return res.json({
        ok: true,
        message: `${provider.toUpperCase()} API key is active and verified successfully!`,
      });
    }

    const data: any = await testRes.json().catch(() => ({}));
    const errText = data.error?.message || data.message || data.detail || `HTTP ${testRes.status}`;

    if (testRes.status === 401 || errText.toLowerCase().includes('invalid') || errText.toLowerCase().includes('unauthorized')) {
      return res.status(401).json({
        ok: false,
        error: `Invalid ${provider.toUpperCase()} API key. Please check your credentials.`,
        invalidKey: true,
      });
    }

    if (testRes.status === 429) {
      return res.status(429).json({
        ok: false,
        error: `${provider.toUpperCase()} rate limit or quota exceeded.`,
        quotaExceeded: true,
      });
    }

    return res.status(testRes.status).json({
      ok: false,
      error: errText,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Server network error testing API key.',
    });
  }
});

// Analyze image using third-party AI provider (OpenRouter, DeepSeek, Groq, OpenAI)
app.post('/api/analyze-thirdparty', async (req, res) => {
  try {
    const { provider, image, mimeType, filename, options, apiKey } = req.body;

    // Secure License Enforcement
    const licenseKey = (req.headers['x-license-key'] as string) || options?.licenseKey;
    const licenseToken = (req.headers['x-license-token'] as string) || options?.licenseToken;
    const licenseCheck = isLicenseValid(licenseKey, licenseToken);
    if (!licenseCheck.valid) {
      return res.status(403).json({
        error: licenseCheck.error || 'A valid 30-day License Key is required to run AI generation.',
        requiresLicense: true,
      });
    }

    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    const cleanKey = apiKey ? String(apiKey).trim().replace(/^["']|["']$/g, '').trim() : '';
    if (!cleanKey) {
      return res.status(400).json({ error: `No API key provided for ${provider.toUpperCase()}.` });
    }

    const generationMode = options?.generationMode || 'both';
    const titleLengthMode = options?.titleLengthMode || (options?.titleLength === 'auto' ? 'auto' : 'fixed');
    const targetTitleLength = options?.titleLength === 'auto' ? 'auto' : (Number(options?.titleLength) || 130);
    const targetDescLength = Math.min(Math.max(Number(options?.descriptionLength) || 60, 20), 500);
    const { titlePrompt, descPrompt } = getTextLengthPromptInstructions(titleLengthMode, targetTitleLength, targetDescLength);
    const kwCount = Math.min(Math.max(Number(options?.keywordCount) || 35, 10), 50);
    const kwFormat = (options?.keywordFormat || 'single') as KeywordFormat;
    const kwInstructions = getKeywordFormatPromptInstructions(kwFormat, kwCount);

    let prompt = '';
    if (generationMode === 'image_to_prompt') {
      prompt = `You are an elite AI image prompt engineer.
Analyze this image using multimodal vision.
STRICT TRADEMARK PROHIBITION: Never include ANY trademarked brand names or copyrighted characters (Apple, Nike, Disney, Marvel, Sony, etc.). Always use generic terms.
1. Conduct visual analysis (main subject, objects, composition, colors, lighting, background, perspective, style).
2. Generate an accurate IMAGE-TO-PROMPT for AI recreation (Midjourney v6, FLUX.1, SDXL).
CRITICAL: DO NOT include filename or file extensions in the prompt!

Respond strictly in valid JSON:
{
  "analysis": {
    "main_subject": "...",
    "objects": ["..."],
    "composition": "...",
    "colors": ["..."],
    "lighting": "...",
    "background": "...",
    "perspective": "...",
    "style": "...",
    "important_details": ["..."]
  },
  "prompt": "Detailed AI recreation prompt here..."
}`;
    } else if (generationMode === 'metadata') {
      prompt = `You are an expert microstock metadata specialist.
Analyze this image and generate commercial stock metadata.
STRICT TRADEMARK PROHIBITION: Never include brand names or copyrighted names (Apple, Nike, Adidas, Disney, Marvel, etc.) in title, description, or keywords!
1. Title: ${titlePrompt}
2. Description: ${descPrompt}
3. Exactly ${kwCount} keywords.
${kwInstructions}
4. Category: ID 1-21 (8 for Graphic Resources).

Respond strictly in valid JSON:
{
  "analysis": {
    "main_subject": "...",
    "objects": ["..."],
    "composition": "...",
    "colors": ["..."],
    "lighting": "...",
    "background": "...",
    "perspective": "...",
    "style": "...",
    "important_details": ["..."]
  },
  "metadata": {
    "title": "Commercial title here",
    "description": "Stock description here...",
    "keywords": ["keyword1", "keyword2", "..."],
    "category": 8,
    "categoryName": "Graphic Resources"
  }
}`;
    } else {
      prompt = `You are an expert microstock specialist and prompt engineer.
Analyze this image.
STRICT TRADEMARK PROHIBITION: Zero tolerance for trademarks or copyrighted brands (Apple, iPhone, Nike, Adidas, Disney, Marvel, etc.). Use generic terms only!
1. Visual analysis (main subject, style, composition, lighting, colors).
2. IMAGE-TO-PROMPT for Midjourney/FLUX (no filenames or extensions!).
3. Commercial metadata: Title (${titlePrompt}), Description (${descPrompt}), ${kwCount} keywords.
${kwInstructions}
4. Category ID 1-21.

Respond strictly in valid JSON:
{
  "analysis": {
    "main_subject": "...",
    "objects": ["..."],
    "composition": "...",
    "colors": ["..."],
    "lighting": "...",
    "background": "...",
    "perspective": "...",
    "style": "...",
    "important_details": ["..."]
  },
  "prompt": "Detailed AI recreation prompt here...",
  "metadata": {
    "title": "Commercial title here",
    "description": "Stock description here...",
    "keywords": ["keyword1", "keyword2", "..."],
    "category": 8,
    "categoryName": "Graphic Resources"
  }
}`;
    }

    const selectedModel = options?.model || config.defaultModel;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
    };
    if (provider === 'openrouter') {
      requestHeaders['HTTP-Referer'] = 'https://genmeta.app';
      requestHeaders['X-Title'] = 'Gen-z Ai Studio';
    }

    // Prepare standard OpenAI-compatible Vision payload
    const messagesPayload = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: image.startsWith('data:') ? image : `data:${mimeType || 'image/jpeg'};base64,${image}`,
            },
          },
        ],
      },
    ];

    const bodyPayload: any = {
      model: selectedModel,
      messages: messagesPayload,
      temperature: options?.temperature ?? 0.2,
    };

    // Include response_format json_object for providers that support it
    if (provider === 'openai' || provider === 'openrouter' || provider === 'groq') {
      bodyPayload.response_format = { type: 'json_object' };
    }

    const completionRes = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(bodyPayload),
    });

    if (!completionRes.ok) {
      const errData: any = await completionRes.json().catch(() => ({}));
      const errMsg = errData.error?.message || errData.message || `Status ${completionRes.status}`;
      if (completionRes.status === 401) {
        return res.status(401).json({ error: `Invalid ${provider.toUpperCase()} API Key`, invalidKey: true });
      }
      if (completionRes.status === 429) {
        return res.status(429).json({ error: `${provider.toUpperCase()} rate limit or quota exceeded`, quotaExceeded: true });
      }
      return res.status(completionRes.status).json({ error: errMsg });
    }

    const resJson: any = await completionRes.json();
    const rawText = resJson.choices?.[0]?.message?.content || '{}';

    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson.trim());
    } catch {
      // Extract first JSON object from response if wrapped in conversational text
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('AI returned a non-JSON response.');
      }
    }

    parsed.generationMode = generationMode;

    if (generationMode === 'image_to_prompt') {
      delete parsed.metadata;
    } else if (generationMode === 'metadata') {
      delete parsed.prompt;
      if (parsed.metadata) {
        parsed.metadata.filename = filename || 'image.jpg';
        if (!parsed.metadata.categoryName) parsed.metadata.categoryName = 'Graphic Resources';
      }
    } else {
      if (parsed.metadata) {
        parsed.metadata.filename = filename || 'image.jpg';
        if (!parsed.metadata.categoryName) parsed.metadata.categoryName = 'Graphic Resources';
      }
    }

    if (filename && parsed.prompt) {
      const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const filenameRegex = new RegExp(escapedFilename, 'gi');
      parsed.prompt = parsed.prompt.replace(filenameRegex, '').replace(/\s{2,}/g, ' ').trim();
    }

    // Apply strict microstock trademark & copyright sanitizer (zero tolerance for brand names)
    sanitizeAiResult(parsed);

    // Strictly enforce Keyword Format (single, double, mixed, auto)
    if (parsed.metadata && Array.isArray(parsed.metadata.keywords)) {
      const contextHints = [
        parsed.metadata.title || '',
        parsed.metadata.description || '',
        parsed.analysis?.main_subject || '',
        ...(parsed.analysis?.objects || []),
      ];
      parsed.metadata.keywords = formatKeywordsByMode(
        parsed.metadata.keywords,
        kwFormat,
        kwCount,
        contextHints
      );
    }

    // Strictly enforce Title and Description character limits and strip all punctuation
    if (parsed.metadata) {
      if (parsed.metadata.title) {
        if (targetTitleLength !== 'auto') {
          parsed.metadata.title = fitTextToCharLimit(parsed.metadata.title, Number(targetTitleLength), 'title');
        } else {
          parsed.metadata.title = stripPunctuation(parsed.metadata.title);
        }
      }
      if (parsed.metadata.description) {
        parsed.metadata.description = fitTextToCharLimit(parsed.metadata.description, targetDescLength, 'description');
      }
    }

    return res.json(parsed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Server error analyzing image with thirdparty provider' });
  }
});

// Start server with Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares as any);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GenMeta Server listening on port ${PORT}`);
  });
}

startServer();
