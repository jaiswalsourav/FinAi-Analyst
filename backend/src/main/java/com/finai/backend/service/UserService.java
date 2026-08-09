package com.finai.backend.service;

import com.finai.backend.entity.UserEntity;
import com.finai.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserEntity createUser(String email, String password, String role) {
        UserEntity entity = new UserEntity();
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

    public String createPasswordResetToken(String email) {
        UserEntity user = findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        String token = UUID.randomUUID().toString();
        user.setPasswordResetToken(token);
        user.setPasswordResetExpiration(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        return token;
    }

    public Optional<UserEntity> findByResetToken(String token) {
        return userRepository.findByPasswordResetToken(token);
    }

    public void resetPassword(String token, String newPassword) {
        UserEntity user = findByResetToken(token)
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
}
