import libsodium from 'libsodium-wrappers';
import { openDB } from 'idb';

let db;

async function getDB() {
    if (db) return db;
    db = await openDB('chatty_crypto', 1, {
        upgrade(db) {
            db.createObjectStore('keys');
        },
    });
    return db;
}

export const cryptoService = {
    async init() {
        await libsodium.ready;
    },

    async ensureKeys(userId) {
        if (!userId) {
            throw new Error("Cannot ensure keys without a valid User ID");
        }
        await this.init();
        const db = await getDB();
        let keyPair = await db.get('keys', userId);

        if (!keyPair) {
            const pair = libsodium.crypto_box_keypair();
            keyPair = {
                publicKey: libsodium.to_base64(pair.publicKey),
                privateKey: libsodium.to_base64(pair.privateKey)
            };
            await db.put('keys', keyPair, userId);
        }

        return keyPair;
    },

    async encrypt(content, recipientPubKeyB64, senderPubKeyB64) {
        await this.init();
        
        const recipientPubKey = libsodium.from_base64(recipientPubKeyB64);
        const senderPubKey = libsodium.from_base64(senderPubKeyB64);

        const sessionKey = libsodium.randombytes_buf(libsodium.crypto_secretbox_KEYBYTES);
        const nonce = libsodium.randombytes_buf(libsodium.crypto_secretbox_NONCEBYTES);

        const encryptedContent = libsodium.crypto_secretbox_easy(content, nonce, sessionKey);

        const sealedForRecipient = libsodium.crypto_box_seal(sessionKey, recipientPubKey);
        const sealedForSender = libsodium.crypto_box_seal(sessionKey, senderPubKey);

        return JSON.stringify({
            v: 1,
            n: libsodium.to_base64(nonce),
            p: libsodium.to_base64(encryptedContent),
            k: {
                r: libsodium.to_base64(sealedForRecipient),
                s: libsodium.to_base64(sealedForSender)
            }
        });
    },

    async decrypt(encryptedJson, myKeyPairB64) {
        try {
            await this.init();
            const bundle = JSON.parse(encryptedJson);
            if (bundle.v !== 1) throw new Error("Unsupported version");

            const myPublicKey = libsodium.from_base64(myKeyPairB64.publicKey);
            const myPrivateKey = libsodium.from_base64(myKeyPairB64.privateKey);

            let sealedKeyB64 = bundle.k.r;
            
            let sessionKey;
            try {
                sessionKey = libsodium.crypto_box_seal_open(
                    libsodium.from_base64(bundle.k.r),
                    myPublicKey,
                    myPrivateKey
                );
            } catch (e) {
                sessionKey = libsodium.crypto_box_seal_open(
                    libsodium.from_base64(bundle.k.s),
                    myPublicKey,
                    myPrivateKey
                );
            }

            const decrypted = libsodium.crypto_secretbox_open_easy(
                libsodium.from_base64(bundle.p),
                libsodium.from_base64(bundle.n),
                sessionKey
            );

            return libsodium.to_string(decrypted);
        } catch (e) {
            console.warn("Decryption failed:", e);
            return null;
        }
    }
};
