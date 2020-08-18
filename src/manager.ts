import WebSocket from 'isomorphic-ws'
import {
    Bytes,
    Checksum256,
    Checksum256Type,
    Name,
    NameType,
    PrivateKey,
    Serializer,
} from '@greymass/eosio'
import {v4 as uuid} from 'uuid'
import {AES_CBC} from 'asmcrypto.js'

import {LinkCreate, SealedMessage} from './link-types'
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

    getSession(
        chainId: Checksum256Type,
        account: NameType,
        permission: NameType
    ): AnchorLinkSessionManagerSession | undefined {
        return this.storage.get(
            Checksum256.from(chainId),
            Name.from(account),
            Name.from(permission)
        )
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
        const message = Serializer.decode({
            type: SealedMessage,
            data: encoded,
        })
        // TODO - Ensure from is one of the saved sessions
        // TODO - Decrypt request
        // const key = this.storage.requestKey
        // const cbc = new AES_CBC(key.array.slice(0, 32), key.array.slice(32, 48))
    }
}
