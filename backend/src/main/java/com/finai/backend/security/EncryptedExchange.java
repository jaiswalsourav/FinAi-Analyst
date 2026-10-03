package com.finai.backend.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKey;

/**
 * Glue between controllers and {@link HybridCrypto} so each encrypted endpoint only needs:
 * <pre>
 *   Call&lt;MyRequest&gt; call = exchange.open(payload, MyRequest.class);   // decrypt + validate
 *   ...business logic using call.request()...
 *   return exchange.reply(myResponse, call);                          // encrypt the answer
 * </pre>
 */
@Component
public class EncryptedExchange {

    // Encrypted requests older than this (or dated in the future) are rejected.
    private static final long MAX_REQUEST_AGE_MS = 5 * 60 * 1000L;

    private final HybridCrypto hybridCrypto;
    private final ObjectMapper objectMapper;

    public EncryptedExchange(HybridCrypto hybridCrypto, ObjectMapper objectMapper) {
        this.hybridCrypto = hybridCrypto;
        this.objectMapper = objectMapper;
    }

    /** A decrypted request plus the AES key needed to encrypt the reply. */
    public record Call<T>(T request, SecretKey aesKey) {
    }

    /** Decrypts the body (RSA unlocks the AES key, AES decrypts), parses it and rejects stale requests. */
    public <T extends TimestampedRequest> Call<T> open(EncryptedPayload payload, Class<T> type) {
        HybridCrypto.DecryptedMessage decrypted = hybridCrypto.decryptRequest(payload);
        T request = parseJson(decrypted.plaintext(), type);
        rejectStaleRequest(request.getTimestamp());
        return new Call<>(request, decrypted.aesKey());
    }

    /** Serializes the response object and encrypts it with the same AES key the request used. */
    public EncryptedPayload reply(Object response, Call<?> call) {
        return hybridCrypto.encryptResponse(toJson(response), call.aesKey());
    }

    /**
     * Replay protection: AES-GCM stops tampering, but an attacker could resend a captured
     * request. Requiring a recent timestamp limits how long a captured request stays useful.
     */
    private void rejectStaleRequest(Long timestampMillis) {
        if (timestampMillis == null || Math.abs(System.currentTimeMillis() - timestampMillis) > MAX_REQUEST_AGE_MS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request expired. Please try again.");
        }
    }

    private <T> T parseJson(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid request.");
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to build response.");
        }
    }
}
