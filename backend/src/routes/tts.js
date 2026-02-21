const express = require('express');
const router = express.Router();

// ElevenLabs voice IDs (popular voices)
const VOICES = {
  'Rachel': 'EXAVITQu4vr4xnSDxMaL', // Warm, friendly female
  'Adam': '21m00Tcm4TlvDq8ikWAM', // Clear male voice
  'Bella': 'EXAVITQu4vr4xnSDxMaL', // Soft female voice
  'Josh': 'TxGEqnHWrfWFTfGW9XjX', // Young male voice
  'Dorothy': 'ThT5KcBeYPX3keUQqHPh', // Elderly warm female
  'Arnold': 'VR6AewLTigWG4xSOukaG', // Deep male voice
};

// Default voice for children's stories
const DEFAULT_VOICE = 'Rachel';

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
    'Rachel': 'Warm and friendly - great for storytelling',
    'Adam': 'Clear and professional',
    'Bella': 'Soft and soothing',
    'Josh': 'Young and energetic',
    'Dorothy': 'Warm grandmother voice',
    'Arnold': 'Deep and calm',
  };
  return descriptions[name] || 'AI voice';
}

/**
 * POST /api/tts/generate
 * Generate speech audio from text using ElevenLabs
 */
router.post('/generate', async (req, res) => {
  try {
    const { text, voiceName = DEFAULT_VOICE, stability = 0.5, similarityBoost = 0.75 } = req.body;

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

    // Call ElevenLabs API
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
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
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

module.exports = router;
