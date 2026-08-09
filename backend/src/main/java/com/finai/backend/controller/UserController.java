package com.finai.backend.controller;

import com.finai.backend.entity.UserEntity;
import com.finai.backend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@RequestBody RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank() || request.getPassword() == null
                || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and password are required.");
        }

        if (userService.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User already exists.");
        }

        UserEntity created = userService.createUser(request.getEmail(), request.getPassword(), "USER");
        return new UserResponse(created.getId(), created.getEmail(), created.getRole());
    }

    @PostMapping("/forgot-password")
    public PasswordResetResponse forgotPassword(@RequestBody ForgotPasswordRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }

        try {
            String token = userService.createPasswordResetToken(request.getEmail());
            return new PasswordResetResponse(request.getEmail(), token, "Password reset token created. Use this token to reset your password.");
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public PasswordResetResponse resetPassword(@RequestBody ResetPasswordRequest request) {
        if (request.getToken() == null || request.getToken().isBlank() || request.getPassword() == null
                || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token and new password are required.");
        }

        try {
            userService.resetPassword(request.getToken(), request.getPassword());
            return new PasswordResetResponse(null, null, "Password reset successfully.");
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @GetMapping("/users")
    public List<UserResponse> getUsers() {
        return userService.listUsers().stream()
                .map(user -> new UserResponse(user.getId(), user.getEmail(), user.getRole()))
                .collect(Collectors.toList());
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated.");
        }

        UserEntity user = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        return new UserResponse(user.getId(), user.getEmail(), user.getRole());
    }

    public static class RegisterRequest {
        private String email;
        private String password;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class UserResponse {
        private Long id;
        private String email;
        private String role;

        public UserResponse(Long id, String email, String role) {
            this.id = id;
            this.email = email;
            this.role = role;
        }

        public Long getId() {
            return id;
        }

        public String getEmail() {
            return email;
        }

        public String getRole() {
            return role;
        }
    }

    public static class ForgotPasswordRequest {
        private String email;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }

    public static class ResetPasswordRequest {
        private String token;
        private String password;

        public String getToken() {
            return token;
        }

        public void setToken(String token) {
            this.token = token;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class PasswordResetResponse {
        private String email;
        private String token;
        private String message;

        public PasswordResetResponse(String email, String token, String message) {
            this.email = email;
            this.token = token;
            this.message = message;
        }

        public String getEmail() {
            return email;
        }

        public String getToken() {
            return token;
        }

        public String getMessage() {
            return message;
        }
    }
}
