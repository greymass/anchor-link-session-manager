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
        await setTimeout(() => {
            assert.equal(manager.retries > 0, true)
            assert.equal(manager.ready, false)
            manager.disconnect()
        }, 500)
    })


    test('connect and disconnect', async function () {
        const manager = new AnchorLinkSessionManager({
            handler: mockEventHandler,
            storage: mockStorage,
        })
        await manager.connect()
        assert.equal(manager.ready, true)
        manager.disconnect()
        assert.equal(manager.ready, false)
    })

})
