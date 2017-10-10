/* jshint browser: true, asi: true, laxcomma: true, esversion: 6 */
/* globals console */

'use strict'

import uuid from 'uuid'

// brought this in as a vue at first so I could do events based on the the subs
// and requests

/**
 * hub constructor, sets up config for backoff, WebSocket creation,
 * internal message buffer, does some light sanity checking.
 *
 * @param {Object} opts
 * @param {!string} opts.url - Server endpoint hosting websocket
 * @param {string} [opts.subscribePath='/api/join'] - Server side message endpoint that
 * services channel subscriptions.
 * @param {number} [opts.factor=200] - Backoff step factor ("to be increased by")
 * @param {number} [opts.max=2000] - Ceiling for backoff wait time
 */
function hub (opts) {
        // {
        //  chan: [sub, sub, sub] <- each sub func expects the message payload from the socket message
        // }

        /*
         * @private
         */
        this.subscriptions = {}

        // {
        //  reqId: (resp) => {}
        // }
        /* @private */
        this.requests = {}

        if (!opts.url) throw new Error('Hub: no url passed for socket connection. Ejecting.')

        this.url = opts.url

        /* @private */
        this.backoff = 0

        /* @private */
        this.factor = opts.factor || 200
        /* @private */
        this.max = opts.max || 2000

        this.sock = null
        /* @private */
        this.sockOpen = false

        if (!opts.subscribePath) console.warn('hub::constructor::no `subscribePath` option set, using default `/api/join`')

        this.subscribePath = opts.subscribePath || '/api/join'

        this._bufferedMessages = []
}

// TODO make this "private"

/**
 * Create a new websocket and hold the ref to it internally. Also
 * decorates the new `WebSocket` with a `write` method to serialized outgoing
 * messages.
*/
hub.prototype = {
  makeSocket () {
    try {
      this.sock = new WebSocket(this.url)

    } catch (e) {
      console.warn(e)
      console.warn('hub::makeSocket::attempting to establish connection again')

      setTimeout(() => {
        // not actually recursive (does not grow infinistack)
        this.makeSocket(this.url)
      }, 500)
    }

    this.sock.write     = this.write.bind(this)   // hrmmmm
    this.sock.onmessage = this.handle.bind(this) // not a fan of all this binding
                                                // what could i do to achieve
    if (this._bufferedMessages.length) {       // a functional refactor?
      let data                                // and would it be of benefit?

      // these have already been serialized
      while ((data = this._bufferedMessages.pop())) {
        this.sock.write(data)
      }
    }

    this.sock.onopen = () => {
      console.info('hub::sock_onopen::socket open')
    }

    this.sock.onclose = (ev) => {
      console.info('hub::sock_onclose::socket close event', ev)
    }

    this.sock.onerror = (ev) => {
      console.error('hub::sock_onerror::error', ev)
    }
  },

  /**
   * Serialize and write data to WebSocket. Given to the WebSocket instance but
   * bound to the Hub instance.
   *
   * @param {any} data - serializeable object to be sent across socket
   */
  write (data) {
    let msg

    // the flow of making a connection needs to be audited
    // this sort of check is required in too many places
    if (!this.sock) {
      // doesn't race since we immediately check
      this.makeSocket(this.url)
    }

    if (this.sock.readyState === this.sock.OPEN) {
      try {
        msg = JSON.stringify(data)
      } catch (e) {
        // TODO o ruin, o death
        throw e
      }

      // we did it!
      this.backoff = 0
      this.sock.send(msg)

    } else if (this.sock.readyState === this.sock.CONNECTING) {
      console.info('hub::write::socket still connecting, retry in a tick')

      setTimeout(() => {
        // gotta hand it to myself
        this.sock.write(data)
      }, 500) // should these be constants?

    // open, connecting, or two others that are basically what we don't want
    } else {
      console.info(`hub::write::socket disconnected, retry in ${this.backoff}ms`)

      this._bufferedMessages.unshift(data)

      this.sock = null

      setTimeout(() => {
        this.backoff = this.backoff + 1 * this.factor
        this.backoff = this.backoff <= this.max ? this.backoff : this.max

        this.makeSocket(this.url)
      }, this.backoff)
    }
  },

  /**
   * @private
   */
  handle (ev) {
    let data = this.read(ev)

    if (data.requestId) {
      data.pending = false

      let handler = this.requests[data.requestId]

      if (handler) {
        handler(data)
        delete this.requests[data.requestId]
      } else {
        console.warn(`hub::orphaned_response`, data)
      }

    } else if (data.channel) {
      let subs = this.subscriptions[data.channel] // [func, func, func]

      if (subs) {
        subs.forEach(sub => sub(data))
      }
    }
  },

  /**
   * Write a message to the server expecting a response to come back keyed
   * with the same `requestId` as aformentioned write.
   *
   * @param {object} req - Request object to be written to WebSocket. Will be
   * deocorated with `uuid.v1` and `pending = true`.
   *
   * @return {Promise} Rejects if `error` property present on payload from
   * server, resolves otherwise.
   */
  request (req) {
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
  },

  /**
   * @callback subscribeCallback
   * @param {object} msgData - message coming from server
   */

  /**
   * Initiate write to WebSocket to communicate interest in subscribing to
   * messages across a given channel. Pass `subscribePath` as option to
   * constructor to configure "endpoint" used to initiate subscription on server.
   *
   * @param {string} channel - Name of channel, to be send on `body.channel`
   * property of outgoing message.
   *
   * @param {string} topic - Optional topic in channel, could be used as a sort of
   * subcategory of interest.
   *
   * @param {subscribeCallback} cb - Callback to be invoked on each message written to
   * channel by server.
   */
  subscribe (channel, topic, cb) {
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
  },

  // TODO finer grained unsub control? unsub from topic, not from whole channel?

  /**
   * Send message to server indicating desire to unsubscribe from given
   * channel.
   *
   * @param {string} channel - Name of channel to unsub from.
   *
   * @param {function} cb - Reference to the callback originally passed on
   * subscription creation.
   */
  unsubscribe (channel, cb) {
    this.sock.write({
      path: this.subscribePath,
      body: { channel }
    })

    if (!cb) {
      console.error('hub::unsubscribe::method requires reference to original callback as second arg')
      return
    }

    let subs = this.subscriptions[channel]

    let index = subs.indexOf(cb)

    if (index !== -1)
      subs.splice(index, 1)
    else {
      console.error('hub::unsubscribe::subscription callback not found in channel')
    }

    if (subs.length === 0) {
      delete this.subscriptions[channel]
    }
  },

  /**
   * @private
  */
  read (msg) {
    try {
      let data = JSON.parse(msg.data)
      return data
    } catch (e) {
      // TODO error hub thing
      throw e
    }
  }
}

export default hub
