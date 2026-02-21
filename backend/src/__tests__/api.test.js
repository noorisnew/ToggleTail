const request = require('supertest');
const express = require('express');

// Create a minimal test app
const app = express();
app.use(express.json());

// Import routes
const healthRoutes = require('../routes/health');
app.use('/api/health', healthRoutes);

describe('Health API', () => {
  test('GET /api/health returns status ok', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('message');
  });
});

describe('Logger Middleware', () => {
  const logger = require('../middleware/logger');

  test('logger has required methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('logger.info does not throw', () => {
    expect(() => logger.info('test message')).not.toThrow();
  });

  test('logger.error does not throw', () => {
    expect(() => logger.error('test error', { code: 500 })).not.toThrow();
  });
});

describe('Error Handler', () => {
  const { ApiError, errorHandler } = require('../middleware/errorHandler');

  test('ApiError creates error with status code', () => {
    const error = new ApiError(404, 'Not found');
    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
  });

  test('ApiError.badRequest creates 400 error', () => {
    const error = ApiError.badRequest('Invalid input');
    expect(error.statusCode).toBe(400);
  });

  test('ApiError.notFound creates 404 error', () => {
    const error = ApiError.notFound('Resource not found');
    expect(error.statusCode).toBe(404);
  });

  test('ApiError.internal creates 500 error', () => {
    const error = ApiError.internal('Server error');
    expect(error.statusCode).toBe(500);
  });
});
