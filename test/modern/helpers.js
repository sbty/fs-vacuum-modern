'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

async function fixture (name) {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), `fs-vacuum-${name}-`))
}

async function removeFixture (root) {
  await fs.promises.rm(root, {recursive: true, force: true})
}

function run (vacuum, leaf, options) {
  let sync = true
  return new Promise((resolve, reject) => {
    let count = 0
    try {
      vacuum(leaf, options, error => {
        count++
        setImmediate(() => resolve({
          count,
          sync,
          error: error && {name: error.name, message: error.message, code: error.code || null}
        }))
      })
    } catch (error) {
      reject(error)
    } finally {
      sync = false
    }
  })
}

async function tree (root) {
  const entries = []
  async function visit (current, relative) {
    let stat
    try {
      stat = await fs.promises.lstat(current)
    } catch (error) {
      if (error.code === 'ENOENT') return
      throw error
    }
    const type = stat.isSymbolicLink() ? 'link' : stat.isDirectory() ? 'dir' : 'file'
    entries.push(`${relative || '.'}:${type}`)
    if (!stat.isDirectory()) return
    const children = (await fs.promises.readdir(current)).sort()
    for (const child of children) await visit(path.join(current, child), path.join(relative, child))
  }
  await visit(root, '')
  return entries
}

async function observe (vacuum, setup) {
  const root = await fixture(setup.name)
  const base = path.join(root, 'base')
  const leaf = path.join(base, ...setup.leaf)
  const logs = []
  try {
    await fs.promises.mkdir(base, {recursive: true})
    await setup.create({root, base, leaf})
    const callback = await run(vacuum, leaf, {
      base,
      purge: setup.purge,
      log: (...args) => logs.push(args.map(String).join(' '))
    })
    const normalize = value => value.replaceAll(root, '<ROOT>').replaceAll(path.sep, '/')
    return {
      callback: {
        ...callback,
        error: callback.error && {...callback.error, message: normalize(callback.error.message)}
      },
      logs: logs.map(normalize),
      tree: (await tree(root)).map(normalize)
    }
  } finally {
    await removeFixture(root)
  }
}

const scenarios = [
  {name: 'missing', leaf: ['missing'], purge: false, create: async () => {}},
  {name: 'empty-directory', leaf: ['a', 'b'], purge: false,
    create: ({leaf}) => fs.promises.mkdir(leaf, {recursive: true})},
  {name: 'file', leaf: ['a', 'file.txt'], purge: false, create: async ({leaf}) => {
    await fs.promises.mkdir(path.dirname(leaf), {recursive: true})
    await fs.promises.writeFile(leaf, 'data')
  }},
  {name: 'file-purge', leaf: ['a', 'file.txt'], purge: true, create: async ({leaf}) => {
    await fs.promises.mkdir(path.dirname(leaf), {recursive: true})
    await fs.promises.writeFile(leaf, 'data')
  }},
  {name: 'purge-directory', leaf: ['a', 'remove'], purge: true, create: async ({leaf}) => {
    await fs.promises.mkdir(path.join(leaf, 'nested'), {recursive: true})
    await fs.promises.writeFile(path.join(leaf, 'nested', '[file].txt'), 'data')
  }},
  {name: 'sibling-stops-walk', leaf: ['a', 'remove'], purge: false, create: async ({base, leaf}) => {
    await fs.promises.mkdir(leaf, {recursive: true})
    await fs.promises.writeFile(path.join(path.dirname(leaf), 'keep.txt'), 'keep')
  }},
  {name: 'symlink-no-purge', leaf: ['a', 'link'], purge: false, create: async ({root, leaf}) => {
    const target = path.join(root, 'target')
    await fs.promises.mkdir(path.dirname(leaf), {recursive: true})
    await fs.promises.mkdir(target)
    await fs.promises.writeFile(path.join(target, 'keep.txt'), 'keep')
    await fs.promises.symlink(target, leaf, process.platform === 'win32' ? 'junction' : 'dir')
  }},
  {name: 'symlink-purge', leaf: ['a', 'link'], purge: true, create: async ({root, leaf}) => {
    const target = path.join(root, 'target')
    await fs.promises.mkdir(path.dirname(leaf), {recursive: true})
    await fs.promises.mkdir(target)
    await fs.promises.writeFile(path.join(target, 'keep.txt'), 'keep')
    await fs.promises.symlink(target, leaf, process.platform === 'win32' ? 'junction' : 'dir')
  }},
  {name: 'broken-symlink', leaf: ['a', 'link'], purge: false, create: async ({root, leaf}) => {
    const target = path.join(root, 'target')
    await fs.promises.mkdir(path.dirname(leaf), {recursive: true})
    await fs.promises.mkdir(target)
    await fs.promises.symlink(target, leaf, process.platform === 'win32' ? 'junction' : 'dir')
    await fs.promises.rmdir(target)
  }}
]

module.exports = {fixture, observe, removeFixture, run, scenarios, tree}
