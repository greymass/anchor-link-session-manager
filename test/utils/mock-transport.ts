import {LinkTransport} from 'anchor-link'
import {SigningRequest} from 'eosio-signing-request'
import {
    Checksum256,
    Checksum256Type,
    PermissionLevel,
    PermissionLevelType,
    PrivateKey,
    PrivateKeyType,
} from '@greymass/eosio'

import {AnchorLinkSessionManager} from '../../src/manager'
import {MockWallet} from './mock-wallet'

export interface MockTransportConfig {
    authorization: PermissionLevel
    chainId: Checksum256
    key: PrivateKey
}

export interface MockTransportConfigType {
    authorization: PermissionLevelType
    chainId: Checksum256Type
    key: PrivateKeyType
}

export const MockTransportConfigDefault = {
    authorization: {actor: 'ihasnocpunet', permission: 'active'},
    chainId: '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840',
    key: '5K1D5MJaKtoN4ExGFKaKoDQ1orDsq8nLPw4C6sqnRH85Bibr6cy',
}

export class MockTransport implements LinkTransport {
    public config: MockTransportConfig
    public manager: AnchorLinkSessionManager
    constructor(
        manager: AnchorLinkSessionManager,
        config: MockTransportConfigType = MockTransportConfigDefault
    ) {
        this.manager = manager
        this.config = {
            authorization: PermissionLevel.from(config.authorization),
            chainId: Checksum256.from(config.chainId),
            key: PrivateKey.from(config.key),
        }
    }
    async onRequest(request: SigningRequest) {
        const wallet = new MockWallet(this.config)
        const completed = await wallet.completeRequest(request, this.manager)
    }
}
