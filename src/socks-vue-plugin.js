/* jshint node: true, asi: true, laxcomma: true, esversion: 6 */
'use strict'

import Hub from './socks.js'

const $socks = {
    install (Vue, opts) {
        let url = opts.url

        const hub = new Hub({ url })

        Vue.$hub = hub
        Vue.prototype.$hub = hub
    }
}

export default $socks
