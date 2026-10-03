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
 * password must never travel in readable form.
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
            System.out.println("Forgot password request failed: email is required.");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }

        // 2. Business logic: create the reset token.
        PasswordResetResponse response;
        try {
            String token = userService.createPasswordResetToken(request.getEmail());
            System.out.println("Password reset token created for email=" + request.getEmail());
            response = new PasswordResetResponse(request.getEmail(), token, "Password reset token created. Use this token to reset your password.");
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }

        // 3. Encrypt the reply (it contains the reset token).
        return exchange.reply(response, call);
    }

    /**
     * Request body : EncryptedPayload wrapping {"token": "...", "password": "...", "timestamp": 1234567890}
     * Response body: EncryptedPayload wrapping the PasswordResetResponse JSON
     */
    @PostMapping("/reset-password")
    public EncryptedPayload resetPassword(@RequestBody EncryptedPayload encryptedRequest) {
        EncryptedExchange.Call<ResetPasswordRequest> call =
                exchange.open(encryptedRequest, ResetPasswordRequest.class);
        ResetPasswordRequest request = call.request();
        if (request.getToken() == null || request.getToken().isBlank() || request.getPassword() == null
                || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token and new password are required.");
        }

        try {
            userService.resetPassword(request.getToken(), request.getPassword());
            System.out.println("Password reset successfully for email=");
            return exchange.reply(new PasswordResetResponse(null, null, "Password reset successfully."), call);
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
        private final String email;
        private final String token;
        private final String message;

        public PasswordResetResponse(String email, String token, String message) {
            this.email = email;
            this.token = token;
            this.message = message;
        }

        public String getEmail() { return email; }
        public String getToken() { return token; }
        public String getMessage() { return message; }
    }
}
