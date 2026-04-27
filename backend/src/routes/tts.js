const express = require('express');
const router = express.Router();

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const REQUEST_TIMEOUT_MS = 20000;
const HEALTH_CACHE_TTL_MS = 60000;

// ElevenLabs voice IDs (optimized for children's storytelling)
// Each voice is distinct — no duplicates. All are pre-made, human-sounding voices
// from ElevenLabs' public library with high naturalness ratings.
const VOICES = {
  'Rachel':  'XrExE9yKIg1WjnnlVkGX', // Matilda  — warm, natural American female storyteller
  'Dorothy': 'ThT5KcBeYPX3keUQqHPh', // Dorothy  — gentle, soothing older female voice
  'Josh':    'TX3LPaxmHKxFdv7VOQHJ', // Liam     — natural, conversational American male
  'Adam':    'onwK4e9ZLuTAKqWW03F9', // Daniel   — deep, articulate British male narrator
  'Sarah':   'XB0fDUnXU5powFXDhCwa', // Charlotte — bright, natural British female
};

// Default voice for children's stories (warm and engaging)
const DEFAULT_VOICE = 'Rachel';

// eleven_multilingual_v2 — highest naturalness / most human-sounding quality
// (eleven_turbo_v2_5 is faster but less natural for storytelling)
const TTS_MODEL = 'eleven_multilingual_v2';

let healthCache = {
  checkedAt: 0,
  result: null,
};

function getApiKey() {
  return process.env.ELEVENLABS_API_KEY?.trim() || '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableStatus(status) {
  return status === 429 || status >= 500;
}

function normalizeUpstreamError(text, status) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return `ElevenLabs upstream returned status ${status}`;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed?.detail?.message === 'string') {
      return parsed.detail.message;
    }
    if (typeof parsed?.detail === 'string') {
      return parsed.detail;
    }
    if (typeof parsed?.message === 'string') {
      return parsed.message;
    }
    if (typeof parsed?.error === 'string') {
      return parsed.error;
    }
  } catch {
    // Non-JSON error payload.
  }

  return trimmed.slice(0, 300);
}

function isVoiceCatalogPermissionError(message) {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('voices_read');
}

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(url, options, retryCount = 1) {
  let lastError;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (!response.ok && isRetriableStatus(response.status) && attempt < retryCount) {
        await sleep(400 * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retryCount) {
        throw error;
      }
      await sleep(400 * (attempt + 1));
    }
  }

  throw lastError;
}

async function checkElevenLabsHealth(forceRefresh = false) {
  const now = Date.now();
  if (
    !forceRefresh &&
    healthCache.result &&
    now - healthCache.checkedAt < HEALTH_CACHE_TTL_MS
  ) {
    return healthCache.result;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    const result = {
      available: false,
      status: 'missing_api_key',
      message: 'ElevenLabs API key not configured',
      checkedAt: new Date(now).toISOString(),
    };
    healthCache = { checkedAt: now, result };
    return result;
  }

  try {
    const response = await fetchWithRetry(`${ELEVENLABS_API_BASE}/voices`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const message = normalizeUpstreamError(errorText, response.status);

      if (isVoiceCatalogPermissionError(message)) {
        const result = {
          available: true,
          status: 'limited_permissions',
          message: 'Voice catalog permission is unavailable, but TTS generation can still work with configured voice IDs.',
          checkedAt: new Date(now).toISOString(),
        };
        healthCache = { checkedAt: now, result };
        return result;
      }

      const result = {
        available: false,
        status: 'upstream_error',
        message,
        checkedAt: new Date(now).toISOString(),
      };
      healthCache = { checkedAt: now, result };
      return result;
    }

    const result = {
      available: true,
      status: 'ok',
      message: 'ElevenLabs is reachable',
      checkedAt: new Date(now).toISOString(),
    };
    healthCache = { checkedAt: now, result };
    return result;
  } catch (error) {
    const result = {
      available: false,
      status: error?.name === 'AbortError' ? 'timeout' : 'network_error',
      message:
        error?.name === 'AbortError'
          ? 'Timed out reaching ElevenLabs'
          : error?.message || 'Failed to reach ElevenLabs',
      checkedAt: new Date(now).toISOString(),
    };
    healthCache = { checkedAt: now, result };
    return result;
  }
}

/**
 * GET /api/tts/voices
 * Get available voices for selection
 */
router.get('/voices', async (req, res) => {
  const voiceList = Object.entries(VOICES).map(([name, id]) => ({
    id,
    name,
    description: getVoiceDescription(name),
  }));

  const health = await checkElevenLabsHealth();

  res.json({ 
    voices: voiceList,
    default: DEFAULT_VOICE,
    available: health.available,
    status: health.status,
    message: health.message,
    checkedAt: health.checkedAt,
  });
});

router.get('/health', async (_req, res) => {
  const health = await checkElevenLabsHealth(true);
  res.status(health.available ? 200 : 503).json({
    ...health,
    defaultVoice: DEFAULT_VOICE,
    voiceCount: Object.keys(VOICES).length,
  });
});

function getVoiceDescription(name) {
  const descriptions = {
    'Rachel': 'Warm storyteller - perfect for bedtime stories',
    'Adam': 'Calm narrator - clear and soothing',
    'Sarah': 'Bright and cheerful - fun adventures',
    'Josh': 'Playful and fun - great for exciting stories',
    'Dorothy': 'Gentle grandma - warm and comforting',
  };
  return descriptions[name] || 'AI storyteller voice';
}

/**
 * POST /api/tts/generate
 * Generate speech audio from text using ElevenLabs
 */
router.post('/generate', async (req, res) => {
  try {
    // Optimized defaults for natural children's storytelling
    const { 
      text, 
      voiceName = DEFAULT_VOICE, 
      stability = 0.35,        // Lower = more expressive/natural
      similarityBoost = 0.80   // Higher = clearer voice matching
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      return res.status(503).json({ 
        error: 'ElevenLabs API key not configured',
        fallback: true,
        message: 'Use device text-to-speech as fallback',
      });
    }

    // Support preset names ("Rachel") and direct ElevenLabs voice IDs (e.g. cloned voices)
    const voiceId = VOICES[voiceName] || voiceName || VOICES[DEFAULT_VOICE];

    // Call ElevenLabs API with optimized settings for storytelling
    const response = await fetchWithRetry(
      `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL, // Using turbo model for faster generation
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style: 0.15,              // Slight style for expressiveness
            use_speaker_boost: true,  // Enhanced clarity
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const message = normalizeUpstreamError(errorText, response.status);
      console.error('ElevenLabs error:', message);
      return res.status(response.status).json({ 
        error: 'Voice generation failed',
        message,
        fallback: true,
      });
    }

    healthCache = {
      checkedAt: Date.now(),
      result: {
        available: true,
        status: 'ok',
        message: 'ElevenLabs is reachable',
        checkedAt: new Date().toISOString(),
      },
    };

    // Stream audio back
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    });

    const audioBuffer = await response.arrayBuffer();
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('TTS generation error:', error.message);
    res.status(error?.name === 'AbortError' ? 504 : 500).json({ 
      error: 'Failed to generate speech',
      message: error?.name === 'AbortError' ? 'Timed out generating speech' : error.message,
      fallback: true,
    });
  }
});

/**
 * POST /api/tts/stream
 * Stream speech audio (for longer texts)
 */
router.post('/stream', async (req, res) => {
  try {
    const { text, voiceName = DEFAULT_VOICE } = req.body;

    const apiKey = getApiKey();

    if (!apiKey) {
      return res.status(503).json({ 
        error: 'ElevenLabs API key not configured',
        fallback: true,
      });
    }

    const voiceId = VOICES[voiceName] || voiceName || VOICES[DEFAULT_VOICE];

    const response = await fetchWithRetry(
      `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: 'Stream failed',
        message: normalizeUpstreamError(errorText, response.status),
        fallback: true,
      });
    }

    res.set('Content-Type', 'audio/mpeg');
    
    // Pipe the stream
    const reader = response.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(Buffer.from(value));
      return pump();
    };
    
    await pump();

  } catch (error) {
    console.error('TTS stream error:', error.message);
    res.status(error?.name === 'AbortError' ? 504 : 500).json({
      error: 'Stream failed',
      message: error?.name === 'AbortError' ? 'Timed out streaming speech' : error.message,
      fallback: true,
    });
  }
});

/**
 * POST /api/tts/clone-voice
 * Upload a parent voice recording and create an ElevenLabs cloned voice.
 *
 * Request: multipart/form-data
 *   - audio: audio file (m4a/mp3/wav, max 10MB)
 *   - name: string — label for the cloned voice (e.g. "Mom's Voice")
 *   - description: string (optional)
 *
 * Response:
 *   { voiceId, name, previewUrl }  on success
 *   { error, fallback: true }      on failure
 */
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/clone-voice', upload.single('audio'), async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(503).json({
        error: 'ElevenLabs API key not configured',
        fallback: true,
      });
    }

    const { name = 'Parent Voice', description = 'Cloned parent voice for story narration' } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // Build multipart form for ElevenLabs voice cloning API
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append(
      'files',
      new Blob([req.file.buffer], { type: req.file.mimetype }),
      req.file.originalname || 'recording.m4a'
    );

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs voice clone error:', errorText);
      return res.status(response.status).json({
        error: 'Voice cloning failed',
        fallback: true,
      });
    }

    const data = await response.json();

    res.json({
      voiceId: data.voice_id,
      name,
      previewUrl: data.preview_url || null,
    });
  } catch (error) {
    console.error('clone-voice error:', error.message);
    res.status(500).json({ error: 'Voice cloning failed', message: error.message, fallback: true });
  }
});

/**
 * DELETE /api/tts/clone-voice/:voiceId
 * Delete a previously cloned ElevenLabs voice.
 */
router.delete('/clone-voice/:voiceId', async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(503).json({ error: 'ElevenLabs API key not configured' });
    }

    const { voiceId } = req.params;

    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to delete voice' });
    }

    res.json({ success: true, voiceId });
  } catch (error) {
    console.error('delete-voice error:', error.message);
    res.status(500).json({ error: 'Failed to delete voice', message: error.message });
  }
});

module.exports = router;
