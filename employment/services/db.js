/**
 * LearnBridge Employment — Isolated Data Store Service
 * Provides atomic in-memory caching and JSON file-backed persistence.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data');

class EmploymentDB {
  constructor() {
    this.jobs = [];
    this.employers = [];
    this.candidates = [];
    this.applications = [];
    this.signLanguageResources = [];
    this.taxonomy = {};
    this.reports = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    this.jobs = this._loadJSON('jobs.json', []);
    this.employers = this._loadJSON('employers.json', []);
    this.candidates = this._loadJSON('candidates.json', []);
    this.applications = this._loadJSON('applications.json', []);
    this.signLanguageResources = this._loadJSON('sign-language-resources.json', []);
    this.taxonomy = this._loadJSON('taxonomy.json', {});
    this.reports = this._loadJSON('reports.json', [
      {
        id: "rep-001",
        jobId: "job-ext-010",
        reportedBy: "candidate-audit-team",
        reason: "expired_listing",
        details: "Deadline passed on October 31, 2026. Automated flag confirmed.",
        status: "resolved",
        createdAt: "2026-11-01T08:00:00.000Z"
      }
    ]);

    this.initialized = true;
  }

  _loadJSON(filename, fallback) {
    try {
      const filePath = path.join(DATA_DIR, filename);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`[EmploymentDB] Warning loading ${filename}:`, err.message);
    }
    return fallback;
  }

  _saveJSON(filename, data) {
    try {
      const filePath = path.join(DATA_DIR, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[EmploymentDB] Error writing ${filename}:`, err.message);
    }
  }

  // Jobs
  getAllJobs() {
    this.init();
    return this.jobs;
  }

  getJobById(id) {
    this.init();
    return this.jobs.find(j => j.id === id) || null;
  }

  createJob(jobData) {
    this.init();
    const newJob = {
      id: jobData.id || `job-emp-${Date.now()}`,
      postedAt: new Date().toISOString(),
      isExpired: false,
      ...jobData
    };
    this.jobs.unshift(newJob);
    this._saveJSON('jobs.json', this.jobs);
    return newJob;
  }

  updateJob(id, updates) {
    this.init();
    const idx = this.jobs.findIndex(j => j.id === id);
    if (idx === -1) return null;
    this.jobs[idx] = { ...this.jobs[idx], ...updates, updatedAt: new Date().toISOString() };
    this._saveJSON('jobs.json', this.jobs);
    return this.jobs[idx];
  }

  // Employers
  getAllEmployers() {
    this.init();
    return this.employers;
  }

  getEmployerById(id) {
    this.init();
    return this.employers.find(e => e.id === id) || null;
  }

  createEmployer(employerData) {
    this.init();
    const newEmp = {
      id: employerData.id || `emp-${Date.now()}`,
      verificationStatus: 'pending',
      createdAt: new Date().toISOString(),
      ...employerData
    };
    this.employers.push(newEmp);
    this._saveJSON('employers.json', this.employers);
    return newEmp;
  }

  updateEmployer(id, updates) {
    this.init();
    const idx = this.employers.findIndex(e => e.id === id);
    if (idx === -1) return null;
    this.employers[idx] = { ...this.employers[idx], ...updates, updatedAt: new Date().toISOString() };
    this._saveJSON('employers.json', this.employers);
    return this.employers[idx];
  }

  // Candidates
  getCandidateById(id) {
    this.init();
    return this.candidates.find(c => c.id === id || c.userId === id) || null;
  }

  updateCandidate(id, updates) {
    this.init();
    const idx = this.candidates.findIndex(c => c.id === id || c.userId === id);
    if (idx === -1) return null;
    this.candidates[idx] = { ...this.candidates[idx], ...updates, updatedAt: new Date().toISOString() };
    this._saveJSON('candidates.json', this.candidates);
    return this.candidates[idx];
  }

  // Applications
  getAllApplications() {
    this.init();
    return this.applications;
  }

  getApplicationById(id) {
    this.init();
    return this.applications.find(a => a.id === id) || null;
  }

  getApplicationsByCandidate(candidateId) {
    this.init();
    return this.applications.filter(a => a.candidateId === candidateId);
  }

  getApplicationsByJob(jobId) {
    this.init();
    return this.applications.filter(a => a.jobId === jobId);
  }

  createApplication(appData) {
    this.init();
    const newApp = {
      id: appData.id || `app-${Date.now()}`,
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'applied',
      timeline: [
        { status: 'applied', date: new Date().toISOString(), note: 'Application submitted successfully.' }
      ],
      messages: [],
      ...appData
    };
    this.applications.unshift(newApp);
    this._saveJSON('applications.json', this.applications);
    return newApp;
  }

  updateApplication(id, updates) {
    this.init();
    const idx = this.applications.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.applications[idx] = { ...this.applications[idx], ...updates, updatedAt: new Date().toISOString() };
    this._saveJSON('applications.json', this.applications);
    return this.applications[idx];
  }

  deleteApplication(id) {
    this.init();
    this.applications = this.applications.filter(a => a.id !== id);
    this._saveJSON('applications.json', this.applications);
    return true;
  }

  // Reports
  getAllReports() {
    this.init();
    return this.reports;
  }

  createReport(reportData) {
    this.init();
    const newReport = {
      id: `rep-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...reportData
    };
    this.reports.unshift(newReport);
    this._saveJSON('reports.json', this.reports);
    return newReport;
  }

  // Sign Language Resources
  getSignLanguageResources() {
    this.init();
    return this.signLanguageResources;
  }

  // Taxonomy
  getTaxonomy() {
    this.init();
    return this.taxonomy;
  }
}

const db = new EmploymentDB();
module.exports = db;
