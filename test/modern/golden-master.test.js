'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const vacuum = require('../../vacuum.js')
const {fixture, observe, removeFixture, run, scenarios} = require('./helpers.js')
const golden = require('../fixtures/golden-master.json')

test('argument validation preserves synchronous assertions', () => {
  assert.throws(() => vacuum(), /must pass in path to remove/)
  assert.throws(() => vacuum(null), /must pass in path to remove/)
  assert.throws(() => vacuum(123, {}, () => {}), /must pass in path to remove/)
  assert.throws(() => vacuum('path', () => {}), /must pass in callback/)
  assert.throws(() => vacuum('path', {}, null), /must pass in callback/)
  assert.throws(() => vacuum('path', 'invalid', () => {}), /options must be an object/)
})

test('null and undefined options are accepted; empty string completes asynchronously', async () => {
  const root = await fixture('arguments')
  try {
    assert.equal((await run(vacuum, path.join(root, 'missing-null'), null)).error, null)
    assert.equal((await run(vacuum, path.join(root, 'missing-undefined'), undefined)).error, null)
    const empty = await run(vacuum, '', {})
    assert.equal(empty.error, null)
    assert.equal(empty.sync, false)
  } finally {
    await removeFixture(root)
  }
})

test('base mismatch callback is synchronous and prefix collisions are outside', () => {
  const root = path.resolve('base-boundary')
  let called = false
  vacuum(`${root}-other`, {base: root}, error => {
    called = true
    assert.equal(error.message, `${root}-other is not a child of ${root}`)
  })
  assert.equal(called, true)
})

test('leaf equal to base is preserved', async () => {
  const root = await fixture('base-equality')
  try {
    const base = path.join(root, 'base')
    await fs.promises.mkdir(base)
    const result = await run(vacuum, base, {base})
    assert.equal(result.error, null)
    assert.equal(result.sync, false)
    assert.equal((await fs.promises.stat(base)).isDirectory(), true)
  } finally {
    await removeFixture(root)
  }
})

for (const scenario of scenarios) {
  test(`golden master: ${scenario.name}`, async () => {
    const result = await observe(vacuum, scenario)
    assert.deepEqual(result, golden[scenario.name])
  })
}

test('exact temporary HOME is not removed', async () => {
  const root = await fixture('home')
  const originalHome = process.env.HOME
  try {
    const base = path.join(root, 'base')
    const home = path.join(base, 'home')
    await fs.promises.mkdir(home, {recursive: true})
    process.env.HOME = home
    const logs = []
    const result = await run(vacuum, home, {base, log: (...args) => logs.push(args.join(' '))})
    assert.equal(result.error, null)
    assert.equal((await fs.promises.stat(home)).isDirectory(), true)
    assert.equal(logs[0], `quitting because cannot remove home directory ${home}`)
  } finally {
    if (originalHome === undefined) delete process.env.HOME
    else process.env.HOME = originalHome
    await removeFixture(root)
  }
})
