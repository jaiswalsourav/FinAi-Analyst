package com.finai.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ChatController {

    @Value("${AI_SERVICE_URL:http://localhost:8001}")
    private String aiServiceUrl;

    @PostMapping("/ask")
    public Map<String, String> ask(@RequestBody Map<String, String> payload) {
        String question = payload.getOrDefault("question", "");
        RestTemplate restTemplate = new RestTemplate();
        Map<String, String> response = restTemplate.postForObject(aiServiceUrl + "/ask", Map.of("question", question), Map.class);
        return Map.of("answer", response != null ? String.valueOf(response.getOrDefault("answer", "No response")) : "No response");
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
