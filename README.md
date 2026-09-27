# fs-vacuum-modern

`fs-vacuum-modern` is a compatibility-focused maintained fork of
[`fs-vacuum` 1.2.10](https://www.npmjs.com/package/fs-vacuum).

It keeps the CommonJS module and callback API, supports current Node.js
releases, and has no runtime dependencies. It is not a rewrite and does not
claim compatibility beyond the behavior covered by this repository's tests.

## Usage

```js
const vacuum = require('fs-vacuum-modern')

const options = {
  base: '/path/to/my/tree/root',
  purge: true,
  log: (...args) => console.debug(...args)
}

vacuum('/path/to/my/tree/root/out/to/my/files', options, error => {
  if (error) console.error('Unable to cleanly vacuum:', error.message)
})
```

## API

### `vacuum(directory, options, callback)`

- `directory` `{String}` — leaf directory, file, or symlink to remove.
- `options` `{Object|null|undefined}`
  - `base` `{String}` — nothing at or above this path is removed.
  - `purge` `{Boolean}` — recursively remove a non-empty leaf first.
  - `log` `{Function}` — receives legacy npmlog-compatible argument lists.
- `callback` `{Function}` — Node-style callback receiving `error` or `null`.

The legacy two-argument form `vacuum(directory, callback)` is intentionally not
supported. See [COMPATIBILITY.md](COMPATIBILITY.md) for preserved quirks.

## npm alias migration

Existing code may keep `require('fs-vacuum')` by installing this package under
the old dependency name:

```json
{
  "dependencies": {
    "fs-vacuum": "npm:fs-vacuum-modern@^1.2.10"
  }
}
```

Verify the resolved dependency tree and run the application's tests after the
change.

## Support

Node.js 22, 24, and 26 are exercised in CI across Ubuntu, Windows, and macOS.
The package remains CommonJS and includes TypeScript declarations for the
existing callback API.

Licensed under ISC. Original copyright and author attribution are retained.
