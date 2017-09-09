/* jshint node: true, asi: true, laxcomma: true, esversion: 6 */
/* global test */
'use strict'

import hub from './socks.js'

test('config opts set', () => {
    const h = new hub({
        url: 'url',
        backoff: 0,
        factor: 200,
        max: 2000,
        subscribePath: 'path to sub'
    })

    expect(h.url).toBe('url')
    expect(h.backoff).toBe(0)
    expect(h.factor).toBe(200)
    expect(h.max).toBe(2000)
    expect(h.subscribePath).toBe('path to sub')
})
