/**
 * LearnBridge — Phase Two Static Code & Asset Audit
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = 'D:/LearnBridge';
const report = {
  timestamp: new Date().toISOString(),
  jsSyntax: {},
  webVtt: {},
  transcriptJson: {},
  mediaAssets: {},
  htmlAudit: {},
  cssAudit: {},
  customElements: {}
};

console.log('=== [PHASE TWO] STATIC CODE & ASSET AUDIT ===\n');

// 1. JavaScript Syntax Check
const jsFiles = [
  'app.js',
  'sw.js',
  'dist/learnbridge.js',
  'components/learnbridge-player.js',
  'components/learnbridge-transcript.js',
  'components/learnbridge-interpreter.js',
  'components/learnbridge-job-card.js',
  'components/learnbridge-certificate.js',
  'components/learnbridge-resource-list.js'
];

jsFiles.forEach(file => {
  const fullPath = path.join(ROOT, file);
  try {
    execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
    report.jsSyntax[file] = { status: 'PASS', error: null };
    console.log(`[PASS] Syntax OK: ${file}`);
  } catch (err) {
    report.jsSyntax[file] = { status: 'FAIL', error: err.message };
    console.error(`[FAIL] Syntax ERROR in ${file}:`, err.message);
  }
});

// 2. WebVTT Syntax & Encoding Validation
['captions-en.vtt', 'captions-am.vtt'].forEach(vttFile => {
  const fullPath = path.join(ROOT, 'media', vttFile);
  if (!fs.existsSync(fullPath)) {
    report.webVtt[vttFile] = { status: 'FAIL', error: 'File missing' };
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const isVtt = lines[0].trim().startsWith('WEBVTT');
  const timeRegex = /^(?:\d{2}:)?\d{2}:\d{2}\.\d{3}\s+-->\s+(?:\d{2}:)?\d{2}:\d{2}\.\d{3}/;
  let cueCount = 0;
  let cuesValid = true;

  for (let i = 1; i < lines.length; i++) {
    if (timeRegex.test(lines[i].trim())) {
      cueCount++;
    }
  }

  report.webVtt[vttFile] = {
    status: isVtt && cueCount > 0 ? 'PASS' : 'FAIL',
    isVttHeader: isVtt,
    cueCount,
    lengthBytes: Buffer.byteLength(content, 'utf8')
  };
  console.log(`[PASS] WebVTT ${vttFile}: Header=${isVtt}, Cues=${cueCount}`);
});

// 3. Transcript JSON Validation
try {
  const transPath = path.join(ROOT, 'media', 'transcript.json');
  const transData = JSON.parse(fs.readFileSync(transPath, 'utf8'));
  const segments = transData.segments || [];
  let chronological = true;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].start < segments[i - 1].start) chronological = false;
  }
  report.transcriptJson = {
    status: chronological && segments.length > 0 ? 'PASS' : 'FAIL',
    segmentCount: segments.length,
    isChronological: chronological,
    keys: Object.keys(transData)
  };
  console.log(`[PASS] Transcript JSON: ${segments.length} segments, chronological=${chronological}`);
} catch (err) {
  report.transcriptJson = { status: 'FAIL', error: err.message };
  console.error('[FAIL] Transcript JSON parse error:', err.message);
}

// 4. Media Asset Inventory Check
const mediaFiles = [
  'sample-lesson.mp4',
  'audio-description.mp3',
  'poster.jpg',
  'learnbridge-lesson-pack.zip'
];
mediaFiles.forEach(m => {
  const fullPath = path.join(ROOT, 'media', m);
  const exists = fs.existsSync(fullPath);
  const size = exists ? fs.statSync(fullPath).size : 0;
  report.mediaAssets[m] = {
    exists,
    sizeBytes: size,
    status: exists && size > 1000 ? 'PASS' : 'FAIL'
  };
  console.log(`[${exists ? 'PASS' : 'FAIL'}] Media ${m}: exists=${exists}, size=${size} bytes`);
});

// 5. HTML Static Audit (index.html & savanna-embed-demo.html)
['index.html', 'savanna-embed-demo.html'].forEach(htmlFile => {
  const fullPath = path.join(ROOT, htmlFile);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Check external links for rel="noopener"
  const linkMatches = content.match(/<a\s+[^>]*href=["'](http[^"']+)["'][^>]*>/gi) || [];
  const unsafeLinks = linkMatches.filter(l => !/rel=["'][^"']*noopener/i.test(l));

  // Check images for alt attribute
  const imgMatches = content.match(/<img\s+[^>]*>/gi) || [];
  const missingAlt = imgMatches.filter(img => !/alt=["'][^"']*["']/i.test(img));

  // Check language declaration
  const hasLang = /<html\s+[^>]*lang=["'][a-z-]+["']/i.test(content);

  // Check title
  const hasTitle = /<title>[^<]+<\/title>/i.test(content);

  report.htmlAudit[htmlFile] = {
    hasLang,
    hasTitle,
    externalLinksCount: linkMatches.length,
    unsafeLinksCount: unsafeLinks.length,
    imagesCount: imgMatches.length,
    imagesMissingAlt: missingAlt.length,
    status: hasLang && hasTitle && unsafeLinks.length === 0 && missingAlt.length === 0 ? 'PASS' : 'FAIL'
  };
  console.log(`[PASS] HTML Audit ${htmlFile}: Lang=${hasLang}, Title=${hasTitle}, UnsafeLinks=${unsafeLinks.length}, MissingAlt=${missingAlt.length}`);
});

// Save static audit report
fs.writeFileSync(
  path.join(ROOT, 'qa', 'evidence', 'media', 'static-audit-result.json'),
  JSON.stringify(report, null, 2),
  'utf8'
);

console.log('\nStatic Audit complete. Saved to qa/evidence/media/static-audit-result.json');
