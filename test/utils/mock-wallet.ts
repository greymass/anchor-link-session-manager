import fetch from 'node-fetch'
import zlib from 'pako'

import {
    ABIDef,
    API,
    APIClient,
    Checksum256,
    Checksum256Type,
    Name,
    PermissionLevel,
    PermissionLevelType,
    PrivateKey,
    PrivateKeyType,
    Signature,
    TimePointSec,
    Transaction,
} from '@greymass/eosio'

import {
    AbiProvider,
    ResolvedSigningRequest,
    SigningRequest,
    SigningRequestEncodingOptions,
} from 'eosio-signing-request'

import {AnchorLinkSessionManager} from '../../src/manager'
import {mockWalletConfig} from './mock-data'

interface MockWalletOptions {
    authorization: PermissionLevelType
    chainId: Checksum256Type
    client: APIClient
    key: PrivateKeyType
}

const expiration = TimePointSec.from('2020-08-18T19:38:47')

export class MockWallet implements AbiProvider {
    public authorization: PermissionLevel
    public chainId: Checksum256
    public readonly client: APIClient
    public key: PrivateKey

    private requestOptions: SigningRequestEncodingOptions
    private abiCache = new Map<string, ABIDef>()
    private pendingAbis = new Map<string, Promise<API.v1.GetAbiResponse>>()

    constructor(options: MockWalletOptions = mockWalletConfig) {
        this.authorization = PermissionLevel.from(options.authorization)
        this.chainId = Checksum256.from(options.chainId)
        this.key = PrivateKey.from(options.key)
        this.client = options.client
        this.requestOptions = {
            abiProvider: this,
            zlib,
        }
    }

    async resolveRequest(request: SigningRequest): Promise<ResolvedSigningRequest> {
        const abis = await request.fetchAbis()
        const tapos = {
            expiration,
            ref_block_num: 0,
            ref_block_prefix: 0,
        }
        if (!request.isIdentity()) {
            const info = await this.client.v1.chain.get_info()
            const header = info.getTransactionHeader()
            tapos.ref_block_num = header.ref_block_num.toNumber()
            tapos.ref_block_prefix = header.ref_block_prefix.toNumber()
        }
        return request.resolve(abis, this.authorization, tapos)
    }

    signTransaction(transaction: Transaction): Signature {
        const digest = transaction.signingDigest(this.chainId)
        const signature = this.key.signDigest(digest)
        return signature
    }

    async completeRequest(
        request: SigningRequest,
        manager?: AnchorLinkSessionManager
    ): Promise<ResolvedSigningRequest> {
        const resolved = await this.resolveRequest(request)
        const signature = this.signTransaction(resolved.transaction)
        const callback = resolved.getCallback([signature])
        if (callback) {
            let body = JSON.stringify(callback.payload)
            if (manager && request.isIdentity()) {
                body = JSON.stringify({
                    ...callback.payload,
                    link_ch: `https://${manager.storage.linkUrl}/${manager.storage.linkId}`,
                    link_key: PrivateKey.from(manager.storage.requestKey).toPublic().toString(),
                    link_name: 'MockWallet',
                })
            }
            await fetch(callback.url, {
                method: 'post',
                body,
            })
        } else {
            throw new Error('callback was not resolved')
        }
        return resolved
    }

    getEventHandler = () => {
        return {
            onIncomingRequest: async (payload) => {
                console.log('incoming request', payload)
                const request = SigningRequest.from(payload, this.requestOptions)
                const completed = await this.completeRequest(request)
                return completed
            },
            onStorageUpdate: (storage) => {
                console.log('saving storage', storage)
            },
        }
    }

    /**
     * Fetch the ABI for given account, cached.
     * @internal
     */
    public async getAbi(account: Name) {
        const key = account.toString()
        let rv = this.abiCache.get(key)
        if (!rv) {
            let getAbi = this.pendingAbis.get(key)
            if (!getAbi) {
                getAbi = this.client.v1.chain.get_abi(account)
                this.pendingAbis.set(key, getAbi)
            }
            rv = (await getAbi).abi
            this.pendingAbis.delete(key)
            if (rv) {
                this.abiCache.set(key, rv)
            }
        }
        return rv as ABIDef
    }
}
