/**
 * LearnBridge Employment — CV Parser Unit Tests
 */

const assert = require('assert');
const cvParser = require('../services/cvParser');

function testCVParser() {
  console.log('--- Running CV Parser & Intelligence Tests ---');

  const sampleCV = `
    Curriculum Vitae
    Amanuel Haile
    Email: amanuel.haile@example.et
    Phone: +251 91 234 5678
    Location: Addis Ababa, Ethiopia

    Professional Summary:
    Frontend engineer passionate about accessible web interfaces and WCAG standards.

    Skills:
    React, TypeScript, WCAG 2.2, HTML/ARIA Semantics, Python, Git

    Experience:
    Frontend Developer at Addis Tech PLC - 2023 to Present
    Web Developer Intern at Green Ethiopia - 2022 to 2023

    Education:
    B.Sc in Software Engineering, Addis Ababa University, 2022
  `;

  // Test 1: Parse normal CV text
  const res1 = cvParser.parseCV(sampleCV, { fileName: "Amanuel_CV.pdf", size: 102400 });
  assert.strictEqual(res1.status, "draft_extracted");
  assert.strictEqual(res1.extractedData.email, "amanuel.haile@example.et");
  assert.strictEqual(res1.extractedData.phone, "+251 91 234 5678");
  assert.ok(res1.extractedData.fullName.includes("Amanuel Haile"));
  assert.ok(res1.extractedData.skills.includes("WCAG 2.2"));
  assert.ok(res1.extractedData.skills.includes("React"));
  assert.strictEqual(res1.reviewRequired, true);
  assert.strictEqual(res1.humanConfirmed, false);
  console.log('✓ Test 1: Full CV field extraction passed.');

  // Test 2: File size limit check
  assert.throws(() => {
    cvParser.parseCV("dummy", { size: 10 * 1024 * 1024 });
  }, /exceeds 5MB/);
  console.log('✓ Test 2: File size limit enforcement passed.');

  // Test 3: Empty content check
  assert.throws(() => {
    cvParser.parseCV("   ");
  }, /no readable text/);
  console.log('✓ Test 3: Empty document handling passed.');
}

if (require.main === module) {
  testCVParser();
}

module.exports = { testCVParser };
