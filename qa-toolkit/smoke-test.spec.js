// LearnBridge Accessibility Smoke Test
// Launches Chromium, Firefox, and WebKit via Playwright, loads a minimal accessible
// HTML page inline, runs axe-core via AxeBuilder, reports violations, and closes.
// Does NOT modify or access the LearnBridge application source.
//
// Run with:
//   set PLAYWRIGHT_BROWSERS_PATH=D:\LearnBridge\tools\playwright-browsers
//   D:\LearnBridge\tools\nodejs\npx.cmd playwright test smoke-test.spec.js

const { test, expect }   = require('@playwright/test');
const { AxeBuilder }     = require('@axe-core/playwright');

// Minimal self-contained accessible HTML page (no external network dependencies)
const ACCESSIBLE_PAGE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LearnBridge Smoke-Test Page</title>
</head>
<body>
  <header>
    <h1>LearnBridge QA Smoke Test</h1>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="#main-content">Skip to content</a></li>
        <li><a href="#about">About</a></li>
      </ul>
    </nav>
  </header>
  <main id="main-content">
    <h2>Accessible content area</h2>
    <p>This page verifies that the axe-core Playwright integration is operational.</p>
    <section aria-labelledby="form-heading">
      <h3 id="form-heading">Sample form</h3>
      <form>
        <label for="name">Name</label>
        <input id="name" type="text" name="name" autocomplete="name" />
        <button type="submit">Submit</button>
      </form>
    </section>
    <section id="about" aria-labelledby="about-heading">
      <h3 id="about-heading">About</h3>
      <p>LearnBridge is an accessible learning platform for Amharic and English speakers.</p>
    </section>
  </main>
  <footer>
    <p>&copy; 2026 LearnBridge. All rights reserved.</p>
  </footer>
</body>
</html>
`;

// AxeBuilder uses the Playwright page fixture — one test per browser project.
test('accessible HTML page has no critical/serious axe violations', async ({ page, browserName }) => {
  // Navigate to an inline data URL — no network, no server required
  const dataUrl = 'data:text/html;charset=UTF-8,' + encodeURIComponent(ACCESSIBLE_PAGE_HTML);
  await page.goto(dataUrl);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
    .analyze();

  const critical = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );

  if (results.violations.length > 0) {
    console.log(`\n[${browserName}] axe violations (${results.violations.length} total):`);
    for (const v of results.violations) {
      console.log(`  [${v.impact.toUpperCase()}] ${v.id}: ${v.description}`);
      for (const node of v.nodes.slice(0, 2)) {
        console.log(`    Target: ${node.target.join(', ')}`);
      }
    }
  } else {
    console.log(`\n[${browserName}] axe: 0 violations — environment is operational.`);
  }

  expect(
    critical,
    `Critical/serious axe violations in ${browserName}:\n` +
    critical.map(v => `  ${v.impact}: ${v.id} — ${v.description}`).join('\n')
  ).toHaveLength(0);
});
