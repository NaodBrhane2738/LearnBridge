/**
 * LearnBridge Employment — Comprehensive Supertest API Suite
 */

const assert = require('assert');
const request = require('supertest');
const app = require('../server');

async function testAPI() {
  console.log('--- Running Employment REST API Integration Tests ---');

  const db = require('../services/db');
  // Ensure idempotent clean state for candidate 02 & job 004
  const existingApp = db.getAllApplications().find(a => a.candidateId === 'ethio-candidate-02' && a.jobId === 'job-eth-004');
  if (existingApp) db.deleteApplication(existingApp.id);

  // 1. GET /api/v1/employment/jobs
  const res1 = await request(app).get('/api/v1/employment/jobs');
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.body.success, true);
  assert.ok(Array.isArray(res1.body.data));
  assert.ok(res1.body.meta.total > 0);
  console.log('✓ 1. GET /api/v1/employment/jobs returns vacancies list.');

  // 2. GET /api/v1/employment/jobs/:id
  const res2 = await request(app).get('/api/v1/employment/jobs/job-eth-001');
  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res2.body.data.id, 'job-eth-001');
  assert.ok(res2.body.data.title.includes('Accessibility QA'));
  console.log('✓ 2. GET /api/v1/employment/jobs/:id returns vacancy details.');

  // 3. GET /api/v1/employment/jobs/:id (404)
  const res3 = await request(app).get('/api/v1/employment/jobs/non-existent-999');
  assert.strictEqual(res3.status, 404);
  assert.strictEqual(res3.body.success, false);
  console.log('✓ 3. GET /api/v1/employment/jobs/:id returns 404 for missing vacancy.');

  // 4. GET /api/v1/employment/jobs/recommendations
  const res4 = await request(app).get('/api/v1/employment/jobs/recommendations?candidateId=ethio-candidate-01');
  assert.strictEqual(res4.status, 200);
  assert.ok(Array.isArray(res4.body.data));
  assert.ok(res4.body.data[0].matchScore >= 50);
  assert.ok(res4.body.data[0].explanation);
  console.log('✓ 4. GET /api/v1/employment/jobs/recommendations returns explainable matches.');

  // 5. GET /api/v1/employment/jobs/:id/audio-summary
  const res5 = await request(app).get('/api/v1/employment/jobs/job-eth-001/audio-summary');
  assert.strictEqual(res5.status, 200);
  assert.ok(res5.body.data.audioText.length > 20);
  console.log('✓ 5. GET /api/v1/employment/jobs/:id/audio-summary returns spoken summary.');

  // 6. POST /api/v1/employment/jobs/:id/report
  const res6 = await request(app)
    .post('/api/v1/employment/jobs/job-eth-001/report')
    .send({ reason: 'misleading_salary', details: 'Audit check' });
  assert.strictEqual(res6.status, 200);
  assert.strictEqual(res6.body.success, true);
  console.log('✓ 6. POST /api/v1/employment/jobs/:id/report registers report.');

  // 7. GET /api/v1/employment/candidate/me
  const res7 = await request(app)
    .get('/api/v1/employment/candidate/me')
    .set('x-candidate-id', 'ethio-candidate-01');
  assert.strictEqual(res7.status, 200);
  assert.strictEqual(res7.body.data.id, 'ethio-candidate-01');
  assert.ok(res7.body.data.skills.includes('WCAG 2.2'));
  console.log('✓ 7. GET /api/v1/employment/candidate/me returns candidate profile.');

  // 8. PATCH /api/v1/employment/candidate/me
  const res8 = await request(app)
    .patch('/api/v1/employment/candidate/me')
    .set('x-candidate-id', 'ethio-candidate-01')
    .send({ location: 'Addis Ababa (Bole Sub-City)' });
  assert.strictEqual(res8.status, 200);
  assert.strictEqual(res8.body.data.location, 'Addis Ababa (Bole Sub-City)');
  console.log('✓ 8. PATCH /api/v1/employment/candidate/me updates profile fields.');

  // 9. POST /api/v1/employment/candidate/me/parse-cv
  const res9 = await request(app)
    .post('/api/v1/employment/candidate/me/parse-cv')
    .send({ cvText: 'Abebe Bikila\nEmail: abebe@olympics.et\nPhone: +251 91 100 2000\nSkills: Python, Git' });
  assert.strictEqual(res9.status, 200);
  assert.strictEqual(res9.body.data.status, 'draft_extracted');
  assert.strictEqual(res9.body.data.reviewRequired, true);
  console.log('✓ 9. POST /api/v1/employment/candidate/me/parse-cv parses CV without saving.');

  // 10. Saved Jobs Lifecycle (GET -> POST -> DELETE)
  const res10a = await request(app)
    .post('/api/v1/employment/candidate/me/saved-jobs')
    .set('x-candidate-id', 'ethio-candidate-01')
    .send({ jobId: 'job-eth-002' });
  assert.strictEqual(res10a.status, 200);

  const res10b = await request(app)
    .get('/api/v1/employment/candidate/me/saved-jobs')
    .set('x-candidate-id', 'ethio-candidate-01');
  assert.strictEqual(res10b.status, 200);
  assert.ok(res10b.body.data.some(j => j.id === 'job-eth-002'));

  const res10c = await request(app)
    .delete('/api/v1/employment/candidate/me/saved-jobs/job-eth-002')
    .set('x-candidate-id', 'ethio-candidate-01');
  assert.strictEqual(res10c.status, 200);
  console.log('✓ 10. Candidate saved jobs lifecycle (add, list, remove) passed.');

  // 11. Applications: GET applications list
  const res11 = await request(app)
    .get('/api/v1/employment/applications')
    .set('x-candidate-id', 'ethio-candidate-01');
  assert.strictEqual(res11.status, 200);
  assert.ok(Array.isArray(res11.body.data));
  console.log('✓ 11. GET /api/v1/employment/applications returns applications list.');

  // 12. Applications: POST new application
  const res12 = await request(app)
    .post('/api/v1/employment/applications')
    .set('x-candidate-id', 'ethio-candidate-02')
    .send({
      jobId: 'job-eth-004',
      coverNote: 'Excited about inclusive banking in Ethiopia.',
      shareAccommodations: true
    });
  assert.strictEqual(res12.status, 201);
  assert.strictEqual(res12.body.data.status, 'applied');
  console.log('✓ 12. POST /api/v1/employment/applications submits application.');

  // 13. Applications: Duplicate submission protection
  const res13 = await request(app)
    .post('/api/v1/employment/applications')
    .set('x-candidate-id', 'ethio-candidate-02')
    .send({ jobId: 'job-eth-004' });
  assert.strictEqual(res13.status, 409);
  console.log('✓ 13. Duplicate application submission prevented with HTTP 409.');

  // Cleanup test application so test is idempotent
  db.deleteApplication(res12.body.data.id);

  // 14. Employer: Register employer
  const res14 = await request(app)
    .post('/api/v1/employment/employer/register')
    .send({
      companyName: 'Bole Innovative Tech',
      registrationNumber: 'ET-TECH-2026-9901',
      contactEmail: 'hr@boletech.et',
      location: 'Addis Ababa'
    });
  assert.strictEqual(res14.status, 201);
  assert.strictEqual(res14.body.data.verificationStatus, 'pending');
  console.log('✓ 14. POST /api/v1/employment/employer/register creates pending employer.');

  // 15. Employer: Post Vacancy
  const res15 = await request(app)
    .post('/api/v1/employment/employer/jobs')
    .set('x-employer-id', 'emp-alx-africa')
    .send({
      title: 'Junior Cloud Infrastructure Specialist',
      industry: 'Technology & Software',
      location: 'Addis Ababa, Ethiopia',
      deadline: '2026-12-31',
      description: 'Assist in cloud deployments.'
    });
  assert.strictEqual(res15.status, 201);
  assert.strictEqual(res15.body.data.title, 'Junior Cloud Infrastructure Specialist');
  console.log('✓ 15. POST /api/v1/employment/employer/jobs publishes vacancy.');

  // 16. Employer ATS: Status Transition
  const res16 = await request(app)
    .patch('/api/v1/employment/employer/applications/app-001/status')
    .set('x-employer-id', 'emp-alx-africa')
    .send({ status: 'interview', note: 'Technical interview confirmed.' });
  assert.strictEqual(res16.status, 200);
  assert.strictEqual(res16.body.data.status, 'interview');
  console.log('✓ 16. PATCH /api/v1/employment/employer/applications/:id/status transitions pipeline.');

  // 17. Admin: Verification queue & approve
  const res17a = await request(app).get('/api/v1/employment/admin/verification-queue');
  assert.strictEqual(res17a.status, 200);

  const res17b = await request(app)
    .post('/api/v1/employment/admin/verify-employer/emp-ethio-fintech-startup')
    .send({ action: 'approve' });
  assert.strictEqual(res17b.status, 200);
  assert.strictEqual(res17b.body.data.verificationStatus, 'verified');
  console.log('✓ 17. Admin verification queue & employer vetting passed.');

  // 18. External Feeds: Providers & Sync
  const res18a = await request(app).get('/api/v1/employment/external/providers');
  assert.strictEqual(res18a.status, 200);
  assert.ok(res18a.body.data.length >= 1);

  const res18b = await request(app).post('/api/v1/employment/external/sync');
  assert.strictEqual(res18b.status, 200);
  assert.strictEqual(typeof res18b.body.data.importedCount, 'number');
  console.log('✓ 18. External feed synchronization and deduplication passed.');

  // 19. Sign Language Resources
  const res19 = await request(app).get('/api/v1/employment/sign-language/resources');
  assert.strictEqual(res19.status, 200);
  assert.ok(res19.body.data.length >= 3);
  assert.strictEqual(res19.body.data[0].languageIdentifier, 'ETSL-ADDIS');
  console.log('✓ 19. GET /api/v1/employment/sign-language/resources returns verified ETSL assets.');

  // 20. Taxonomy
  const res20 = await request(app).get('/api/v1/employment/taxonomy');
  assert.strictEqual(res20.status, 200);
  assert.ok(res20.body.data.employmentTypes.length >= 10);
  assert.ok(res20.body.data.accommodations.length >= 6);
  console.log('✓ 20. GET /api/v1/employment/taxonomy returns complete taxonomy.');

  console.log('--- All 20 API Integration Tests Passed! ---');
}

if (require.main === module) {
  testAPI().catch(err => {
    console.error("Test failure:", err);
    process.exit(1);
  });
}

module.exports = { testAPI };
