package com.finai.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

/**
 * The only way the backend talks to the AI service. Every call carries the shared
 * X-Internal-Key secret, which the AI service requires on all routes except /health.
 */
@Component
public class AiServiceClient {

    private static final ParameterizedTypeReference<Map<String, Object>> JSON_MAP = new ParameterizedTypeReference<>() {};

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String apiKey;

    public AiServiceClient(@Value("${AI_SERVICE_URL:http://localhost:8001}") String baseUrl,
                           @Value("${INTERNAL_API_KEY:}") String apiKey) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(180_000); // AI answers that call several data tools can take a while
        this.restTemplate = new RestTemplate(factory);
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    public Map<String, Object> get(String path, Map<String, String> query) {
        UriComponentsBuilder uri = UriComponentsBuilder.fromHttpUrl(baseUrl + path);
        query.forEach(uri::queryParam);
        return restTemplate.exchange(uri.build().encode().toUri(), HttpMethod.GET, new HttpEntity<>(headers()), JSON_MAP).getBody();
    }

    public Map<String, Object> post(String path, Object body) {
        return restTemplate.exchange(baseUrl + path, HttpMethod.POST, new HttpEntity<>(body, headers()), JSON_MAP).getBody();
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Key", apiKey);
        return headers;
    }
}
