const fs = require('node:fs');
const path = require('node:path');
const { validateContentIntegrity } = require('../admin/admin-logic.js');

const sitePath = path.join(__dirname, '..', 'content', 'site.json');
const siteData = JSON.parse(fs.readFileSync(sitePath, 'utf8'));
const result = validateContentIntegrity(siteData);

if (!result.ok) {
  console.error('Content integrity check failed:');
  for (const error of result.errors) {
    console.error('- ' + error);
  }
  process.exit(1);
}

console.log('Content integrity check passed.');
