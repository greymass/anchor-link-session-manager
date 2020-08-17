import {v4 as uuid} from 'uuid'
import {PrivateKey} from '@greymass/eosio'
import {AnchorLinkSessionManagerStorage} from '../../src/storage'

export const mockSession = {
    network: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
    account: 'teamgreymass',
    permission: 'active',
    publicKey: 'PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs',
    name: 'testsession',
}

export const mockStorage = new AnchorLinkSessionManagerStorage({
    linkId: uuid(),
    linkUrl: 'cb.anchor.link',
    requestKey: PrivateKey.generate('K1').toWif(),
    sessions: [],
})

export const mockTransaction = {
    actions: [
        {
            account: 'eosio',
            name: 'voteproducer',
            authorization: [
                {
                    actor: '............1',
                    permission: '............2',
                },
            ],
            data: {
                voter: '............1',
                proxy: 'greymassvote',
                producers: [],
            },
        },
    ],
}
