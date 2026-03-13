const test = require('node:test');
const assert = require('node:assert/strict');

const logic = require('../admin/admin-logic.js');
const site = require('../content/site.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('getLiveUrl handles project sites', () => {
  assert.equal(logic.getLiveUrl('jam398/AI-website'), 'https://jam398.github.io/AI-website/');
});

test('getLiveUrl handles user sites', () => {
  assert.equal(logic.getLiveUrl('jam398/jam398.github.io'), 'https://jam398.github.io/');
});

test('validateCandidateData allows unchanged valid site data', () => {
  const result = logic.validateCandidateData(site, clone(site));
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('validateCandidateData blocks protected email changes', () => {
  const candidate = clone(site);
  candidate.contact.email = 'different@example.com';

  const result = logic.validateCandidateData(site, candidate);

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Blocked protected field change: contact\.email/);
});

test('validateCandidateData blocks navigation changes', () => {
  const candidate = clone(site);
  candidate.nav.items[0].label = 'Start';

  const result = logic.validateCandidateData(site, candidate);

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Blocked protected field change: nav/);
});

test('getEnabledToolDefinitions removes deploy tool when Actions access is unavailable', () => {
  const enabled = logic.getEnabledToolDefinitions(
    [{ name: 'read_content' }, { name: 'check_deploy' }],
    { actionsReadable: false }
  );

  assert.deepEqual(enabled, [{ name: 'read_content' }]);
});
