import {
    Checksum256,
    Checksum256Type,
    Name,
    NameType,
    PublicKey,
    PublicKeyType,
} from '@greymass/eosio'

export interface AnchorLinkSessionManagerAccountOptions {
    network: Checksum256Type
    name: NameType
    permission: NameType
    publicKey: PublicKeyType
}

export class AnchorLinkSessionManagerAccount {
    public network!: Checksum256
    public name!: Name
    public permission!: Name
    public publicKey!: PublicKey

    constructor(options: AnchorLinkSessionManagerAccountOptions) {
        this.network = Checksum256.from(options.network)
        this.name = Name.from(options.name)
        this.permission = Name.from(options.permission)
        this.publicKey = PublicKey.from(options.publicKey)
    }
}
