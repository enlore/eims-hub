/* jshint node: true, asi: true, laxcomma: true, esversion: 6 */
/* global test */
'use strict'

import hub from '../socks.js'

describe('hub construction', function () {
    const h = new hub({
        url: 'ws://url',
        backoff: 0,
        factor: 200,
        max: 2000,
        subscribePath: 'path to sub'
    })

    it('config opts are set by constructor', function () {
        expect(h.url).toEqual('ws://url')
        expect(h.backoff).toEqual(0)
        expect(h.factor).toEqual(200)
        expect(h.max).toEqual(2000)
        expect(h.subscribePath).toEqual('path to sub')
    })

    it('makeSocket creates a WebSocket and sets it on .sock', function () {
        h.makeSocket()
        expect(h.sock).toBeDefined()
        expect(h.sock).toBeTruthy()
    })
})

describe('hub errors', function () {
    it('constructor throws if no url passed', function () {
        expect(function () {
            let h = new hub({})
        }).toThrowError(/no url passed/)
    })
})
