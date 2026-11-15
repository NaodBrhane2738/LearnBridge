/**
 * LearnBridge Employment — Master Automated Test Runner
 * Runs Search, CV Parser, and REST API Integration Suites.
 */

const { testSearch } = require('./search.test');
const { testCVParser } = require('./cv-parser.test');
const { testAPI } = require('./api.test');

async function runAll() {
  console.log('====================================================');
  console.log('LEARNBRIDGE EMPLOYMENT PLATFORM — AUTOMATED TEST RUNNER');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    testSearch();
    passed += 12;
  } catch (err) {
    console.error("❌ Search Test Failure:", err.message);
    failed++;
  }

  try {
    testCVParser();
    passed += 3;
  } catch (err) {
    console.error("❌ CV Parser Test Failure:", err.message);
    failed++;
  }

  try {
    await testAPI();
    passed += 20;
  } catch (err) {
    console.error("❌ API Test Failure:", err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED.`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All Employment test suites executed cleanly with exit code 0.');
    process.exit(0);
  }
}

runAll();
