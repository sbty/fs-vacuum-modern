# Modernization

## Production changes

- Replaced `path-is-inside` with its separator-aware boundary comparison using `node:path`.
- Replaced rimraf 2.x purge with callback `fs.rm()` using `recursive` and `force`.
- Replaced graceful-fs operations with matching callback APIs from `node:fs`.

Each dependency was changed separately and followed by Golden Master and
Differential tests. Runtime dependencies changed from three to zero.

## Test and CI changes

The legacy test files remain as upstream history. Their intent is covered by a
`node:test` suite using built-ins, normalized Golden Master observations,
independent differential fixtures, and deterministic race injection. CI runs
Node 22, 24, and 26 on Ubuntu, plus Node 24 on Windows and macOS.
The CommonJS declaration is compiled under TypeScript 7.0 in strict/no-emit
mode, including negative checks for unsupported overloads.

## Deliberately unchanged

- The callback API was not converted to promises or async functions.
- The package remains CommonJS with `vacuum.js` as its main entry point.
- No `exports` field was added, preserving legacy subpath access.
- Assertion order, callback timing, logs, HOME comparison, and race exits remain.
- The upstream author and ISC notice remain intact.

## Safety decisions

Tests use only fresh OS temporary directories. Symlink targets, base boundaries,
HOME protection, and ENOENT/ENOTEMPTY/EEXIST race exits are covered. The literal
HOME comparison is retained for compatibility and documented as a risk.
