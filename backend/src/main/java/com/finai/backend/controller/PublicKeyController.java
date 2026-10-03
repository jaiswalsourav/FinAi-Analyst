package com.finai.backend.controller;

import com.finai.backend.security.HybridCrypto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Step 1 of the hybrid-encryption flow: the browser fetches our RSA public key
 * and uses it to lock its one-time AES key. The public key is not secret.
 */
@RestController
@RequestMapping("/api")
public class PublicKeyController {

    private final HybridCrypto hybridCrypto;

    public PublicKeyController(HybridCrypto hybridCrypto) {
        this.hybridCrypto = hybridCrypto;
    }

    @GetMapping("/public-key")
    public PublicKeyResponse publicKey() {
        return new PublicKeyResponse(hybridCrypto.getPublicKeyBase64());
    }

    public static class PublicKeyResponse {
        private final String publicKey;

        public PublicKeyResponse(String publicKey) { this.publicKey = publicKey; }

        public String getPublicKey() { return publicKey; }
    }
}
