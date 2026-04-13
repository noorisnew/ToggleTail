/**
 * Prisma Client Singleton
 *
 * Using a module-level singleton prevents exhausting the connection pool
 * during hot-reloads in development (nodemon restarts the process but
 * Node's module cache keeps this file alive in some environments).
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
