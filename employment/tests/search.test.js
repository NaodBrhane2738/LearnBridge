/**
 * LearnBridge Employment — Search & Filter Unit Tests
 */

const assert = require('assert');
const searchEngine = require('../services/searchEngine');
const recommendationsEngine = require('../services/recommendations');

function testSearch() {
  console.log('--- Running Search & Filter Tests ---');

  // Test 1: Baseline search returns active jobs
  const res1 = searchEngine.search();
  assert.ok(res1.total > 0, "Should return at least 1 job");
  assert.strictEqual(typeof res1.page, 'number');
  assert.ok(Array.isArray(res1.results));
  console.log('✓ Test 1: Baseline active jobs search passed.');

  // Test 2: Search by title / keyword
  const res2 = searchEngine.search({ q: 'Accessibility' });
  assert.ok(res2.total >= 1, "Should find Accessibility role");
  assert.ok(res2.results.some(j => j.title.includes('Accessibility')));
  console.log('✓ Test 2: Keyword search passed.');

  // Test 3: Search by Ethiopian location
  const res3 = searchEngine.search({ location: 'Addis Ababa' });
  assert.ok(res3.total >= 1, "Should find jobs in Addis Ababa");
  assert.ok(res3.results.every(j => (j.location + j.region).includes('Addis Ababa')));
  console.log('✓ Test 3: Ethiopian location filter passed.');

  // Test 4: Search by International Remote
  const res4 = searchEngine.search({ remoteType: 'remote' });
  assert.ok(res4.total >= 1, "Should find remote jobs");
  assert.ok(res4.results.every(j => j.isRemote === true));
  console.log('✓ Test 4: 100% Remote filter passed.');

  // Test 5: Search by employment type
  const res5 = searchEngine.search({ employmentType: 'Full-time' });
  assert.ok(res5.results.every(j => j.employmentType === 'Full-time'));
  console.log('✓ Test 5: Employment type filter passed.');

  // Test 6: Workplace accommodations filter (ETSL)
  const res6 = searchEngine.search({ accommodation: 'etsl_interpreter' });
  assert.ok(res6.total >= 1, "Should find ETSL supported jobs");
  assert.ok(res6.results.every(j => j.accommodations?.etsl_interpreter?.status === 'supported'));
  console.log('✓ Test 6: Workplace accommodation filter passed.');

  // Test 7: Verified employer only
  const res7 = searchEngine.search({ verifiedOnly: true });
  assert.ok(res7.results.every(j => j.verifiedEmployer === true));
  console.log('✓ Test 7: Verified employer filter passed.');

  // Test 8: Salary filtering
  const res8 = searchEngine.search({ salaryMin: 40000, currency: 'ETB' });
  assert.ok(res8.results.every(j => (j.salaryMax || j.salaryMin) >= 40000));
  console.log('✓ Test 8: Salary range filter passed.');

  // Test 9: Sorting by salary descending
  const res9 = searchEngine.search({ sortBy: 'salary_desc', currency: 'ETB' });
  for (let i = 0; i < res9.results.length - 1; i++) {
    const cur = res9.results[i].salaryMax || res9.results[i].salaryMin || 0;
    const next = res9.results[i + 1].salaryMax || res9.results[i + 1].salaryMin || 0;
    assert.ok(cur >= next, `Salaries should be descending: ${cur} >= ${next}`);
  }
  console.log('✓ Test 9: Salary sort descending passed.');

  // Test 10: Pagination
  const res10 = searchEngine.search({ page: 1, limit: 2 });
  assert.strictEqual(res10.results.length, 2);
  assert.strictEqual(res10.page, 1);
  assert.strictEqual(res10.limit, 2);
  console.log('✓ Test 10: Pagination passed.');

  // Test 11: No-result cases
  const res11 = searchEngine.search({ q: 'non_existent_astrophysics_quantum_role_9999' });
  assert.strictEqual(res11.total, 0);
  assert.strictEqual(res11.results.length, 0);
  console.log('✓ Test 11: No results edge case passed.');

  // Test 12: Explainable recommendations
  const recs = recommendationsEngine.getRecommendationsForCandidate('ethio-candidate-01');
  assert.ok(recs.length > 0, "Should generate recommendations");
  assert.ok(recs[0].matchScore >= 50);
  assert.ok(recs[0].explanation && recs[0].explanation.summary);
  console.log('✓ Test 12: Explainable recommendations passed.');
}

if (require.main === module) {
  testSearch();
}

module.exports = { testSearch };
