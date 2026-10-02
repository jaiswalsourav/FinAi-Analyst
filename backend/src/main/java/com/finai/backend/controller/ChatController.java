package com.finai.backend.controller;

import com.finai.backend.service.AiServiceClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ChatController {
    // POST http://localhost:8080/api/ask
    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

    private final AiServiceClient aiServiceClient;

    public ChatController(AiServiceClient aiServiceClient) {
        this.aiServiceClient = aiServiceClient;
    }

    // Frontend question (+ optional stock symbol and chat name) -> AI agent -> answer back to the frontend
    @PostMapping("/ask")
    public ResponseEntity<Map<String, String>> ask(@RequestBody Map<String, String> payload, Authentication authentication) {
        String question = payload.getOrDefault("question", "");
        String symbol = payload.getOrDefault("symbol", "");
        String chat = payload.getOrDefault("session", "");
        String username = authentication != null ? authentication.getName() : "anonymous";
        logger.info("Received /api/ask request from user={}, question={}", username, question);

        // One conversation per user (and per named chat, e.g. one per stock)
        String sessionId = chat == null || chat.isBlank() ? username : username + ":" + chat;
        if (sessionId.length() > 120) {
            sessionId = sessionId.substring(0, 120);
        }

        try {
            // The agent fetches market data itself via its tools; it only needs prompt, session and symbol
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("prompt", question);
            requestBody.put("session_id", sessionId);
            if (symbol != null && !symbol.isEmpty()) {
                requestBody.put("symbol", symbol);
            }

            Map<String, Object> response = aiServiceClient.post("/agent/ask", requestBody);
            logger.info("AI service responded for user={}", username);
            Object answer = response != null ? response.get("answer") : null;
            return ResponseEntity.ok(Map.of("answer", answer != null ? String.valueOf(answer) : "No response", "user", username));
        } catch (Exception ex) {
            logger.error("Failed to call AI service for user={}", username, ex);
            return ResponseEntity.status(502).body(Map.of("error", "Unable to reach the AI service right now. Please try again.", "user", username));
        }
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
