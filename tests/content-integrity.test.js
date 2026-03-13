const test = require('node:test');
const assert = require('node:assert/strict');

const { deriveMailtoUrl, validateContentIntegrity } = require('../admin/admin-logic.js');
const site = require('../content/site.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('content integrity passes for the checked-in site data', () => {
  const result = validateContentIntegrity(site);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('content integrity rejects placeholder email content', () => {
  const candidate = clone(site);
  candidate.meta.email = 'example@hotmail.com';
  candidate.contact.email = 'example@hotmail.com';
  candidate.home.ctaButtonUrl = deriveMailtoUrl(candidate.meta.email);
  candidate.services.ctaButtonUrl = deriveMailtoUrl(candidate.meta.email);

  const result = validateContentIntegrity(candidate);

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /placeholder\/demo content/);
});

test('content integrity rejects mismatched mailto fields', () => {
  const candidate = clone(site);
  candidate.home.ctaButtonUrl = 'mailto:someone-else@example.com';

  const result = validateContentIntegrity(candidate);

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /home\.ctaButtonUrl must match/);
});
