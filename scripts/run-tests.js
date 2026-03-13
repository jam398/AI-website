const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function collectTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }
    if (/\.test\.(c?js|mjs)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

const testDir = path.join(__dirname, '..', 'tests');
const testFiles = collectTestFiles(testDir);

if (testFiles.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
});

process.exit(result.status || 0);
