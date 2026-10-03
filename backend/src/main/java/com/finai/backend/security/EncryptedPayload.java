package com.finai.backend.security;

/**
 * The JSON envelope that travels over the wire for hybrid-encrypted messages.
 * Every field is Base64 text so it fits safely in JSON.
 *
 * @param encryptedKey the one-time AES key, locked with the server's RSA public key.
 *                     Only present in requests (the server already knows the key when it replies).
 * @param iv           random 12-byte "nonce" used by AES-GCM. Must be new for every message.
 * @param ciphertext   the encrypted message. AES-GCM appends an authentication tag to it,
 *                     so tampering is detected automatically when decrypting.
 */
public record EncryptedPayload(String encryptedKey, String iv, String ciphertext) {
}
