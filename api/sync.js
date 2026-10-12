/**
 * Vercel Serverless Function: /api/sync
 * Provides multi-device persistence for StillHour using Vercel KV / Upstash Redis REST API.
 * All devices owned by the user automatically sync with this single-user cloud store.
 */

// Helper to interact with Upstash / Vercel KV REST API
async function kvCommand(command, ...args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return { error: 'KV_NOT_CONFIGURED' };
  }

  try {
    const response = await fetch(`${url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command, ...args]),
    });

    if (!response.ok) {
      throw new Error(`KV request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { result: data.result };
  } catch (err) {
    console.error('KV request error:', err);
    return { error: err.message };
  }
}

const DB_KEY = 'stillhour:userdata:v1';

export default async function handler(req, res) {
  // CORS Headers for multi-device support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kvConfigured = Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );

  // 1. GET: Fetch latest cloud state for multi-device initial load / pull
  if (req.method === 'GET') {
    if (!kvConfigured) {
      return res.status(200).json({
        success: false,
        kvConfigured: false,
        message: 'Vercel KV is not yet linked. Link Vercel KV in the Storage tab to enable multi-device sync.',
      });
    }

    const { result, error } = await kvCommand('GET', DB_KEY);
    if (error) {
      return res.status(500).json({ success: false, error });
    }

    let parsed = null;
    if (result) {
      try {
        parsed = typeof result === 'string' ? JSON.parse(result) : result;
      } catch {
        parsed = null;
      }
    }

    return res.status(200).json({
      success: true,
      kvConfigured: true,
      data: parsed || {
        subjects: [],
        tasks: [],
        sessions: [],
        templates: [],
        snapshots: {},
        updatedAt: new Date().toISOString(),
      },
      serverTimestamp: Date.now(),
    });
  }

  // 2. POST: Push local mutations or full database sync
  if (req.method === 'POST') {
    if (!kvConfigured) {
      return res.status(200).json({
        success: false,
        kvConfigured: false,
        message: 'Vercel KV is not yet linked. Data is saved locally in IndexedDB.',
      });
    }

    const body = req.body || {};
    const { fullState, mutations = [] } = body;

    // Fetch existing remote state first to perform a clean merge
    const currentRes = await kvCommand('GET', DB_KEY);
    let remoteState = {
      subjects: [],
      tasks: [],
      sessions: [],
      templates: [],
      snapshots: {},
      updatedAt: new Date().toISOString(),
    };

    if (currentRes.result) {
      try {
        const p = typeof currentRes.result === 'string' ? JSON.parse(currentRes.result) : currentRes.result;
        if (p && typeof p === 'object') remoteState = p;
      } catch {
        // use default empty remoteState
      }
    }

    // Merging logic:
    let mergedState = { ...remoteState };

    if (fullState && typeof fullState === 'object') {
      // Merge subjects: union by ID, preferring latest updatedAt
      const subjectsMap = new Map();
      (remoteState.subjects || []).forEach((s) => subjectsMap.set(s.id, s));
      (fullState.subjects || []).forEach((s) => {
        const existing = subjectsMap.get(s.id);
        if (!existing || new Date(s.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
          subjectsMap.set(s.id, s);
        }
      });

      // Merge tasks
      const tasksMap = new Map();
      (remoteState.tasks || []).forEach((t) => tasksMap.set(t.id, t));
      (fullState.tasks || []).forEach((t) => {
        const existing = tasksMap.get(t.id);
        if (!existing || new Date(t.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
          tasksMap.set(t.id, t);
        }
      });

      // Merge sessions: union by ID
      const sessionsMap = new Map();
      (remoteState.sessions || []).forEach((sess) => sessionsMap.set(sess.id, sess));
      (fullState.sessions || []).forEach((sess) => sessionsMap.set(sess.id, sess));

      // Merge templates
      const templatesMap = new Map();
      (remoteState.templates || []).forEach((tpl) => templatesMap.set(tpl.id, tpl));
      (fullState.templates || []).forEach((tpl) => templatesMap.set(tpl.id, tpl));

      mergedState = {
        subjects: Array.from(subjectsMap.values()),
        tasks: Array.from(tasksMap.values()),
        sessions: Array.from(sessionsMap.values()),
        templates: Array.from(templatesMap.values()),
        snapshots: { ...(remoteState.snapshots || {}), ...(fullState.snapshots || {}) },
        updatedAt: new Date().toISOString(),
      };
    }

    // Save merged state back into KV
    const saveRes = await kvCommand('SET', DB_KEY, JSON.stringify(mergedState));
    if (saveRes.error) {
      return res.status(500).json({ success: false, error: saveRes.error });
    }

    return res.status(200).json({
      success: true,
      kvConfigured: true,
      data: mergedState,
      serverTimestamp: Date.now(),
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
