import fs from 'node:fs';

const REQUIRED_PRIMITIVES = ['::focus', '::panel', '::table', '::evidence_drawer', '::next_actions'];
const CANONICAL_QUESTIONS = [
  'What is happening?',
  'What should I care about right now?',
  'What do I need to decide?',
  'Why should I trust this?',
  'What should I do next?',
];

function validateMarkdown(markdown) {
  const findings = [];
  
  // Primitives
  for (const primitive of REQUIRED_PRIMITIVES) {
    if (!markdown.includes(primitive)) {
      findings.push({
        finding_type: 'ux_contract_violation',
        violation_type: 'missing_required_primitives',
        severity: 'block',
        expected: [primitive],
      });
    }
  }

  // Canonical questions
  for (const question of CANONICAL_QUESTIONS) {
    if (!markdown.toLowerCase().includes(question.toLowerCase())) {
      findings.push({
        finding_type: 'ux_contract_violation',
        violation_type: 'missing_canonical_questions',
        severity: 'block',
        expected: [question],
      });
    }
  }

  // Ensure decision actions exist
  const actions = ['approve', 'revise', 'reject'];
  for (const action of actions) {
    if (!markdown.toLowerCase().includes(action)) {
      findings.push({
        finding_type: 'ux_contract_violation',
        violation_type: 'missing_decision_action',
        severity: 'block',
        expected: [action],
      });
    }
  }

  return findings;
}

try {
  const fixture = fs.readFileSync('./docs/approval-review-fixture.md', 'utf8');
  console.log('Validating Approval Review Fixture against UX Gate rules...');
  const findings = validateMarkdown(fixture);

  if (findings.length === 0) {
    console.log('✅ Fixture PASSES the UX Gate!');
  } else {
    console.log('❌ Fixture FAILS the UX Gate:');
    console.log(JSON.stringify(findings, null, 2));
    process.exit(1);
  }
} catch (e) {
  console.error('Failed to read fixture:', e.message);
  process.exit(1);
}
