/**
 * cloudStore.js
 * Single source of truth: Vercel KV via /api/sync
 * All reads and writes go through here. No local caching.
 */

const API_URL = '/api/sync';

/**
 * Fetch the full database from the cloud.
 * Returns { subjects, tasks, sessions, templates, snapshots, recycleBin }
 */
export async function cloudFetch() {
  const res = await fetch(API_URL, { method: 'GET' });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const json = await res.json();
  if (!json.kvConfigured) throw new Error('KV_NOT_CONFIGURED');
  return json.data;
}

/**
 * Write the full database to the cloud (single truth, no merge).
 * Accepts the complete state object and overwrites KV entirely.
 */
export async function cloudSave(fullState) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullState }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Save failed');
  return json;
}
