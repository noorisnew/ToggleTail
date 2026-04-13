/**
 * Shared database connection state.
 *
 * A simple mutable flag that index.js sets after a successful Prisma
 * $connect() call. Middleware and routes read it to decide whether the
 * database is available — avoiding a round-trip query on every request.
 */

module.exports = {
  isConnected: false,
};
