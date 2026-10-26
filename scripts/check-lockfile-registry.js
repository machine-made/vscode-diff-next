'use strict';
// Fails when package-lock.json resolves any package from a registry other than
// the public npm registry. Run before `npm ci` so a mirror URL never reaches CI.
// Reads both lockfile layouts: `packages` (v2, v3) and the legacy
// `dependencies` tree (v1, and v2 for older npm).
const fs = require('fs');
const path = require('path');

const ALLOWED_PREFIX = 'https://registry.npmjs.org/';

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkEntry(label, entry, offenders) {
  if (isObject(entry) && typeof entry.resolved === 'string' && !entry.resolved.startsWith(ALLOWED_PREFIX)) {
    offenders.push(`${label}: ${entry.resolved}`);
  }
}

function walkLegacy(tree, trail, offenders) {
  for (const [name, entry] of Object.entries(tree)) {
    const label = `${trail}${name}`;
    checkEntry(label, entry, offenders);
    if (isObject(entry) && isObject(entry.dependencies)) {
      walkLegacy(entry.dependencies, `${label} > `, offenders);
    }
  }
}

// Returns { offenders }. Throws if the lockfile has neither layout.
function scanLockfile(lock) {
  const hasPackages = isObject(lock) && isObject(lock.packages);
  const hasLegacy = isObject(lock) && isObject(lock.dependencies);
  if (!hasPackages && !hasLegacy) {
    throw new Error('lockfile has neither a "packages" map nor a "dependencies" tree');
  }
  const offenders = [];
  if (hasPackages) {
    for (const [name, entry] of Object.entries(lock.packages)) {
      checkEntry(name || '(root)', entry, offenders);
    }
  }
  if (hasLegacy) {
    walkLegacy(lock.dependencies, '', offenders);
  }
  return { offenders };
}

module.exports = { scanLockfile, ALLOWED_PREFIX };

if (require.main === module) {
  const lockPath = path.join(__dirname, '..', 'package-lock.json');
  let result;
  try {
    result = scanLockfile(JSON.parse(fs.readFileSync(lockPath, 'utf8')));
  } catch (err) {
    console.error(`check-lockfile-registry: cannot read ${lockPath}: ${err.message}`);
    process.exit(1);
  }
  if (result.offenders.length > 0) {
    console.error(`package-lock.json resolves ${result.offenders.length} package(s) outside ${ALLOWED_PREFIX}:`);
    for (const line of result.offenders) console.error(`  ${line}`);
    console.error(`Fix: run "npm install --package-lock-only --registry=${ALLOWED_PREFIX}" and commit the lockfile.`);
    process.exit(1);
  }
  console.log('check-lockfile-registry OK');
}
