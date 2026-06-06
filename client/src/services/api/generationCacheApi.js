/**
 * Client API for the per-user "AI-generated content" cache.
 *
 * Mirrors the server's /api/generation-cache/:module endpoints. Each module
 * (reading | listening | writing | speaking) gets exactly one cached
 * payload per user. Returns null cleanly when:
 *   - the user is not logged in (no JWT)
 *   - no cache exists yet
 *   - the cached payload is missing/corrupt
 * Practice pages can then fall back to "generate fresh".
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

function authHeaders(token) {
    const t = token || getStoredToken();
    return t
        ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` }
        : null;
}

/**
 * GET cached content for a module.
 * Returns the data payload (whatever the practice page expects), or null
 * if there's no usable cache yet.
 */
export async function getCachedGeneration(module, token) {
    const headers = authHeaders(token);
    if (!headers) return null; // no auth → skip cache
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/generation-cache/${encodeURIComponent(module)}`,
            { method: "GET", headers }
        );
        if (!res.ok) return null;
        const json = await res.json();
        if (!json?.cached) return null;
        return json.data ?? null;
    } catch (err) {
        console.warn(`[cache] getCachedGeneration(${module}) failed:`, err.message);
        return null;
    }
}

/**
 * Persist freshly-generated content. Silent on failure (the user already
 * has working content; saving the cache is an optimisation).
 */
export async function saveCachedGeneration(module, data, token) {
    const headers = authHeaders(token);
    if (!headers) return false;
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/generation-cache/${encodeURIComponent(module)}`,
            { method: "PUT", headers, body: JSON.stringify({ data }) }
        );
        return res.ok;
    } catch (err) {
        console.warn(`[cache] saveCachedGeneration(${module}) failed:`, err.message);
        return false;
    }
}

/**
 * Wipe the cached payload (used right before regenerating).
 */
export async function clearCachedGeneration(module, token) {
    const headers = authHeaders(token);
    if (!headers) return false;
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/generation-cache/${encodeURIComponent(module)}`,
            { method: "DELETE", headers }
        );
        return res.ok;
    } catch (err) {
        console.warn(`[cache] clearCachedGeneration(${module}) failed:`, err.message);
        return false;
    }
}
