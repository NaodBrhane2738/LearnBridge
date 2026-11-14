const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const translationsPath = path.join(__dirname, '..', 'data', 'translations.json');

function loadData() {
  const raw = fs.readFileSync(translationsPath, 'utf8');
  return JSON.parse(raw);
}

router.get('/languages', (req, res) => {
  const data = loadData();
  res.json({
    success: true,
    data: {
      defaultLanguage: 'en',
      languages: data.languages
    },
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

router.get('/translations/:language', (req, res, next) => {
  const lang = (req.params.language || '').toLowerCase().trim();
  const data = loadData();

  if (!data.translations[lang]) {
    const err = new Error(`Language '${lang}' is not supported. Supported codes: ${data.languages.map(l => l.code).join(', ')}`);
    err.status = 404;
    err.code = 'LANGUAGE_NOT_FOUND';
    err.details = { supportedLanguages: data.languages.map(l => l.code) };
    return next(err);
  }

  res.json({
    success: true,
    data: {
      language: lang,
      translations: data.translations[lang],
      fallbackLanguage: 'en'
    },
    meta: {
      version: 'v1',
      requestId: req.id
    }
  });
});

module.exports = router;
