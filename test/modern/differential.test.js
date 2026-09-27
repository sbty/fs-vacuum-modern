'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')

const modern = require('../../vacuum.js')
const upstream = require('fs-vacuum-upstream')
const {observe, scenarios} = require('./helpers.js')

for (const scenario of scenarios) {
  test(`differential: ${scenario.name}`, async () => {
    const [upstreamResult, modernResult] = await Promise.all([
      observe(upstream, {...scenario, name: `upstream-${scenario.name}`}),
      observe(modern, {...scenario, name: `modern-${scenario.name}`})
    ])
    assert.deepEqual(modernResult, upstreamResult)
  })
}
