import {join as joinPath} from 'path'
import {v4 as uuid} from 'uuid'
import {APIClient, PrivateKey} from '@greymass/eosio'
import {AnchorLinkSessionManagerEventHander} from '../../src/manager'
import {AnchorLinkSessionManagerStorage} from '../../src/storage'
import {MockProvider} from './mock-provider'

const client = new APIClient({
    provider: new MockProvider(joinPath(__dirname, '..', 'data')),
})

export const mockEventHandler: AnchorLinkSessionManagerEventHander = {
    onIncomingRequest: (payload) => {
        // console.log('MockEventHandler.onIncomingRequest', payload)
    },
    onStorageUpdate: (storage) => {
        // console.log('MockEventHandler.onStorageUpdate', storage)
    },
    onSocketEvent: (type, message) => {
        console.log(type, message)
    }
}

export const mockSession = {
    network: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
    actor: 'greymassaaaa',
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

export const mockWalletConfig = {
    authorization: {actor: 'greymassaaaa', permission: 'active'},
    chainId: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
    client,
    key: '5K1D5MJaKtoN4ExGFKaKoDQ1orDsq8nLPw4C6sqnRH85Bibr6cy',
}
