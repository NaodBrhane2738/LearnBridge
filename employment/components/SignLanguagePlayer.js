/**
 * LearnBridge Employment — Ethiopian Sign Language (ETSL) Dockable Player
 * Provides honest linguistic metadata, regional dialetical notices, and synchronized guidance.
 */

class SignLanguagePlayer {
  constructor() {
    this.container = null;
    this.videoEl = null;
    this.resources = [];
    this.currentResource = null;
  }

  async init() {
    this.container = document.getElementById('etsl-dock-window');
    if (!this.container) return;

    this.videoEl = document.getElementById('etsl-video-element');
    this.bindEvents();
    await this.loadResources();
  }

  bindEvents() {
    // Dock Left / Right toggle
    const dockToggle = document.getElementById('btn-etsl-dock-pos');
    if (dockToggle) {
      dockToggle.addEventListener('click', () => {
        this.container.classList.toggle('dock-left');
        const isLeft = this.container.classList.contains('dock-left');
        dockToggle.textContent = isLeft ? 'Dock Right ↘' : 'Dock Left ↙';
        if (window.a11y) {
          window.a11y.announceLive(isLeft ? "Sign language window moved to bottom left." : "Sign language window moved to bottom right.", false);
        }
      });
    }

    // Close button
    const closeBtn = document.getElementById('btn-etsl-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.container.style.display = 'none';
        if (window.a11y) {
          window.a11y.announceLive("Sign language window closed. You can re-enable it in accessibility modes.", false);
        }
      });
    }

    // Resource switcher select
    const select = document.getElementById('etsl-resource-select');
    if (select) {
      select.addEventListener('change', (e) => {
        const resId = e.target.value;
        const res = this.resources.find(r => r.id === resId);
        if (res) this.playResource(res);
      });
    }
  }

  async loadResources() {
    try {
      const response = await fetch('/api/v1/employment/sign-language/resources');
      const json = await response.json();
      if (json.success && json.data) {
        this.resources = json.data;
        this.populateSelect();
        if (this.resources.length > 0) {
          this.playResource(this.resources[0]);
        }
      }
    } catch (err) {
      console.warn("[SignLanguagePlayer] Could not fetch sign resources:", err.message);
    }
  }

  populateSelect() {
    const select = document.getElementById('etsl-resource-select');
    if (!select) return;
    select.innerHTML = '';
    this.resources.forEach(r => {
      select.innerHTML += `<option value="${r.id}">${r.title} (${r.availabilityStatus === 'official_resource' ? 'Official ETSL' : 'Demo'})</option>`;
    });
  }

  playResource(resource) {
    this.currentResource = resource;
    const disclaimer = document.getElementById('etsl-disclaimer-text');
    const badge = document.getElementById('etsl-status-badge');

    if (disclaimer) {
      disclaimer.textContent = resource.notes || resource.transcript;
    }

    if (badge) {
      if (resource.availabilityStatus === 'official_resource') {
        badge.textContent = "Verified ETSL";
        badge.className = "badge badge-verified";
      } else {
        badge.textContent = "Demo / Placeholder";
        badge.className = "badge badge-accomm";
      }
    }

    // Notice text
    const notice = document.getElementById('etsl-variety-label');
    if (notice) {
      notice.textContent = `${resource.languageName} — ${resource.regionalVariety}`;
    }
  }
}

window.signLanguagePlayer = new SignLanguagePlayer();
