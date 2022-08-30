import {
    Checksum256,
    Checksum256Type,
    Int64,
    Name,
    NameType,
    PublicKey,
    Struct,
} from '@greymass/eosio'
import {LoginResult} from 'anchor-link'
import {SigningRequest} from 'eosio-signing-request'
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

@Struct.type('anchor_link_session_manager_session')
export class AnchorLinkSessionManagerSession extends Struct {
    @Struct.field('name') declare actor: Name
    @Struct.field('name') declare permission: Name
    @Struct.field('name') declare name: Name
    @Struct.field('checksum256') declare network: Checksum256
    @Struct.field('public_key') declare publicKey: PublicKey
    @Struct.field('int64', {optional: true}) declare created?: Int64
    @Struct.field('int64', {optional: true}) declare lastUsed?: Int64

    updateLastUsed(time: number) {
        this.lastUsed = Int64.from(time)
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

        return AnchorLinkSessionManagerSession.from({
            actor,
            permission,
            name: String(linkInfo['session_name']),
            network: String(network),
            publicKey: String(linkInfo['request_key']),
            created: Date.now(),
            lastUsed: Date.now(),
        })
    }

    public static fromLoginResult(result: LoginResult): AnchorLinkSessionManagerSession {
        const linkInfo = result.resolved.request.getInfoKey('link', LinkCreate)
        if (!linkInfo || !linkInfo['request_key']) {
            throw new Error('identity request does not contain link information')
        }
        return AnchorLinkSessionManagerSession.from({
            actor: result.session.auth.actor,
            permission: result.session.auth.permission,
            name: result.session.identifier,
            network: String(result.resolved.request.getChainId()),
            publicKey: String(linkInfo['request_key']),
            created: Date.now(),
            lastUsed: Date.now(),
        })
    }
}
