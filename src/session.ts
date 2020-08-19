import {
    Checksum256,
    Checksum256Type,
    Name,
    NameType,
    PublicKey,
    PublicKeyType,
} from '@greymass/eosio'
import {LoginResult} from 'anchor-link'

import {LinkCreate} from './link-types'

export class AnchorLinkSessionManagerSession {
    public actor!: Name
    public permission!: Name
    public name!: Name
    public network!: Checksum256
    public publicKey!: PublicKey

    constructor(
        network: Checksum256Type,
        actor: NameType,
        permission: NameType,
        publicKey: PublicKeyType,
        name: NameType
    ) {
        this.network = Checksum256.from(network)
        this.actor = Name.from(actor)
        this.permission = Name.from(permission)
        this.name = Name.from(name)
        this.publicKey = PublicKey.from(publicKey)
    }

    public static fromLoginResult(result: LoginResult): AnchorLinkSessionManagerSession {
        const linkInfo = result.request.getInfoKey('link', LinkCreate)
        if (!linkInfo) {
            throw new Error('identity request does not contain link information')
        }
        return new AnchorLinkSessionManagerSession(
            result.request.getChainId(),
            result.session.auth.actor,
            result.session.auth.permission,
            linkInfo['request_key'].toString(),
            result.session.identifier
        )
    }
}
