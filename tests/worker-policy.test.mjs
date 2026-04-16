import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../tools/mcp-remote/src/index.js';
import {
  getLiveUrlForRepo,
  getToolCredentialError,
  getWorkerAuthFailure,
} from '../tools/mcp-remote/src/policy.js';

function encodeSiteData(siteData) {
  return Buffer.from(`${JSON.stringify(siteData, null, 2)}\n`, 'utf8').toString('base64');
}

async function withMockFetch(handlers, fn) {
  const originalFetch = globalThis.fetch;
  let index = 0;

  globalThis.fetch = async (input, init = {}) => {
    const handler = handlers[index++];
    if (!handler) {
      throw new Error(`Unexpected fetch call ${index}: ${String(input)}`);
    }
    return handler(input, init, index);
  };

  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

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

test('propose_content_update returns a validated proposal payload', async () => {
  const currentSite = {
    meta: {
      siteTitle: 'JM AI Consulting',
      siteDescription: 'Desc',
      consultant: 'Jose Martinez',
      email: 'jose@jm-ai.com',
    },
    nav: { items: [{ label: 'Home', url: '/' }] },
    home: { headline: 'Old headline', ctaButtonUrl: 'mailto:jose@jm-ai.com' },
    about: { pageTitle: 'About' },
    services: { ctaButtonUrl: 'mailto:jose@jm-ai.com' },
    contact: { email: 'jose@jm-ai.com' },
    footer: { text: 'Footer' },
  };
  const candidateSite = {
    ...currentSite,
    home: { ...currentSite.home, headline: 'New headline' },
  };

  await withMockFetch([
    () => new Response(JSON.stringify({ content: encodeSiteData(currentSite), sha: 'sha-current' }), { status: 200 }),
    () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(candidateSite) } }],
    }), { status: 200 }),
  ], async () => {
    const response = await worker.fetch(
      new Request('https://worker.example/api/tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Auth': 'secret',
          'X-GitHub-Token': 'gh-token',
          'X-OpenAI-Key': 'sk-token',
        },
        body: JSON.stringify({
          name: 'propose_content_update',
          arguments: { instruction: 'Rewrite the home headline' },
        }),
      }),
      { WORKER_SHARED_SECRET: 'secret' }
    );
    const body = await response.json();
    const payload = JSON.parse(body.result);

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.status, 'proposal_ready');
    assert.equal(payload.base_site_sha, 'sha-current');
    assert.equal(payload.candidate_site_data.home.headline, 'New headline');
    assert.ok(Array.isArray(payload.changed_paths));
    assert.ok(payload.changed_paths.includes('home.headline'));
    assert.match(payload.proposal_hash, /^[a-f0-9]{64}$/);
  });
});

test('publish_content_update rejects proposal hash mismatches', async () => {
  const currentSite = {
    meta: {
      siteTitle: 'JM AI Consulting',
      siteDescription: 'Desc',
      consultant: 'Jose Martinez',
      email: 'jose@jm-ai.com',
    },
    nav: { items: [{ label: 'Home', url: '/' }] },
    home: { headline: 'Old headline', ctaButtonUrl: 'mailto:jose@jm-ai.com' },
    about: { pageTitle: 'About' },
    services: { ctaButtonUrl: 'mailto:jose@jm-ai.com' },
    contact: { email: 'jose@jm-ai.com' },
    footer: { text: 'Footer' },
  };
  const candidateSite = {
    ...currentSite,
    home: { ...currentSite.home, headline: 'New headline' },
  };

  await withMockFetch([
    () => new Response(JSON.stringify({ content: encodeSiteData(currentSite), sha: 'sha-current' }), { status: 200 }),
  ], async () => {
    const response = await worker.fetch(
      new Request('https://worker.example/api/tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Auth': 'secret',
          'X-GitHub-Token': 'gh-token',
        },
        body: JSON.stringify({
          name: 'publish_content_update',
          arguments: {
            site_data: candidateSite,
            proposal_hash: 'wrong-hash',
          },
        }),
      }),
      { WORKER_SHARED_SECRET: 'secret' }
    );
    const body = await response.json();
    const payload = JSON.parse(body.result);

    assert.equal(response.status, 200);
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 'proposal_hash_mismatch');
  });
});

test('propose_content_update blocks protected field changes', async () => {
  const currentSite = {
    meta: {
      siteTitle: 'JM AI Consulting',
      siteDescription: 'Desc',
      consultant: 'Jose Martinez',
      email: 'jose@jm-ai.com',
    },
    nav: { items: [{ label: 'Home', url: '/' }] },
    home: { headline: 'Old headline', ctaButtonUrl: 'mailto:jose@jm-ai.com' },
    about: { pageTitle: 'About' },
    services: { ctaButtonUrl: 'mailto:jose@jm-ai.com' },
    contact: { email: 'jose@jm-ai.com' },
    footer: { text: 'Footer' },
  };
  const candidateSite = {
    ...currentSite,
    meta: { ...currentSite.meta, email: 'intruder@jm-ai.com' },
    contact: { email: 'intruder@jm-ai.com' },
    home: { ...currentSite.home, ctaButtonUrl: 'mailto:intruder@jm-ai.com' },
    services: { ...currentSite.services, ctaButtonUrl: 'mailto:intruder@jm-ai.com' },
  };

  await withMockFetch([
    () => new Response(JSON.stringify({ content: encodeSiteData(currentSite), sha: 'sha-current' }), { status: 200 }),
    () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(candidateSite) } }],
    }), { status: 200 }),
  ], async () => {
    const response = await worker.fetch(
      new Request('https://worker.example/api/tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Auth': 'secret',
          'X-GitHub-Token': 'gh-token',
          'X-OpenAI-Key': 'sk-token',
        },
        body: JSON.stringify({
          name: 'propose_content_update',
          arguments: { instruction: 'Change the contact email' },
        }),
      }),
      { WORKER_SHARED_SECRET: 'secret' }
    );
    const body = await response.json();
    const payload = JSON.parse(body.result);

    assert.equal(response.status, 200);
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 'validation_failed');
    assert.ok(payload.blocked_paths.includes('meta.email'));
    assert.match(payload.validation_errors.join('\n'), /Blocked protected field change: meta\.email/);
  });
});
