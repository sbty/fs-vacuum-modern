# Publish checklist

The package name `fs-vacuum-modern` was not present in the npm registry when
checked on 2026-09-28. Availability is not reserved until publication.

## Before push

- [ ] Review `git diff` and confirm the intentional compatibility differences.
- [ ] Decide whether `1.2.10` is the desired initial fork version.
- [ ] Accept the two high-severity audit findings in the dev-only upstream
  reference dependency; runtime dependencies have no known audit findings.
- [ ] Run `npm ci`, `npm test`, and `npm pack --dry-run`.
- [ ] Commit the reviewed files.

## After push

- [ ] Confirm GitHub Actions passes Ubuntu on Node 22, 24, and 26.
- [ ] Confirm GitHub Actions passes Windows and macOS on Node 24.
- [ ] Confirm repository About, homepage, and issue URLs use
  `sbty/fs-vacuum-modern`.

## Before npm publish

- [ ] Run `npm whoami` and confirm the intended npm account.
- [ ] Run `npm publish --dry-run` and review every packed file.
- [ ] Confirm `name`, `version`, `author`, `contributors`, `license`, `main`,
  `types`, and `engines` in `package.json`.
- [ ] Confirm no tarball, coverage output, debug log, or temporary fixture is
  tracked.
- [ ] Publish manually; do not create a tag or release until installation is
  verified.

## After npm publish

- [ ] Install `fs-vacuum-modern` in a fresh project and run one vacuum operation.
- [ ] Install `fs-vacuum@npm:fs-vacuum-modern@^1.2.10` in a fresh project.
- [ ] Confirm `require('fs-vacuum')` resolves to the modern package.
- [ ] Inspect `npm ls` and rerun the consuming application's tests.
- [ ] Create the Git tag and GitHub Release only after those checks succeed.
