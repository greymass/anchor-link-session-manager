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

import {mockEventHandler, mockSession} from './utils/mock-data'

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
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
        })
        const session = AnchorLinkSessionManagerSession.from({...mockSession})
        manager.addSession(session)
        assert.equal(manager.storage.sessions.length, 1)
        const matching = manager.storage.sessions.find(
            (session) =>
                session.network.toString() === mockSession.network &&
                session.actor.toString() === mockSession.actor &&
                session.permission.toString() === mockSession.permission &&
                session.publicKey.toString() === mockSession.publicKey &&
                session.name.toString() === mockSession.name
        )
        assert.equal(matching !== undefined, true)
    })

    test('add session and prevent duplicates', function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
        })
        const session1 = AnchorLinkSessionManagerSession.from({...mockSession})
        manager.addSession(session1)
        const newPublicKey = 'PUB_K1_4yHCwKRT8Z6JXGg4GiTuJLWCg2XZETcnSEN5VhSM6okbb51rvo'
        const session2 = AnchorLinkSessionManagerSession.from({
            ...mockSession,
            publicKey: newPublicKey, // alter public key to ensure old session was replaced
        })
        manager.addSession(session2)
        assert.equal(manager.storage.sessions.length, 1)
        const matching = manager.storage.sessions.find(
            (session) =>
                session.network.toString() === mockSession.network &&
                session.actor.toString() === mockSession.actor &&
                session.permission.toString() === mockSession.permission &&
                session.publicKey.toString() === newPublicKey &&
                session.name.toString() === mockSession.name
        )
        assert.equal(matching !== undefined, true)
    })

    test('add/remove sessions', function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
        })
        assert.equal(manager.storage.sessions.length, 0)
        const session1 = AnchorLinkSessionManagerSession.from({
            ...mockSession,
            name: 'testsession1',
        })
        manager.addSession(session1)
        assert.equal(manager.storage.sessions.length, 1)

        const session2 = AnchorLinkSessionManagerSession.from({
            ...mockSession,
            name: 'testsession2',
        })
        manager.addSession(session2)
        assert.equal(manager.storage.sessions.length, 2)

        manager.removeSession(session2)
        assert.equal(manager.storage.sessions.length, 1)

        manager.removeSession(manager.storage.sessions[0])
        assert.equal(manager.storage.sessions.length, 0)
    })

    test('remove based on unserialized', function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
        })
        assert.equal(manager.storage.sessions.length, 0)

        const session1 = AnchorLinkSessionManagerSession.from({
            ...mockSession,
            name: 'testsession1',
        })
        manager.addSession(session1)

        const serialized = manager.storage.serialize()
        const newStorage = AnchorLinkSessionManagerStorage.unserialize(serialized)
        manager.removeSession(newStorage.sessions[0])
        assert.equal(manager.storage.sessions.length, 0)
    })

    test('get session returns match', function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
        })
        const session = AnchorLinkSessionManagerSession.from({...mockSession})
        manager.addSession(session)
        assert.equal(manager.storage.sessions.length, 1)
        const matching = manager.getSession(
            mockSession.network,
            mockSession.actor,
            mockSession.permission
        )
        assert.equal(matching === session, true)
    })

    test('get session returns undefined', function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
        })
        const matching = manager.getSession(
            mockSession.network,
            mockSession.actor,
            mockSession.permission
        )
        assert.equal(undefined === matching, true)
    })

    test('clear sessions', function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
        })
        const session1 = AnchorLinkSessionManagerSession.from({
            ...mockSession,
            name: 'testsession1',
        })
        manager.addSession(session1)
        const session2 = AnchorLinkSessionManagerSession.from({
            ...mockSession,
            name: 'testsession2',
        })
        manager.addSession(session2)
        assert.equal(manager.storage.sessions.length, 2)
        manager.clearSessions()
        assert.equal(manager.storage.sessions.length, 0)
    })

    test('to/from json', function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
        })
        const session = AnchorLinkSessionManagerSession.from({...mockSession})
        manager.addSession(session)
        assert.equal(manager.storage.sessions.length, 1)
        assert.equal(JSON.stringify(manager.storage), manager.storage.serialize())
        const storage = AnchorLinkSessionManagerStorage.unserialize(manager.storage.serialize())
        assert.equal(storage.linkId, manager.storage.linkId)
        assert.equal(storage.linkUrl, manager.storage.linkUrl)
        assert.equal(storage.requestKey, manager.storage.requestKey)
        storage.sessions.forEach((v, k) => {
            assert.equal(v.network.toString(), manager.storage.sessions[k].network.toString())
            assert.equal(v.actor.toString(), manager.storage.sessions[k].actor.toString())
            assert.equal(v.permission.toString(), manager.storage.sessions[k].permission.toString())
            assert.equal(v.publicKey.toString(), manager.storage.sessions[k].publicKey.toString())
            assert.equal(v.name.toString(), manager.storage.sessions[k].name.toString())
        })
    })
})
