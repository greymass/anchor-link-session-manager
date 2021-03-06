import * as assert from 'assert'
import 'mocha'
import {validate as uuidValidate} from 'uuid'

import {PrivateKey} from '@greymass/eosio'

import {AnchorLinkSessionManager} from '../src/manager'
import {AnchorLinkSessionManagerStorage} from '../src/storage'

import {mockEventHandler, mockStorage} from './utils/mock-data'

suite('manager', function () {
    test('init with defaults', function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
            storage: mockStorage,
        })
        assert.equal(uuidValidate(manager.storage.linkId), true)
        assert.equal(manager.storage.linkUrl, 'cb.anchor.link')
        assert.doesNotThrow(() => {
            PrivateKey.from(manager.storage.requestKey)
        })
    })

    test('init with storage', function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
            storage: mockStorage,
        })
        assert.equal(mockStorage.linkId, manager.storage.linkId)
        assert.equal(mockStorage.linkUrl, manager.storage.linkUrl)
        assert.equal(mockStorage.requestKey, manager.storage.requestKey)
        assert.equal(mockStorage.sessions, manager.storage.sessions)
    })

    test('init with custom callback service', function () {
        const linkUrl = 'cb.anchor.tools'
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
            linkUrl,
        })
        assert.equal(uuidValidate(manager.storage.linkId), true)
        assert.equal(manager.storage.linkUrl, linkUrl)
        assert.doesNotThrow(() => {
            PrivateKey.from(manager.storage.requestKey)
        })
    })

    test('connection retry', async function () {
        const testStorage = new AnchorLinkSessionManagerStorage({
            linkId: mockStorage.linkId,
            linkUrl: 'invalid.anchor.link',
            requestKey: mockStorage.requestKey,
            sessions: mockStorage.sessions,
        })
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
            storage: testStorage,
        })
        manager.connect()
        await setTimeout(async () => {
            assert.equal(manager.retries > 0, true)
            assert.equal(manager.ready, false)
            await manager.disconnect()
        }, 500)
    })

    test('connection heartbeat', async function () {
        const testStorage = new AnchorLinkSessionManagerStorage({
            linkId: mockStorage.linkId,
            linkUrl: 'cb.anchor.link',
            requestKey: mockStorage.requestKey,
            sessions: mockStorage.sessions,
        })
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
            storage: testStorage,
        })
        manager.connect()
        await setTimeout(async () => {
            assert.equal(manager.retries > 0, true)
            assert.equal(manager.ready, false)
            await manager.disconnect()
        }, 25000)
    })

    test('connect and disconnect', async function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
            storage: mockStorage,
        })
        await manager.connect()
        assert.equal(manager.ready, true)
        await manager.disconnect()
        assert.equal(manager.ready, false)
    })

})
