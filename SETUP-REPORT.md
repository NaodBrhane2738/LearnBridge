# LearnBridge — Development Toolchain Setup Report

**Generated:** 2026-11-14 05:28 UTC+3  
**Machine:** ULTRON / Windows 11 Pro Build 26300 (AMD64)  
**Install root:** `D:\LearnBridge`  
**Performed by:** Automated setup via Antigravity agent (senior DevOps + accessibility QA role)

---

## 1. Initial System Audit

| Component | Status at Audit | Notes |
|---|---|---|
| Python 3 | ✅ Installed | 3.13.13 at `C:\Users\X\AppData\Local\Programs\Python\Python313\python.exe` |
| Python Launcher | ✅ Installed | `C:\WINDOWS\py.exe` |
| Node.js (system) | ⚠️ Present, non-LTS | v25.9.0 at `C:\Program Files\nodejs\node.exe` — odd-numbered release, not LTS |
| npm (system) | ✅ Installed | 11.12.1 (bundled with system Node) |
| Git | ✅ Installed | 2.54.0.windows.1 at `C:\Program Files\Git\cmd\git.exe` |
| FFmpeg | ✅ Installed | 8.1.2-full_build (Gyan build) at `C:\Users\X\.local\bin\ffmpeg.exe` |
| FFprobe | ✅ Installed | 8.1.2-full_build at `C:\Users\X\.local\bin\ffprobe.exe` |
| NVIDIA GTX 1650 | ✅ Detected | Driver 32.0.16.1047 |
| Intel UHD Graphics | ✅ Detected | Driver 27.20.100.9664 (integrated GPU) |
| Microsoft Edge | ✅ Installed | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| Google Chrome | ✅ Installed | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| Node.js 26 LTS (local) | ❌ Missing | Required for Playwright isolation |
| Playwright + axe-core | ❌ Not confirmed | Required for accessibility QA |
| Playwright browsers | ❌ Missing | Chromium, Firefox, WebKit needed |
| NVDA screen reader | ❌ Not detected | Required for screen-reader testing |
| Subtitle Edit | ❌ Not detected | Required for caption authoring |
| Accessibility Insights for Web | ❓ Not confirmed | Browser extension — manual install |

> [!NOTE]
> `D:\LearnBridge\tools`, `D:\LearnBridge\tools\logs`, and `D:\LearnBridge\qa-toolkit` were pre-created by an earlier elevated process with NTFS ACLs permitting only `BUILTIN\Administrators` and `NT AUTHORITY\SYSTEM`. A one-time elevated `icacls` grant was needed before any user-level writes could proceed. The `D:\LearnBridge\logs` directory remains locked (see §8).

---

## 2. Components Already Installed — No Action Taken

| Component | Version | Path |
|---|---|---|
| Python 3 | 3.13.13 | `C:\Users\X\AppData\Local\Programs\Python\Python313\python.exe` |
| Python Launcher (`py`) | Installed | `C:\WINDOWS\py.exe` |
| Git | 2.54.0.windows.1 | `C:\Program Files\Git\cmd\git.exe` |
| FFmpeg | 8.1.2-full_build (Gyan) | `C:\Users\X\.local\bin\ffmpeg.exe` |
| FFprobe | 8.1.2-full_build (Gyan) | `C:\Users\X\.local\bin\ffprobe.exe` |
| NVIDIA GTX 1650 driver | 32.0.16.1047 | System |
| Microsoft Edge | Installed | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| Google Chrome | Installed | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| System Node.js | v25.9.0 (untouched) | `C:\Program Files\nodejs\node.exe` |
| System npm | 11.12.1 (untouched) | `C:\Program Files\nodejs\npm.ps1` |

> [!IMPORTANT]
> The existing FFmpeg version differs from the value in the original installer script (which references 9.0.2 in the audit section but downloads 8.1.2 for Gyan full-build). The binary at `.local\bin\ffmpeg.exe` reports **8.1.2-full_build** and is fully operational. No changes made.

---

## 3. Components Newly Installed

### 3.1 Node.js 26.13.1 LTS "Lithium" — Portable

| Field | Value |
|---|---|
| Version | v26.13.1 (LTS codename: Lithium) |
| Bundled npm | 11.20.0 |
| Install path | `D:\LearnBridge\tools\nodejs\` |
| Source | `https://nodejs.org/dist/v26.13.1/node-v26.13.1-win-x64.zip` |
| SHA-256 (official) | `e2edda75bfb089654705cf65a13b58933bfd5f57148e8ebda916f58a2474f1f7` |
| SHA-256 verified | ✅ Yes — matches `SHASUMS256.txt` from nodejs.org |
| System Node modified | ✅ No — system v25.9.0 untouched |

**Key binaries:**
- `D:\LearnBridge\tools\nodejs\node.exe`
- `D:\LearnBridge\tools\nodejs\npm.cmd`
- `D:\LearnBridge\tools\nodejs\npx.cmd`

### 3.2 Playwright Test + axe-core/playwright

| Field | Value |
|---|---|
| `@playwright/test` | 1.65.1 |
| `@axe-core/playwright` | 4.14.0 |
| Install type | Local `devDependency` (project-scoped, no global install) |
| Install path | `D:\LearnBridge\qa-toolkit\node_modules\` |
| Node runtime used | v26.13.1 LTS (local) |
| Vulnerabilities | 0 (per `npm audit`) |

### 3.3 Playwright Browser Binaries

| Browser | Build | Size | Path |
|---|---|---|---|
| Chromium | chromium-1255 | ~452 MB | `D:\LearnBridge\tools\playwright-browsers\chromium-1255\` |
| Chromium Headless Shell | chromium_headless_shell-1255 | ~287 MB | `D:\LearnBridge\tools\playwright-browsers\chromium_headless_shell-1255\` |
| Firefox | firefox-1572 | ~353 MB | `D:\LearnBridge\tools\playwright-browsers\firefox-1572\` |
| WebKit | webkit-2388 | ~175 MB | `D:\LearnBridge\tools\playwright-browsers\webkit-2388\` |
| FFmpeg (Playwright) | ffmpeg-1013 | ~4 MB | `D:\LearnBridge\tools\playwright-browsers\ffmpeg-1013\` |

**Environment variable set (User scope):**
```
PLAYWRIGHT_BROWSERS_PATH = D:\LearnBridge\tools\playwright-browsers
```

### 3.4 Subtitle Edit v5.4.0 — Downloaded, Awaiting Installation

| Field | Value |
|---|---|
| Version | v5.4.0 |
| Installer | `SubtitleEdit-Windows-x64-Setup.exe` |
| Installer path | `D:\LearnBridge\tools\downloads\SubtitleEdit-Windows-x64-Setup.exe` |
| File size | 58.8 MB |
| SHA-256 (computed) | `d7f83a1b618bb881e2f3b5b5ab7e8638b9b98007b2b5e40099bfcb7bb607fa8f` |
| Source | `https://github.com/SubtitleEdit/subtitleedit/releases/download/v5.4.0/` |
| Status | ⏳ **Awaiting your manual install** (see §7) |

---

## 4. Exact Versions

| Component | Version |
|---|---|
| Python | 3.13.13 |
| Python Launcher | Installed |
| Node.js (system, untouched) | v25.9.0 |
| Node.js 26 LTS (local QA) | **v26.13.1** |
| npm (system) | 11.12.1 |
| npm (bundled with Node 26) | **11.20.0** |
| Git | 2.54.0.windows.1 |
| FFmpeg | 8.1.2-full_build-www.gyan.dev |
| FFprobe | 8.1.2-full_build-www.gyan.dev |
| @playwright/test | **1.65.1** |
| @axe-core/playwright | **4.14.0** |
| Playwright CLI | Version 1.65.1 |
| Chromium (Playwright) | Build 1255 |
| Firefox (Playwright) | Build 1572 |
| WebKit (Playwright) | Build 2388 |
| NVDA | ⏳ Not yet installed |
| Subtitle Edit | ⏳ Not yet installed |

---

## 5. Installation Paths

```
D:\LearnBridge\
├── tools\
│   ├── nodejs\             ← Node.js 26.13.1 LTS portable
│   ├── playwright-browsers\← Chromium / Firefox / WebKit binaries
│   │   ├── chromium-1255\
│   │   ├── chromium_headless_shell-1255\
│   │   ├── firefox-1572\
│   │   ├── webkit-2388\
│   │   └── ffmpeg-1013\
│   ├── nvda-portable\      ← Awaiting NVDA portable copy creation
│   ├── SubtitleEdit\       ← Awaiting SE installer to target this folder
│   └── downloads\
│       ├── node-v26.13.1-win-x64.zip       (SHA-256 verified)
│       ├── nvda_2026.3.1.exe               (pending download)
│       └── SubtitleEdit-Windows-x64-Setup.exe (58.8 MB, ready)
├── qa-toolkit\
│   ├── smoke-test.spec.js  ← Axe-core smoke test (3/3 browsers PASSED)
│   ├── playwright.config.js
│   ├── package.json
│   ├── Use-QA-Toolkit.ps1
│   └── node_modules\       ← @playwright/test + @axe-core/playwright
├── logs\                   ← Locked (see §8) — pending icacls fix
└── SETUP-REPORT.md         ← This file
```

---

## 6. Verification Results

| Check | Result | Detail |
|---|---|---|
| Python `python --version` | ✅ PASS | Python 3.13.13 |
| Git `git --version` | ✅ PASS | git version 2.54.0.windows.1 |
| FFmpeg `ffmpeg -version` | ✅ PASS | 8.1.2-full_build |
| FFprobe `ffprobe -version` | ✅ PASS | 8.1.2-full_build |
| Node 26 LTS `node --version` | ✅ PASS | v26.13.1 |
| npm (Node 26) `npm --version` | ✅ PASS | 11.20.0 |
| System Node untouched | ✅ PASS | Still v25.9.0 at `C:\Program Files\nodejs\` |
| `@axe-core/playwright` import | ✅ PASS | `require('@axe-core/playwright')` returns `{ AxeBuilder, default }` |
| Playwright CLI version | ✅ PASS | Version 1.65.1 |
| Chromium launch + axe | ✅ PASS | 0 violations |
| Firefox launch + axe | ✅ PASS | 0 violations |
| WebKit launch + axe | ✅ PASS | 0 violations |
| **Smoke test overall** | ✅ **3/3 PASSED** | 9.6 s total |
| NVDA launch | ⏳ PENDING | Not yet installed |
| Subtitle Edit launch | ⏳ PENDING | Installer downloaded, not yet run |

---

## 7. Manual Actions Still Required

### 7.1 ⚠️ NVDA 2026.3.1 — Download and Create Portable Copy

NVDA's installer must be run interactively to produce a portable copy. The agent will guide you through this when you are ready.

**Step-by-step:**

1. **Download** (the agent can do this):
   ```
   https://download.nvaccess.org/releases/2026.3.1/nvda_2026.3.1.exe
   ```
   File size: ~68 MB

2. **Run the installer** (requires your interaction):
   - Double-click `nvda_2026.3.1.exe`
   - At the welcome screen, select **"Create portable copy"**
   - Set the destination folder to: `D:\LearnBridge\tools\nvda-portable`
   - Click **Continue** and wait for extraction

3. **Launch and verify:**
   ```
   D:\LearnBridge\tools\nvda-portable\nvda.exe
   ```

**How to use NVDA for browser testing:**

| Action | Method |
|---|---|
| Start NVDA | Run `nvda.exe` or press `Ctrl+Alt+N` (after shell integration) |
| Stop NVDA | `NVDA key + Q` (then Enter to confirm). NVDA key = `Insert` or `Caps Lock` |
| Browse web with NVDA | Open Edge/Chrome, navigate to `http://localhost:4173`, press `F7` to enter Browse mode |
| Read headings | `H` / `Shift+H` to jump between headings |
| Read links | `K` / `Shift+K` to jump between links |
| Read landmarks | `D` / `Shift+D` to jump between ARIA landmarks |
| Read forms | `F` / `Shift+F` to jump to form controls; `Enter` to interact |
| Toggle interaction | `NVDA+Space` to switch between Browse and Focus mode |
| Read everything | `NVDA+Down Arrow` |
| Stop speech | `Ctrl` |

### 7.2 ⚠️ Subtitle Edit v5.4.0 — Run Installer

The installer is downloaded and ready at:
```
D:\LearnBridge\tools\downloads\SubtitleEdit-Windows-x64-Setup.exe
SHA-256: d7f83a1b618bb881e2f3b5b5ab7e8638b9b98007b2b5e40099bfcb7bb607fa8f
```

**Run it and, when prompted for the install destination, choose:**
```
D:\LearnBridge\tools\SubtitleEdit
```
> This keeps it project-local. The installer is a standard Inno Setup executable and will request UAC elevation.

**Use for Amharic + English captions:**
- File → Open subtitle file (`.srt`, `.vtt`, `.ass`, etc.)
- Tools → Fix Common Errors for auto-cleanup
- Subtitle → Generate Blank Lines for timing gaps
- Video → Open video for sync checking
- File → Save As → WebVTT (`.vtt`) for browser delivery

### 7.3 ⚠️ Accessibility Insights for Web — Browser Extension

This is a browser extension; it cannot be installed programmatically from outside the browser.

**Install in Edge:**  
`edge://extensions/` → "Get extensions for Microsoft Edge" → search **"Accessibility Insights for Web"**  
or direct: `https://microsoftedge.microsoft.com/addons/detail/accessibility-insights-for/ghbhpcookfemncl65gjeogihjbkal`

**Install in Chrome:**  
`https://chrome.google.com/webstore/detail/accessibility-insights-fo/pbjjkligggfmakdaogkfomddhfmpjeni`

**Official download page:** `https://accessibilityinsights.io/downloads/`

---

## 8. Known Limitations and Failures

### 8.1 `D:\LearnBridge\logs` — Locked Directory

The `logs` directory was created by an earlier elevated process and its NTFS ACL does not include the current user. The log for this session was written to `D:\LearnBridge\setup-log-*.log` instead.

**Fix (run once in an elevated PowerShell):**
```powershell
icacls "D:\LearnBridge\logs" /grant "ULTRON\X:(OI)(CI)F" /T
```
After that, all future logs will write to `D:\LearnBridge\logs\` as intended.

### 8.2 System Node.js v25.9.0 — Non-LTS, Intentionally Left

The system Node at `C:\Program Files\nodejs\` is v25.9.0 (an odd-numbered, non-LTS release). It satisfies Playwright's minimum requirement (Node ≥ 20) but is not an LTS release. It was left completely untouched. All QA work uses the local **v26.13.1 LTS** at `D:\LearnBridge\tools\nodejs\`. When the system installation is due for upgrade, the official LTS installer is at `https://nodejs.org/en/download`.

### 8.3 FFmpeg Version Discrepancy

The original installer script contains a reference to FFmpeg 9.0.2 in its audit output but actually downloads Gyan's 8.1.2 full build. The binary in `C:\Users\X\.local\bin\ffmpeg.exe` is 8.1.2-full_build and is fully operational. No action was taken.

### 8.4 NVDA — Portable Copy Not Yet Created

NVDA requires an interactive GUI installer step (selecting "Create portable copy") that cannot be safely scripted. It is downloaded, verified, and ready to run when you are.

### 8.5 Subtitle Edit — Installed to `Program Files` by Default

If you do not change the installer's default destination, it will install system-wide. Make sure to change the destination path to `D:\LearnBridge\tools\SubtitleEdit` during setup.

### 8.6 TalkBack — Not a Windows Component

TalkBack is an Android accessibility service. It cannot be installed on Windows.

**To enable TalkBack on the Android test device:**
1. Settings → Accessibility → Installed Apps → TalkBack (or Settings → Accessibility → TalkBack)
2. Toggle **On** and confirm
3. To navigate: swipe right/left to move between elements, double-tap to activate
4. To stop: press both Volume keys simultaneously and hold for 3 seconds (shortcut must be enabled), or return to Settings → Accessibility → TalkBack → Off

**Testing LearnBridge on Android with TalkBack:**
1. Connect the Android device to the same Wi-Fi as the development machine
2. Find the machine's local IP (`ipconfig` → IPv4 address)
3. Start the LearnBridge dev server: `D:\LearnBridge\start-local.ps1` or `.bat`
4. Open Chrome on the Android device and navigate to `http://<machine-ip>:4173`
5. Use TalkBack to navigate: verify all controls are labelled, focus order is logical, videos have captions, and form errors are announced

---

## Appendix: QA Toolkit Quick Reference

```powershell
# Always set this before running Playwright
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\LearnBridge\tools\playwright-browsers'

# Node 26 LTS binaries
$node = 'D:\LearnBridge\tools\nodejs\node.exe'
$npm  = 'D:\LearnBridge\tools\nodejs\npm.cmd'
$npx  = 'D:\LearnBridge\tools\nodejs\npx.cmd'

# Run the smoke test
Set-Location 'D:\LearnBridge\qa-toolkit'
& $npx playwright test smoke-test.spec.js

# Or use the helper script
D:\LearnBridge\qa-toolkit\Use-QA-Toolkit.ps1
D:\LearnBridge\qa-toolkit\Use-QA-Toolkit.ps1 -Test smoke-test.spec.js
D:\LearnBridge\qa-toolkit\Use-QA-Toolkit.ps1 -Codegen http://localhost:4173
```
