import {Listener, ListenerEncoding, ListenerOptions} from '@greymass/buoy'
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
    fetch?: typeof fetch
    handler: AnchorLinkSessionManagerEventHander
    linkUrl?: string
    storage?: AnchorLinkSessionManagerStorage
    WebSocket?: WebSocket
}

export interface AnchorLinkSessionManagerEventHander {
    onIncomingRequest(payload: string)
    onStorageUpdate(storage: string)
    onSocketEvent?(type: string, event: any)
}

export class AnchorLinkSessionManager {
    public storage: AnchorLinkSessionManagerStorage

    private fetch?: typeof fetch
    private handler: AnchorLinkSessionManagerEventHander
    private listener: Listener
    private listenerOptions: ListenerOptions

    constructor(options: AnchorLinkSessionManagerOptions) {
        this.handler = options.handler
        if (options && options.fetch) {
            this.fetch = options.fetch
        }
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
        this.listenerOptions = {
            autoConnect: false,
            encoding: ListenerEncoding.binary,
            service: `https://${this.storage.linkUrl}`,
            channel: this.storage.linkId,
        }
        if (options.WebSocket) {
            this.listenerOptions.WebSocket = options.WebSocket
        }
        this.listener = this.setupListener()
    }

    setupListener() {
        const listener = new Listener(this.listenerOptions)

        listener.on('connect', () => {
            try {
                if (this.handler && this.handler.onSocketEvent) {
                    this.handler.onSocketEvent('onopen', {})
                }
            } catch (e) {
                console.log('SessionManager on:connect exception', e)
            }
        })

        listener.on('disconnect', () => {
            this.disconnect()
            try {
                if (this.handler && this.handler.onSocketEvent) {
                    this.handler.onSocketEvent('onclose', {})
                }
            } catch (e) {
                console.log('SessionManager on:disconnect exception', e)
            }
        })

        listener.on('message', (message) => {
            try {
                if (this.handler && this.handler.onSocketEvent) {
                    this.handler.onSocketEvent('onmessage', message)
                }
                this.handleRequest(message)
            } catch (e) {
                console.log('SessionManager on:message exception', e)
            }
        })

        listener.on('error', (error) => {
            try {
                if (this.handler && this.handler.onSocketEvent) {
                    this.handler.onSocketEvent('onerror', error)
                }
            } catch (e) {
                console.log('SessionManager on:error exception', e)
            }
        })

        return listener
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

    connect() {
        this.listener.connect()
    }

    disconnect() {
        this.listener.disconnect()
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

    get ready(): boolean {
        return this.listener && this.listener.isConnected
    }
}
