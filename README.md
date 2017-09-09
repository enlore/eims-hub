# Hub

> hoob

Here's a simple client side websocket utililty tool. Create a websocket, audo
de/serialize messages across the sockect, auto reconnect with stepped backoff,
manage pub/sub style subscribtions to channels on a corresponding server.

Uses [`eims-rest-contract`] to standardize read/write message payloads and assist
in some bookeeping involing message ids, timestamps, and the like.

[`eims-rest-contract`]: (https://github.com/enlore/eims-rest-contract)
