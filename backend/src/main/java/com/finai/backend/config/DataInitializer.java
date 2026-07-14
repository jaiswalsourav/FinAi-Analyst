package com.finai.backend.config;

import com.finai.backend.service.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initUsers(UserService userService) {
        return args -> {
            if (!userService.existsByEmail("admin@company.com")) {
                userService.createUser("admin@company.com", "admin123", "ADMIN");
            }
            if (!userService.existsByEmail("user@company.com")) {
                userService.createUser("user@company.com", "user123", "USER");
            }
        };
    }
}
