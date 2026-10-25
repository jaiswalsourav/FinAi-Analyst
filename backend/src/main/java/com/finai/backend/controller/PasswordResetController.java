package com.finai.backend.controller;

import com.finai.backend.security.EncryptedExchange;
import com.finai.backend.security.EncryptedPayload;
import com.finai.backend.security.TimestampedRequest;
import com.finai.backend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Forgot-password / reset-password flow. Both endpoints use hybrid encryption
 * (see {@link com.finai.backend.security.HybridCrypto}): the request body is an
 * EncryptedPayload and so is the response, because the reset token and the new
 * password must never travel in readable form. The token itself only reaches the
 * user by email (see {@link com.finai.backend.service.PasswordResetMailer}).
 */
@RestController
@RequestMapping("/api")
public class PasswordResetController {

    private final UserService userService;
    private final EncryptedExchange exchange;

    public PasswordResetController(UserService userService, EncryptedExchange exchange) {
        this.userService = userService;
        this.exchange = exchange;
    }

    /**
     * Request body : EncryptedPayload wrapping {"email": "...", "timestamp": 1234567890}
     * Response body: EncryptedPayload wrapping the PasswordResetResponse JSON
     */
    @PostMapping("/forgot-password")
    public EncryptedPayload forgotPassword(@RequestBody EncryptedPayload encryptedRequest) {
        // 1. Decrypt and validate the timestamp.
        EncryptedExchange.Call<ForgotPasswordRequest> call =
                exchange.open(encryptedRequest, ForgotPasswordRequest.class);
        ForgotPasswordRequest request = call.request();
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }

        // 2. Email the reset link to the account owner. The token is never put in the response,
        //    and the reply is the same whether the account exists or not.
        userService.requestPasswordReset(request.getEmail());

        // 3. Encrypt the reply.
        return exchange.reply(new PasswordResetResponse(
                "If an account exists for this email, a password reset link has been sent to it."), call);
    }

    /**
     * Request body : EncryptedPayload wrapping {"token": "...", "password": "...", "timestamp": 1234567890}
     * Response body: EncryptedPayload wrapping the PasswordResetResponse JSON
     */
    @PostMapping("/reset-password")
    public EncryptedPayload resetPassword(@RequestBody EncryptedPayload encryptedRequest) {
        // 1. Decrypt and validate the timestamp.
        EncryptedExchange.Call<ResetPasswordRequest> call =
                exchange.open(encryptedRequest, ResetPasswordRequest.class);
        ResetPasswordRequest request = call.request();
        if (request.getToken() == null || request.getToken().isBlank() || request.getPassword() == null
                || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token and new password are required.");
        }

        try {
            userService.resetPassword(request.getToken(), request.getPassword());
            return exchange.reply(new PasswordResetResponse("Password reset successfully."), call);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    /** The decrypted content of a forgot-password request. */
    public static class ForgotPasswordRequest extends TimestampedRequest {
        private String email;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    /** The decrypted content of a reset-password request. */
    public static class ResetPasswordRequest extends TimestampedRequest {
        private String token;
        private String password;

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class PasswordResetResponse {
        private final String message;

        public PasswordResetResponse(String message) {
            this.message = message;
        }

        public String getMessage() { return message; }
    }
}
