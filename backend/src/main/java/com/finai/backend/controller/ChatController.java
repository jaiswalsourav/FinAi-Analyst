package com.finai.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.security.core.Authentication;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ChatController {
//http://localhost:8080/api/ask
    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

    @Value("${AI_SERVICE_URL:http://localhost:8001}")
    private String aiServiceUrl;

    @PostMapping("/ask")
    public Map<String, String> ask(@RequestBody Map<String, String> payload, Authentication authentication) {
        String question = payload.getOrDefault("question", "");
        String username = authentication != null ? authentication.getName() : "anonymous";
        logger.info("Received /api/ask request from user={}, question={}", username, question);

        RestTemplate restTemplate = new RestTemplate();
        try {
            Map<String, String> response = restTemplate.postForObject(aiServiceUrl + "/ask", Map.of("question", question), Map.class);
            logger.info("AI service response for user={}: {}", username, response);
            String answer = response != null ? String.valueOf(response.getOrDefault("answer", "No response")) : "No response";
            return Map.of("answer", answer, "user", username);
        } catch (Exception ex) {
            logger.error("Failed to call AI service at {} for user={}", aiServiceUrl, username, ex);
            return Map.of("answer", "Unable to reach AI service.", "user", username);
        }
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
