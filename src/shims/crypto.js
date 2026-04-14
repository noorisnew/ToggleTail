/**
 * Minimal 'crypto' shim for React Native / Metro bundler.
 *
 * bcryptjs 3.x does `import nodeCrypto from "crypto"` as a Node.js fallback.
 * In React Native there is no Node.js crypto module, so Metro must resolve
 * 'crypto' to something. This shim wraps globalThis.crypto (provided by Hermes
 * in React Native 0.73+) so bcryptjs never hits the "no crypto available" error.
 *
 * bcryptjs always tries `globalThis.crypto.getRandomValues` first (the Web
 * Crypto path). It only falls back to `nodeCrypto.randomBytes` when the global
 * is unavailable, which never happens on Hermes. This shim is a safety net.
 */

'use strict';

const _crypto = globalThis.crypto || {};

/**
 * Synchronously returns `size` cryptographically random bytes as a Uint8Array.
 * Mirrors the API of Node.js `crypto.randomBytes(size)`.
 */
function randomBytes(size) {
  const buf = new Uint8Array(size);
  if (_crypto.getRandomValues) {
    return _crypto.getRandomValues(buf);
  }
  // Fallback — should never be reached on Hermes.
  for (let i = 0; i < size; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return buf;
}

module.exports = {
  randomBytes,
  getRandomValues: (buf) => (_crypto.getRandomValues ? _crypto.getRandomValues(buf) : buf),
};
