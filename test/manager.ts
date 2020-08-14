import * as assert from 'assert'
import 'mocha'
import { v4 as uuid, validate as uuidValidate } from 'uuid';

import {Checksum256, Name, PrivateKey, PublicKey} from '@greymass/eosio'

import {AnchorLinkSessionManager} from '../src/manager'
import {AnchorLinkSessionManagerSession} from '../src/session'
import {AnchorLinkSessionManagerStorage} from '../src/storage'

const mockSession = {
    network: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
    account: 'teamgreymass',
    permission: 'active',
    publicKey: 'PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs',
    name: 'testsession',
}

const mockStorage = new AnchorLinkSessionManagerStorage({
    linkId: uuid(),
    linkUrl: 'cb.anchor.link',
    requestKey: PrivateKey.generate('K1').toWif(),
    sessions: [],
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
            storage: mockStorage
        })
        assert.equal(mockStorage.linkId, manager.storage.linkId)
        assert.equal(mockStorage.linkUrl, manager.storage.linkUrl)
        assert.equal(mockStorage.requestKey, manager.storage.requestKey)
        assert.equal(mockStorage.sessions, manager.storage.sessions)
    })

})
