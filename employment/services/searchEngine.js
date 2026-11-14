/**
 * LearnBridge Employment — Search and Filtering Engine
 * Implements high-performance, accessible search with multi-faceted filtering,
 * Ethiopian regional taxonomy, international remote eligibility, and accessibility scoring.
 */

const db = require('./db');

class SearchEngine {
  /**
   * Execute multi-parameter search across jobs
   * @param {Object} params Query parameters
   * @returns {Object} { total, page, limit, totalPages, results, facets }
   */
  search(params = {}) {
    const allJobs = db.getAllJobs();

    const {
      q = '',
      industry = '',
      location = '',
      remoteType = '', // 'remote' | 'hybrid' | 'onsite'
      employmentType = '',
      experienceLevel = '',
      salaryMin = null,
      salaryMax = null,
      currency = '',
      skills = '',
      languages = '',
      verifiedOnly = false,
      accommodation = '', // 'screen_reader_ready', 'etsl_interpreter', etc.
      includeExpired = false,
      sortBy = 'newest', // 'newest' | 'relevance' | 'salary_desc' | 'deadline_asc'
      page = 1,
      limit = 10
    } = params;

    const queryTokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const requestedSkills = skills ? skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
    const requestedLanguages = languages ? languages.split(',').map(l => l.trim().toLowerCase()).filter(Boolean) : [];

    let filtered = allJobs.filter(job => {
      // 1. Expiration check
      if (!includeExpired && job.isExpired) {
        return false;
      }

      // 2. Verified employer only
      if ((verifiedOnly === true || verifiedOnly === 'true') && !job.verifiedEmployer) {
        return false;
      }

      // 3. Keyword query search (Title, Employer, Description, Skills)
      if (queryTokens.length > 0) {
        const searchableText = [
          job.title,
          job.employerName,
          job.description,
          (job.skills || []).join(' '),
          job.location,
          job.region
        ].join(' ').toLowerCase();

        const matchesAllTokens = queryTokens.every(token => searchableText.includes(token));
        if (!matchesAllTokens) return false;
      }

      // 4. Industry
      if (industry && industry !== 'all') {
        if (job.industry.toLowerCase() !== industry.toLowerCase()) {
          return false;
        }
      }

      // 5. Location / Region
      if (location && location !== 'all') {
        const locLower = location.toLowerCase();
        const jobLoc = (job.location + ' ' + (job.region || '')).toLowerCase();
        if (!jobLoc.includes(locLower)) {
          return false;
        }
      }

      // 6. Remote / Work Arrangement
      if (remoteType && remoteType !== 'all') {
        if (remoteType === 'remote' && !job.isRemote) return false;
        if (remoteType === 'onsite' && (job.isRemote || (job.workArrangement || '').toLowerCase().includes('remote'))) return false;
        if (remoteType === 'hybrid' && !(job.workArrangement || '').toLowerCase().includes('hybrid')) return false;
      }

      // 7. Employment Type
      if (employmentType && employmentType !== 'all') {
        if (job.employmentType.toLowerCase() !== employmentType.toLowerCase()) {
          return false;
        }
      }

      // 8. Experience Level
      if (experienceLevel && experienceLevel !== 'all') {
        if (job.experienceLevel.toLowerCase() !== experienceLevel.toLowerCase()) {
          return false;
        }
      }

      // 9. Currency & Salary Filtering
      if (currency && job.currency && job.currency.toLowerCase() !== currency.toLowerCase()) {
        return false;
      }

      if (salaryMin !== null && salaryMin !== undefined && salaryMin !== '') {
        const minVal = Number(salaryMin);
        if (!isNaN(minVal) && (job.salaryMax || job.salaryMin || 0) < minVal) {
          return false;
        }
      }

      if (salaryMax !== null && salaryMax !== undefined && salaryMax !== '') {
        const maxVal = Number(salaryMax);
        if (!isNaN(maxVal) && (job.salaryMin || 0) > maxVal) {
          return false;
        }
      }

      // 10. Skills Filter
      if (requestedSkills.length > 0) {
        const jobSkills = (job.skills || []).map(s => s.toLowerCase());
        const hasSkill = requestedSkills.some(reqSkill => 
          jobSkills.some(js => js.includes(reqSkill))
        );
        if (!hasSkill) return false;
      }

      // 11. Language Requirements Filter
      if (requestedLanguages.length > 0) {
        const jobLangs = (job.languages || []).map(l => l.toLowerCase()).join(' ');
        const matchesLanguage = requestedLanguages.some(rl => jobLangs.includes(rl));
        if (!matchesLanguage) return false;
      }

      // 12. Accessibility Accommodations Filter
      if (accommodation && accommodation !== 'all') {
        const accommObj = job.accommodations && job.accommodations[accommodation];
        if (!accommObj || accommObj.status !== 'supported') {
          return false;
        }
      }

      return true;
    });

    // Scoring & Relevance calculation
    if (sortBy === 'relevance' && queryTokens.length > 0) {
      filtered.sort((a, b) => {
        const scoreA = this._calculateRelevanceScore(a, queryTokens);
        const scoreB = this._calculateRelevanceScore(b, queryTokens);
        return scoreB - scoreA;
      });
    } else if (sortBy === 'salary_desc') {
      filtered.sort((a, b) => (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0));
    } else if (sortBy === 'deadline_asc') {
      filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else {
      // Default: newest first
      filtered.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    }

    // Facet aggregation for UI filters
    const facets = this._buildFacets(allJobs);

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedResults = filtered.slice(startIndex, startIndex + limitNum);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      results: paginatedResults,
      facets
    };
  }

  _calculateRelevanceScore(job, tokens) {
    let score = 0;
    const title = (job.title || '').toLowerCase();
    const employer = (job.employerName || '').toLowerCase();
    const skills = (job.skills || []).map(s => s.toLowerCase()).join(' ');

    tokens.forEach(tok => {
      if (title === tok) score += 50;
      else if (title.includes(tok)) score += 30;
      if (employer.includes(tok)) score += 20;
      if (skills.includes(tok)) score += 15;
    });

    if (job.verifiedEmployer) score += 5;
    return score;
  }

  _buildFacets(jobs) {
    const industries = {};
    const locations = {};
    const employmentTypes = {};
    const accommodations = {
      screen_reader_ready: 0,
      etsl_interpreter: 0,
      captioned_meetings: 0,
      wheelchair_accessible: 0,
      flexible_hours: 0
    };

    jobs.forEach(job => {
      if (job.industry) {
        industries[job.industry] = (industries[job.industry] || 0) + 1;
      }
      if (job.region) {
        locations[job.region] = (locations[job.region] || 0) + 1;
      }
      if (job.employmentType) {
        employmentTypes[job.employmentType] = (employmentTypes[job.employmentType] || 0) + 1;
      }
      if (job.accommodations) {
        Object.keys(accommodations).forEach(key => {
          if (job.accommodations[key] && job.accommodations[key].status === 'supported') {
            accommodations[key]++;
          }
        });
      }
    });

    return {
      industries,
      locations,
      employmentTypes,
      accommodations,
      totalActive: jobs.filter(j => !j.isExpired).length
    };
  }
}

const searchEngine = new SearchEngine();
module.exports = searchEngine;
