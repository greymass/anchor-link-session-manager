import {
    Checksum256,
    Checksum256Type,
    Name,
    NameType,
    PublicKey,
    PublicKeyType,
} from '@wharfkit/antelope'
import {LoginResult} from 'anchor-link'
import {SigningRequest} from '@wharfkit/signing-request'
import zlib from 'pako'

import {LinkCreate} from './link-types'

export interface ZlibProvider {
    deflateRaw: (data: Uint8Array) => Uint8Array
    inflateRaw: (data: Uint8Array) => Uint8Array
}

export interface IdentityRequestOptions {
    textEncoder?: TextEncoder
    textDecoder?: TextDecoder
    zlib?: ZlibProvider
}

export class AnchorLinkSessionManagerSession {
    public actor!: Name
    public permission!: Name
    public name!: Name
    public network!: Checksum256
    public publicKey!: PublicKey
    public created!: number
    public lastUsed!: number

    constructor(
        network: Checksum256Type,
        actor: NameType,
        permission: NameType,
        publicKey: PublicKeyType,
        name: NameType,
        created?: number,
        lastUsed?: number
    ) {
        this.network = Checksum256.from(network)
        this.actor = Name.from(actor)
        this.permission = Name.from(permission)
        this.publicKey = PublicKey.from(publicKey)
        this.name = Name.from(name)
        this.created = created || Date.now()
        this.lastUsed = lastUsed || Date.now()
    }

    updateLastUsed(time: number) {
        this.lastUsed = time
    }

    public static fromIdentityRequest(
        network: Checksum256Type,
        actor: NameType,
        permission: NameType,
        payload: string,
        options: IdentityRequestOptions = {}
    ) {
        const requestOptions = {
            textDecoder: options.textDecoder || new TextDecoder(),
            textEncoder: options.textEncoder || new TextEncoder(),
            zlib: options.zlib || zlib,
        }

        const request = SigningRequest.from(payload, requestOptions)
        if (!request.isIdentity()) {
            throw new Error('supplied request is not an identity request')
        }

        const linkInfo = request.getInfoKey('link', LinkCreate)
        if (!linkInfo || !linkInfo['request_key'] || !linkInfo['session_name']) {
            throw new Error('identity request does not contain link information')
        }

        return new AnchorLinkSessionManagerSession(
            String(network),
            actor,
            permission,
            String(linkInfo['request_key']),
            String(linkInfo['session_name'])
        )
    }

    public static fromLoginResult(result: LoginResult): AnchorLinkSessionManagerSession {
        const linkInfo = result.resolved.request.getInfoKey('link', LinkCreate)
        if (!linkInfo || !linkInfo['request_key']) {
            throw new Error('identity request does not contain link information')
        }
        return new AnchorLinkSessionManagerSession(
            String(result.resolved.request.getChainId()),
            result.session.auth.actor,
            result.session.auth.permission,
            String(linkInfo['request_key']),
            result.session.identifier
        )
    }
}
