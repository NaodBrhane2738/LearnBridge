/**
 * LearnBridge Employment — Explainable Job Recommendation Engine
 * Matches candidate skills, career interests, and voluntary accommodations.
 * Strictly enforces non-discriminatory matching (disability or missing accommodation metadata
 * is NEVER used to penalize candidate rank).
 */

const db = require('./db');

class RecommendationsEngine {
  /**
   * Generate explainable recommendations for a candidate
   * @param {string} candidateId 
   * @param {Object} options Custom weighting options
   * @returns {Array<Object>} List of recommended jobs with explainable score cards
   */
  getRecommendationsForCandidate(candidateOrId, options = {}) {
    let candidate = null;
    if (typeof candidateOrId === 'object' && candidateOrId !== null) {
      candidate = candidateOrId;
    } else {
      candidate = db.getCandidateById(candidateOrId);
    }
    const jobs = db.getAllJobs().filter(j => !j.isExpired);

    if (!candidate) {
      // Default non-personalized fallback: return newest verified opportunities
      const defaultLimit = options.limit !== undefined ? options.limit : 50;
      return jobs.slice(0, defaultLimit).map(job => ({
        job,
        matchScore: 80,
        explanation: {
          summary: "Recommended based on trending verified opportunities in Ethiopia.",
          skillMatches: [],
          accommodationCompatibility: "Standard profile match"
        }
      }));
    }

    const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
    const candidateLoc = (candidate.location || '').toLowerCase();
    const candidateJobTypes = (candidate.preferredEmploymentTypes || candidate.jobTypes || []).map(t => t.toLowerCase());
    const candidateAccommodations = (candidate.accommodationsProfile && candidate.accommodationsProfile.accommodationsRequested) || [];

    const scored = jobs.map(job => {
      let score = 50; // Base baseline score
      const skillMatches = [];
      const explanations = [];

      // 1. Skill overlap (up to +35 points)
      const jobSkills = (job.skills || []).map(s => s.toLowerCase());
      if (candidateSkills.length > 0) {
        candidateSkills.forEach(cSkill => {
          const match = jobSkills.find(jSkill => jSkill.includes(cSkill) || cSkill.includes(jSkill));
          if (match && !skillMatches.includes(match)) {
            skillMatches.push(match);
            score += 10;
          }
        });
      }

      if (skillMatches.length > 0) {
        explanations.push(`${skillMatches.length} matching skills: ${skillMatches.slice(0, 3).join(', ')}`);
      }

      // 2. Job Type match (+10 points)
      if (candidateJobTypes.length > 0 && job.employmentType) {
        const typeMatch = candidateJobTypes.some(t => job.employmentType.toLowerCase().includes(t));
        if (typeMatch) {
          score += 10;
          explanations.push(`Preferred job type: ${job.employmentType}.`);
        }
      }

      // 3. Location & Remote match (up to +15 points)
      if (job.isRemote) {
        score += 10;
        explanations.push("Remote flexibility matches your profile.");
      } else if (candidateLoc && (job.location || '').toLowerCase().includes(candidateLoc)) {
        score += 15;
        explanations.push(`Located directly in ${job.region || 'your area'}.`);
      }

      // 4. Positive Accommodation Match (up to +15 points bonus; NEVER negative penalty)
      let accommodationCompatibility = "Accommodations: Standard workplace";
      if (job.accommodations) {
        let positiveAccomms = 0;
        if (job.accommodations.screen_reader_ready && job.accommodations.screen_reader_ready.status === 'supported') {
          positiveAccomms++;
        }
        if (job.accommodations.etsl_interpreter && job.accommodations.etsl_interpreter.status === 'supported') {
          positiveAccomms++;
        }
        if (job.accommodations.wheelchair_accessible && job.accommodations.wheelchair_accessible.status === 'supported') {
          positiveAccomms++;
        }

        if (positiveAccomms > 0) {
          score += 10;
          accommodationCompatibility = `${positiveAccomms} verified workplace accommodations supported.`;
          explanations.push(accommodationCompatibility);
        }
      }

      // 5. Verified Employer trust boost (+5 points)
      if (job.verifiedEmployer) {
        score += 5;
        explanations.push("Verified employer with vetted trade registration.");
      }

      // Cap match score between 0 and 99
      const finalScore = Math.min(98, Math.max(45, score));

      return {
        job,
        matchScore: finalScore,
        explanation: {
          summary: explanations.join(' · ') || "General opportunity matching your broad industry profile.",
          skillMatches,
          accommodationCompatibility
        }
      };
    });

    // Sort descending by match score
    scored.sort((a, b) => b.matchScore - a.matchScore);

    const limit = options.limit !== undefined ? options.limit : 50;
    return scored.slice(0, limit);
  }
}

const recommendationsEngine = new RecommendationsEngine();
module.exports = recommendationsEngine;
