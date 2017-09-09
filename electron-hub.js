/* jshint node: true, asi: true, laxcomma: true, esversion: 6 */
'use strict'

module.exports = function (ipcMain) {
    return {
        _wins: [],
        _ipc: ipcMain,

        on (chan, cb) {
            this._ipc.on(chan, cb)
        },

        once (chan, cb) {
            this._ipc.once(chan, cb)
        },

        add (win) {
            this._wins.push(win)
        },

        rem (win) {
            let idx = this._wins.indexOf(win)
            this._wins.splice(idx, 1)
        },

        send (ev, data) {
            if (this.empty())
                this.log(`no windows to send ${ev}::${data}`)
            else
                this._wins.forEach(w => w.webContents.send(ev, data))
        },

        reply (s, ev, data) {
            s.send(ev, data)
        },

        empty () {
            return this._wins.length === 0
        },

        log () {
            let args = Array.prototype.slice.call(arguments)
            let msg = [ 'main::log', ...args ]

            console.info.apply(console, msg)

            this.send('log', { data: msg })
        }
    }
}
