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
