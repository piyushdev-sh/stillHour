/**
 * Vercel Serverless Function: /api/sync
 * Single source of truth storage using Vercel KV / Upstash Redis REST API.
 * GET  → returns the full database
 * POST → overwrites the full database (no merge — caller owns the truth)
 */

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { error: 'KV_NOT_CONFIGURED' };

  try {
    const res = await fetch(`${url}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', key]),
    });
    const data = await res.json();
    return { result: data.result };
  } catch (err) {
    return { error: err.message };
  }
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { error: 'KV_NOT_CONFIGURED' };

  try {
    const res = await fetch(`${url}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', key, value]),
    });
    const data = await res.json();
    return { result: data.result };
  } catch (err) {
    return { error: err.message };
  }
}

const DB_KEY = 'stillhour:userdata:v2';

const EMPTY_DB = {
  subjects: [],
  tasks: [],
  sessions: [],
  templates: [],
  snapshots: {},
  recycleBin: [],
  settings: {},
  updatedAt: null,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const kvConfigured = Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );

  if (!kvConfigured) {
    return res.status(503).json({
      success: false,
      kvConfigured: false,
      message: 'Vercel KV is not linked. Go to the Vercel dashboard → Storage → Connect KV.',
    });
  }

  // ── GET: read full database ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { result, error } = await kvGet(DB_KEY);
    if (error) return res.status(500).json({ success: false, error });

    let data = EMPTY_DB;
    if (result) {
      try {
        data = typeof result === 'string' ? JSON.parse(result) : result;
      } catch {
        data = EMPTY_DB;
      }
    }

    return res.status(200).json({ success: true, kvConfigured: true, data, serverTimestamp: Date.now() });
  }

  // ── POST: overwrite full database ────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body || {};
    const { fullState } = body;

    if (!fullState || typeof fullState !== 'object') {
      return res.status(400).json({ success: false, error: 'fullState is required' });
    }

    const toSave = {
      subjects:   Array.isArray(fullState.subjects)   ? fullState.subjects   : [],
      tasks:      Array.isArray(fullState.tasks)       ? fullState.tasks      : [],
      sessions:   Array.isArray(fullState.sessions)    ? fullState.sessions   : [],
      templates:  Array.isArray(fullState.templates)   ? fullState.templates  : [],
      snapshots:  typeof fullState.snapshots === 'object' && fullState.snapshots !== null ? fullState.snapshots : {},
      recycleBin: Array.isArray(fullState.recycleBin)  ? fullState.recycleBin : [],
      settings:   typeof fullState.settings === 'object' && fullState.settings !== null ? fullState.settings : {},
      updatedAt:  new Date().toISOString(),
    };

    const { error } = await kvSet(DB_KEY, JSON.stringify(toSave));
    if (error) return res.status(500).json({ success: false, error });

    return res.status(200).json({ success: true, kvConfigured: true, data: toSave, serverTimestamp: Date.now() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
