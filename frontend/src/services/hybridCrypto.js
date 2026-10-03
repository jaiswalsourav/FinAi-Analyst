// Hybrid encryption (RSA + AES) using the browser's built-in Web Crypto API.
//
// Why both?
//  - RSA lets us share a secret with the server safely (public key locks, private key unlocks),
//    but it is slow and can only encrypt tiny messages.
//  - AES is fast and handles any size, but both sides need the same secret key.
//
// So for every message we:
//  1. create a random one-time AES key,
//  2. encrypt the real message with it,
//  3. lock the AES key with the server's RSA public key and send both,
//  4. later decrypt the server's reply with the same AES key.
//
// Settings here must match backend/.../security/HybridCrypto.java exactly.

const AES_KEY_BITS = 256;
const GCM_IV_BYTES = 12; // standard nonce size for AES-GCM

// ---- Base64 <-> bytes helpers (JSON can only carry text, so we send Base64) ----
const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

// Import the server's RSA public key (Base64 X.509/SPKI) so it can lock our AES key.
function importPublicKey(publicKeyBase64) {
  return crypto.subtle.importKey(
    'spki',
    fromBase64(publicKeyBase64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
}

/**
 * Encrypts `data` (any JSON-able object) for the server.
 * Returns { payload, aesKey }:
 *  - payload: { encryptedKey, iv, ciphertext } to send to the server
 *  - aesKey:  keep it to decrypt the server's reply
 */
export async function encryptRequest(data, publicKeyBase64) {
  // 1. Random one-time AES key (extractable so RSA can wrap its raw bytes).
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_BITS },
    true,
    ['encrypt', 'decrypt'],
  );

  // 2. Encrypt the message with AES-GCM using a fresh random IV.
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(JSON.stringify(data)),
  );

  // 3. Lock the AES key with the server's RSA public key.
  const rsaKey = await importPublicKey(publicKeyBase64);
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaKey, rawAesKey);

  return {
    payload: {
      encryptedKey: toBase64(encryptedKey),
      iv: toBase64(iv),
      ciphertext: toBase64(ciphertext),
    },
    aesKey,
  };
}

/** Decrypts the server's reply { iv, ciphertext } with the AES key from encryptRequest(). */
export async function decryptResponse(payload, aesKey) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    aesKey,
    fromBase64(payload.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}
