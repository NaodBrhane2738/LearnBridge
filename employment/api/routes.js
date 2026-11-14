/**
 * LearnBridge Employment — REST API Routes
 * Fully isolated Express router serving the complete Employment Platform API.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const db = require('../services/db');
const searchEngine = require('../services/searchEngine');
const recommendationsEngine = require('../services/recommendations');
const cvParser = require('../services/cvParser');
const externalJobManager = require('../services/externalJobAdapter');

// Middleware: JSON parser
router.use(express.json());

// Helper for standard API response
function jsonSuccess(res, data, meta = {}) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
}

function jsonError(res, status, message, errors = []) {
  return res.status(status).json({
    success: false,
    error: {
      code: status,
      message,
      errors
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}

// -------------------------------------------------------------
// 1. JOBS DISCOVERY & SEARCH
// -------------------------------------------------------------

/**
 * GET /jobs
 * Search and filter vacancies
 */
router.get('/jobs', (req, res) => {
  try {
    const results = searchEngine.search(req.query);
    return jsonSuccess(res, results.results, {
      total: results.total,
      page: results.page,
      limit: results.limit,
      totalPages: results.totalPages,
      facets: results.facets
    });
  } catch (err) {
    return jsonError(res, 500, "Error searching jobs: " + err.message);
  }
});

/**
 * GET /jobs/recommendations
 * Explainable recommendations for active candidate
 */
router.get('/jobs/recommendations', (req, res) => {
  try {
    const candidateId = req.query.candidateId || req.headers['x-candidate-id'] || 'ethio-candidate-01';
    const recs = recommendationsEngine.getRecommendationsForCandidate(candidateId);
    return jsonSuccess(res, recs, { candidateId });
  } catch (err) {
    return jsonError(res, 500, "Error fetching recommendations: " + err.message);
  }
});

/**
 * GET /jobs/:id
 * Retrieve full job vacancy details
 */
router.get('/jobs/:id', (req, res) => {
  const job = db.getJobById(req.params.id);
  if (!job) {
    return jsonError(res, 404, `Job vacancy with ID '${req.params.id}' not found.`);
  }
  return jsonSuccess(res, job);
});

/**
 * GET /jobs/:id/audio-summary
 * Get accessible spoken summary metadata
 */
router.get('/jobs/:id/audio-summary', (req, res) => {
  const job = db.getJobById(req.params.id);
  if (!job) {
    return jsonError(res, 404, "Job vacancy not found.");
  }
  return jsonSuccess(res, {
    jobId: job.id,
    title: job.title,
    employer: job.employerName,
    audioText: job.audioSummaryText || `${job.title} at ${job.employerName}. Location: ${job.location}.`,
    supportedVoices: ["en-US", "am-ET"],
    disclaimer: "Synthesized via local client Web Speech API."
  });
});

/**
 * POST /jobs/:id/report
 * Submit fraudulent or scam job report
 */
router.post('/jobs/:id/report', (req, res) => {
  const { reason, details, reporterEmail } = req.body;
  if (!reason) {
    return jsonError(res, 400, "Report reason is required (e.g. scam, misleading_salary, discriminatory, expired).");
  }

  const job = db.getJobById(req.params.id);
  if (!job) {
    return jsonError(res, 404, "Job vacancy not found.");
  }

  const report = db.createReport({
    jobId: job.id,
    jobTitle: job.title,
    employerName: job.employerName,
    reportedBy: reporterEmail || 'anonymous-user',
    reason,
    details: details || ''
  });

  return jsonSuccess(res, report, { message: "Report received. LearnBridge moderation team will review within 24 hours." });
});

// -------------------------------------------------------------
// 2. CANDIDATE PROFILES & CV MANAGEMENT
// -------------------------------------------------------------

/**
 * GET /candidate/me
 * Retrieve current candidate profile
 */
router.get('/candidate/me', (req, res) => {
  const candidateId = req.headers['x-candidate-id'] || 'ethio-candidate-01';
  const candidate = db.getCandidateById(candidateId);
  if (!candidate) {
    return jsonError(res, 404, "Candidate profile not found.");
  }
  return jsonSuccess(res, candidate);
});

/**
 * PATCH /candidate/me
 * Update candidate profile fields
 */
router.patch('/candidate/me', (req, res) => {
  const candidateId = req.headers['x-candidate-id'] || 'ethio-candidate-01';
  const updates = req.body;

  // Prevent modifying sensitive IDs
  delete updates.id;
  delete updates.userId;

  const updated = db.updateCandidate(candidateId, updates);
  if (!updated) {
    return jsonError(res, 404, "Candidate not found.");
  }
  return jsonSuccess(res, updated);
});

/**
 * POST /candidate/me/parse-cv
 * Upload & parse CV without auto-saving
 */
router.post('/candidate/me/parse-cv', (req, res) => {
  try {
    const { cvText, fileName, fileSize } = req.body;
    if (!cvText || cvText.trim().length === 0) {
      return jsonError(res, 400, "cvText content is required for parsing.");
    }

    const draft = cvParser.parseCV(cvText, { fileName, size: fileSize });
    return jsonSuccess(res, draft);
  } catch (err) {
    return jsonError(res, 400, err.message);
  }
});

/**
 * POST /candidate/me/resumes
 * Save confirmed parsed resume to candidate profile
 */
router.post('/candidate/me/resumes', (req, res) => {
  const candidateId = req.headers['x-candidate-id'] || 'ethio-candidate-01';
  const candidate = db.getCandidateById(candidateId);
  if (!candidate) {
    return jsonError(res, 404, "Candidate not found.");
  }

  const { fileName, fileSize, confirmedSkills, confirmedEducation, confirmedExperience } = req.body;
  const newResume = {
    id: `res-${Date.now()}`,
    fileName: fileName || "Verified_Resume.pdf",
    fileSize: fileSize || "180 KB",
    uploadedAt: new Date().toISOString(),
    isPrimary: true,
    parsedData: {
      extractedSkills: confirmedSkills || [],
      extractedEducation: confirmedEducation || [],
      extractedExperience: confirmedExperience || []
    }
  };

  const existingResumes = candidate.resumes || [];
  existingResumes.forEach(r => r.isPrimary = false);
  existingResumes.unshift(newResume);

  // Update candidate profile skills if provided
  const combinedSkills = Array.from(new Set([...(candidate.skills || []), ...(confirmedSkills || [])]));

  const updated = db.updateCandidate(candidateId, {
    resumes: existingResumes,
    skills: combinedSkills
  });

  return jsonSuccess(res, newResume, { candidate: updated });
});

/**
 * GET /candidate/me/saved-jobs
 */
router.get('/candidate/me/saved-jobs', (req, res) => {
  const candidateId = req.headers['x-candidate-id'] || 'ethio-candidate-01';
  const candidate = db.getCandidateById(candidateId);
  if (!candidate) {
    return jsonError(res, 404, "Candidate not found.");
  }

  const savedIds = candidate.savedJobIds || [];
  const savedJobs = savedIds.map(id => db.getJobById(id)).filter(Boolean);
  return jsonSuccess(res, savedJobs);
});

/**
 * POST /candidate/me/saved-jobs
 */
router.post('/candidate/me/saved-jobs', (req, res) => {
  const candidateId = req.headers['x-candidate-id'] || 'ethio-candidate-01';
  const { jobId } = req.body;
  if (!jobId) {
    return jsonError(res, 400, "jobId is required.");
  }

  const candidate = db.getCandidateById(candidateId);
  if (!candidate) return jsonError(res, 404, "Candidate not found.");

  const savedIds = candidate.savedJobIds || [];
  if (!savedIds.includes(jobId)) {
    savedIds.push(jobId);
    db.updateCandidate(candidateId, { savedJobIds: savedIds });
  }

  return jsonSuccess(res, { savedJobIds: savedIds, message: "Job saved to candidate favorites." });
});

/**
 * DELETE /candidate/me/saved-jobs/:id
 */
router.delete('/candidate/me/saved-jobs/:id', (req, res) => {
  const candidateId = req.headers['x-candidate-id'] || 'ethio-candidate-01';
  const candidate = db.getCandidateById(candidateId);
  if (!candidate) return jsonError(res, 404, "Candidate not found.");

  let savedIds = candidate.savedJobIds || [];
  savedIds = savedIds.filter(id => id !== req.params.id);
  db.updateCandidate(candidateId, { savedJobIds: savedIds });

  return jsonSuccess(res, { savedJobIds: savedIds, message: "Job removed from saved jobs." });
});

// -------------------------------------------------------------
// 3. APPLICATIONS SYSTEM
// -------------------------------------------------------------

/**
 * GET /applications
 * List applications submitted by active candidate
 */
router.get('/applications', (req, res) => {
  const candidateId = req.headers['x-candidate-id'] || 'ethio-candidate-01';
  const apps = db.getApplicationsByCandidate(candidateId);
  return jsonSuccess(res, apps, { total: apps.length });
});

/**
 * GET /applications/:id
 */
router.get('/applications/:id', (req, res) => {
  const app = db.getApplicationById(req.params.id);
  if (!app) {
    return jsonError(res, 404, "Application not found.");
  }
  return jsonSuccess(res, app);
});

/**
 * POST /applications
 * Submit an application (internal or quick apply)
 */
router.post('/applications', (req, res) => {
  const candidateId = req.headers['x-candidate-id'] || 'ethio-candidate-01';
  const { jobId, coverNote, employerAnswers, shareAccommodations } = req.body;

  if (!jobId) {
    return jsonError(res, 400, "jobId is required.");
  }

  const job = db.getJobById(jobId);
  if (!job) {
    return jsonError(res, 404, "Job vacancy not found.");
  }

  if (job.isExpired) {
    return jsonError(res, 400, "Cannot apply to an expired job vacancy.");
  }

  const candidate = db.getCandidateById(candidateId);
  if (!candidate) {
    return jsonError(res, 404, "Candidate not found.");
  }

  // Check duplicate application
  const existingApps = db.getApplicationsByCandidate(candidateId);
  const alreadyApplied = existingApps.find(a => a.jobId === jobId);
  if (alreadyApplied) {
    return jsonError(res, 409, "You have already submitted an application for this vacancy.");
  }

  // Accommodations snapshot (strictly respects candidate opt-in)
  let accommodationsSnapshot = null;
  if (shareAccommodations && candidate.accommodationsProfile && candidate.accommodationsProfile.shareWithEmployers) {
    accommodationsSnapshot = {
      shared: true,
      format: candidate.accommodationsProfile.preferredInterviewFormat,
      items: candidate.accommodationsProfile.accommodationsRequested || []
    };
  }

  const primaryResume = (candidate.resumes || []).find(r => r.isPrimary) || (candidate.resumes || [])[0] || null;

  const newApp = db.createApplication({
    jobId: job.id,
    jobTitle: job.title,
    employerId: job.employerId,
    employerName: job.employerName,
    candidateId: candidate.id,
    candidateName: candidate.fullName,
    candidateEmail: candidate.email,
    resumeId: primaryResume ? primaryResume.id : null,
    resumeFileName: primaryResume ? primaryResume.fileName : "Uploaded_Profile.pdf",
    coverNote: coverNote || "",
    employerAnswers: employerAnswers || [],
    accommodationsSnapshot
  });

  return res.status(201).json({
    success: true,
    data: newApp,
    meta: {
      message: "Application submitted successfully. Employer will review your profile."
    }
  });
});

// -------------------------------------------------------------
// 4. EMPLOYER PORTAL & APPLICANT MANAGEMENT
// -------------------------------------------------------------

/**
 * POST /employer/register
 */
router.post('/employer/register', (req, res) => {
  const { companyName, registrationNumber, website, industry, location, contactEmail } = req.body;
  if (!companyName || !registrationNumber || !contactEmail) {
    return jsonError(res, 400, "companyName, registrationNumber, and contactEmail are mandatory for registration.");
  }

  const employer = db.createEmployer({
    name: companyName,
    registrationNumber,
    website: website || "",
    industry: industry || "Technology & Software",
    location: location || "Addis Ababa, Ethiopia",
    contactEmail
  });

  return res.status(201).json({
    success: true,
    data: employer,
    meta: {
      message: "Employer registered. Pending compliance verification by LearnBridge administrators."
    }
  });
});

/**
 * GET /employer/jobs
 * List vacancies created by employer
 */
router.get('/employer/jobs', (req, res) => {
  const employerId = req.headers['x-employer-id'] || 'emp-alx-africa';
  const jobs = db.getAllJobs().filter(j => j.employerId === employerId);
  return jsonSuccess(res, jobs, { total: jobs.length });
});

/**
 * POST /employer/jobs
 * Create and publish a new vacancy
 */
router.post('/employer/jobs', (req, res) => {
  const employerId = req.headers['x-employer-id'] || 'emp-alx-africa';
  const employer = db.getEmployerById(employerId);

  const {
    title,
    industry,
    location,
    region,
    isRemote,
    workArrangement,
    employmentType,
    experienceLevel,
    salaryMin,
    salaryMax,
    currency,
    deadline,
    description,
    responsibilities,
    requirements,
    skills,
    languages,
    accommodations
  } = req.body;

  if (!title || !description || !deadline) {
    return jsonError(res, 400, "Title, description, and application deadline are required.");
  }

  const newJob = db.createJob({
    title,
    employerId,
    employerName: employer ? employer.name : "Registered Employer",
    verifiedEmployer: employer ? employer.verificationStatus === 'verified' : false,
    source: "native_employer",
    industry: industry || "Technology & Software",
    location: location || "Addis Ababa, Ethiopia",
    region: region || "Addis Ababa",
    isRemote: Boolean(isRemote),
    workArrangement: workArrangement || (isRemote ? "100% Remote" : "On-site"),
    employmentType: employmentType || "Full-time",
    experienceLevel: experienceLevel || "Mid-level",
    salaryMin: Number(salaryMin) || 0,
    salaryMax: Number(salaryMax) || 0,
    currency: currency || "ETB",
    salaryDisclosed: Boolean(salaryMin || salaryMax),
    deadline,
    description,
    responsibilities: responsibilities || [],
    requirements: requirements || [],
    skills: skills || [],
    languages: languages || ["English", "Amharic"],
    accommodations: accommodations || {
      screen_reader_ready: { status: "not_specified" },
      etsl_interpreter: { status: "not_specified" }
    },
    applicationMethod: "internal"
  });

  return res.status(201).json({
    success: true,
    data: newJob,
    meta: { message: "Job vacancy published successfully." }
  });
});

/**
 * GET /employer/jobs/:id/applications
 * View candidate inbox for a specific vacancy
 */
router.get('/employer/jobs/:id/applications', (req, res) => {
  const employerId = req.headers['x-employer-id'] || 'emp-alx-africa';
  const job = db.getJobById(req.params.id);

  if (!job) {
    return jsonError(res, 404, "Job vacancy not found.");
  }

  if (job.employerId !== employerId && employerId !== 'admin') {
    return jsonError(res, 403, "Access denied. You do not own this vacancy.");
  }

  const apps = db.getApplicationsByJob(req.params.id);
  return jsonSuccess(res, apps, { total: apps.length, jobTitle: job.title });
});

/**
 * PATCH /employer/applications/:id/status
 * Transition candidate status (reviewing -> shortlisted -> interview -> offer -> rejected)
 */
router.patch('/employer/applications/:id/status', (req, res) => {
  const { status, note, messageText } = req.body;
  const allowedStatuses = ['applied', 'reviewing', 'shortlisted', 'interview', 'offer', 'rejected', 'withdrawn'];

  if (!allowedStatuses.includes(status)) {
    return jsonError(res, 400, `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`);
  }

  const app = db.getApplicationById(req.params.id);
  if (!app) {
    return jsonError(res, 404, "Application not found.");
  }

  const timeline = app.timeline || [];
  timeline.push({
    status,
    date: new Date().toISOString(),
    note: note || `Status updated to ${status}`
  });

  const messages = app.messages || [];
  if (messageText) {
    messages.push({
      sender: "employer",
      senderName: "Hiring Manager",
      timestamp: new Date().toISOString(),
      text: messageText
    });
  }

  const updated = db.updateApplication(app.id, {
    status,
    timeline,
    messages
  });

  return jsonSuccess(res, updated, { message: `Candidate application transitioned to '${status}'.` });
});

// -------------------------------------------------------------
// 5. ADMINISTRATION, TRUST & COMPLIANCE
// -------------------------------------------------------------

/**
 * GET /admin/verification-queue
 */
router.get('/admin/verification-queue', (req, res) => {
  const employers = db.getAllEmployers();
  const pending = employers.filter(e => e.verificationStatus === 'pending');
  return jsonSuccess(res, pending, { count: pending.length });
});

/**
 * POST /admin/verify-employer/:id
 */
router.post('/admin/verify-employer/:id', (req, res) => {
  const { action } = req.body; // 'approve' | 'reject'
  const employer = db.getEmployerById(req.params.id);
  if (!employer) return jsonError(res, 404, "Employer not found.");

  const status = action === 'approve' ? 'verified' : 'rejected';
  const updated = db.updateEmployer(employer.id, {
    verificationStatus: status,
    verificationDate: new Date().toISOString(),
    verifiedBy: "LearnBridge Compliance Bureau"
  });

  return jsonSuccess(res, updated, { message: `Employer status set to '${status}'.` });
});

/**
 * GET /admin/reports
 */
router.get('/admin/reports', (req, res) => {
  const reports = db.getAllReports();
  return jsonSuccess(res, reports, { count: reports.length });
});

// -------------------------------------------------------------
// 6. EXTERNAL ADAPTERS & SYNC
// -------------------------------------------------------------

/**
 * GET /external/providers
 */
router.get('/external/providers', (req, res) => {
  const providers = externalJobManager.getRegisteredProviders();
  return jsonSuccess(res, providers);
});

/**
 * POST /external/sync
 */
router.post('/external/sync', async (req, res) => {
  try {
    const stats = await externalJobManager.syncAll();
    return jsonSuccess(res, stats, { message: "External feeds synchronized." });
  } catch (err) {
    return jsonError(res, 500, "Error synchronizing external feeds: " + err.message);
  }
});

// -------------------------------------------------------------
// 7. SIGN LANGUAGE RESOURCES & TAXONOMY
// -------------------------------------------------------------

/**
 * GET /sign-language/resources
 */
router.get('/sign-language/resources', (req, res) => {
  const resources = db.getSignLanguageResources();
  return jsonSuccess(res, resources, { count: resources.length });
});

/**
 * GET /taxonomy
 */
router.get('/taxonomy', (req, res) => {
  const taxonomy = db.getTaxonomy();
  return jsonSuccess(res, taxonomy);
});

// -------------------------------------------------------------
// 8. OPENAPI 3.0 SPECIFICATION
// -------------------------------------------------------------
router.get('/openapi.json', (req, res) => {
  const openapiPath = path.resolve(__dirname, 'openapi.json');
  if (fs.existsSync(openapiPath)) {
    return res.sendFile(openapiPath);
  }
  return jsonError(res, 404, "OpenAPI schema file not found.");
});

module.exports = router;
