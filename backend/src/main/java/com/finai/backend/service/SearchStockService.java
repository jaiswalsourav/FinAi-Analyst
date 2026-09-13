package com.finai.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finai.backend.controller.SearchStockController.SearchStockName;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class SearchStockService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SearchStockService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public List<SearchStockName> stockNameSearch(String stockName) {
        if (stockName == null || stockName.trim().isEmpty()) {
            return Collections.emptyList();
        }

        List<SearchStockName> searchResults = new ArrayList<>();

        try {
            String encodedQuery = URLEncoder.encode(stockName.trim(), StandardCharsets.UTF_8);
            String webApiUrl = "https://query2.finance.yahoo.com/v1/finance/search?q="
                    + encodedQuery + "&quotesCount=10&newsCount=0";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(webApiUrl))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = this.httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode rootNode = this.objectMapper.readTree(response.body());
                JsonNode quotesNode = rootNode.path("quotes");

                for (JsonNode quoteNode : quotesNode) {
                    String symbol = quoteNode.path("symbol").asText("");
                    String exchange = quoteNode.path("exchange").asText("");
                    
                    // In Yahoo Finance, Indian NSE equities end in .NS and have exchange NSI/NSE
                    boolean isNseListed = symbol.endsWith(".NS") || exchange.equalsIgnoreCase("NSE") || exchange.equalsIgnoreCase("NSI");

                    if (isNseListed) {
                        String cleanSymbol = symbol.replace(".NS", "");
                        String stockNameResult = quoteNode.hasNonNull("shortname")
                                ? quoteNode.get("shortname").asText()
                                : quoteNode.path("longname").asText(cleanSymbol);

                        searchResults.add(new SearchStockName(
                                cleanSymbol,
                                "NSE:" + cleanSymbol,
                                stockNameResult,
                                true
                        ));
                    }
                }
            } else {
                throw new RuntimeException("Failed to fetch stock data. HTTP status code: " + response.statusCode());
            }
        } catch (Exception e) {
            System.err.println("Direct web search error: " + e.getMessage());
        }

        return searchResults;
    }
}