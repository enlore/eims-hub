# Hub

> hoob

Here's a simple client side websocket utililty tool. Create a websocket, audo
de/serialize messages across the sockect, auto reconnect with stepped backoff,
manage pub/sub style subscribtions to channels on a corresponding server.

~~Uses [`eims-rest-contract`] to standardize read/write message payloads and assist
in some bookeeping involing message ids, timestamps, and the like.~~lies

## Tests

Gargabe. Tried using Karma to test in like, _every friggin browser man it's
awesome_ and it kinda worked. Worth circling back on.

Might work up a suite and mock the WebSocket, but that may be more beneficial
as practice as anything.

[`eims-rest-contract`]: (https://github.com/enlore/eims-rest-contract)

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### hub

hub constructor, sets up config for backoff, WebSocket creation,
internal message buffer, does some light sanity checking.

**Parameters**

-   `opts` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
    -   `opts.url` **![string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Server endpoint hosting websocket
    -   `opts.subscribePath` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Server side message endpoint that
        services channel subscriptions. (optional, default `'/api/join'`)
    -   `opts.factor` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** Backoff step factor ("to be increased by") (optional, default `200`)
    -   `opts.max` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** Ceiling for backoff wait time (optional, default `2000`)

#### write

Serialize and write data to WebSocket. Given to the WebSocket instance but
bound to the Hub instance.

**Parameters**

-   `data` **any** serializeable object to be sent across socket

#### request

Write a message to the server expecting a response to come back keyed
with the same `requestId` as aformentioned write.

**Parameters**

-   `req` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** Request object to be written to WebSocket. Will be
    deocorated with `uuid.v1` and `pending = true`.

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** Rejects if `error` property present on payload from
server, resolves otherwise.

#### subscribe

Initiate write to WebSocket to communicate interest in subscribing to
messages across a given channel. Pass `subscribePath` as option to
constructor to configure "endpoint" used to initiate subscription on server.

**Parameters**

-   `channel` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Name of channel, to be send on `body.channel`
    property of outgoing message.
-   `topic` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Optional topic in channel, could be used as a sort of
    subcategory of interest.
-   `cb` **[subscribeCallback](#subscribecallback)** Callback to be invoked on each message written to
    channel by server.

#### unsubscribe

Send message to server indicating desire to unsubscribe from given
channel.

**Parameters**

-   `channel` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Name of channel to unsub from.
-   `cb` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** Reference to the callback originally passed on
    subscription creation.

#### prototype

Create a new websocket and hold the ref to it internally. Also
decorates the new `WebSocket` with a `write` method to serialized outgoing
messages.

### subscribeCallback

Type: [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)

**Parameters**

-   `msgData` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** message coming from server
