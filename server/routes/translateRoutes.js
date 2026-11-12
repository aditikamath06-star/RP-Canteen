const express = require('express');
const router = express.Router();

// Helper to translate text using free Google Translate endpoint with fallback
async function performTranslation(text, sourceLang = 'auto', targetLang = 'kn') {
  if (!text || !text.trim()) return '';

  const cleanText = text.trim();
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
    sourceLang
  )}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(cleanText)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  });

  if (!response.ok) {
    throw new Error(`Translation service returned HTTP ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const translated = data[0].map((item) => (item && item[0] ? item[0] : '')).join('');
    return translated || cleanText;
  }
  return cleanText;
}

// @route   POST /api/translate
// @desc    Suggest translation between English and Kannada (Protected for staff / head)
// @access  Public / Staff (available for canteen management)
router.post('/', async (req, res) => {
  try {
    const { text, from, to } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Text to translate is required.',
      });
    }

    const targetLang = to === 'kn' ? 'kn' : 'en';
    const sourceLang = from === 'kn' ? 'kn' : from === 'en' ? 'en' : 'auto';

    try {
      const translatedText = await performTranslation(text, sourceLang, targetLang);
      return res.json({
        success: true,
        originalText: text,
        translatedText,
        from: sourceLang,
        to: targetLang,
      });
    } catch (apiErr) {
      console.warn('[Translation API Warning]: External service error:', apiErr.message);
      // Graceful failure: return original text as fallback per requirements
      return res.json({
        success: true,
        originalText: text,
        translatedText: text, // Fallback to original
        from: sourceLang,
        to: targetLang,
        fallback: true,
        notice: 'Translation suggestion service temporarily unavailable. You can enter translations manually.',
      });
    }
  } catch (error) {
    console.error('[Translation Route Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process translation request.',
    });
  }
});

module.exports = router;

