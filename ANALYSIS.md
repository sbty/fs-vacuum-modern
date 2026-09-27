# fs-vacuum 1.2.10 analysis

This analysis was written before changing `vacuum.js`. The reference is the
upstream `fs-vacuum` 1.2.10 CommonJS implementation (`e2daf9a`) and the existing
test suite. The dependency versions resolved by the checked-in lockfile are
`graceful-fs` 4.1.15, `path-is-inside` 1.0.2, and `rimraf` 2.6.3.

## Public API and arguments

The package exports one function:

```js
vacuum(directory, options, callback)
```

- `directory` must be a string. It may identify a file, directory, or symbolic
  link. A truthy value is converted to an absolute path with `path.resolve()`.
- `options` may be `null` or `undefined`; either becomes an empty object. Other
  falsy values also become an empty object. A truthy non-object is rejected.
- `options.base`, when truthy, is resolved to an absolute path. It is an
  exclusive stopping point: the base itself is never removed.
- `options.purge`, when truthy, selects recursive leaf removal through rimraf.
- `options.log`, when truthy, is called directly. Its type is not validated.
- `callback` must be a function. The supported signature does not include a
  two-argument `(directory, callback)` overload.

The first two validations use `assert()` synchronously, in this order:

1. `directory` is a string (`must pass in path to remove`).
2. `callback` is a function (`must pass in callback`).
3. after normalizing falsy options, `options` is an object
   (`options must be an object`).

Consequently, `vacuum(path, callback)` fails the callback assertion rather than
treating its second argument as the callback. An empty string passes the type
check and reaches asynchronous `lstat('')`, which normally produces ENOENT and
a successful callback.

## Callback and error semantics

- Assertion failures are synchronous `AssertionError`s.
- A base/leaf mismatch calls the callback synchronously with `Error`, before any
  filesystem request.
- Filesystem outcomes are delivered from filesystem callbacks. Success uses
  `callback(null)`.
- Initial `lstat` ENOENT, traversal `readdir` ENOENT, and race-time removal
  ENOENT are treated as successful completion.
- Initial non-ENOENT `lstat`, non-ENOENT `readdir`, and unexpected removal errors
  are returned unchanged.
- ENOTEMPTY and EEXIST while removing a branch are treated as a benign race and
  finish successfully.
- The implementation has no explicit once-guard, but each control-flow branch
  returns after calling the callback; the covered paths invoke it once.

## Filesystem operations

Operations come from `graceful-fs`: `lstat`, `readdir`, `rmdir`, and `unlink`.
They execute serially, one branch at a time.

- Directory, `purge: false`: inspect the leaf, then remove it and successive
  empty parents with `rmdir`.
- File, `purge: false`: unlink the file, then remove successive empty parents.
- Symlink, `purge: false`: `lstat` identifies the link, `unlink` removes only the
  link, and traversal continues at its real parent. The link target is not
  traversed.
- `purge: true`: rimraf removes the leaf recursively, then normal parent
  vacuuming resumes. Rimraf removes a symlink itself, not its target. A missing
  leaf is already accepted by the initial `lstat` path.
- Other filesystem object types are rejected with
  `<path> is not a directory, file, or link` after logging.

## Base boundary semantics

Both leaf and truthy base values are resolved before comparison. The current
`path-is-inside` implementation strips one trailing platform separator, folds
case only on Windows, and accepts the same path or a path beginning with
`base + path.sep`. It therefore rejects prefix collisions such as `root-other`
for base `root`. Relative paths, `.` and `..` inherit `path.resolve()` semantics.
Windows drive, separator, UNC, and case behavior follows the Windows `path`
implementation plus case folding in `path-is-inside`.

`leaf === base` is accepted. After asynchronous `lstat`, `next(base)` stops
without deleting the base. Filesystem root is also an exclusive stop because
`dirname(root) === root`.

## HOME protection

Before removing an empty branch, the implementation compares the resolved
branch using exact string equality with `process.env.HOME`. It does not consult
`os.homedir()` or `USERPROFILE`.

- An exact absolute HOME value is protected.
- Empty or undefined HOME values do not add protection.
- A relative HOME value does not match an absolute branch.
- A HOME value with a trailing separator may not match the normalized branch.
- Windows comparison is not case-folded for this guard.

These are observable legacy quirks. Tests must replace HOME only with a
temporary fixture or use a child process; the real home directory must never be
used as a deletion fixture.

## Race handling

The upstream tests inject races after `readdir` reports an empty directory:

- another actor creates an entry before `rmdir`;
- POSIX-like ENOTEMPTY is returned;
- Windows-like EEXIST is returned;
- another actor removes the entry first and ENOENT is returned.

All three outcomes terminate successfully without continuing above that branch.
This behavior prevents removal of unrelated newly-created entries and must be
preserved.

## Logging

The default logger is a no-op. Observable calls include:

- `purging`, leaf;
- `removing`, path;
- `finished vacuuming up to`, stop path;
- reasons for non-empty branches, HOME protection, races, and failures.

Log arguments and order are compatibility-sensitive because the README exposes
an npmlog-compatible callback.

## Dependencies and tests

Runtime dependencies before modernization: 3 (`graceful-fs`,
`path-is-inside`, `rimraf`). Existing development dependencies are `errno`,
`mkdirp`, `require-inject`, `standard`, `tap`, and `tmp`.

The twelve existing test files cover assertions, base mismatch, empty-directory
walking, file and symlink removal, purge, HOME protection, stopping at sibling
entries, and ENOENT/ENOTEMPTY/EEXIST races. They use old test and fixture
packages, global mutable state, and some Unix-specific path expectations. Their
behavioral intent must be retained while moving to `node:test`,
`node:assert/strict`, `fs.mkdtemp`, recursive `fs.mkdir`, and isolated fixtures.

## Modernization candidates and risks

1. Replace only `path-is-inside` with a small `path.relative()` predicate after
   differential coverage for equality, prefix collisions, relative paths,
   separators, Windows drives, UNC paths, and case handling.
2. Replace only rimraf with callback `fs.rm({ recursive: true, force: true })`
   after differential coverage for files, directories, symlinks, broken links,
   missing paths, special characters, and errors. `fs.rm` retry and glob
   behavior are possible differences.
3. Replace `graceful-fs` last. Standard `fs` has the required callback methods,
   but graceful-fs adds EMFILE/ENFILE queuing. Serial operation reduces exposure
   but does not prove equivalence under process-wide descriptor exhaustion.

Main compatibility risks are callback timing, exact assertion/error text,
Windows path and removal behavior, rimraf glob-era edge cases, graceful-fs
descriptor exhaustion behavior, and the intentionally literal HOME guard.

## Safety findings

The base/root/symlink/race protections are structurally sound for the covered
flows. The notable safety limitation is that HOME protection depends on a raw,
case-sensitive `process.env.HOME` string; a missing, relative, differently-cased,
or trailing-separator value can bypass it. Changing that silently would alter
observable behavior. The modernization should retain the behavior, document the
risk, and keep all destructive tests inside newly-created temporary directories.
