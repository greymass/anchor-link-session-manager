import WebSocket from 'isomorphic-ws'
import {SigningRequest} from 'eosio-signing-request'
import {PrivateKey, PublicKey} from '@greymass/eosio'
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

    connect() {
        const linkUrl = `wss://${this.storage.linkUrl}/${this.storage.linkId}`
        this.socket = new WebSocket(linkUrl)
    }
}
