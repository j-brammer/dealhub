import crypto from 'crypto';
import cors from 'cors';
import express from 'express';

import { ALLOWED_SLUGS, EBAY_SEARCH_BY_SLUG } from './ebayCategoryMap.js';

const PORT = Number.parseInt(String(process.env.PORT || '8080'), 10) || 8080;
const EBAY_API_ROOT = (process.env.EBAY_API_ROOT || 'https://api.ebay.com').replace(/\/$/, '');
const EBAY_MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID || '';
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET || '';
const EBAY_SCOPE = process.env.EBAY_OAUTH_SCOPE || 'https://api.ebay.com/oauth/api_scope';

const MAD_VERIFICATION_TOKEN = process.env.EBAY_MAD_VERIFICATION_TOKEN || '';
const MAD_PUBLIC_URL = (process.env.EBAY_MAD_PUBLIC_URL || '').trim();

const identityOrigin = (() => {
  try {
    return new URL(EBAY_API_ROOT).origin;
  } catch {
    return 'https://api.ebay.com';
  }
})();

const TOKEN_URL = `${identityOrigin}/identity/v1/oauth2/token`;

/** @type {{ accessToken: string; expiresAtMs: number } | null} */
let tokenCache = null;

async function getApplicationAccessToken() {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + 5000) {
    return tokenCache.accessToken;
  }
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    throw new Error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set');
  }
  const basic = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`, 'utf8').toString('base64');
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: EBAY_SCOPE,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`eBay OAuth failed: ${res.status} ${text}`);
  }
  /** @type {{ access_token: string; expires_in: number }} */
  const json = JSON.parse(text);
  const expiresIn = Number(json.expires_in) || 7200;
  tokenCache = {
    accessToken: json.access_token,
    expiresAtMs: now + expiresIn * 1000,
  };
  return tokenCache.accessToken;
}

/**
 * @param {string} pathWithQuery path starting with /buy/browse/v1/...
 */
async function ebayBrowseGet(pathWithQuery) {
  const token = await getApplicationAccessToken();
  const url = `${EBAY_API_ROOT}${pathWithQuery.startsWith('/') ? '' : '/'}${pathWithQuery}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': EBAY_MARKETPLACE_ID,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`eBay Browse error: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

function buildSearchQueryString(slug, offset, limit) {
  const params = new URLSearchParams();
  const spec = EBAY_SEARCH_BY_SLUG[slug] || EBAY_SEARCH_BY_SLUG.all;
  if (spec.q) params.set('q', spec.q);
  if (spec.category_ids) params.set('category_ids', spec.category_ids);
  params.set('limit', String(Math.min(Math.max(limit, 1), 200)));
  params.set('offset', String(Math.max(offset, 0)));
  return `/buy/browse/v1/item_summary/search?${params.toString()}`;
}

function madChallengeResponse(challengeCode, verificationToken, endpointUrl) {
  return crypto
    .createHash('sha256')
    .update(challengeCode, 'utf8')
    .update(verificationToken, 'utf8')
    .update(endpointUrl, 'utf8')
    .digest('hex');
}

const app = express();
app.set('trust proxy', true);
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/search', async (req, res) => {
  try {
    const slug = String(req.query.slug || 'all');
    if (!ALLOWED_SLUGS.has(slug)) {
      res.status(400).json({ error: `Unknown slug: ${slug}` });
      return;
    }
    const offset = Number.parseInt(String(req.query.offset ?? '0'), 10) || 0;
    const limit = Number.parseInt(String(req.query.limit ?? '12'), 10) || 12;
    const path = buildSearchQueryString(slug, offset, limit);
    const data = await ebayBrowseGet(path);
    res.json({
      slug,
      offset,
      limit,
      total: data.total ?? 0,
      itemSummaries: data.itemSummaries ?? [],
    });
  } catch (e) {
    console.error('[search]', e);
    res.status(502).json({ error: e instanceof Error ? e.message : 'Search failed' });
  }
});

app.get('/item/:itemId', async (req, res) => {
  try {
    const raw = req.params.itemId;
    const itemId = decodeURIComponent(raw);
    const path = `/buy/browse/v1/item/${encodeURIComponent(itemId)}`;
    const data = await ebayBrowseGet(path);
    res.json(data);
  } catch (e) {
    console.error('[item]', e);
    res.status(502).json({ error: e instanceof Error ? e.message : 'Item fetch failed' });
  }
});

const MAD_PATH = '/webhooks/ebay-marketplace-account-deletion';

app.get(MAD_PATH, (req, res) => {
  const challengeCode = req.query.challenge_code;
  if (!challengeCode || typeof challengeCode !== 'string') {
    res.status(400).json({ error: 'missing challenge_code' });
    return;
  }
  if (!MAD_VERIFICATION_TOKEN || !MAD_PUBLIC_URL) {
    console.warn('[MAD] EBAY_MAD_VERIFICATION_TOKEN or EBAY_MAD_PUBLIC_URL not set');
    res.status(503).json({ error: 'MAD not configured' });
    return;
  }
  const challengeResponse = madChallengeResponse(challengeCode, MAD_VERIFICATION_TOKEN, MAD_PUBLIC_URL);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ challengeResponse });
});

app.post(MAD_PATH, (req, res) => {
  try {
    const body = req.body;
    const topic = body?.metadata?.topic;
    const nid = body?.notification?.notificationId;
    console.log('[MAD] POST received', { topic, notificationId: nid });
  } catch (e) {
    console.warn('[MAD] log error', e);
  }
  res.status(204).end();
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`dealhub-ebay-backend listening on ${PORT}`);
  if (!EBAY_CLIENT_ID) console.warn('Warning: EBAY_CLIENT_ID is empty');
  if (!MAD_PUBLIC_URL) console.warn('Warning: EBAY_MAD_PUBLIC_URL is empty (MAD challenge will fail until set)');
});
