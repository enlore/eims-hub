/* jshint node: true, asi: true, laxcomma: true, esversion: 6 */
'use strict'

import hub from './socks.js'

const $socks = {
    install (Vue, opts) {
        let url = opts.url

        const {request, subscribe, unsubscribe} = hub({ url })

        Vue.$request = request
        Vue.$subscribe = subscribe
        Vue.$unsubscribe = unsubscribe

        Vue.prototype.$request = request
        Vue.prototype.$subscribe = subscribe
        Vue.prototype.$unsubscribe = unsubscribe
    }
}

export default $socks
