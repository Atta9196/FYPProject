/**
 * progressSync - bidirectional sync between localStorage and the backend.
 *
 * Why this exists:
 *   Practice progress was historically stored ONLY in browser localStorage,
 *   keyed by the user's email. localStorage is strictly per-origin, so after
 *   deploying the app to a new domain (or signing in from a different device /
 *   browser / private window), the user appeared to have "lost" everything.
 *
 * What this does:
 *   - On login: pull the user's saved progress from Firestore and seed the
 *     localStorage keys the existing practice pages already read from.
 *   - On the existing `progressUpdated` event (which every practice page
 *     dispatches after saving): push the latest localStorage state back up.
 *
 * No changes to existing practice pages are required - they keep writing to
 * localStorage and firing `progressUpdated` exactly as before.
 */

import {
    fetchAllProgress,
    saveModuleProgress,
    syncProgress,
} from "./api/progressApi";

const MODULES = ["reading", "writing", "listening", "speaking"];
const BASE_KEYS = {
    reading: "ielts-reading-history",
    writing: "ielts-writing-history",
    listening: "ielts-listening-history",
    speaking: "ielts-speaking-history",
};
const PUSH_DEBOUNCE_MS = 1200;
const LAST_PULL_KEY = "ielts-progress-last-pull"; // userId -> ISO

function sanitizeUserPart(userId) {
    return String(userId).replace(/[^a-zA-Z0-9]/g, "_");
}

function getKey(module, userId) {
    const base = BASE_KEYS[module];
    if (!base) return null;
    if (!userId) return base;
    return `${base}_${sanitizeUserPart(userId)}`;
}

function readLocalEntries(module, userId) {
    if (typeof window === "undefined") return [];
    const key = getKey(module, userId);
    if (!key) return [];
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.warn(`[progressSync] Failed to parse local ${module} history`, err);
        return [];
    }
}

function writeLocalEntries(module, entries, userId) {
    if (typeof window === "undefined") return;
    const key = getKey(module, userId);
    if (!key) return;
    try {
        window.localStorage.setItem(
            key,
            JSON.stringify(Array.isArray(entries) ? entries : [])
        );
    } catch (err) {
        console.warn(`[progressSync] Failed to write local ${module} history`, err);
    }
}

function collectLocalProgress(userId) {
    const out = {};
    for (const module of MODULES) {
        out[module] = readLocalEntries(module, userId);
    }
    return out;
}

// Merge strategy: prefer the longer list (assumed to be the more complete one);
// when lengths tie, prefer server. This protects users from accidentally
// overwriting server-side data with an empty localStorage cache on a fresh
// device (the previous bug).
function mergeEntries(serverEntries = [], localEntries = []) {
    if (!Array.isArray(serverEntries)) serverEntries = [];
    if (!Array.isArray(localEntries)) localEntries = [];
    if (localEntries.length === 0) return serverEntries;
    if (serverEntries.length === 0) return localEntries;
    return localEntries.length > serverEntries.length
        ? localEntries
        : serverEntries;
}

let activeUser = null; // { uid, email, token }
let pushTimer = null;
let pushPending = false;
let progressListener = null;
let storageListener = null;
let initialized = false;

/**
 * Push the current localStorage state for the active user up to the server.
 * Debounced so a burst of saves only produces one network round-trip.
 */
function schedulePush() {
    if (!activeUser?.token) return;
    pushPending = true;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
        pushTimer = null;
        if (!activeUser?.token) return;
        const snapshot = collectLocalProgress(
            activeUser.email || activeUser.uid
        );
        try {
            await syncProgress(snapshot, activeUser.token);
            pushPending = false;
        } catch (err) {
            // Keep pushPending true so a later push retries this state.
            console.warn("[progressSync] push failed:", err.message);
        }
    }, PUSH_DEBOUNCE_MS);
}

function handleProgressUpdated() {
    schedulePush();
}

function handleStorageEvent(event) {
    if (!event.key) return;
    // Only react to keys that look like ours
    const matchesModule = MODULES.some((m) => event.key.startsWith(BASE_KEYS[m]));
    if (matchesModule) schedulePush();
}

/**
 * Pull server state, merge with local cache, write merged result back to
 * localStorage, then ask any subscribers (Dashboard etc.) to re-render.
 */
async function pullAndSeed() {
    if (!activeUser?.token) return null;
    const userKey = activeUser.email || activeUser.uid;
    try {
        const serverProgress = await fetchAllProgress(activeUser.token);
        let changed = false;
        for (const module of MODULES) {
            const serverEntries = serverProgress[module] || [];
            const localEntries = readLocalEntries(module, userKey);
            const merged = mergeEntries(serverEntries, localEntries);
            // Only write if the merged result differs from local
            const localStr = JSON.stringify(localEntries);
            const mergedStr = JSON.stringify(merged);
            if (localStr !== mergedStr) {
                writeLocalEntries(module, merged, userKey);
                changed = true;
            }
            // If local was richer than server, push the merged data back up.
            const serverStr = JSON.stringify(serverEntries);
            if (mergedStr !== serverStr) {
                try {
                    await saveModuleProgress(module, merged, activeUser.token);
                } catch (err) {
                    console.warn(
                        `[progressSync] failed to push back merged ${module}:`,
                        err.message
                    );
                }
            }
        }
        if (typeof window !== "undefined") {
            window.localStorage.setItem(
                `${LAST_PULL_KEY}_${sanitizeUserPart(userKey)}`,
                new Date().toISOString()
            );
        }
        if (changed && typeof window !== "undefined") {
            window.dispatchEvent(new Event("progressUpdated"));
        }
        return serverProgress;
    } catch (err) {
        console.warn("[progressSync] pull failed:", err.message);
        return null;
    }
}

/**
 * Begin syncing for the given user. Idempotent - calling again with the same
 * user is a no-op; calling with a different user re-initializes.
 */
export async function startProgressSync(user, token) {
    if (typeof window === "undefined") return;
    if (!user || !token) return;

    const sameUser =
        activeUser &&
        activeUser.token === token &&
        (activeUser.uid === user.uid || activeUser.email === user.email);
    if (sameUser && initialized) return;

    // Reset any previous listeners
    stopProgressSync({ keepCache: true });

    activeUser = {
        uid: user.uid || user.id || null,
        email: user.email || null,
        token,
    };

    progressListener = handleProgressUpdated;
    storageListener = handleStorageEvent;
    window.addEventListener("progressUpdated", progressListener);
    window.addEventListener("storage", storageListener);
    // Some practice pages also fire moduleCompleted custom events
    window.addEventListener("moduleCompleted", progressListener);

    initialized = true;

    // Seed localStorage from server, then push any local-only data back up.
    await pullAndSeed();
}

/**
 * Stop syncing. Optionally keep the cached entries so the user still sees
 * recent data after a logout while offline.
 */
export function stopProgressSync({ keepCache = true } = {}) {
    if (typeof window !== "undefined") {
        if (progressListener) {
            window.removeEventListener("progressUpdated", progressListener);
            window.removeEventListener("moduleCompleted", progressListener);
        }
        if (storageListener) {
            window.removeEventListener("storage", storageListener);
        }
    }
    if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
    }
    progressListener = null;
    storageListener = null;
    activeUser = null;
    initialized = false;

    if (!keepCache && typeof window !== "undefined") {
        // Best-effort wipe of cached history keys (any user)
        try {
            for (let i = window.localStorage.length - 1; i >= 0; i--) {
                const key = window.localStorage.key(i);
                if (!key) continue;
                if (MODULES.some((m) => key.startsWith(BASE_KEYS[m]))) {
                    window.localStorage.removeItem(key);
                }
            }
        } catch {
            // ignore
        }
    }
}

/**
 * Force an immediate sync (used by the manual "Sync" UI if added later).
 */
export async function forceSyncNow() {
    if (!activeUser?.token) return;
    if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
    }
    const snapshot = collectLocalProgress(activeUser.email || activeUser.uid);
    try {
        await syncProgress(snapshot, activeUser.token);
        pushPending = false;
    } catch (err) {
        console.warn("[progressSync] forced push failed:", err.message);
    }
    await pullAndSeed();
}

export function isProgressSyncActive() {
    return initialized && !!activeUser?.token;
}

export function hasPendingPush() {
    return pushPending;
}
