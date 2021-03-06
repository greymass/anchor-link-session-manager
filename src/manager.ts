import WebSocket from 'isomorphic-ws'
import {
    Bytes,
    Checksum256,
    Checksum256Type,
    Name,
    NameType,
    PrivateKey,
    PublicKey,
    Serializer,
} from '@greymass/eosio'
import {v4 as uuid} from 'uuid'

import {SealedMessage} from './link-types'
import {AnchorLinkSessionManagerSession} from './session'
import {AnchorLinkSessionManagerStorage} from './storage'
import {unsealMessage} from './utils'

export interface AnchorLinkSessionManagerOptions {
    handler: AnchorLinkSessionManagerEventHander
    linkUrl?: string
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
                linkUrl: options.linkUrl || 'cb.anchor.link',
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

    updateLastUsed(publicKey: PublicKey) {
        this.storage.updateLastUsed(publicKey)
        this.handler.onStorageUpdate(this.storage.serialize())
    }

    heartbeat() {
        clearTimeout(this.pingTimeout)
        this.pingTimeout = setTimeout(async () => {
            if (this.socket && this.socket.readyState === 1) {
                await this.disconnect()
            }
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
                try {
                    if (this.handler && this.handler.onSocketEvent) {
                        this.handler.onSocketEvent('onopen', event)
                    }
                } catch (e) {
                    reject(e)
                }
                manager.connecting = false
                manager.heartbeat()
                manager.ready = true
                resolve(manager.socket)
            }
            socket.onmessage = (message: any) => {
                try {
                    if (this.handler && this.handler.onSocketEvent) {
                        this.handler.onSocketEvent('onmessage', message)
                    }
                    manager.handleRequest(message.data)
                } catch (e) {
                    reject(e)
                }
            }
            socket.onerror = function (err) {
                try {
                    if (this.handler && this.handler.onSocketEvent) {
                        this.handler.onSocketEvent('onerror', err)
                    }
                } catch (e) {
                    reject(e)
                }
                manager.ready = false
                switch (err.code) {
                    case 'ENOTFOUND':
                    case 'ECONNREFUSED': {
                        const wait = backoff(manager.retries)
                        manager.retry = setTimeout(() => {
                            try {
                                manager.retries++
                                clearInterval(manager.pingTimeout)
                                manager.connect()
                            } catch (error) {
                                console.log('error caught', error)
                            }
                        }, wait)
                        break
                    }
                    default: {
                        clearInterval(manager.pingTimeout)
                        reject(err)
                        break
                    }
                }
            }
            socket.onclose = function (event) {
                try {
                    if (this.handler && this.handler.onSocketEvent) {
                        this.handler.onSocketEvent('onclose', event)
                    }
                } catch (e) {
                    reject(e)
                }
                // add variable about whether this is enabled beyond connecting
                manager.connecting = false
                if (event.code !== 1000 && event.code !== 4001) {
                    const wait = backoff(manager.retries)
                    manager.retry = setTimeout(async () => {
                        try {
                            manager.retries++
                            await manager.disconnect()
                            clearInterval(manager.pingTimeout)
                            manager.connect()
                        } catch (error) {
                            console.log('error caught', error)
                        }
                    }, wait)
                }
            }
            socket.addEventListener('ping', (event) => {
                // Reset retries on successful ping
                manager.retries = 0
                try {
                    if (this.handler && this.handler.onSocketEvent) {
                        this.handler.onSocketEvent('onping', event)
                    }
                } catch (e) {
                    reject(e)
                }
                manager.heartbeat()
                manager.socket.send('pong')
            })
            manager.socket = socket
        }).catch((error) => {
            console.log(
                'SessionManager connect: caught error in promise',
                error.message,
                error.code,
                manager.retries
            )
        })
    }

    async disconnect() {
        clearTimeout(this.retry)
        clearTimeout(this.pingTimeout)
        this.connecting = false
        this.ready = false
        await this.socket.close(1000)
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

        // Updating session lastUsed timestamp
        this.updateLastUsed(message.from)

        // Fire callback for onIncomingRequest defined by client application
        this.handler.onIncomingRequest(unsealed)

        // Return the unsealed message
        return unsealed
    }
}

function backoff(n) {
    return Math.min(Math.pow(n * 100, 2) / 1000, 5000)
}
