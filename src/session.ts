import {
    Checksum256Type,
    Name,
    NameType,
    PublicKey,
    PublicKeyType,
    TimePointSec,
} from '@greymass/eosio'

import {LinkSession} from 'anchor-link'
import {SigningRequest} from 'eosio-signing-request'

import {AnchorLinkSessionManagerAccount} from './account'

export class AnchorLinkSessionManagerSession {
    public name!: Name
    public account!: AnchorLinkSessionManagerAccount

    constructor(
        network: Checksum256Type,
        account: NameType,
        permission: NameType,
        publicKey: PublicKeyType,
        name: NameType
    ) {
        this.name = Name.from(name)
        this.account = new AnchorLinkSessionManagerAccount({
            name: account,
            network: network,
            permission: permission,
            publicKey: publicKey,
        })
    }

    static from(chainId: Checksum256Type, session: LinkSession) {
        return new AnchorLinkSessionManagerSession(
            chainId,
            session.auth.actor,
            session.auth.permission,
            session.publicKey,
            session.identifier
        )
    }
}

export class AnchorLinkSessionData {
    public requestKey!: PublicKey
    public created!: TimePointSec
    public updated!: TimePointSec

    constructor(requestKey: PublicKeyType) {
        this.requestKey = PublicKey.from(requestKey)
        this.created = TimePointSec.from(Date())
        this.updated = TimePointSec.from(Date())
    }
}

export class AnchorLinkSessionRequest {
    public session!: AnchorLinkSessionManagerSession
    public info!: LinkInfo
    public request!: LinkRequest
}

export class LinkRequest extends SigningRequest {
    public name!: Name
    public key!: PublicKey
    public identifier!: string
}

export class LinkInfo {
    public expiration!: TimePointSec
}
