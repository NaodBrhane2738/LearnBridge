/**
 * LearnBridge Employment — Semantic Job Card Component
 * WCAG 2.2 Level AAA compliant with audible readout and bookmarking.
 * Strictly adheres to vibeless design principles: zero raw emojis,
 * disciplined frosted glass surfaces, and crisp inline SVGs.
 */

class JobCardComponent {
  /**
   * Render single job card HTML
   * @param {Object} job Job data
   * @param {boolean} isSaved Whether candidate has bookmarked this job
   * @returns {string} HTML string
   */
  static render(job, isSaved = false) {
    const verifiedBadge = job.verifiedEmployer
      ? `<span class="badge badge-verified" title="Verified Trade License & Legal Entity">
          <svg class="ui-icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Verified Employer
        </span>`
      : `<span class="badge badge-standard">Standard Listing</span>`;

    const remoteBadge = job.isRemote
      ? `<span class="badge badge-remote">
          <svg class="ui-icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
          Remote
        </span>`
      : `<span class="badge badge-onsite">${job.workArrangement || 'On-site'}</span>`;

    const expiredBadge = job.isExpired
      ? `<span class="badge badge-expired">Expired</span>`
      : '';

    // Compensation string
    let salaryString = 'Compensation Unspecified';
    if (job.salaryDisclosed) {
      if (job.salaryMin && job.salaryMax) {
        salaryString = `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} ${job.currency} / ${job.salaryPeriod || 'Mo'}`;
      } else if (job.salaryMin) {
        salaryString = `From ${job.salaryMin.toLocaleString()} ${job.currency}`;
      }
    }

    // Accessibility tags
    const accommTags = [];
    if (job.accommodations) {
      if (job.accommodations.screen_reader_ready && job.accommodations.screen_reader_ready.status === 'supported') {
        accommTags.push(`<span class="meta-pill" title="Screen reader tested software and workflow">
          <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Screen-Reader Ready
        </span>`);
      }
      if (job.accommodations.etsl_interpreter && job.accommodations.etsl_interpreter.status === 'supported') {
        accommTags.push(`<span class="meta-pill" title="Certified Ethiopian Sign Language interpreter available">
          <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
          ETSL Supported
        </span>`);
      }
      if (job.accommodations.captioned_meetings && job.accommodations.captioned_meetings.status === 'supported') {
        accommTags.push(`<span class="meta-pill" title="Captioned meetings and onboarding">
          <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Captioned
        </span>`);
      }
      if (job.accommodations.wheelchair_accessible && job.accommodations.wheelchair_accessible.status === 'supported') {
        accommTags.push(`<span class="meta-pill" title="Wheelchair accessible physical facility">
          <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><path d="M9 13v-3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/><path d="M7 19a5 5 0 1 0 10 0"/></svg>
          Barrier-Free
        </span>`);
      }
      if (job.accommodations.flexible_hours && job.accommodations.flexible_hours.status === 'supported') {
        accommTags.push(`<span class="meta-pill" title="Flexible work hours & async schedule">
          <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Flexible Hours
        </span>`);
      }
    }

    const deadlineFormatted = job.deadline ? new Date(job.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Open until filled';
    const savedBtnText = isSaved ? 'Saved' : 'Save';
    const savedClass = isSaved ? 'btn-secondary active' : 'btn-outline';

    return `
      <article class="job-card ${job.isExpired ? 'job-card-expired' : ''}" id="card-${job.id}" role="article" tabindex="0" aria-labelledby="title-${job.id}">
        <div class="job-card-top">
          <div class="job-card-title-group">
            <h3 class="job-card-title" id="title-${job.id}">
              <a href="#job/${job.id}">${escapeHTML(job.title)}</a>
            </h3>
            <div class="job-card-employer-row">
              <span class="job-employer-name">${escapeHTML(job.employerName)}</span>
              <span>•</span>
              <span class="job-location">
                <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ${escapeHTML(job.location)}
              </span>
              ${verifiedBadge}
              ${remoteBadge}
              ${expiredBadge}
            </div>
          </div>
          <button type="button" class="btn btn-sm ${savedClass} btn-save-job" data-id="${job.id}" aria-label="${isSaved ? 'Remove from saved jobs' : 'Save job to favorites'}" aria-pressed="${isSaved}">
            <svg class="ui-icon" style="width: 14px; height: 14px; ${isSaved ? 'fill: currentColor;' : ''}" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${savedBtnText}
          </button>
        </div>

        <div class="job-tags-row">
          <span class="meta-pill job-salary">
            <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>
            ${salaryString}
          </span>
          <span class="meta-pill">
            <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            ${escapeHTML(job.employmentType)}
          </span>
          <span class="meta-pill">
            <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            ${escapeHTML(job.experienceLevel)}
          </span>
          <span class="meta-pill">
            <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Deadline: ${deadlineFormatted}
          </span>
          ${accommTags.join(' ')}
        </div>

        <p class="job-card-description">${escapeHTML(job.description)}</p>

        <div class="job-card-footer">
          <div class="job-card-actions">
            <button type="button" class="btn btn-sm btn-outline btn-listen-summary" data-id="${job.id}" aria-label="Listen to audio summary of ${escapeHTML(job.title)}">
              <svg class="ui-icon" style="width: 14px; height: 14px;" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              Listen
            </button>
            <a href="#job/${job.id}" class="btn btn-sm btn-secondary">
              View Details
              <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>

          <button type="button" class="btn btn-sm btn-primary btn-open-apply-modal" data-id="${job.id}" ${job.isExpired ? 'disabled' : ''}>
            ${job.applicationMethod === 'external' ? 'Apply on Partner Platform' : 'Quick Apply'}
          </button>
        </div>
      </article>
    `;
  }

  /**
   * Render focused compact swipeable job card (Tinder-style)
   * 100% IDENTICAL structure across center hero and fanned background cards.
   * Differs only in job data and visual depth/positioning.
   *
   * @param {Object} scoredItem Scored job object { job, matchScore, explanation }
   * @param {number} index Current card index (0-based)
   * @param {number} total Total cards in deck
   * @param {string} role 'center' | 'next' | 'prev'
   * @returns {string} HTML markup
   */
  static renderSwipeCard(scoredItem, index, total, role = 'center') {
    if (!scoredItem) return '';
    const job = scoredItem.job || scoredItem;
    const matchScore = scoredItem.matchScore || 85;
    const explanation = scoredItem.explanation || {};
    const isCenter = role === 'center';

    let salaryString = 'Disclosed Upon Interview';
    if (job.salaryDisclosed) {
      if (job.salaryMin && job.salaryMax) {
        salaryString = `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} ${job.currency}`;
      } else if (job.salaryMin) {
        salaryString = `From ${job.salaryMin.toLocaleString()} ${job.currency}`;
      }
    }

    const verifiedBadge = job.verifiedEmployer
      ? `<span class="badge badge-verified" title="Verified Trade License">
          <svg class="ui-icon" style="width: 12px; height: 12px;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Verified
        </span>`
      : '';

    const remoteBadge = job.isRemote
      ? `<span class="badge badge-remote">Remote</span>`
      : `<span class="badge badge-onsite">${escapeHTML(job.workArrangement || 'On-site')}</span>`;

    const skillsList = (job.skills || []).slice(0, 4).map(s => `<span class="meta-pill">${escapeHTML(s)}</span>`).join(' ');

    const resps = (job.responsibilities || []).slice(0, 4).map(r => `<li>${escapeHTML(r)}</li>`).join('');
    const reqs = (job.requirements || []).slice(0, 4).map(r => `<li>${escapeHTML(r)}</li>`).join('');

    const accommTags = [];
    if (job.accommodations) {
      if (job.accommodations.screen_reader_ready?.status === 'supported') {
        accommTags.push(`<span class="meta-pill">Screen-Reader Ready</span>`);
      }
      if (job.accommodations.etsl_interpreter?.status === 'supported') {
        accommTags.push(`<span class="meta-pill">ETSL Supported</span>`);
      }
      if (job.accommodations.captioned_meetings?.status === 'supported') {
        accommTags.push(`<span class="meta-pill">Captioned Meetings</span>`);
      }
      if (job.accommodations.wheelchair_accessible?.status === 'supported') {
        accommTags.push(`<span class="meta-pill">Barrier-Free</span>`);
      }
      if (job.accommodations.flexible_hours?.status === 'supported') {
        accommTags.push(`<span class="meta-pill">Flexible Hours</span>`);
      }
    }
    const accommHtml = accommTags.join(' ');

    const cardClasses = [
      'swipe-card',
      'tinder-card',
      isCenter ? 'is-hero-card' : 'is-side-card',
      !isCenter ? `is-side-${role}` : ''
    ].filter(Boolean).join(' ');

    const cardId = isCenter ? `swipe-card-${job.id}` : `swipe-card-${job.id}-${role}`;
    const cardTitleId = isCenter ? `swipe-title-${job.id}` : `swipe-title-${job.id}-${role}`;
    const detailsContainerId = isCenter ? `card-expanded-details-${job.id}` : `card-expanded-details-${job.id}-${role}`;

    const roleAriaLabel = isCenter
      ? `Active opportunity ${index + 1} of ${total}: ${escapeHTML(job.title)} at ${escapeHTML(job.employerName)}`
      : (role === 'next'
          ? `Next opportunity (+1): ${escapeHTML(job.title)} at ${escapeHTML(job.employerName)} (Click to view)`
          : `Upcoming opportunity (+2): ${escapeHTML(job.title)} at ${escapeHTML(job.employerName)} (Click to view)`);

    return `
      <article class="${cardClasses}" id="${cardId}" role="${isCenter ? 'region' : 'button'}" aria-label="${roleAriaLabel}" tabindex="${isCenter ? '0' : '-1'}">
        <!-- Top Status Bar -->
        <div class="swipe-card-top-bar">
          <div class="deck-counter-badge">
            Opportunity <strong>${index + 1}</strong> of <strong>${total}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${isCenter ? `
              <button type="button" class="btn-deck-mic is-listening" id="btn-deck-mic" aria-label="Voice microphone on by default (Press V to mute)" aria-pressed="true" title="Voice Control Active (Say 'more', 'apply', 'pass' or press V to mute)">
                <svg class="ui-icon mic-icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                <span class="mic-status-label">Mic: On (V)</span>
              </button>
            ` : `
              <span class="side-card-role-pill" title="${role === 'next' ? 'First to appear when swiped' : 'Upcoming in queue'}">
                ${role === 'next' ? 'Next Up (→)' : 'Queue (+2)'}
              </span>
            `}
            <div class="match-score-pill">
              <svg class="ui-icon" style="width: 13px; height: 13px;" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span><strong>${matchScore}%</strong> Match</span>
            </div>
          </div>
        </div>

        ${explanation.summary ? `
          <div class="match-explanation-banner">
            <svg class="ui-icon" style="color: var(--primary-red); width: 13px; height: 13px;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${escapeHTML(explanation.summary)}</span>
          </div>
        ` : ''}

        <!-- Job Header -->
        <div class="swipe-card-header">
          <h2 class="swipe-card-title" id="${cardTitleId}">${escapeHTML(job.title)}</h2>
          <div class="swipe-card-subhead">
            <strong class="swipe-card-employer">${escapeHTML(job.employerName)}</strong>
            <span class="dot-separator">•</span>
            <span class="swipe-card-location">${escapeHTML(job.location)}</span>
          </div>
          <div class="swipe-card-badges">
            ${verifiedBadge}
            ${remoteBadge}
            <span class="badge badge-standard">${escapeHTML(job.employmentType)}</span>
          </div>
        </div>

        <!-- Meta Highlights -->
        <div class="swipe-card-meta-row compact-meta">
          <div class="meta-item">
            <span class="meta-label">Compensation</span>
            <span class="meta-val meta-salary">${salaryString}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Industry</span>
            <span class="meta-val">${escapeHTML(job.industry || 'Technology')}</span>
          </div>
        </div>

        <!-- Role Overview -->
        <div class="swipe-card-body compact-body">
          <p class="swipe-card-desc">${escapeHTML(job.description)}</p>

          ${skillsList ? `
            <div class="swipe-card-section" style="margin-top: 6px;">
              <div class="job-tags-row">${skillsList}</div>
            </div>
          ` : ''}
        </div>

        <!-- Toggle More Details Button (M key or click) -->
        <button type="button" class="btn-card-toggle-details" ${isCenter ? 'id="btn-card-toggle-details"' : ''} aria-expanded="false" aria-controls="${detailsContainerId}" aria-label="Toggle full job details (Press M or click)">
          <span class="toggle-text">More Details (Press M or click)</span>
          <svg class="ui-icon toggle-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        <!-- Expanded Full Details (Revealed via M or 'More') -->
        <div class="swipe-card-expanded-details" id="${detailsContainerId}" style="display: none;" aria-hidden="true">
          ${resps ? `
            <div class="swipe-card-section">
              <h4 class="swipe-section-heading">Key Responsibilities</h4>
              <ul class="bullet-list">${resps}</ul>
            </div>
          ` : ''}

          ${reqs ? `
            <div class="swipe-card-section">
              <h4 class="swipe-section-heading">Requirements & Qualifications</h4>
              <ul class="bullet-list">${reqs}</ul>
            </div>
          ` : ''}

          ${accommHtml ? `
            <div class="swipe-card-section">
              <h4 class="swipe-section-heading">Verified Workplace Accommodations</h4>
              <div class="job-tags-row">${accommHtml}</div>
            </div>
          ` : ''}

          <div class="swipe-card-section swipe-card-footer-info">
            <span class="info-pill">Employer: <strong>${escapeHTML(job.employerName)}</strong></span>
            <span class="info-pill">Location: <strong>${escapeHTML(job.location)}</strong></span>
          </div>
        </div>

        <!-- Keyboard Controls Indicator -->
        <div class="swipe-keyboard-hint compact-hint" aria-hidden="true">
          <div class="hint-col hint-left">
            <kbd class="key-kbd">← Arrow</kbd>
            <span>Pass</span>
          </div>
          <div class="hint-col hint-mid">
            <kbd class="key-kbd">M</kbd>
            <span>More Info</span>
          </div>
          <div class="hint-col hint-right">
            <span>Apply</span>
            <kbd class="key-kbd">Arrow →</kbd>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="swipe-card-actions tinder-actions">
          <button type="button" class="btn btn-card-pass" ${isCenter ? 'id="btn-card-pass"' : ''} data-id="${job.id}" aria-label="Pass on this job (Left Arrow)">
            <svg class="ui-icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Pass (←)
          </button>
          <button type="button" class="btn btn-card-apply" ${isCenter ? 'id="btn-card-apply"' : ''} data-id="${job.id}" aria-label="Apply to this job with CV (Right Arrow)">
            <svg class="ui-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            Apply with CV (→)
          </button>
        </div>
      </article>
    `;
  }

  /**
   * Deprecated alias for renderSwipeCard to maintain backward compatibility
   */
  static renderSideCard(scoredItem, index, total, position) {
    return this.renderSwipeCard(scoredItem, index, total, position);
  }

  /**
   * Render pagination dots with active red pill indicator matching Image 2
   */
  static renderPaginationDots(total, currentIndex) {
    if (total <= 1) return '';
    const dots = [];
    const maxVisible = 7;
    let start = 0;
    let end = total;

    if (total > maxVisible) {
      const half = Math.floor(maxVisible / 2);
      start = Math.max(0, currentIndex - half);
      end = Math.min(total, start + maxVisible);
      if (end - start < maxVisible) {
        start = Math.max(0, end - maxVisible);
      }
    }

    for (let i = start; i < end; i++) {
      const isActive = i === currentIndex;
      dots.push(`
        <button type="button" 
                class="deck-page-dot ${isActive ? 'active' : ''}" 
                data-jump-index="${i}" 
                role="tab" 
                aria-selected="${isActive ? 'true' : 'false'}" 
                aria-label="Go to opportunity ${i + 1} of ${total}"
                title="Opportunity ${i + 1} of ${total}">
        </button>
      `);
    }
    return dots.join('');
  }

  /**
   * Render complete deck with subtle tip corners behind front card and circular navigation controls
   * @param {Array} cardDeck Array of scored job items
   * @param {number} currentIndex Active card index
   * @returns {string} HTML markup
   */
  static renderSwipeDeck(cardDeck, currentIndex) {
    if (!cardDeck || cardDeck.length === 0 || currentIndex >= cardDeck.length) {
      return '';
    }

    const total = cardDeck.length;
    const currentItem = cardDeck[currentIndex];
    
    // User requirement:
    // 1. Right background card has the work NEXT from the front one (currentIndex + 1)
    // This is the card that will animate to front when swiped!
    const rightIndex = (currentIndex + 1) % total;
    const nextItem = total > 1 ? cardDeck[rightIndex] : null;

    // 2. Left background card has the NEXT-NEXT one (currentIndex + 2) in queue
    const leftIndex = (currentIndex + 2) % total;
    const leftItem = total > 2 ? cardDeck[leftIndex] : (total > 1 ? cardDeck[rightIndex] : null);

    // Pre-structured identical card markup for all 3 positions
    const centerCardHtml = this.renderSwipeCard(currentItem, currentIndex, total, 'center');
    const prevCardHtml = leftItem ? this.renderSwipeCard(leftItem, leftIndex, total, 'prev') : '';
    const nextCardHtml = nextItem ? this.renderSwipeCard(nextItem, rightIndex, total, 'next') : '';
    const paginationDotsHtml = this.renderPaginationDots(total, currentIndex);

    return `
      <div class="deck-carousel-viewport" id="deck-carousel-viewport">
        <div class="deck-carousel-stage" id="deck-carousel-stage">
          <!-- Left Background Card (Upcoming Opportunity +2, Fanned Out) -->
          ${leftItem ? `
            <div class="deck-slide-side deck-slide-prev" id="deck-slide-prev" data-target-index="${leftIndex}" role="button" tabindex="0" aria-label="Upcoming in queue (+2): ${escapeHTML(leftItem.job?.title || '')} (Click to switch)" title="Upcoming (+2): ${escapeHTML(leftItem.job?.title || '')} (Click to view)">
              ${prevCardHtml}
            </div>
          ` : ''}

          <!-- Center Active Card (Hero Card - Crystal Clear, High Contrast, Red Accent) -->
          <div class="deck-slide-center" id="deck-slide-center">
            ${centerCardHtml}
          </div>

          <!-- Right Background Card (Immediate Next Opportunity +1, Fanned Out) -->
          ${nextItem ? `
            <div class="deck-slide-side deck-slide-next" id="deck-slide-next" data-target-index="${rightIndex}" role="button" tabindex="0" aria-label="Next opportunity (+1): ${escapeHTML(nextItem.job?.title || '')} (Click to switch)" title="Next (+1): ${escapeHTML(nextItem.job?.title || '')} (Click to view)">
              ${nextCardHtml}
            </div>
          ` : ''}
        </div>

        <!-- Carousel Navigation Controls (Circular Arrows + Pagination Dots from Image 2) -->
        <div class="deck-carousel-controls" aria-label="Opportunity carousel controls">
          <button type="button" class="deck-nav-arrow deck-nav-prev" id="btn-carousel-prev" aria-label="Previous opportunity (Left Arrow)" title="Previous (← Arrow)" ${currentIndex === 0 ? 'disabled' : ''}>
            <svg class="ui-icon" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>

          <div class="deck-pagination-pills" id="deck-pagination-pills" role="tablist" aria-label="Opportunity indicators">
            ${paginationDotsHtml}
          </div>

          <button type="button" class="deck-nav-arrow deck-nav-next" id="btn-carousel-next" aria-label="Next opportunity (Right Arrow)" title="Next (→ Arrow)" ${currentIndex >= total - 1 ? 'disabled' : ''}>
            <svg class="ui-icon" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    `;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.JobCardComponent = JobCardComponent;
