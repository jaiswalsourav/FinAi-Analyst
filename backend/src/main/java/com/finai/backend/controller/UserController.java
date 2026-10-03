package com.finai.backend.controller;

import com.finai.backend.entity.UserEntity;
import com.finai.backend.security.EncryptedExchange;
import com.finai.backend.security.EncryptedPayload;
import com.finai.backend.security.JwtUtil;
import com.finai.backend.security.TimestampedRequest;
import com.finai.backend.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
//@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EncryptedExchange exchange;

    @Autowired
    public UserController(UserService userService, PasswordEncoder passwordEncoder, JwtUtil jwtUtil,
                          EncryptedExchange exchange) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.exchange = exchange;
    }

    @GetMapping("/error")
    public ResponseEntity<String> handleError() {
        return new ResponseEntity<>("An error occurred.", HttpStatus.INTERNAL_SERVER_ERROR);
    }
    /// registration endpoint /api/register
    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody RegisterRequest request) {

        System.out.println("Register request received: " + request.getEmail() + ", " + request.getName());
        if (request.getEmail() == null || request.getEmail().isBlank() || request.getPassword() == null
                || request.getPassword().isBlank() || request.getName() == null || request.getName().isBlank()) {
                    System.out.println("Registration failed: email, name, and password are required.");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email, name, and password are required.");
        }

          // Check if the user already exists
        if (userService.existsByEmail(request.getEmail())) {
            logger.info("Registration failed: user already exists email={}", request.getEmail());
            System.out.println("Registration failed: user already exists email=" + request.getEmail());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User already exists.");
        }
                
        UserEntity created = userService.createUser(request.getName(), request.getEmail(), request.getPassword(), "USER");
        logger.info("User registered successfully email={} role={}", created.getEmail(), created.getRole());
        System.out.println("User registered successfully email=" + created.getName() + ", role=" + created.getRole());
        return new ResponseEntity<>("User Created Successfully", HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public EncryptedPayload login(@RequestBody EncryptedPayload encryptedRequest) {
        EncryptedExchange.Call<LoginRequest> call = exchange.open(encryptedRequest, LoginRequest.class);
        LoginRequest request = call.request();
        if (request.getEmail() == null || request.getEmail().isBlank() || request.getPassword() == null
                || request.getPassword().isBlank()) {
                    System.out.println("Login failed: email and password are required.");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and password are required.");
        }

        UserEntity user = userService.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            logger.warn("Invalid login attempt for email={}", request.getEmail());
            System.out.println("Invalid login attempt for email=" + request.getEmail());
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        logger.info("Login successful for email={}", user.getEmail());
        System.out.println("Login successful for email=" + user.getEmail());
        // The JWT is encrypted too, so it never crosses the network in readable form.
        return exchange.reply(new AuthResponse(token), call);
    }

    @GetMapping("/users")
    public List<UserResponse> getUsers() {
        return userService.listUsers().stream()
                .map(user -> new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole()))
                .collect(Collectors.toList());
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated.");
        }

        UserEntity user = userService.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }

    public static class RegisterRequest {
        private String name;
        private String email;
        private String password;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class LoginRequest extends TimestampedRequest {
        private String email;
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class AuthResponse {
        private String token;

        public AuthResponse(String token) { this.token = token; }

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
    }

    public static class UserResponse {
        private Long id;
        private String name;
        private String email;
        private String role;

        public UserResponse(Long id, String name, String email, String role) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.role = role;
        }

        public Long getId() { return id; }
        public String getName() { return name; }
        public String getEmail() { return email; }
        public String getRole() { return role; }
    }
}
