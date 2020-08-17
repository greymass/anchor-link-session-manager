import {Checksum256, Name, PrivateKeyType} from '@greymass/eosio'

import {AnchorLinkSessionManagerSession} from './session'

export interface AnchorLinkSessionManagerStorageOptions {
    linkId: string
    linkUrl: string
    requestKey: PrivateKeyType
    sessions: AnchorLinkSessionManagerSession[]
}

export class AnchorLinkSessionManagerStorage {
    linkId: string
    linkUrl = 'cb.anchor.link'
    requestKey: PrivateKeyType
    sessions: AnchorLinkSessionManagerSession[] = []

    constructor(options: AnchorLinkSessionManagerStorageOptions) {
        this.linkId = options.linkId
        this.linkUrl = options.linkUrl
        this.requestKey = options.requestKey
        this.sessions = options.sessions
    }

    public add(session: AnchorLinkSessionManagerSession) {
        this.sessions.push(session)
    }

    public get(chainId: Checksum256, account: Name, permission: Name): AnchorLinkSessionManagerSession | undefined {
        return this.sessions.find(
            (s) =>
                !(
                    chainId === s.account.network &&
                    account === s.account.name &&
                    permission === s.account.permission
                )
        )
    }

    public clear() {
        this.sessions = []
    }

    public remove(session: AnchorLinkSessionManagerSession) {
        this.sessions = this.sessions.filter(
            (s) =>
                !(
                    session.name === s.name &&
                    session.account.network === s.account.network &&
                    session.account.name === s.account.name &&
                    session.account.permission === s.account.permission &&
                    session.account.publicKey === s.account.publicKey
                )
        )
    }
}
