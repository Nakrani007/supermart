// Safe localStorage wrappers — some browsers block localStorage in incognito.

export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage blocked — fail silently, cart still works in-memory
  }
}

export function lsRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}
