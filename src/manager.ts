import WebSocket from 'isomorphic-ws'
import {Bytes, PrivateKey} from '@greymass/eosio'
import {v4 as uuid} from 'uuid'

import {AnchorLinkSessionManagerSession} from './session'
import {AnchorLinkSessionManagerStorage} from './storage'

export interface AnchorLinkSessionManagerOptions {
    storage?: AnchorLinkSessionManagerStorage
}

export class AnchorLinkSessionManager {
    public ready = false
    public connecting = false
    public storage: AnchorLinkSessionManagerStorage

    private socket: WebSocket

    constructor(options?: AnchorLinkSessionManagerOptions) {
        if (options && options.storage) {
            this.storage = options.storage
        } else {
            this.storage = new AnchorLinkSessionManagerStorage({
                linkId: uuid(),
                linkUrl: 'cb.anchor.link',
                requestKey: PrivateKey.generate('K1').toWif(),
                sessions: [],
            })
        }
    }

    addSession(session: AnchorLinkSessionManagerSession) {
        this.storage.add(session)
    }

    clearSessions() {
        this.storage.clear()
    }

    removeSession(session: AnchorLinkSessionManagerSession) {
        this.storage.remove(session)
    }

    save() {
        // NYI
    }

    connect(): Promise<WebSocket> {
        this.connecting = true
        this.ready = false
        return new Promise((resolve, reject) => {
            const linkUrl = `wss://${this.storage.linkUrl}/${this.storage.linkId}`
            const socket = new WebSocket(linkUrl)
            socket.onopen = () => {
                console.log(`Connected to "${linkUrl}" channel.`)
                this.connecting = false
                this.ready = true
                resolve(this.socket)
            }
            socket.onmessage = (message: any) => {
                console.log(`Received transaction on "${linkUrl}" channel.`)
                this.handleRequest(message.data)
            }
            socket.onerror = function (err) {
                this.connecting = false
                this.ready = false
                reject(err)
            }
            this.socket = socket
        })
    }

    handleRequest(encoded: Bytes) {
        console.log(encoded)
    }
}
