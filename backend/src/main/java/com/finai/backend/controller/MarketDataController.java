package com.finai.backend.controller;

import com.finai.backend.service.AiServiceClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpStatusCodeException;

import java.util.Map;
import java.util.regex.Pattern;

/**
 * Login-protected pass-through to the AI service's market data, so the browser never
 * talks to the AI service directly (it requires an internal key the browser must not have).
 */
@RestController
@RequestMapping("/api")
public class MarketDataController {

    private static final Logger logger = LoggerFactory.getLogger(MarketDataController.class);
    // e.g. NSE:TCS, NASDAQ:AAPL, INFY.NS, M&M, ^NSEI
    private static final Pattern RANGE = Pattern.compile("^(1d|5d|1mo|6mo|1y|5y)$");
    private static final Pattern SYMBOL = Pattern.compile("^[A-Za-z0-9:.&^\\-]{1,30}$");

    private final AiServiceClient aiServiceClient;

    public MarketDataController(AiServiceClient aiServiceClient) {
        this.aiServiceClient = aiServiceClient;
    }

    @GetMapping("/stock-info")
    public ResponseEntity<?> stockInfo(@RequestParam("symbol") String symbol) {
        return proxy("/stock-info", symbol);
    }

    @GetMapping("/stock-news")
    public ResponseEntity<?> stockNews(@RequestParam("symbol") String symbol) {
        return proxy("/stock-news", symbol);
    }

    @GetMapping("/stock-history")
    public ResponseEntity<?> stockHistory(@RequestParam("symbol") String symbol,
                                          @RequestParam(value = "range", defaultValue = "6mo") String range) {
        if (!SYMBOL.matcher(symbol).matches() || !RANGE.matcher(range).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid symbol or range"));
        }
        return forward("/stock-history", Map.of("symbol", symbol, "range", range));
    }

    @GetMapping("/market-overview")
    public ResponseEntity<?> marketOverview() {
        return forward("/market-overview", Map.of());
    }

    private ResponseEntity<?> proxy(String path, String symbol) {
        if (!SYMBOL.matcher(symbol).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid symbol"));
        }
        return forward(path, Map.of("symbol", symbol));
    }

    private ResponseEntity<?> forward(String path, Map<String, String> query) {
        String symbol = query.getOrDefault("symbol", "-");
        try {
            return ResponseEntity.ok(aiServiceClient.get(path, query));
        } catch (HttpStatusCodeException ex) {
            // Pass the AI service's own status and {"detail": ...} message through
            logger.warn("AI service {} returned {} for symbol={}", path, ex.getStatusCode(), symbol);
            return ResponseEntity.status(ex.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(ex.getResponseBodyAsString());
        } catch (Exception ex) {
            logger.error("Failed to call AI service {} for symbol={}", path, symbol, ex);
            return ResponseEntity.status(502).body(Map.of("error", "Unable to reach AI service."));
        }
    }
}
