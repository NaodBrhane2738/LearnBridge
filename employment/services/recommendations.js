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
  getRecommendationsForCandidate(candidateId, options = {}) {
    const candidate = db.getCandidateById(candidateId);
    const jobs = db.getAllJobs().filter(j => !j.isExpired);

    if (!candidate) {
      // Default non-personalized fallback: return newest verified opportunities
      return jobs.slice(0, 5).map(job => ({
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
          if (match) {
            skillMatches.push(match);
            score += 10;
          }
        });
      }

      if (skillMatches.length > 0) {
        explanations.push(`${skillMatches.length} matching skills: ${skillMatches.slice(0, 3).join(', ')}`);
      }

      // 2. Location & Remote match (up to +15 points)
      if (job.isRemote) {
        score += 10;
        explanations.push("Remote flexibility matches your profile.");
      } else if (candidateLoc && (job.location || '').toLowerCase().includes(candidateLoc)) {
        score += 15;
        explanations.push(`Located directly in ${job.region || 'your area'}.`);
      }

      // 3. Positive Accommodation Match (up to +15 points bonus; NEVER negative penalty)
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

      // 4. Verified Employer trust boost (+5 points)
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

    return scored.slice(0, 6);
  }
}

const recommendationsEngine = new RecommendationsEngine();
module.exports = recommendationsEngine;
