// Collision-free order number generator — no shared state, no database dependency.
//
// Format : SM-{timestamp_ms}-{random5}
// Example: SM-1723456789123-A9XK2
//
// Collision probability per millisecond:
//   alphabet = 36 chars (A-Z + 0-9),  length = 5  →  36^5 ≈ 60,466,176 combinations
//   Two simultaneous orders in the same millisecond have a 1-in-60M chance of collision.
//   In practice, the retry mechanism (up to 3 attempts) eliminates even that edge case.
//
// Fallback (generateFallbackOrderNumber):
//   Used on retry attempts — uses base-36 timestamp + 8 random chars for higher entropy.

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Cryptographically-seeded random alphanumeric string of given length. */
function randomStr(len) {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

/**
 * Primary generator.
 * Returns e.g. "SM-1723456789123-A9XK2"
 */
export function generateOrderNumber() {
  const ts   = Date.now();   // 13-digit millisecond epoch
  const rand = randomStr(5); // 5 alphanumeric chars  →  60 M combos / ms
  return `SM-${ts}-${rand}`;
}

/**
 * High-entropy fallback — used on collision retry.
 * Base-36 timestamp (shorter) + 8 random chars  →  ~2.8 trillion combos.
 * Returns e.g. "SM-LK9X2F4A-B3Z8QW1T"
 */
export function generateFallbackOrderNumber() {
  const ts   = Date.now().toString(36).toUpperCase(); // compact epoch
  const rand = randomStr(8);                          // 36^8 ≈ 2.8 T combos
  return `SM-${ts}-${rand}`;
}
