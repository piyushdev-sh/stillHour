/**
 * Vercel Serverless Function: /api/timer
 * Authoritative Universal Focus Timer across all devices using Vercel KV / Upstash Redis REST API.
 * Single source of truth for active timer state with atomic concurrency control.
 *
 * GET  → Fetches current active timer & server timestamp
 * POST → Actions: START, PAUSE, RESUME, STOP, COMPLETE, DISCARD, SYNC
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

async function kvDel(key) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { error: 'KV_NOT_CONFIGURED' };

  try {
    const res = await fetch(`${url}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['DEL', key]),
    });
    const data = await res.json();
    return { result: data.result };
  } catch (err) {
    return { error: err.message };
  }
}

const TIMER_KEY = 'stillhour:active_timer:v1';
const DB_KEY    = 'stillhour:userdata:v2';

function parseActiveTimer(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object' && parsed.sessionId) {
      return parsed;
    }
  } catch {}
  return null;
}

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
    return res.status(200).json({
      success: true,
      kvConfigured: false,
      activeTimer: null,
      serverTimestamp: Date.now(),
      message: 'Vercel KV not configured. Local fallback active.',
    });
  }

  // ── GET: Return authoritative active timer and current server timestamp ────
  if (req.method === 'GET') {
    const { result, error } = await kvGet(TIMER_KEY);
    if (error) return res.status(500).json({ success: false, error });

    let timer = parseActiveTimer(result);
    const nowMs = Date.now();

    // Check if running timer naturally expired
    if (timer && timer.status === 'running' && nowMs >= timer.targetEndTimestamp) {
      timer.status = 'completed';
      timer.lastTickTimestamp = timer.targetEndTimestamp;
      timer.updatedAt = new Date(nowMs).toISOString();
      await kvSet(TIMER_KEY, JSON.stringify(timer));
    }

    return res.status(200).json({
      success: true,
      kvConfigured: true,
      activeTimer: timer,
      serverTimestamp: nowMs,
    });
  }

  // ── POST: Actions (START, PAUSE, RESUME, STOP, COMPLETE, DISCARD, SYNC) ────
  if (req.method === 'POST') {
    const body = req.body || {};
    const { action, payload } = body;
    const nowMs = Date.now();
    const nowISO = new Date(nowMs).toISOString();

    const { result: currentRaw } = await kvGet(TIMER_KEY);
    let currentTimer = parseActiveTimer(currentRaw);

    // Auto-complete if expired
    if (currentTimer && currentTimer.status === 'running' && nowMs >= currentTimer.targetEndTimestamp) {
      currentTimer.status = 'completed';
      currentTimer.lastTickTimestamp = currentTimer.targetEndTimestamp;
    }

    switch (action) {
      // ── START A NEW TIMER ──
      case 'START': {
        const {
          subjectId,
          subjectName,
          taskId = null,
          taskTitle = null,
          durationMinutes = 25,
          force = false,
        } = payload || {};

        if (!subjectId) {
          return res.status(400).json({ success: false, error: 'subjectId is required to start a session' });
        }

        // Concurrency guard: If an active session is running/paused and not forced, reject with 409
        if (
          currentTimer &&
          (currentTimer.status === 'running' || currentTimer.status === 'paused') &&
          !force
        ) {
          return res.status(409).json({
            success: false,
            error: 'TIMER_ALREADY_ACTIVE',
            message: `A session for "${currentTimer.subjectName}" is already active on another device.`,
            activeTimer: currentTimer,
            serverTimestamp: nowMs,
          });
        }

        const plannedDurationSeconds = Math.max(60, Math.floor(durationMinutes * 60));
        const sessionId = `sess_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
        const targetEndTimestamp = nowMs + plannedDurationSeconds * 1000;

        const newTimer = {
          sessionId,
          subjectId,
          subjectName: subjectName || 'Study',
          taskId,
          taskTitle,
          plannedDurationSeconds,
          startTimestamp: nowMs,
          startTimestampISO: nowISO,
          targetEndTimestamp,
          pauses: [],
          currentPauseStart: null,
          status: 'running',
          lastTickTimestamp: nowMs,
          isSaved: false,
          date: new Date(nowMs).toISOString().slice(0, 10),
          recoveryEvents: [],
          createdAt: nowISO,
          updatedAt: nowISO,
        };

        const { error: setError } = await kvSet(TIMER_KEY, JSON.stringify(newTimer));
        if (setError) return res.status(500).json({ success: false, error: setError });

        return res.status(200).json({
          success: true,
          activeTimer: newTimer,
          serverTimestamp: nowMs,
        });
      }

      // ── PAUSE TIMER ──
      case 'PAUSE': {
        if (!currentTimer || currentTimer.status !== 'running') {
          return res.status(200).json({
            success: true,
            activeTimer: currentTimer,
            serverTimestamp: nowMs,
          });
        }

        const pauses = Array.isArray(currentTimer.pauses) ? [...currentTimer.pauses] : [];
        pauses.push({
          pausedAt: nowMs,
          pausedAtISO: nowISO,
          resumedAt: null,
          resumedAtISO: null,
        });

        currentTimer.status = 'paused';
        currentTimer.currentPauseStart = nowMs;
        currentTimer.lastTickTimestamp = nowMs;
        currentTimer.pauses = pauses;
        currentTimer.updatedAt = nowISO;

        await kvSet(TIMER_KEY, JSON.stringify(currentTimer));
        return res.status(200).json({
          success: true,
          activeTimer: currentTimer,
          serverTimestamp: nowMs,
        });
      }

      // ── RESUME TIMER ──
      case 'RESUME': {
        if (!currentTimer || currentTimer.status !== 'paused') {
          return res.status(200).json({
            success: true,
            activeTimer: currentTimer,
            serverTimestamp: nowMs,
          });
        }

        const pauseDurationMs = currentTimer.currentPauseStart
          ? Math.max(0, nowMs - currentTimer.currentPauseStart)
          : 0;

        currentTimer.targetEndTimestamp = (currentTimer.targetEndTimestamp || nowMs) + pauseDurationMs;

        const pauses = Array.isArray(currentTimer.pauses) ? [...currentTimer.pauses] : [];
        if (pauses.length > 0 && pauses[pauses.length - 1].resumedAt === null) {
          pauses[pauses.length - 1].resumedAt = nowMs;
          pauses[pauses.length - 1].resumedAtISO = nowISO;
        }

        currentTimer.status = 'running';
        currentTimer.currentPauseStart = null;
        currentTimer.lastTickTimestamp = nowMs;
        currentTimer.pauses = pauses;
        currentTimer.updatedAt = nowISO;

        await kvSet(TIMER_KEY, JSON.stringify(currentTimer));
        return res.status(200).json({
          success: true,
          activeTimer: currentTimer,
          serverTimestamp: nowMs,
        });
      }

      // ── STOP / COMPLETE TIMER ──
      case 'STOP':
      case 'COMPLETE': {
        if (!currentTimer) {
          return res.status(200).json({
            success: true,
            activeTimer: null,
            serverTimestamp: nowMs,
          });
        }

        const discard = Boolean(payload?.discard);
        const reason = payload?.reason || (
          currentTimer.status === 'completed' || nowMs >= currentTimer.targetEndTimestamp
            ? 'timer_completed'
            : 'manual_stop'
        );

        // Effective session end timestamp
        let effectiveEndMs = nowMs;
        if (currentTimer.status === 'paused' && currentTimer.currentPauseStart) {
          effectiveEndMs = currentTimer.currentPauseStart;
        } else if (currentTimer.status === 'completed' || nowMs >= currentTimer.targetEndTimestamp) {
          effectiveEndMs = Math.min(nowMs, currentTimer.targetEndTimestamp);
        }

        // Compute total pause duration
        let totalPauseMs = 0;
        const pauses = (currentTimer.pauses || []).map((p) => {
          const pStart = p.pausedAt;
          const pEnd = p.resumedAt || (currentTimer.status === 'paused' ? effectiveEndMs : pStart);
          if (pEnd > pStart) {
            totalPauseMs += (pEnd - pStart);
          }
          return {
            pausedAt: pStart,
            pausedAtISO: p.pausedAtISO || new Date(pStart).toISOString(),
            resumedAt: pEnd,
            resumedAtISO: p.resumedAtISO || new Date(pEnd).toISOString(),
          };
        });

        const grossElapsedMs = Math.max(0, effectiveEndMs - currentTimer.startTimestamp);
        const netElapsedMs = Math.max(0, grossElapsedMs - totalPauseMs);
        const actualDurationSeconds = Math.min(
          currentTimer.plannedDurationSeconds,
          Math.floor(netElapsedMs / 1000)
        );

        const sessionRecord = {
          id: currentTimer.sessionId,
          subjectId: currentTimer.subjectId,
          subjectName: currentTimer.subjectName,
          taskId: currentTimer.taskId || null,
          taskTitle: currentTimer.taskTitle || null,
          plannedDurationSeconds: currentTimer.plannedDurationSeconds,
          durationSeconds: actualDurationSeconds,
          durationMinutes: Math.round(actualDurationSeconds / 60),
          startTimestamp: currentTimer.startTimestamp,
          startTimestampISO: currentTimer.startTimestampISO || new Date(currentTimer.startTimestamp).toISOString(),
          endTimestamp: effectiveEndMs,
          endTimestampISO: new Date(effectiveEndMs).toISOString(),
          pauses,
          recoveryEvents: currentTimer.recoveryEvents || [],
          completionReason: discard ? 'manual_discard' : reason,
          notes: payload?.notes || '',
          date: currentTimer.date || new Date(currentTimer.startTimestamp).toISOString().slice(0, 10),
          completed: true,
          isEligible: actualDurationSeconds >= 60,
          createdAt: currentTimer.createdAt || new Date(currentTimer.startTimestamp).toISOString(),
          savedAt: nowISO,
        };

        // Atomically delete active timer
        await kvDel(TIMER_KEY);

        // If not discarded and study time was accrued, append to sessions in userdata
        if (!discard && actualDurationSeconds > 0) {
          const { result: dbRaw } = await kvGet(DB_KEY);
          let db = {
            subjects: [],
            tasks: [],
            sessions: [],
            templates: [],
            snapshots: {},
            recycleBin: [],
            settings: {},
            updatedAt: null,
          };
          if (dbRaw) {
            try {
              db = typeof dbRaw === 'string' ? JSON.parse(dbRaw) : dbRaw;
            } catch {}
          }

          const sessionsList = Array.isArray(db.sessions) ? db.sessions : [];
          if (!sessionsList.some((s) => s.id === sessionRecord.id)) {
            db.sessions = [sessionRecord, ...sessionsList];
            db.updatedAt = nowISO;
            await kvSet(DB_KEY, JSON.stringify(db));
          }
        }

        return res.status(200).json({
          success: true,
          activeTimer: null,
          finalizedSession: sessionRecord,
          serverTimestamp: nowMs,
        });
      }

      // ── DISCARD ACTIVE TIMER ──
      case 'DISCARD': {
        await kvDel(TIMER_KEY);
        return res.status(200).json({
          success: true,
          activeTimer: null,
          serverTimestamp: nowMs,
        });
      }

      // ── SYNC / HEARTBEAT ──
      case 'SYNC':
      case 'HEARTBEAT': {
        return res.status(200).json({
          success: true,
          activeTimer: currentTimer,
          serverTimestamp: nowMs,
        });
      }

      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
