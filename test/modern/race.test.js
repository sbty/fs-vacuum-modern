'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const {fixture, removeFixture, run} = require('./helpers.js')
const vacuumPath = require.resolve('../../vacuum.js')

function loadWithFs (overrides) {
  const originals = {}
  for (const [name, replacement] of Object.entries(overrides)) {
    originals[name] = fs[name]
    fs[name] = replacement(originals[name])
  }
  delete require.cache[vacuumPath]
  try {
    return require(vacuumPath)
  } finally {
    for (const [name, original] of Object.entries(originals)) fs[name] = original
    delete require.cache[vacuumPath]
  }
}

for (const code of ['ENOTEMPTY', 'EEXIST', 'ENOENT']) {
  test(`race-time ${code} ends successfully`, async () => {
    const root = await fixture(`race-${code}`)
    const base = path.join(root, 'base')
    const branch = path.join(base, 'branch')
    const leaf = path.join(branch, 'leaf.txt')
    const originalReaddir = fs.readdir
    const originalRmdir = fs.rmdir
    let injected = false
    try {
      await fs.promises.mkdir(branch, {recursive: true})
      await fs.promises.writeFile(leaf, 'data')
      const vacuum = loadWithFs({
        readdir: () => (directory, callback) => originalReaddir(directory, (error, files) => {
          if (!error && directory === branch && files.length === 0) {
            injected = true
            if (code !== 'ENOENT') fs.writeFileSync(path.join(branch, 'racer.txt'), 'race')
          }
          callback(error, files)
        }),
        rmdir: () => (directory, callback) => {
          if (directory === branch && code === 'ENOENT') fs.rmdirSync(branch)
          originalRmdir(directory, error => {
            if (error && directory === branch && code === 'EEXIST') error.code = 'EEXIST'
            callback(error)
          })
        }
      })
      const logs = []
      const result = await run(vacuum, leaf, {base, log: (...args) => logs.push(args.join(' '))})
      assert.equal(injected, true)
      assert.equal(result.error, null)
      assert.equal(result.count, 1)
      if (code === 'ENOENT') assert.match(logs.at(-1), /lost the race/)
      else assert.match(logs.at(-1), /new \(racy\) entries/)
    } finally {
      await removeFixture(root)
    }
  })
}
