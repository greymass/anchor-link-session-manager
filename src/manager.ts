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
    onStorageUpdate(storage: string)
    onSocketEvent?(type: string, event: any)
}

export class AnchorLinkSessionManager {
    public ready = false
    public connecting = false
    public pingTimeout
    public retries: number
    public storage: AnchorLinkSessionManagerStorage

    private handler: AnchorLinkSessionManagerEventHander
    private retry: any
    private socket: WebSocket

    constructor(options: AnchorLinkSessionManagerOptions) {
        this.handler = options.handler
        this.retries = 0
        if (options && options.storage) {
            this.storage = options.storage
        } else {
            this.storage = new AnchorLinkSessionManagerStorage({
                linkId: uuid(),
                linkUrl: 'cb.anchor.link',
                requestKey: PrivateKey.generate('K1').toWif(),
                sessions: [],
            })
            this.handler.onStorageUpdate(this.storage.serialize())
        }
    }

    addSession(session: AnchorLinkSessionManagerSession) {
        this.storage.add(session)
        this.handler.onStorageUpdate(this.storage.serialize())
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
        this.handler.onStorageUpdate(this.storage.serialize())
    }

    removeSession(session: AnchorLinkSessionManagerSession) {
        this.storage.remove(session)
        this.handler.onStorageUpdate(this.storage.serialize())
    }

    save() {
        this.handler.onStorageUpdate(this.storage.serialize())
    }

    heartbeat() {
        clearTimeout(this.pingTimeout)
        this.pingTimeout = setTimeout(() => {
            this.socket.terminate()
        }, 10000 + 1000)
    }

    connect(): Promise<WebSocket> {
        const manager = this
        this.connecting = true
        this.ready = false
        return new Promise((resolve, reject) => {
            const linkUrl = `wss://${this.storage.linkUrl}/${this.storage.linkId}`
            const socket = new WebSocket(linkUrl)
            socket.onopen = (event) => {
                if (this.handler && this.handler.onSocketEvent) {
                    this.handler.onSocketEvent("onopen", event)
                }
                manager.connecting = false
                manager.heartbeat()
                manager.ready = true
                manager.retries = 0
                resolve(manager.socket)
            }
            socket.onmessage = (message: any) => {
                if (this.handler && this.handler.onSocketEvent) {
                    this.handler.onSocketEvent("onmessage", message)
                }
                try {
                    manager.handleRequest(message.data)
                } catch (e) {
                    reject(e)
                }
            }
            socket.onerror = function (err) {
                if (this.handler && this.handler.onSocketEvent) {
                    this.handler.onSocketEvent("onerror", err)
                }
                manager.ready = false
                clearInterval(manager.pingTimeout)
                reject(err)
            }
            socket.onclose = function(event) {
                if (this.handler && this.handler.onSocketEvent) {
                    this.handler.onSocketEvent("onclose", event)
                }
                // add variable about whether this is enabled beyond connecting
                manager.connecting = false
                const wait = backoff(manager.retries)
                manager.retry = setTimeout(() => {
                    manager.retries++
                    clearInterval(manager.pingTimeout)
                    manager.connect()
                }, wait)
            }
            socket.on('ping', (event) => {
                manager.heartbeat()
                manager.socket.send('pong')
            })
            manager.socket = socket
        })
    }

    disconnect() {
        clearTimeout(this.retry)
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

function backoff(n) {
    return Math.min(Math.pow(n * 100, 2) / 1000, 5000)
}
