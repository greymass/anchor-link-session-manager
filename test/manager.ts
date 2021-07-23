import * as assert from 'assert'
import 'mocha'
import {validate as uuidValidate} from 'uuid'

import {PrivateKey} from '@greymass/eosio'

import {AnchorLinkSessionManager} from '../src/manager'

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
})
