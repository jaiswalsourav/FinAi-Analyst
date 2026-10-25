package com.finai.backend.config;

import com.finai.backend.repository.UserRepository;
import com.finai.backend.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD, so no fixed admin password
 * ships with the code. Does nothing once that account exists.
 */
@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    // Hash of the admin password the old data.sql seeded; it is public in the git history
    private static final String OLD_SEEDED_HASH = "$2a$10$M6pWBqzOe5h4bZfAtraVYuu1Z6HQRQ7UAnfiVv0muNiVtO2Cb1ve6";

    private final UserService userService;
    private final UserRepository userRepository;
    private final String adminEmail;
    private final String adminPassword;

    public DataInitializer(UserService userService, UserRepository userRepository,
                           @Value("${admin.email}") String adminEmail,
                           @Value("${admin.password}") String adminPassword) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        userRepository.findAll().stream()
                .filter(user -> OLD_SEEDED_HASH.equals(user.getPassword()))
                .forEach(user -> logger.error("Account {} still uses the password from the old data.sql seed. "
                        + "Change its password now.", user.getEmail()));

        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            return;
        }
        if (adminPassword.length() < UserService.MIN_PASSWORD_LENGTH) {
            logger.error("ADMIN_PASSWORD must be at least {} characters; admin account not created.",
                    UserService.MIN_PASSWORD_LENGTH);
            return;
        }
        if (!userService.existsByEmail(adminEmail)) {
            userService.createUser("Admin", adminEmail, adminPassword, "ADMIN");
            logger.info("Created admin account {}", adminEmail);
        }
    }
}
