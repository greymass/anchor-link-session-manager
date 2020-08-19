import wtf from 'wtfnode'
import * as assert from 'assert'
import {join as joinPath} from 'path'
import 'mocha'

import {APIClient} from '@greymass/eosio'
import AnchorLink from 'anchor-link'

import {AnchorLinkSessionManager} from '../src/manager'
import {AnchorLinkSessionManagerSession} from '../src/session'

import {mockStorage, mockWalletConfig} from './utils/mock-data'
import {MockProvider} from './utils/mock-provider'
import {MockTransport} from './utils/mock-transport'
import {MockWallet} from './utils/mock-wallet'

const client = new APIClient({
    provider: new MockProvider(joinPath(__dirname, 'data')),
})

suite('anchor-link', function () {
    let link: AnchorLink
    let manager: AnchorLinkSessionManager
    let transaction: any
    let transport: MockTransport
    let wallet: MockWallet

    setup(async () => {
        wallet = new MockWallet({
            ...mockWalletConfig,
            client,
        })
        manager = new AnchorLinkSessionManager({
            handler: wallet.getEventHandler(),
            storage: mockStorage,
        })
        transaction = {
            action: {
                account: 'eosio.token',
                name: 'transfer',
                authorization: [wallet.authorization],
                data: {
                    from: wallet.authorization.actor.toString(),
                    to: 'teamgreymass',
                    quantity: '0.0001 EOS',
                    memo: 'lol',
                },
            },
        }
        transport = new MockTransport(manager, wallet)
        link = new AnchorLink({
            chainId: wallet.chainId,
            client,
            transport,
        })
    })

    teardown(async () => {
        manager.clearSessions()
        manager.disconnect()
    })

    suiteTeardown(() => {
        wtf.dump()
    })

    test('login + add session', async () => {
        // start mock manager service
        await manager.connect()
        // login to mock manager service
        const response = await link.login('anchor-link-session-manager')
        // ensure login processed and returned identity
        assert.equal(response.payload.sa, wallet.authorization.actor)
        assert.equal(response.payload.sp, wallet.authorization.permission)
        manager.addSession(AnchorLinkSessionManagerSession.fromLoginResult(response))
        // ensure it was added
        assert.equal(manager.storage.sessions.length, 1)
        // retrieve session from manager and ensure it exists
        const returned = manager.getSession(
            wallet.chainId,
            response.session.auth.actor,
            response.session.auth.permission
        )
        assert.notEqual(undefined, returned)
        // check return values
        if (returned) {
            assert.equal(returned.network.toString(), wallet.chainId.toString())
            assert.equal(returned.actor, response.session.auth.actor)
            assert.equal(returned.permission, response.session.auth.permission)
        }
    })

    test('transact using known session', async () => {
        // start mock manager service
        await manager.connect()
        // login to using the mock wallet and save session into manager
        const response = await link.login('anchor-link-session-manager')
        manager.addSession(AnchorLinkSessionManagerSession.fromLoginResult(response))
        // perform the transaction
        return response.session.transact(transaction, {broadcast: false})
    })

    test('transact rejects unknown session', async () => {
        // start mock manager service
        await manager.connect()
        // login to mock manager service
        const identity = await link.login('anchor-link-session-manager')
        // do not add session to manager, and ensure no sessions exist
        assert.equal(manager.storage.sessions.length, 0)
        // ensure the transaction is rejected
        assert.rejects(
            identity.session.transact(transaction, {
                broadcast: false,
            })
        )
    })
})
