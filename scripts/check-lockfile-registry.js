'use strict';
// Fails when package-lock.json resolves any package from a registry other than
// the public npm registry. Run before `npm ci` so a mirror URL never reaches CI.
const fs = require('fs');
const path = require('path');

const ALLOWED_PREFIX = 'https://registry.npmjs.org/';
const lockPath = path.join(__dirname, '..', 'package-lock.json');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

const bad = [];
for (const [name, entry] of Object.entries(lock.packages ?? {})) {
  const resolved = entry.resolved;
  if (typeof resolved === 'string' && !resolved.startsWith(ALLOWED_PREFIX)) {
    bad.push(`${name || '(root)'}: ${resolved}`);
  }
}

if (bad.length > 0) {
  console.error(`package-lock.json resolves ${bad.length} package(s) outside ${ALLOWED_PREFIX}:`);
  for (const line of bad) console.error(`  ${line}`);
  console.error(`Fix: run "npm install --package-lock-only --registry=${ALLOWED_PREFIX}" and commit the lockfile.`);
  process.exit(1);
}
console.log(`check-lockfile-registry OK (${Object.keys(lock.packages ?? {}).length} entries)`);
