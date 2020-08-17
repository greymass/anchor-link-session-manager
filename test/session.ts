import * as assert from 'assert'
import 'mocha'

import {Checksum256, Name, PublicKey} from '@greymass/eosio'

import {AnchorLinkSessionManagerSession} from '../src/session'

suite('session', function () {
    test('init', function () {
        const chainId = '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840'
        const account = 'teamgreymass'
        const permission = 'active'
        const publicKey = 'PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs'
        const sessionName = 'testsession'
        // Initialize with untyped values
        new AnchorLinkSessionManagerSession(chainId, account, permission, publicKey, sessionName)
        // Initialize with eosio typed values
        const session = new AnchorLinkSessionManagerSession(
            Checksum256.from(chainId),
            Name.from(account),
            Name.from(permission),
            PublicKey.from(publicKey),
            Name.from(sessionName)
        )
        assert.equal(session.name, sessionName)
        assert.equal(session.account.network, chainId)
        assert.equal(session.account.name, account)
        assert.equal(session.account.permission, permission)
        assert.equal(session.account.publicKey, publicKey)
    })
})
