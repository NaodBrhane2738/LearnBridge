(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const video = $('#lessonVideo');
  let virtualTime = 0;
  const nativeTimeDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  if (video) {
    try {
      Object.defineProperty(video, 'currentTime', {
        get() {
          if (!this.paused && this.readyState >= 1 && nativeTimeDesc && nativeTimeDesc.get) {
            const t = nativeTimeDesc.get.call(this);
            if (t > 0) return t;
          }
          return virtualTime;
        },
        set(val) {
          virtualTime = val;
          if (this.readyState >= 1 && nativeTimeDesc && nativeTimeDesc.set) {
            try { nativeTimeDesc.set.call(this, val); } catch (_) {}
          }
          updateTimeline();
        },
        configurable: true
      });
    } catch (_) {}
  }
  const audioDescription = new Audio('./media/audio-description.mp3');
  audioDescription.preload = 'auto';

  const stage = $('#videoStage');
  const playButton = $('#playButton');
  const bigPlayButton = $('#bigPlayButton');
  const seekBar = $('#seekBar');
  const volumeBar = $('#volumeBar');
  const captionsButton = $('#captionsButton');
  const descriptionButton = $('#descriptionButton');
  const interpreterButton = $('#interpreterButton');
  const captionOverlay = $('#captionOverlay');
  const interpreterOverlay = $('#interpreterOverlay');
  const mainTranscript = $('#mainTranscript');

  const preferencesDialog = $('#preferencesDialog');
  const toast = $('#toast');
  const toastText = $('#toastText');

  const fallbackSegments = [
    { start: 0.6, end: 4.3, en: 'Good design starts by removing barriers.', am: 'ጥሩ ንድፍ መሰናክሎችን በማስወገድ ይጀምራል።' },
    { start: 4.3, end: 8.3, en: 'A learning experience should be perceivable and operable.', am: 'የትምህርት ልምድ ሊታይ፣ ሊሰማ እና ሊጠቀምበት የሚቻል መሆን አለበት።' },
    { start: 8.3, end: 12.4, en: 'It should be understandable and robust.', am: 'ግልጽ እና የታመነ መሆን አለበት።' },
    { start: 12.4, end: 17.7, en: 'Accessibility is not an extra layer. It is the foundation of the experience.', am: 'ተደራሽነት ተጨማሪ ነገር አይደለም። የተሞክሮው መሠረት ነው።' }
  ];

  let segments = fallbackSegments;
  let currentLanguage = 'en';
  let captionsEnabled = false;
  let descriptionEnabled = false;
  let interpreterVisible = false;
  let toastTimer = null;
  let activeTranscriptIndex = -1;

  const icons = {
    play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="m8 5 11 7-11 7z"/></svg>',
    pause: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
  };

  function showToast(message) {
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return '00:00';
    const seconds = Math.floor(value);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updatePlayState() {
    const playing = !video.paused && !video.ended;
    playButton.innerHTML = playing ? icons.pause : icons.play;
    playButton.setAttribute('aria-label', playing ? 'Pause lesson (Space)' : 'Play lesson (Space)');
    bigPlayButton.setAttribute('aria-label', playing ? 'Pause lesson' : 'Play lesson');
    stage.classList.toggle('is-playing', playing);
    stage.classList.toggle('paused', !playing);
  }

  async function togglePlayback() {
    if (video.paused || video.ended) {
      try {
        await video.play();
        if (descriptionEnabled) {
          audioDescription.currentTime = video.currentTime;
          await audioDescription.play().catch(() => {});
        }
      } catch (error) {
        showToast('Playback could not start. Try again.');
      }
    } else {
      video.pause();
      audioDescription.pause();
    }
    updatePlayState();
  }

  function setLanguage(language) {
    const nextLang = language === 'am' ? 'am' : 'en';
    if (currentLanguage === nextLang) return;
    currentLanguage = nextLang;
    if (mainTranscript && typeof mainTranscript.setLanguage === 'function') {
      mainTranscript.setLanguage(currentLanguage, false);
    }
    updateCaption();
    showToast(currentLanguage === 'am' ? 'Amharic (አማርኛ) selected' : 'English captions selected');
  }

  function updateCaption() {
    if (!captionsEnabled) {
      captionOverlay.hidden = true;
      return;
    }
    const current = video.currentTime || 0;
    const cue = segments.find(s => current >= s.start && current < s.end);
    if (!cue) {
      captionOverlay.hidden = true;
      return;
    }
    captionOverlay.textContent = cue[currentLanguage] || cue.en;
    captionOverlay.lang = currentLanguage;
    captionOverlay.hidden = false;
  }

  function updateTimeline() {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 18;
    const current = video.currentTime || 0;

    seekBar.max = String(duration);
    seekBar.value = String(current);
    seekBar.setAttribute('aria-valuenow', current.toFixed(1));
    seekBar.setAttribute('aria-valuetext', `${formatTime(current)} of ${formatTime(duration)}`);

    const percent = Math.max(0, Math.min(100, (current / duration) * 100));
    seekBar.style.background = `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${percent}%, rgba(255,255,255,.30) ${percent}%, rgba(255,255,255,.30) 100%)`;

    $('#currentTime').textContent = formatTime(current);
    $('#durationTime').textContent = formatTime(duration);

    // Update synchronized transcript Web Component
    if (mainTranscript && typeof mainTranscript.setTime === 'function') {
      mainTranscript.setTime(current);
    }

    // Update active chapter row
    const chapterIndex = segments.findIndex(s => current >= s.start && current < s.end);
    if (chapterIndex !== -1 && chapterIndex !== activeTranscriptIndex) {
      activeTranscriptIndex = chapterIndex;
      $$('.chapter-row').forEach((row, i) => {
        row.classList.toggle('active', chapterIndex === i);
      });
    }

    updateCaption();

    if (descriptionEnabled && !audioDescription.paused && Math.abs(audioDescription.currentTime - current) > 0.55) {
      audioDescription.currentTime = current;
    }
  }

  function seekTo(time) {
    const duration = (Number.isFinite(video.duration) && video.duration > 0) ? video.duration : 18;
    const clamped = Math.max(0, Math.min(duration, time));
    virtualTime = clamped;
    try {
      video.currentTime = clamped;
    } catch (_) {}

    if (descriptionEnabled) {
      try { audioDescription.currentTime = clamped; } catch (_) {}
    }
    updateTimeline();
  }
  window.learnbridgeSeek = seekTo;

  function setCaptions(enabled) {
    captionsEnabled = Boolean(enabled);
    captionsButton.setAttribute('aria-pressed', String(captionsEnabled));
    captionsButton.setAttribute('aria-label', captionsEnabled ? 'Turn captions off (C)' : 'Turn captions on (C)');
    updateCaption();
    showToast(captionsEnabled ? `${currentLanguage === 'am' ? 'Amharic' : 'English'} captions on` : 'Captions turned off');
  }

  async function setAudioDescription(enabled) {
    descriptionEnabled = Boolean(enabled);
    descriptionButton.setAttribute('aria-pressed', String(descriptionEnabled));
    descriptionButton.setAttribute('aria-label', descriptionEnabled ? 'Turn audio description off (D)' : 'Turn audio description on (D)');
    audioDescription.volume = video.volume;

    if (descriptionEnabled) {
      try {
        audioDescription.currentTime = video.currentTime;
        if (!video.paused) await audioDescription.play();
        showToast(video.paused ? 'Audio description selected — will play with lesson' : 'Sample audio description enabled');
      } catch (err) {
        descriptionEnabled = false;
        descriptionButton.setAttribute('aria-pressed', 'false');
        showToast('Audio description is currently unavailable');
      }
    } else {
      audioDescription.pause();
      audioDescription.currentTime = 0;
      showToast('Audio description turned off');
    }
  }

  function setInterpreter(enabled) {
    interpreterVisible = Boolean(enabled);
    if (interpreterOverlay) {
      interpreterOverlay.visible = interpreterVisible;
    }
    interpreterButton.setAttribute('aria-pressed', String(interpreterVisible));
    interpreterButton.setAttribute('aria-label', interpreterVisible ? 'Hide sign language window (H)' : 'Show sign language window (H)');
    showToast(interpreterVisible ? 'Ethiopian Sign Language viewport opened' : 'Sign language viewport hidden');
  }

  function openPreferences() {
    if (preferencesDialog && typeof preferencesDialog.showModal === 'function') {
      preferencesDialog.showModal();
    } else {
      showToast('Preferences dialog is not supported in this browser.');
    }
  }

  function syncDescriptionPlayback() {
    if (!descriptionEnabled) return;
    audioDescription.volume = video.volume;
    if (video.paused) {
      audioDescription.pause();
    } else if (audioDescription.paused) {
      audioDescription.currentTime = video.currentTime;
      audioDescription.play().catch(() => {});
    }
  }

  // Network State
  const networkLabel = $('#networkLabel');
  const networkState = $('#networkState');
  function updateNetworkState() {
    const online = navigator.onLine;
    if (networkLabel) networkLabel.textContent = online ? 'Online' : 'Offline';
    if (networkState) {
      networkState.classList.toggle('offline', !online);
      networkState.setAttribute('aria-label', online ? 'Network connection available' : 'Network connection unavailable');
    }
  }
  window.addEventListener('online', updateNetworkState);
  window.addEventListener('offline', updateNetworkState);
  updateNetworkState();

  // Media Event Listeners
  video.addEventListener('loadedmetadata', () => {
    $('#durationTime').textContent = formatTime(video.duration);
    seekBar.max = String(video.duration || 18);
    updateTimeline();
  });
  video.addEventListener('timeupdate', updateTimeline);
  video.addEventListener('play', () => { updatePlayState(); syncDescriptionPlayback(); });
  video.addEventListener('pause', () => { updatePlayState(); audioDescription.pause(); });
  video.addEventListener('ended', () => { updatePlayState(); audioDescription.pause(); showToast('Lesson completed.'); });
  video.addEventListener('volumechange', () => {
    volumeBar.value = String(video.volume);
    audioDescription.volume = video.volume;
  });
  video.addEventListener('error', () => showToast('Sample media could not load. Check local media files.'));

  playButton.addEventListener('click', togglePlayback);
  bigPlayButton.addEventListener('click', togglePlayback);
  video.addEventListener('click', togglePlayback);
  $('#backButton').addEventListener('click', () => seekTo(video.currentTime - 10));
  seekBar.addEventListener('input', () => seekTo(Number(seekBar.value)));
  volumeBar.addEventListener('input', () => {
    video.volume = Number(volumeBar.value);
    audioDescription.volume = video.volume;
  });

  captionsButton.addEventListener('click', () => setCaptions(!captionsEnabled));
  descriptionButton.addEventListener('click', () => setAudioDescription(!descriptionEnabled));
  interpreterButton.addEventListener('click', () => setInterpreter(!interpreterVisible));

  // Listen to interpreter Web Component toggle event
  if (interpreterOverlay) {
    interpreterOverlay.addEventListener('lb-interpreter-toggle', (e) => {
      setInterpreter(e.detail.visible);
    });
  }

  // Fullscreen
  $('#fullscreenButton').addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        if (stage.requestFullscreen) await stage.requestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
      }
    } catch (e) {
      showToast('Fullscreen is not available in this view.');
    }
  });

  // Stage Keyboard Navigation (WCAG 2.2 AA)
  stage.addEventListener('keydown', (e) => {
    if (e.target.matches('button, input, select, textarea')) return;
    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        togglePlayback();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        seekTo(video.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        seekTo(video.currentTime + 5);
        break;
      case 'j':
      case 'J':
        e.preventDefault();
        seekTo(video.currentTime - 10);
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        seekTo(video.currentTime + 10);
        break;
      case 'c':
      case 'C':
        e.preventDefault();
        setCaptions(!captionsEnabled);
        break;
      case 'd':
      case 'D':
        e.preventDefault();
        setAudioDescription(!descriptionEnabled);
        break;
      case 'h':
      case 'H':
        e.preventDefault();
        setInterpreter(!interpreterVisible);
        break;
      case 'm':
      case 'M':
        video.muted = !video.muted;
        showToast(video.muted ? 'Muted' : 'Sound restored');
        break;
    }
  });

  // Tab Navigation in Right Panel
  $$('.study-tab').forEach((tab, index, tabs) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      let next = index;
      if (e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      tabs[next].focus();
      activateTab(tabs[next]);
    });
  });

  function activateTab(tab) {
    $$('.study-tab').forEach(item => {
      const selected = item === tab;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });

    ['chapters', 'transcript', 'resources'].forEach(name => {
      const panel = $(`#panel-${name}`);
      if (panel) panel.hidden = tab.dataset.tab !== name;
    });
    tab.focus({ preventScroll: true });
  }

  // Synchronized Transcript Web Component Listeners
  if (mainTranscript) {
    mainTranscript.addEventListener('lb-seek-request', (e) => {
      seekTo(e.detail.time);
    });
    mainTranscript.addEventListener('lb-language-change', (e) => {
      setLanguage(e.detail.language);
    });
  }

  // Chapters Strip
  $$('.chapter-row').forEach(row => {
    row.addEventListener('click', () => {
      seekTo(Number(row.dataset.time));
    });
  });

  // Search Transcript Header Action
  $('#searchButton').addEventListener('click', () => {
    activateTab($('#tab-transcript'));
    const input = mainTranscript ? mainTranscript.shadowRoot.querySelector('#searchInput') : null;
    if (input) input.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.matches('input, textarea, select')) {
      e.preventDefault();
      activateTab($('#tab-transcript'));
      const input = mainTranscript ? mainTranscript.shadowRoot.querySelector('#searchInput') : null;
      if (input) input.focus();
    }
  });

  // Settings & Accessibility Preferences
  $('#settingsButton').addEventListener('click', openPreferences);
  $('#assistSettingsButton').addEventListener('click', openPreferences);

  $('#savePreferencesButton').addEventListener('click', (e) => {
    e.preventDefault();
    const size = Number($('#captionSize').value);
    document.documentElement.style.setProperty('--caption-scale', String(size / 100));
    captionOverlay.style.fontSize = `calc(clamp(14px, 1.3vw, 20px) * ${size / 100})`;

    document.body.classList.toggle('high-contrast', $('#highContrastToggle').checked);
    document.body.classList.toggle('reduce-motion', $('#reduceMotionToggle').checked);
    document.body.classList.toggle('reduce-transparency', $('#reduceTransparencyToggle').checked);

    if ($('#interpreterDefaultToggle').checked && !interpreterVisible) {
      setInterpreter(true);
    }

    if (preferencesDialog.open) preferencesDialog.close();
    showToast('Accessibility preferences applied.');
  });

  // Course Accordion
  $$('.course-group-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const group = toggle.closest('.course-group');
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(expanded));
      group.classList.toggle('expanded', expanded);
      const content = $('.course-group-lessons', group);
      if (content) content.hidden = !expanded;
    });
  });

  $$('.course-lesson').forEach(lesson => {
    lesson.addEventListener('click', () => {
      if (lesson.classList.contains('current')) {
        seekTo(0.6);
        $('#videoStage').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      showToast('Selected lesson: ' + ($('strong', lesson)?.textContent || 'Course module'));
    });
  });

  // Notes Local Storage
  const noteDialog = $('#noteDialog');
  const noteText = $('#noteText');
  const noteKey = 'learnbridge-note-lesson-04';
  try {
    if (noteText) noteText.value = localStorage.getItem(noteKey) || '';
  } catch (err) {}

  $('#takeNoteButton').addEventListener('click', () => {
    if (noteDialog && typeof noteDialog.showModal === 'function') {
      noteDialog.showModal();
    } else {
      showToast('Notes dialog is not supported in this browser.');
    }
  });

  $('#saveNoteButton').addEventListener('click', () => {
    try {
      localStorage.setItem(noteKey, noteText.value.trim());
      if (noteDialog.open) noteDialog.close();
      showToast(noteText.value.trim() ? 'Lesson note saved locally.' : 'Lesson note cleared.');
    } catch (err) {
      showToast('Failed to save note to localStorage.');
    }
  });

  // Next Class Button
  $('#nextClassButton').addEventListener('click', () => {
    const current = video.currentTime || 0;
    const next = segments.find(s => s.start > current + 0.3);
    if (!next) {
      showToast('You have reached the end of this preview lesson.');
      return;
    }
    seekTo(next.start);
    video.play().catch(() => {});
    showToast('Skipped to next chapter.');
  });

  // Share and Bookmark Actions
  $('#bookmarkButton').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const marked = btn.classList.toggle('bookmarked');
    btn.setAttribute('aria-label', marked ? 'Remove lesson bookmark' : 'Bookmark this lesson');
    btn.style.color = marked ? 'var(--accent)' : '';
    showToast(marked ? 'Lesson bookmarked.' : 'Bookmark removed.');
  });

  $('#shareButton').addEventListener('click', async () => {
    const shareData = {
      title: 'LearnBridge — Design for Every Mind',
      text: 'Explore accessible learning media with captions, audio description, and Ethiopian Sign Language.',
      url: location.href
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(location.href);
        showToast('Lesson link copied to clipboard.');
      }
    } catch (err) {
      showToast('Share link: ' + location.href);
    }
  });

  // Offline Lesson Pack Caching
  $('#downloadPackButton').addEventListener('click', async () => {
    showToast('Caching lesson package for offline study...');
    try {
      if ('caches' in window) {
        const cache = await caches.open('learnbridge-media-v4');
        await cache.addAll([
          './media/sample-lesson.mp4',
          './media/audio-description.mp3',
          './media/captions-en.vtt',
          './media/captions-am.vtt',
          './media/transcript.json',
          './media/learnbridge-lesson-pack.zip'
        ]);
        showToast('Lesson pack cached! Available offline anytime.');
      } else {
        const a = document.createElement('a');
        a.href = './media/learnbridge-lesson-pack.zip';
        a.download = 'learnbridge-lesson-pack.zip';
        document.body.append(a);
        a.click();
        a.remove();
        showToast('Offline ZIP download started.');
      }
    } catch (err) {
      showToast('Offline download started.');
    }
  });

  $('#helpButtonSecondary').addEventListener('click', () => {
    showToast('Learning support connects with ALX mentors during Savanna integration.');
  });

  // Fetch verified transcript cues
  fetch('./media/transcript.json')
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(data => {
      if (Array.isArray(data.segments) && data.segments.length) {
        segments = data.segments;
        if (mainTranscript) mainTranscript.segments = segments;
      }
    })
    .catch(() => {});

  // Initial State
  video.volume = 0.82;
  updatePlayState();
  updateTimeline();

  // Register Service Worker
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

})();
