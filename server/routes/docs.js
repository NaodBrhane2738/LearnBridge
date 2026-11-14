const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const openApiPath = path.join(__dirname, '..', '..', 'openapi', 'openapi.json');

router.get('/openapi.json', (req, res) => {
  const raw = fs.readFileSync(openApiPath, 'utf8');
  res.setHeader('Content-Type', 'application/json');
  res.send(raw);
});

router.get('/docs', (req, res) => {
  const openApiRaw = fs.readFileSync(openApiPath, 'utf8');
  const spec = JSON.parse(openApiRaw);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LearnBridge API Documentation · v1.0.0</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #091a18;
      --card-bg: #0f2b27;
      --border: rgba(255, 255, 255, 0.14);
      --accent: #c5f18e;
      --seafoam: #8df0b0;
      --text: #e6f0e9;
      --text-muted: #95ada5;
      --code-bg: #061210;
      --method-get: #36a4fa;
      --method-post: #48bb78;
      --method-patch: #ecc94b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'DM Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 0;
    }
    header {
      background: linear-gradient(180deg, #12332e, #091a18);
      border-bottom: 1px solid var(--border);
      padding: 32px 24px;
    }
    .header-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: rgba(197, 241, 142, 0.15);
      color: var(--accent);
      border: 1px solid rgba(197, 241, 142, 0.3);
    }
    h1 { margin: 8px 0 4px; font-size: 28px; }
    p { margin: 0; color: var(--text-muted); }
    main {
      max-width: 1100px;
      margin: 32px auto;
      padding: 0 24px 64px;
    }
    .endpoint-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .endpoint-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      user-select: none;
      background: rgba(255, 255, 255, 0.03);
    }
    .endpoint-header:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .method {
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
    }
    .method-get { background: rgba(54, 164, 250, 0.2); color: var(--method-get); }
    .method-post { background: rgba(72, 187, 120, 0.2); color: var(--method-post); }
    .method-patch { background: rgba(236, 201, 75, 0.2); color: var(--method-patch); }
    .path {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      font-size: 15px;
      color: #fff;
    }
    .summary {
      color: var(--text-muted);
      font-size: 14px;
      margin-left: auto;
    }
    .endpoint-body {
      padding: 20px;
      border-top: 1px solid var(--border);
    }
    pre {
      background: var(--code-bg);
      padding: 14px 18px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      overflow-x: auto;
      color: #a8f0cc;
      margin: 10px 0;
    }
    .try-btn {
      padding: 8px 18px;
      border-radius: 999px;
      background: var(--accent);
      color: #0b2622;
      border: 0;
      font-weight: 700;
      cursor: pointer;
      margin-top: 10px;
      font-size: 13px;
      transition: transform 0.15s;
    }
    .try-btn:hover { transform: translateY(-2px); }
    .test-output {
      margin-top: 14px;
      display: none;
    }
    .home-link {
      color: var(--seafoam);
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
    .home-link:hover { text-decoration: underline; }
    .curl-snippet {
      color: #ffdf75;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <div>
        <span class="badge">OPENAPI 3.0.3 COMPLIANT</span>
        <h1>LearnBridge REST API Documentation</h1>
        <p>Universal accessibility & localization infrastructure endpoints for LMS and job platforms.</p>
      </div>
      <div>
        <a href="/index.html" class="home-link">← Return to Studio</a>
      </div>
    </div>
  </header>

  <main id="endpointsContainer">
    <div style="background: rgba(197, 241, 142, 0.08); border: 1px solid rgba(197, 241, 142, 0.25); border-radius: 14px; padding: 18px 22px; margin-bottom: 28px;">
      <h3 style="margin: 0 0 6px; color: var(--accent);">Authentication & Server Integration</h3>
      <p style="font-size: 14px; color: var(--text);">Third-party platforms authenticate using the header <code style="color:var(--accent);">x-api-key: lb_live_...</code>. Demo integrations: <strong>savanna-lms</strong> (<code style="color:#ffdf75;">lb_live_savanna_9842a1b7c</code>) and <strong>ethio-jobs-portal</strong> (<code style="color:#ffdf75;">lb_live_ethiojobs_45c82e01f</code>).</p>
    </div>

    ${Object.entries(spec.paths).map(([pathKey, methods]) => {
      return Object.entries(methods).map(([method, def]) => {
        const id = `${method}-${pathKey.replace(/[^a-z0-9]/gi, '-')}`;
        return `
          <div class="endpoint-card" id="${id}">
            <div class="endpoint-header" onclick="document.getElementById('body-${id}').style.display = document.getElementById('body-${id}').style.display === 'none' ? 'block' : 'none'">
              <span class="method method-${method}">${method}</span>
              <span class="path">${pathKey}</span>
              <span class="summary">${def.summary || ''}</span>
            </div>
            <div class="endpoint-body" id="body-${id}">
              <p>${def.description || def.summary || ''}</p>
              
              <div style="margin-top: 12px;">
                <strong>cURL Request Example:</strong>
                <pre class="curl-snippet">curl -X ${method.toUpperCase()} "http://127.0.0.1:4173/api/v1${pathKey.replace('{language}', 'am').replace('{profileId}', 'low_vision').replace('{integrationId}', 'savanna-lms')}" \\
  -H "x-api-key: lb_live_savanna_9842a1b7c" ${method === 'post' || method === 'patch' ? '\\\n  -H "Content-Type: application/json" \\\n  -d \'{"profileId":"low_vision","language":"am"}\'' : ''}</pre>
              </div>

              <button class="try-btn" onclick="testEndpoint('${method.toUpperCase()}', '${pathKey}', 'output-${id}')">Execute Live Request (Try It Out)</button>
              
              <div class="test-output" id="output-${id}">
                <strong>Live Response (HTTP):</strong>
                <pre id="pre-${id}">Loading response...</pre>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }).join('')}
  </main>

  <script>
    async function testEndpoint(method, pathTemplate, outputId) {
      const outputDiv = document.getElementById(outputId);
      const pre = outputDiv.querySelector('pre');
      outputDiv.style.display = 'block';
      pre.textContent = 'Calling API...';

      let resolvedPath = pathTemplate
        .replace('{language}', 'am')
        .replace('{profileId}', 'low_vision')
        .replace('{integrationId}', 'savanna-lms');

      const fullUrl = '/api/v1' + resolvedPath;
      const opts = {
        method: method,
        headers: {
          'x-api-key': 'lb_live_savanna_9842a1b7c',
          'Content-Type': 'application/json'
        }
      };

      if (method === 'POST' || method === 'PATCH') {
        if (resolvedPath.includes('/preferences')) {
          opts.body = JSON.stringify({ profileId: 'low_vision', language: 'am', font_scale: 1.25 });
        } else if (resolvedPath === '/integrations') {
          opts.body = JSON.stringify({ name: 'Interactive Test Client', allowedOrigins: ['*'] });
        }
      }

      try {
        const res = await fetch(fullUrl, opts);
        const data = await res.json();
        pre.textContent = 'HTTP ' + res.status + ' ' + res.statusText + '\\n\\n' + JSON.stringify(data, null, 2);
      } catch (err) {
        pre.textContent = 'Network or request error: ' + err.message;
      }
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

module.exports = router;
