var assert = require('node:assert')
var fs = require('node:fs')
var path = require('node:path')
var dirname = path.dirname
var resolve = path.resolve

var lstat = fs.lstat
var readdir = fs.readdir
var rm = fs.rm
var rmdir = fs.rmdir
var unlink = fs.unlink

module.exports = vacuum

// Preserve path-is-inside 1.x semantics: the same path is allowed, prefix
// collisions are rejected, and Windows paths are compared case-insensitively.
function isInside (child, parent) {
  child = stripTrailingSeparator(child)
  parent = stripTrailingSeparator(parent)
  if (process.platform === 'win32') {
    child = child.toLowerCase()
    parent = parent.toLowerCase()
  }
  return child.lastIndexOf(parent, 0) === 0 &&
    (child[parent.length] === path.sep || child[parent.length] === undefined)
}

// path-is-inside ignored one trailing platform separator before comparison.
function stripTrailingSeparator (value) {
  return value[value.length - 1] === path.sep ? value.slice(0, -1) : value
}

/**
 * Remove a leaf and then empty parent directories, stopping before base/root.
 * Validation and callbacks intentionally retain fs-vacuum 1.2.10 timing.
 *
 * @param {string} leaf file, directory, or symlink to remove
 * @param {object|null|undefined} options legacy base, purge, and log options
 * @param {function(Error|null): void} cb completion callback
 * @returns {void}
 */
function vacuum (leaf, options, cb) {
  assert(typeof leaf === 'string', 'must pass in path to remove')
  assert(typeof cb === 'function', 'must pass in callback')

  if (!options) options = {}
  assert(typeof options === 'object', 'options must be an object')

  var log = options.log ? options.log : function () {}

  leaf = leaf && resolve(leaf)
  var base = options.base && resolve(options.base)
  if (base && !isInside(leaf, base)) {
    return cb(new Error(leaf + ' is not a child of ' + base))
  }

  lstat(leaf, function (error, stat) {
    if (error) {
      if (error.code === 'ENOENT') return cb(null)

      log(error.stack)
      return cb(error)
    }

    if (!(stat && (stat.isDirectory() || stat.isSymbolicLink() || stat.isFile()))) {
      log(leaf, 'is not a directory, file, or link')
      return cb(new Error(leaf + ' is not a directory, file, or link'))
    }

    if (options.purge) {
      log('purging', leaf)
      rm(leaf, {recursive: true, force: true}, function (error) {
        if (error) return cb(error)

        next(dirname(leaf))
      })
    } else if (!stat.isDirectory()) {
      log('removing', leaf)
      unlink(leaf, function (error) {
        if (error) return cb(error)

        next(dirname(leaf))
      })
    } else {
      next(leaf)
    }
  })

  // Walk upward one branch at a time. Rechecking immediately before removal
  // keeps newly-created entries safe and treats lost races as successful exits.
  function next (branch) {
    branch = branch && resolve(branch)
    // either we've reached the base or we've reached the root
    if ((base && branch === base) || branch === dirname(branch)) {
      log('finished vacuuming up to', branch)
      return cb(null)
    }

    readdir(branch, function (error, files) {
      if (error) {
        if (error.code === 'ENOENT') return cb(null)

        log('unable to check directory', branch, 'due to', error.message)
        return cb(error)
      }

      if (files.length > 0) {
        log('quitting because other entries in', branch)
        return cb(null)
      }

      if (branch === process.env.HOME) {
        log('quitting because cannot remove home directory', branch)
        return cb(null)
      }

      log('removing', branch)
      lstat(branch, function (error, stat) {
        if (error) {
          if (error.code === 'ENOENT') return cb(null)

          log('unable to lstat', branch, 'due to', error.message)
          return cb(error)
        }

        var remove = stat.isDirectory() ? rmdir : unlink
        remove(branch, function (error) {
          if (error) {
            if (error.code === 'ENOENT') {
              log('quitting because lost the race to remove', branch)
              return cb(null)
            }
            if (error.code === 'ENOTEMPTY' || error.code === 'EEXIST') {
              log('quitting because new (racy) entries in', branch)
              return cb(null)
            }

            log('unable to remove', branch, 'due to', error.message)
            return cb(error)
          }

          next(dirname(branch))
        })
      })
    })
  }
}
