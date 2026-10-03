package com.finai.backend.security;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.spec.MGF1ParameterSpec;
import java.util.Base64;

/**
 * Hybrid encryption = asymmetric (RSA) + symmetric (AES).
 *
 * Why both?
 *  - RSA can share a secret safely with anyone (public key locks, private key unlocks),
 *    but it is slow and can only encrypt a few hundred bytes.
 *  - AES is fast and handles any message size, but both sides need the same secret key.
 *
 * So we combine them:
 *  1. The browser creates a random one-time AES key.
 *  2. The browser encrypts the real message with that AES key.
 *  3. The browser locks the AES key with our RSA public key and sends both.
 *  4. We unlock the AES key with our RSA private key (only this server has it),
 *     then use it to decrypt the message.
 *  5. We encrypt our reply with the same AES key, so only that browser can read it.
 *
 * The algorithm settings below must match frontend/src/services/hybridCrypto.js exactly.
 */
@Component
public class HybridCrypto {

    private static final String RSA_TRANSFORMATION = "RSA/ECB/OAEPPadding";
    private static final String AES_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int RSA_KEY_BITS = 2048;
    private static final int GCM_IV_BYTES = 12;     // standard nonce size for GCM
    private static final int GCM_TAG_BITS = 128;    // authentication tag length

    /*
     * Java's default OAEP uses SHA-1 for its internal MGF1 step, while the browser's
     * Web Crypto uses the same hash (SHA-256) for both. We pin SHA-256 / SHA-256
     * explicitly, otherwise decryption fails with a "padding" error.
     */
    private static final OAEPParameterSpec OAEP_SHA256 = new OAEPParameterSpec(
            "SHA-256", "MGF1", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT);

    private final SecureRandom secureRandom = new SecureRandom();
    private final KeyPair rsaKeyPair;

    /**
     * A fresh RSA key pair is generated each time the server starts. The private key stays
     * in memory and is never sent anywhere. (Running several backend instances would need
     * a shared, persisted key instead.)
     */
    public HybridCrypto() throws GeneralSecurityException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(RSA_KEY_BITS);
        this.rsaKeyPair = generator.generateKeyPair();
    }

    /** The RSA public key (X.509 / SPKI format) as Base64, safe to hand out to browsers. */
    public String getPublicKeyBase64() {
        return Base64.getEncoder().encodeToString(rsaKeyPair.getPublic().getEncoded());
    }

    /** Result of decrypting a request: the readable message plus the AES key to reply with. */
    public record DecryptedMessage(String plaintext, SecretKey aesKey) {
    }

    /** Steps 4a + 4b: unlock the AES key with RSA, then decrypt the message with AES. */
    public DecryptedMessage decryptRequest(EncryptedPayload payload) {
        try {
            // 4a. RSA: recover the one-time AES key.
            Cipher rsa = Cipher.getInstance(RSA_TRANSFORMATION);
            rsa.init(Cipher.DECRYPT_MODE, rsaKeyPair.getPrivate(), OAEP_SHA256);
            byte[] aesKeyBytes = rsa.doFinal(decode(payload.encryptedKey()));
            SecretKey aesKey = new SecretKeySpec(aesKeyBytes, "AES");

            // 4b. AES-GCM: decrypt the message. Throws if the data was altered.
            byte[] plain = aesCipher(Cipher.DECRYPT_MODE, aesKey, decode(payload.iv()))
                    .doFinal(decode(payload.ciphertext()));
            return new DecryptedMessage(new String(plain, StandardCharsets.UTF_8), aesKey);
        } catch (GeneralSecurityException | IllegalArgumentException | NullPointerException ex) {
            // Deliberately vague: don't tell an attacker which step failed.
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid encrypted request.");
        }
    }

    /** Step 5: encrypt the reply with the AES key from the request, using a brand-new IV. */
    public EncryptedPayload encryptResponse(String plaintext, SecretKey aesKey) {
        try {
            byte[] iv = new byte[GCM_IV_BYTES];
            secureRandom.nextBytes(iv); // never reuse an IV with the same key
            byte[] cipherText = aesCipher(Cipher.ENCRYPT_MODE, aesKey, iv)
                    .doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return new EncryptedPayload(null, encode(iv), encode(cipherText));
        } catch (GeneralSecurityException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to encrypt response.");
        }
    }

    private Cipher aesCipher(int mode, SecretKey key, byte[] iv) throws GeneralSecurityException {
        Cipher cipher = Cipher.getInstance(AES_TRANSFORMATION);
        cipher.init(mode, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
        return cipher;
    }

    private static byte[] decode(String base64) {
        return Base64.getDecoder().decode(base64);
    }

    private static String encode(byte[] bytes) {
        return Base64.getEncoder().encodeToString(bytes);
    }
}
