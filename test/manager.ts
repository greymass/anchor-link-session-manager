import * as assert from 'assert'
import {join as joinPath} from 'path'
import 'mocha'
import {validate as uuidValidate} from 'uuid'

import {APIClient, PrivateKey} from '@greymass/eosio'
import AnchorLink from 'anchor-link'

import {AnchorLinkSessionManager} from '../src/manager'
import {AnchorLinkSessionManagerSession} from '../src/session'

import {mockStorage} from './utils/mock-data'
import {MockProvider} from './utils/mock-provider'
import {MockTransport} from './utils/mock-transport'

const client = new APIClient({
    provider: new MockProvider(joinPath(__dirname, 'data')),
})

suite('manager', function () {
    test('init with defaults', function () {
        const manager = new AnchorLinkSessionManager()
        assert.equal(uuidValidate(manager.storage.linkId), true)
        assert.equal(manager.storage.linkUrl, 'cb.anchor.link')
        assert.doesNotThrow(() => {
            PrivateKey.from(manager.storage.requestKey)
        })
    })

    test('init with storage', function () {
        const manager = new AnchorLinkSessionManager({
            storage: mockStorage,
        })
        assert.equal(mockStorage.linkId, manager.storage.linkId)
        assert.equal(mockStorage.linkUrl, manager.storage.linkUrl)
        assert.equal(mockStorage.requestKey, manager.storage.requestKey)
        assert.equal(mockStorage.sessions, manager.storage.sessions)
    })

    test('login', async function () {
        const manager = new AnchorLinkSessionManager({
            storage: mockStorage,
        })

        await manager
            .connect()
            .then(async (socket) => {
                const transport = new MockTransport(manager)
                const chainId = transport.config.chainId.toString()
                const link = new AnchorLink({chainId, client, transport})
                const identity = await link.login('ihasnocpunet')
                manager.addSession(AnchorLinkSessionManagerSession.from(chainId, identity.session))
                socket.close()
            })
            .catch((message) => {
                throw new Error(message)
            })
    })

    test('login + transact', async function () {
        const manager = new AnchorLinkSessionManager({
            storage: mockStorage,
        })
        await manager
            .connect()
            .then(async (socket) => {
                const transport = new MockTransport(manager)
                const chainId = transport.config.chainId.toString()
                const link = new AnchorLink({chainId, client, transport})
                const {session} = await link.login('ihasnocpunet')
                manager.addSession(AnchorLinkSessionManagerSession.from(chainId, session))
                await session.transact({
                    action: {
                        account: 'eosio.token',
                        name: 'transfer',
                        authorization: [session.auth],
                        data: {
                            from: session.auth.actor,
                            to: 'teamgreymass',
                            quantity: '100000.0000 EOS',
                            memo: 'lol',
                        },
                    },
                })

                socket.close()
            })
            .catch((message) => {
                throw new Error(message)
            })
    })
})
