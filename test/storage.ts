import * as assert from 'assert'
import 'mocha'
import {v4 as uuid} from 'uuid'

import {PrivateKey} from '@greymass/eosio'

import {AnchorLinkSessionManager} from '../src/manager'
import {AnchorLinkSessionManagerSession} from '../src/session'
import {
    AnchorLinkSessionManagerStorage,
    AnchorLinkSessionManagerStorageOptions,
} from '../src/storage'

const mockSession = {
    network: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
    account: 'teamgreymass',
    permission: 'active',
    publicKey: 'PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs',
    name: 'testsession',
}

const mockStorageOptions: AnchorLinkSessionManagerStorageOptions = {
    linkId: uuid(),
    linkUrl: 'cb.anchor.link',
    requestKey: PrivateKey.generate('K1').toWif(),
    sessions: [],
}

suite('storage', function () {
    test('init', function () {
        const storage = new AnchorLinkSessionManagerStorage(mockStorageOptions)
        assert.equal(mockStorageOptions.linkId, storage.linkId)
        assert.equal(mockStorageOptions.linkUrl, storage.linkUrl)
        assert.equal(mockStorageOptions.requestKey, storage.requestKey)
        assert.equal(mockStorageOptions.sessions, storage.sessions)
    })

    test('add session', function () {
        const manager = new AnchorLinkSessionManager()
        const session = new AnchorLinkSessionManagerSession(
            mockSession.network,
            mockSession.account,
            mockSession.permission,
            mockSession.publicKey,
            mockSession.name
        )
        manager.addSession(session)
        assert.equal(manager.storage.sessions.length, 1)
        const matching = manager.storage.sessions.find(
            (session) =>
                session.account.network.toString() === mockSession.network &&
                session.account.name.toString() === mockSession.account &&
                session.account.permission.toString() === mockSession.permission &&
                session.account.publicKey.toString() === mockSession.publicKey &&
                session.name.toString() === mockSession.name
        )
        assert.equal(matching !== undefined, true)
    })

    test('add/remove sessions', function () {
        const manager = new AnchorLinkSessionManager()
        assert.equal(manager.storage.sessions.length, 0)

        const session1 = new AnchorLinkSessionManagerSession(
            mockSession.network,
            mockSession.account,
            mockSession.permission,
            mockSession.publicKey,
            'testsession1'
        )
        manager.addSession(session1)
        assert.equal(manager.storage.sessions.length, 1)

        const session2 = new AnchorLinkSessionManagerSession(
            mockSession.network,
            mockSession.account,
            mockSession.permission,
            mockSession.publicKey,
            'testsession2'
        )
        manager.addSession(session2)
        assert.equal(manager.storage.sessions.length, 2)

        manager.removeSession(session2)
        assert.equal(manager.storage.sessions.length, 1)

        manager.removeSession(manager.storage.sessions[0])
        assert.equal(manager.storage.sessions.length, 0)
    })

    test('clear sessions', function () {
        const manager = new AnchorLinkSessionManager()
        const session1 = new AnchorLinkSessionManagerSession(
            mockSession.network,
            mockSession.account,
            mockSession.permission,
            mockSession.publicKey,
            'testsession1'
        )
        manager.addSession(session1)
        const session2 = new AnchorLinkSessionManagerSession(
            mockSession.network,
            mockSession.account,
            mockSession.permission,
            mockSession.publicKey,
            'testsession2'
        )
        manager.addSession(session2)
        assert.equal(manager.storage.sessions.length, 2)
        manager.clearSessions()
        assert.equal(manager.storage.sessions.length, 0)
    })
})
