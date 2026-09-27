# Compatibility

## Reference upstream

The reference implementation is `fs-vacuum` 1.2.10. Differential tests install
that exact version as `fs-vacuum-upstream` and run each implementation against
an independent temporary fixture.

## Preserved public behavior

- CommonJS default export: `vacuum(directory, options, callback)`.
- Synchronous assertion failures for invalid directory, callback, and options.
- Synchronous callback for a base/leaf mismatch; filesystem results remain asynchronous.
- Files, empty directories, symlinks, missing paths, and recursive purge.
- Exclusive base boundary, exact `process.env.HOME` protection, and filesystem-root stopping.
- Benign ENOENT, ENOTEMPTY, and EEXIST race exits.
- Callback count, errors, logs, and final tree for Golden Master scenarios.

## Known quirks

- `vacuum(path, callback)` is not an overload and throws for the missing third argument.
- Falsy options become `{}`; an empty-string directory normally completes as missing.
- `leaf === base` is valid and leaves the base in place.
- HOME protection compares the resolved branch with the literal `HOME` value.
- Symlinks are removed without following their targets.

## Platform behavior

Path resolution and errors remain platform-native. Boundary checks preserve the
upstream separator-aware prefix rule and Windows-only case folding.

## Intentional differences

- `fs.rm({recursive: true, force: true})` replaces rimraf 2.x; undocumented glob behavior is not supported.
- Standard `node:fs` replaces graceful-fs; its process-wide EMFILE/ENFILE queue is not retained.
- Supported Node.js starts at 22.

See [ANALYSIS.md](ANALYSIS.md) for the full baseline and safety review.
