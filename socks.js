/* jshint browser: true, asi: true, laxcomma: true, esversion: 6 */
/* globals console */

'use strict'

import uuid from 'uuid'

// brought this in as a vue at first so I could do events based on the the subs
// and requests
function hub (opts) {
    // {
    //  chan: [sub, sub, sub] <- each sub func expects the message payload from the socket message
    // }
    this.subscriptions = {}

    // {
    //  reqId: (resp) => {}
    // }
    this.requests = {}

    if (!opts.url) throw new Error('Hub: no url passed for socket connection. Ejecting.')

    this.url = opts.url

    // incremental backoff params
    this.backoff = opts.backoff || 0
    this.factor = opts.factor || 200
    this.max = opts.max || 2000

    this.sock = null
    this.sockOpen = false

    if (!opts.subscribePath) console.warn('Hub: no `subscribePath` option set, using default `/api/join`')

    this.subscribePath = opts.subscribePath || '/api/join'

    this._bufferedMessages = []
}

hub.prototype.makeSocket = function makeSocket () {
    try {
        this.sock = new WebSocket(this.url)

    } catch (e) {
        console.warn(e)
        console.warn('attempting to establish connection again')

        setTimeout(() => {
            // allegedly not actually recursive (does not grow infinistack)
            this.makeSocket(this.url)
        }, 500)
    }

    this.sock.write = this.write.bind(this) // hrmmmm

    if (this._bufferedMessages.length) {
        // these have alread been serialized
        let data

        while ((data = this._bufferedMessages.pop())) {
            this.sock.write(data)
        }
    }

    this.sock.onopen = () => {
        console.info('socket open')
    }

    this.sock.onclose = (ev) => {
        console.info('socket close event', ev)
    }

    this.sock.onerror = (ev) => {
        console.error('socket error event', ev)
    }

    this.sock.onmessage = this.handle
}

// context of .write method bound to instance of hub forcibly with .bind call
hub.prototype.write = function write (data) {
    let msg

    // the flow of making a connection needs to be audited
    // this sort of check is required in too many places
    if (!this.sock) {
        this.makeSocket(this.url)
    }

    if (this.sock.readyState === this.sock.OPEN) {
        try {
            msg = JSON.stringify(data)
        } catch (e) {
            // TODO error hub thing
            throw e
        }

        this.backoff = 0
        this.sock.send(msg)

    } else if (this.sock.readyState === this.sock.CONNECTING) {
        console.warn('socket still connecting, retry in a tick')

        setTimeout(() => {
            this.sock.write(data)
        }, 100)

    } else {
        console.warn(`socket disconnected, retry in a bit: ${this.backoff}`)

        this._bufferedMessages.unshift(data)

        this.sock = null

        setTimeout(() => {
            this.backoff = this.backoff + 1 * this.factor
            this.backoff = this.backoff <= this.max ? this.backoff : this.max

            this.makeSocket(this.url)
        }, this.backoff)
    }
}

hub.prototype.handle = function handle (ev) {
    let data = this.read(ev)

    if (data.requestId) {
        data.pending = false

        let handler = this.requests[data.requestId]

        if (handler) {
            handler(data)
            delete this.requests[data.requestId]
        } else {
            console.warn(`pipeline:orphaned_response - no handler`, data)
        }

    } else if (data.channel) {
        let subs = this.subscriptions[data.channel] // [func, func, func]

        if (subs) {
            subs.forEach(sub => sub(data))
        }
    }
}

/**
 * Returns a promise that rejects if there's a .error prop on the response
 * or resolves otherwise.
 */
hub.prototype.request = function request (req) {
    req.requestId = uuid.v1()
    req.pending = true

    let promise = new Promise(function (resolve, reject) {
        // register a callback that will recieve the response data from the
        // request and finish the promise with it
        this.requests[req.requestId] = function (response) {
            if (response.error) reject(response)
            else resolve(response)
        }
    })

    if (this.sock)
        this.sock.write(req)
    else {
        this.makeSocket()
        this.sock.write(req)
    }

    return promise
}

/**
 * this is still callback based. use streams?
 */
hub.prototype.subscribe = function subscribe (channel, topic, cb) {
    // arg snip
    if (typeof topic === 'function') {
        cb = topic
        topic = null
    }

    if (this.sock) {
        this.sock.write({
            path: this.subscribePath,
            body: { channel }
        })
    } else {
        this.makeSocket()
        this.sock.write({
            path: this.subscribePath,
            body: { channel }
        })
    }

    this.subscriptions[channel] = this.subscriptions[channel] || []

    let subs = this.subscriptions[channel]

    if (subs.indexOf(cb) === -1)
        subs.push(cb)
}

// TODO finer grained unsub control? unsub from topic, not from whole channel?
hub.prototype.unsubscribe = function unsubscribe (channel, cb) {
    this.sock.write({
        path: this.subscribePath,
        body: { channel }
    })

    if (!cb) {
        console.error('pipeline:$unsubscribe - method requires reference to original callback as second arg')
        return
    }

    let subs = this.subscriptions[channel]

    let index = subs.indexOf(cb)

    if (index !== -1)
        subs.splice(index, 1)
    else {
        console.error('pipeline:$unsubscribe - subscription callback not found in channel')
    }

    if (subs.length === 0) {
        delete this.subscriptions[channel]
    }
}

hub.prototype.read = function read (msg) {
    try {
        let data = JSON.parse(msg.data)
        return data
    } catch (e) {
        // TODO error hub thing
        throw e
    }
}

export default hub
