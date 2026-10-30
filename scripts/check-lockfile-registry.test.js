'use strict';
// Self-test for check-lockfile-registry.js with one v1 and one v3 fixture.
const assert = require('assert');
const { scanLockfile } = require('./check-lockfile-registry');

const npmjs = 'https://registry.npmjs.org/a/-/a-1.0.0.tgz';
const mirror = 'https://registry.example.invalid/b/-/b-1.0.0.tgz';

// v1: only the legacy `dependencies` tree; the offender is nested.
const v1Clean = { lockfileVersion: 1, dependencies: { a: { resolved: npmjs, dependencies: { b: { resolved: npmjs } } } } };
const v1Dirty = { lockfileVersion: 1, dependencies: { a: { resolved: npmjs, dependencies: { b: { resolved: mirror } } } } };
assert.deepStrictEqual(scanLockfile(v1Clean).offenders, []);
assert.deepStrictEqual(scanLockfile(v1Dirty).offenders, [`a > b: ${mirror}`]);

// v3: only the `packages` map.
const v3Clean = { lockfileVersion: 3, packages: { '': { name: 'x' }, 'node_modules/a': { resolved: npmjs } } };
const v3Dirty = { lockfileVersion: 3, packages: { '': { name: 'x' }, 'node_modules/b': { resolved: mirror } } };
assert.deepStrictEqual(scanLockfile(v3Clean).offenders, []);
assert.deepStrictEqual(scanLockfile(v3Dirty).offenders, [`node_modules/b: ${mirror}`]);

// Neither layout: the check must fail, not pass on nothing.
assert.throws(() => scanLockfile({ lockfileVersion: 3 }), /neither/);
assert.throws(() => scanLockfile(null), /neither/);

console.log('check-lockfile-registry self-test OK');
