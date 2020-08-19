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

import {SealedMessage} from './link-types'
import {AnchorLinkSessionManagerSession} from './session'
import {AnchorLinkSessionManagerStorage} from './storage'
import {unsealMessage} from './utils'

export interface AnchorLinkSessionManagerOptions {
    handler: AnchorLinkSessionManagerEventHander
    storage?: AnchorLinkSessionManagerStorage
}

export interface AnchorLinkSessionManagerEventHander {
    onIncomingRequest(payload: string)
}

export class AnchorLinkSessionManager {
    public ready = false
    public connecting = false
    public storage: AnchorLinkSessionManagerStorage

    private handler: AnchorLinkSessionManagerEventHander
    private socket: WebSocket

    constructor(options: AnchorLinkSessionManagerOptions) {
        this.handler = options.handler
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
                this.connecting = false
                this.ready = true
                resolve(this.socket)
            }
            socket.onmessage = (message: any) => {
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

    disconnect() {
        this.connecting = false
        this.ready = false
        this.socket.close(1000)
    }

    handleRequest(encoded: Bytes): string {
        // Decode the incoming message
        const message = Serializer.decode({
            type: SealedMessage,
            data: encoded,
        })

        // Unseal the message using the session managers request key
        const unsealed = unsealMessage(
            message.ciphertext,
            PrivateKey.from(this.storage.requestKey),
            message.from,
            message.nonce
        )

        // Ensure an active session for this key exists in storage
        if (!this.storage.has(message.from)) {
            throw new Error(`Unknown session using ${message.from}`)
        }

        // Fire callback for onIncomingRequest defined by client application
        this.handler.onIncomingRequest(unsealed)

        // Return the unsealed message
        return unsealed
    }
}
