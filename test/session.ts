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
        AnchorLinkSessionManagerSession.from({
            network: chainId,
            actor: account,
            permission: permission,
            publicKey: publicKey,
            name: sessionName,
        })
        // Initialize with eosio typed values
        const session = AnchorLinkSessionManagerSession.from({
            network: Checksum256.from(chainId),
            actor: Name.from(account),
            permission: Name.from(permission),
            publicKey: PublicKey.from(publicKey),
            name: Name.from(sessionName),
        })
        assert.equal(session.name, sessionName)
        assert.equal(session.publicKey, publicKey)
        assert.equal(session.network, chainId)
        assert.equal(session.actor, account)
        assert.equal(session.permission, permission)
    })
})
