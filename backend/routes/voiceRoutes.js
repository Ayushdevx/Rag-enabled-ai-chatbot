const express = require('express');
const { WebSpeechAPI } = require('../services/voiceService');

const router = express.Router();

/**
 * Convert speech to text
 * POST /api/voice/stt
 */
router.post('/stt', async (req, res) => {
  try {
    const { audioData } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    
    // In a real implementation, we would use Whisper API or another STT service
    // For this implementation, we'll use a mock that would be replaced by actual API calls
    const text = await WebSpeechAPI.speechToText(audioData);
    
    return res.status(200).json({ text });
  } catch (error) {
    console.error('Error converting speech to text:', error);
    return res.status(500).json({ error: 'Error converting speech to text' });
  }
});

/**
 * Convert text to speech
 * POST /api/voice/tts
 */
router.post('/tts', async (req, res) => {
  try {
    const { text, voice } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // In a real implementation, we would use ElevenLabs or Web Speech API
    // For this implementation, we'll use a mock that would be replaced by actual API calls
    const audioData = await WebSpeechAPI.textToSpeech(text, voice);
    
    return res.status(200).json({ audioData });
  } catch (error) {
    console.error('Error converting text to speech:', error);
    return res.status(500).json({ error: 'Error converting text to speech' });
  }
});

module.exports = router;
