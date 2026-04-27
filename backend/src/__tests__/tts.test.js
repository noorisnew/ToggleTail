const request = require('supertest');
const express = require('express');

describe('TTS routes', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      ELEVENLABS_API_KEY: 'test-key',
    };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    delete global.fetch;
  });

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/tts', require('../routes/tts'));
    return app;
  }

  test('GET /api/tts/health returns ok when upstream voices request succeeds', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ voices: [] }),
    });

    const response = await request(createApp()).get('/api/tts/health');

    expect(response.status).toBe(200);
    expect(response.body.available).toBe(true);
    expect(response.body.status).toBe('ok');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/voices'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'xi-api-key': 'test-key' }),
        signal: expect.any(Object),
      })
    );
  });

  test('GET /api/tts/voices reports unavailable when upstream health fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ detail: { message: 'Invalid API key' } }),
    });

    const response = await request(createApp()).get('/api/tts/voices');

    expect(response.status).toBe(200);
    expect(response.body.available).toBe(false);
    expect(response.body.message).toContain('Invalid API key');
  });

  test('POST /api/tts/generate returns audio when upstream succeeds', async () => {
    const audioBuffer = Buffer.from([0x49, 0x44, 0x33]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => audioBuffer,
    });

    const response = await request(createApp())
      .post('/api/tts/generate')
      .send({ text: 'Hello', voiceName: 'Rachel' });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('audio/mpeg');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/text-to-speech/XrExE9yKIg1WjnnlVkGX'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'xi-api-key': 'test-key' }),
        body: expect.any(String),
        signal: expect.any(Object),
      })
    );
  });

  test('POST /api/tts/generate returns upstream message on failure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ detail: { message: 'Too many requests' } }),
    });
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ detail: { message: 'Too many requests' } }),
    });

    const response = await request(createApp())
      .post('/api/tts/generate')
      .send({ text: 'Hello', voiceName: 'Rachel' });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Voice generation failed');
    expect(response.body.message).toContain('Too many requests');
    expect(response.body.fallback).toBe(true);
  });
});