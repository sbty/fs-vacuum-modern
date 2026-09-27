import vacuum = require('../..')

vacuum('/tmp/leaf', undefined, error => {
  const result: Error | null = error
  void result
})

vacuum('/tmp/leaf', {
  base: '/tmp',
  purge: true,
  log: (...args: unknown[]) => void args
}, error => void error)

// @ts-expect-error The upstream runtime has no two-argument overload.
vacuum('/tmp/leaf', () => {})

// @ts-expect-error Options must not be a string.
vacuum('/tmp/leaf', 'invalid', () => {})
