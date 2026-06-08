const SESSION_KEY_PREFIX = "ielts-reading-active-session";

function sessionKey(userId) {
  if (!userId) return SESSION_KEY_PREFIX;
  const safe = String(userId).replace(/[^a-zA-Z0-9]/g, "_");
  return `${SESSION_KEY_PREFIX}_${safe}`;
}

export function loadReadingSession(userId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(sessionKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveReadingSession(userId, payload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(sessionKey(userId), JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to persist reading session", err);
  }
}

export function clearReadingSession(userId) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(sessionKey(userId));
}
