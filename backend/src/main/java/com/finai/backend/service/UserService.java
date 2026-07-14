package com.finai.backend.service;

import com.finai.backend.entity.UserEntity;
import com.finai.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

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
}
