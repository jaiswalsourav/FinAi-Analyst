package com.finai.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

@Configuration
public class UserDetailsConfig {

    @Bean
    public UserDetailsService userDetailsService() {
        UserDetails admin = User.withUsername("admin@company.com")
                .password("$2a$10$3qQm8R8V3mD2fQf0fVg3S.zLZ5n8Ck0YtgOKqaJ3V2xYxaYQk0pZ2")
                .roles("ADMIN")
                .build();

        UserDetails user = User.withUsername("user@company.com")
                .password("$2a$10$3qQm8R8V3mD2fQf0fVg3S.zLZ5n8Ck0YtgOKqaJ3V2xYxaYQk0pZ2")
                .roles("USER")
                .build();

        return new InMemoryUserDetailsManager(admin, user);
    }
}
