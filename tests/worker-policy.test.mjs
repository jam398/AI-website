import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../tools/mcp-remote/src/index.js';
import {
  getLiveUrlForRepo,
  getToolCredentialError,
  getWorkerAuthFailure,
} from '../tools/mcp-remote/src/policy.js';

test('worker policy resolves GitHub Pages URLs correctly', () => {
  assert.equal(getLiveUrlForRepo('jam398/AI-website'), 'https://jam398.github.io/AI-website/');
  assert.equal(getLiveUrlForRepo('jam398/jam398.github.io'), 'https://jam398.github.io/');
});

test('worker policy requires auth for deployed hosts and allows localhost without a secret', () => {
  assert.deepEqual(
    getWorkerAuthFailure({ hostname: 'localhost', expectedSecret: '', providedSecret: '' }),
    null
  );
  assert.deepEqual(
    getWorkerAuthFailure({ hostname: 'worker.example', expectedSecret: '', providedSecret: '' }),
    {
      status: 500,
      error: 'Worker auth is not configured. Set WORKER_SHARED_SECRET before deploying this worker.',
    }
  );
  assert.deepEqual(
    getWorkerAuthFailure({ hostname: 'worker.example', expectedSecret: 'secret', providedSecret: 'wrong' }),
    { status: 401, error: 'Missing or invalid worker auth.' }
  );
});

test('worker policy returns credential-specific errors', () => {
  assert.match(getToolCredentialError('check_deploy', { githubToken: '', openaiKey: '' }), /Actions: read/);
  assert.match(getToolCredentialError('transcribe_audio', { githubToken: '', openaiKey: '' }), /OpenAI API key/);
  assert.equal(getToolCredentialError('lighthouse_audit', { githubToken: '', openaiKey: '' }), null);
});

test('health endpoint remains public', async () => {
  const response = await worker.fetch(new Request('https://worker.example/health'), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
});

test('REST endpoint rejects missing worker auth in production', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/api/tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'list_pages', arguments: {} }),
    }),
    { WORKER_SHARED_SECRET: 'secret' }
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.match(body.error, /Missing or invalid worker auth/);
});

test('REST endpoint returns 403 when downstream credentials are missing', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/api/tool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Worker-Auth': 'secret',
      },
      body: JSON.stringify({ name: 'check_deploy', arguments: {} }),
    }),
    { WORKER_SHARED_SECRET: 'secret' }
  );
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.match(body.error, /Actions: read permission/);
});

test('REST endpoint allows localhost without worker auth secret configuration', async () => {
  const response = await worker.fetch(
    new Request('http://localhost/api/tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'unknown_tool', arguments: {} }),
    }),
    {}
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.match(body.error, /Unknown tool/);
});
