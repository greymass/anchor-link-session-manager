import {Bytes, PrivateKey, PublicKey, Serializer, UInt64} from '@greymass/eosio'

import {AES_CBC} from 'asmcrypto.js'

/**
 * Encrypt a message using AES and shared secret derived from given keys.
 * @internal
 */
export function unsealMessage(
    message: Bytes,
    privateKey: PrivateKey,
    publicKey: PublicKey,
    nonce: UInt64
): string {
    const secret = privateKey.sharedSecret(publicKey)
    const key = Serializer.encode({object: nonce}).appending(secret.array).sha512Digest
    const cbc = new AES_CBC(key.array.slice(0, 32), key.array.slice(32, 48))
    const ciphertext = Bytes.from(cbc.decrypt(message.array))
    return ciphertext.toString('utf8')
}
