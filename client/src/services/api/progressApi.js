/**
 * Progress API client - talks to /api/progress on the backend.
 *
 * Server stores per-user progress in Firestore (keyed by Firebase UID).
 * Client caches the same data in localStorage so the UI keeps working
 * offline and avoids extra round-trips.
 */

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "https://ielts-coach-backend.onrender.com";

function getStoredToken() {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem("auth");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.token || null;
    } catch {
        return null;
    }
}

function authHeaders(explicitToken) {
    const token = explicitToken || getStoredToken();
    return token
        ? {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
          }
        : { "Content-Type": "application/json" };
}

export async function fetchAllProgress(token) {
    const res = await fetch(`${API_BASE_URL}/api/progress`, {
        method: "GET",
        headers: authHeaders(token),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to load progress (${res.status})`);
    }
    const json = await res.json();
    return json?.progress || {};
}

export async function fetchModuleProgress(module, token) {
    const res = await fetch(
        `${API_BASE_URL}/api/progress/${encodeURIComponent(module)}`,
        {
            method: "GET",
            headers: authHeaders(token),
        }
    );
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to load ${module} progress`);
    }
    const json = await res.json();
    return Array.isArray(json?.entries) ? json.entries : [];
}

export async function saveModuleProgress(module, entries, token) {
    const res = await fetch(
        `${API_BASE_URL}/api/progress/${encodeURIComponent(module)}`,
        {
            method: "PUT",
            headers: authHeaders(token),
            body: JSON.stringify({ entries: Array.isArray(entries) ? entries : [] }),
        }
    );
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to save ${module} progress`);
    }
    return res.json();
}

export async function syncProgress(progress, token) {
    const res = await fetch(`${API_BASE_URL}/api/progress/sync`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ progress: progress || {} }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to sync progress");
    }
    return res.json();
}
