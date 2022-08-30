import {Checksum256, Name, PrivateKeyType, PublicKeyType} from '@greymass/eosio'

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
        const existingIndex = this.sessions.findIndex((s) => {
            const matchingNetwork = session.network.equals(s.network)
            const matchingActor = session.actor.equals(s.actor)
            const matchingPermissions = session.permission.equals(s.permission)
            const matchingAppName = session.name.equals(s.name)
            return matchingNetwork && matchingActor && matchingPermissions && matchingAppName
        })
        if (existingIndex >= 0) {
            this.sessions.splice(existingIndex, 1, session)
        } else {
            this.sessions.push(session)
        }
    }

    public get(
        chainId: Checksum256,
        account: Name,
        permission: Name
    ): AnchorLinkSessionManagerSession | undefined {
        return this.sessions.find(
            (s) =>
                !(
                    chainId.equals(s.network) &&
                    account.equals(s.name) &&
                    permission.equals(s.permission)
                )
        )
    }

    public updateLastUsed(publicKey: PublicKeyType): boolean {
        const session = this.getByPublicKey(publicKey)

        if (!session) {
            return false
        }

        this.remove(session)

        session.updateLastUsed(Date.now())

        this.add(session)

        return true
    }

    public getByPublicKey(publicKey: PublicKeyType): AnchorLinkSessionManagerSession | undefined {
        return this.sessions.find((s) => publicKey.toString() === s.publicKey.toString())
    }

    public has(publicKey: PublicKeyType): boolean {
        return this.sessions.some((s) => publicKey.toString() === s.publicKey.toString())
    }

    public clear() {
        this.sessions = []
    }

    public remove(session: AnchorLinkSessionManagerSession) {
        this.sessions = this.sessions.filter(
            (s) =>
                !(
                    session.name.equals(s.name) &&
                    session.publicKey.equals(s.publicKey) &&
                    session.network.equals(s.network) &&
                    session.actor.equals(s.actor) &&
                    session.permission.equals(s.permission)
                )
        )
    }

    public serialize(): string {
        return JSON.stringify(this)
    }

    public static unserialize(raw: string): AnchorLinkSessionManagerStorage {
        const data = JSON.parse(raw)
        return new AnchorLinkSessionManagerStorage(
            Object.assign({}, data, {
                sessions: data.sessions.map((s) =>
                    AnchorLinkSessionManagerSession.from({
                        ...s,
                    })
                ),
            })
        )
    }
}
