import fetch from 'node-fetch'

import {
    Checksum256,
    Checksum256Type,
    PermissionLevel,
    PermissionLevelType,
    PrivateKey,
    PrivateKeyType,
    Signature,
    TimePointSec,
    Transaction,
} from '@greymass/eosio'

import {ResolvedSigningRequest, SigningRequest} from 'eosio-signing-request'

import {AnchorLinkSessionManager} from '../../src/manager'

interface MockWalletOptions {
    authorization: PermissionLevelType
    chainId: Checksum256Type
    key: PrivateKeyType
}

const expiration = TimePointSec.fromMilliseconds(Date.now() + 60 * 1000)

export class MockWallet {
    public authorization: PermissionLevel
    public chainId: Checksum256
    public key: PrivateKey

    constructor(options: MockWalletOptions) {
        this.authorization = PermissionLevel.from(options.authorization)
        this.chainId = Checksum256.from(options.chainId)
        this.key = PrivateKey.from(options.key)
    }

    async resolveRequest(request: SigningRequest): Promise<ResolvedSigningRequest> {
        const abis = await request.fetchAbis()
        return request.resolve(abis, this.authorization, {
            expiration,
            ref_block_num: 0,
            ref_block_prefix: 0,
        })
    }

    signTransaction(transaction: Transaction): Signature {
        const digest = transaction.signingDigest(this.chainId)
        const signature = this.key.signDigest(digest)
        return signature
    }

    async completeRequest(
        request: SigningRequest,
        manager: AnchorLinkSessionManager
    ): Promise<ResolvedSigningRequest> {
        const resolved = await this.resolveRequest(request)
        const signature = this.signTransaction(resolved.transaction)
        const callback = resolved.getCallback([signature])
        if (callback) {
            const body = JSON.stringify({
                ...callback.payload,
                link_ch: `https://${manager.storage.linkUrl}/${manager.storage.linkId}`,
                link_key: PrivateKey.from(manager.storage.requestKey).toPublic(),
                link_name: 'MockWallet',
            })
            await fetch(callback.url, {
                method: 'post',
                body,
            })
        } else {
            throw new Error('callback was not resolved')
        }
        return resolved
    }
}
