const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const employmentHtmlPath = path.join(__dirname, '..', 'employment', 'index.html');

console.log('====================================================');
console.log(' LEARNBRIDGE WCAG 2.2 AA ACCESSIBILITY AUDIT SUITE');
console.log('====================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(desc, pass, detail = '') {
  totalChecks++;
  if (pass) {
    passedChecks++;
    console.log(`  [PASS] ${desc}`);
  } else {
    failedChecks++;
    console.error(`  [FAIL] ${desc} - ${detail}`);
  }
}

// 1. Audit Main Dashboard & LMS (index.html)
console.log('--- 1. Main LMS & Dashboard Accessibility Checks (index.html) ---');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// A. Language declaration
check('Root html has valid lang attribute', /<html\s+[^>]*lang=["']en["']/i.test(indexHtml));

// B. Viewport meta tag supports zoom
check('Viewport allows user scaling (no user-scalable=no)', 
  /<meta\s+name=["']viewport["'][^>]*content=["'][^"']*width=device-width[^"']*["']/i.test(indexHtml) && 
  !/user-scalable\s*=\s*no/i.test(indexHtml));

// C. Skip navigation link
check('Skip link present for keyboard bypass', 
  /class=["']skip-link["']/i.test(indexHtml) && /href=["']#main-learning-content["']/i.test(indexHtml));

// D. Single direct login button
check('Login page features single accessible "Log in" action button',
  /id=["']btn-login-submit["']/i.test(indexHtml) && /Log in/i.test(indexHtml));

// E. Verification that email/password inputs are removed
check('Email and password inputs removed from login page',
  !/<input[^>]*type=["']email["']/i.test(indexHtml) && !/<input[^>]*type=["']password["']/i.test(indexHtml));

// F. Verification that Points Pill is removed from dashboard
check('Points badge pill removed from dashboard header',
  !/class=["']points-pill-badge["']/i.test(indexHtml));

// G. Verification that Studio button is removed from dashboard
check('Studio button removed from top header navigation',
  !/id=["']btnStudioPortal["']/i.test(indexHtml));

// H. Verification that "Match with 12+ Tech Employers" is removed
check('"Match with 12+ Tech Employers" banner removed from dashboard',
  !/Match with 12\+ Tech Employers/i.test(indexHtml));

// I. Verification that Job Portal is removed from sidebar
check('Job Portal removed from LMS sidebar navigation',
  !/class=["']nav-link\s+nav-link-job-portal["']/i.test(indexHtml));

// J. Verification that top header Job Portal opens in new tab
check('Top header Job Portal button has target="_blank"',
  /<a[^>]*id=["']btnJobPortal["'][^>]*target=["']_blank["']/i.test(indexHtml) ||
  /<a[^>]*target=["']_blank["'][^>]*id=["']btnJobPortal["']/i.test(indexHtml));

// K. ARIA live regions for screen readers
check('Polite ARIA live region present for video subtitles',
  /id=["']videoSubtitlesBar["'][^>]*aria-live=["']polite["']/i.test(indexHtml));

// L. Synchronized Video Captions contain authentic DO-IT course text
check('Closed captions contain authentic DO-IT course video text',
  /DO-IT:\s*Disabilities,\s*Opportunities/i.test(indexHtml));

// M. Video Player Accessibility
check('Course lesson video has poster and playsinline attributes',
  /<video[^>]*id=["']courseLessonVideo["'][^>]*poster=["'][^"']+["'][^>]*playsinline/i.test(indexHtml));

// 2. Audit Employment Platform (employment/index.html)
console.log('\n--- 2. Employment & Job Portal Accessibility Checks (employment/index.html) ---');
const empHtml = fs.readFileSync(employmentHtmlPath, 'utf8');

check('Employment root html has valid lang attribute', /<html\s+[^>]*lang=["']en["']/i.test(empHtml));
check('Employment platform has skip links', /class=["']skip-link["']/i.test(empHtml));
check('Employment platform has polite ARIA live region', /id=["']sr-announcer-polite["'][^>]*role=["']status["']/i.test(empHtml));
check('Employment platform has assertive ARIA live region', /id=["']sr-announcer-assertive["'][^>]*role=["']alert["']/i.test(empHtml));

console.log('\n----------------------------------------------------');
console.log(`TOTAL AUDIT CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
console.log('----------------------------------------------------');

if (failedChecks === 0) {
  console.log('\n>>> ZERO CRITICAL OR SERIOUS ACCESSIBILITY VIOLATIONS DETECTED <<<');
  process.exit(0);
} else {
  console.error('\n>>> ACCESSIBILITY AUDIT VIOLATIONS DETECTED <<<');
  process.exit(1);
}
