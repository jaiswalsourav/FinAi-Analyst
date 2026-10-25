package com.finai.backend.service;

import com.finai.backend.entity.UserEntity;
import com.finai.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    public static final int MIN_PASSWORD_LENGTH = 8;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailer resetMailer;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, PasswordResetMailer resetMailer) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.resetMailer = resetMailer;
    }

    public UserEntity createUser(String name, String email, String password, String role) {
        UserEntity entity = new UserEntity();
        entity.setName(name.trim());
        entity.setEmail(email.trim().toLowerCase());
        entity.setPassword(passwordEncoder.encode(password));
        entity.setRole(role);
        return userRepository.save(entity);
    }

    public Optional<UserEntity> findByEmail(String email) {
        return userRepository.findByEmail(email.trim().toLowerCase());
    }

    public boolean existsByEmail(String email) {
        return findByEmail(email).isPresent();
    }

    /**
     * Emails a reset link if the account exists. Says nothing either way, so the
     * endpoint can't be used to find out which emails are registered.
     */
    public void requestPasswordReset(String email) {
        findByEmail(email).ifPresent(user -> {
            byte[] bytes = new byte[32];
            RANDOM.nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

            // Only the hash is stored, so a database leak doesn't expose usable tokens
            user.setPasswordResetToken(hashToken(token));
            user.setPasswordResetExpiration(LocalDateTime.now().plusHours(1));
            userRepository.save(user);

            resetMailer.sendResetLink(user.getEmail(), token);
        });
    }

    public void resetPassword(String token, String newPassword) {
        if (newPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("Password must be at least " + MIN_PASSWORD_LENGTH + " characters.");
        }
        UserEntity user = userRepository.findByPasswordResetToken(hashToken(token))
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired token."));

        if (user.getPasswordResetExpiration() == null || user.getPasswordResetExpiration().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Reset token has expired.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiration(null);
        userRepository.save(user);
    }

    public List<UserEntity> listUsers() {
        return userRepository.findAll();
    }

    private static String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
