/**
 * timerApi.js
 * Client service for the authoritative universal timer backend (/api/timer).
 * Enforces single-device-timer synchronization with server-level concurrency control.
 */

const API_URL = '/api/timer';

export async function fetchActiveTimer() {
  try {
    const res = await fetch(API_URL, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const data = await res.json();
    return {
      success: Boolean(data.success),
      activeTimer: data.activeTimer || null,
      serverTimestamp: data.serverTimestamp || Date.now(),
      kvConfigured: data.kvConfigured !== false,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      activeTimer: null,
      serverTimestamp: Date.now(),
      offline: true,
    };
  }
}

export async function startRemoteTimer({
  subjectId,
  subjectName,
  taskId = null,
  taskTitle = null,
  durationMinutes = 25,
  force = false,
}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'START',
        payload: {
          subjectId,
          subjectName,
          taskId,
          taskTitle,
          durationMinutes,
          force,
        },
      }),
    });

    const data = await res.json();

    if (res.status === 409) {
      return {
        conflict: true,
        activeTimer: data.activeTimer,
        message: data.message || 'Another session is already active.',
        serverTimestamp: data.serverTimestamp || Date.now(),
      };
    }

    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }

    return {
      success: true,
      activeTimer: data.activeTimer,
      serverTimestamp: data.serverTimestamp || Date.now(),
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

export async function pauseRemoteTimer() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'PAUSE' }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      activeTimer: data.activeTimer,
      serverTimestamp: data.serverTimestamp || Date.now(),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function resumeRemoteTimer() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'RESUME' }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      activeTimer: data.activeTimer,
      serverTimestamp: data.serverTimestamp || Date.now(),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function stopRemoteTimer({ discard = false, reason = null, notes = '' } = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'STOP',
        payload: { discard, reason, notes },
      }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      activeTimer: null,
      finalizedSession: data.finalizedSession || null,
      serverTimestamp: data.serverTimestamp || Date.now(),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function discardRemoteTimer() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DISCARD' }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      activeTimer: null,
      serverTimestamp: data.serverTimestamp || Date.now(),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function syncRemoteTimer() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SYNC' }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      activeTimer: data.activeTimer || null,
      serverTimestamp: data.serverTimestamp || Date.now(),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
