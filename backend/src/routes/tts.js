const express = require('express');
const router = express.Router();

// ElevenLabs voice IDs (optimized for children's storytelling)
const VOICES = {
  'Rachel': 'EXAVITQu4vr4xnSDxMaL', // Warm, friendly female - great for stories
  'Adam': '21m00Tcm4TlvDq8ikWAM',   // Clear male voice - calm narrator
  'Sarah': 'EXAVITQu4vr4xnSDxMaL',  // Bright female voice
  'Josh': 'TxGEqnHWrfWFTfGW9XjX',   // Young male - playful, fun
  'Dorothy': 'ThT5KcBeYPX3keUQqHPh', // Warm grandmother - gentle, soothing
};

// Default voice for children's stories (warm and engaging)
const DEFAULT_VOICE = 'Rachel';

// Model selection: eleven_turbo_v2_5 is fastest with great quality
// eleven_multilingual_v2 has best naturalness but slower
const TTS_MODEL = 'eleven_turbo_v2_5';

/**
 * GET /api/tts/voices
 * Get available voices for selection
 */
router.get('/voices', (req, res) => {
  const voiceList = Object.entries(VOICES).map(([name, id]) => ({
    id,
    name,
    description: getVoiceDescription(name),
  }));

  res.json({ 
    voices: voiceList,
    default: DEFAULT_VOICE,
    available: !!process.env.ELEVENLABS_API_KEY,
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

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(503).json({ 
        error: 'ElevenLabs API key not configured',
        fallback: true,
        message: 'Use device text-to-speech as fallback',
      });
    }

    const voiceId = VOICES[voiceName] || VOICES[DEFAULT_VOICE];

    // Call ElevenLabs API with optimized settings for storytelling
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
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
      console.error('ElevenLabs error:', errorText);
      return res.status(response.status).json({ 
        error: 'Voice generation failed',
        fallback: true,
      });
    }

    // Stream audio back
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    });

    const audioBuffer = await response.arrayBuffer();
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('TTS generation error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate speech',
      message: error.message,
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

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(503).json({ 
        error: 'ElevenLabs API key not configured',
        fallback: true,
      });
    }

    const voiceId = VOICES[voiceName] || VOICES[DEFAULT_VOICE];

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Stream failed', fallback: true });
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
    res.status(500).json({ error: 'Stream failed', fallback: true });
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
