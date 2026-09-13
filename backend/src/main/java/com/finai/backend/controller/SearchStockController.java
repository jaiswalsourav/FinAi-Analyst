package com.finai.backend.controller;

import com.finai.backend.service.SearchStockService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/search")
public class SearchStockController {

    // DTO declared directly inside the controller
    public record SearchStockName(
        String symbol,
        String exchangeSymbol,
        String stockName,
        boolean isNseListed
    ) {}

    private final SearchStockService searchStockService;

    public SearchStockController(SearchStockService searchStockService) {
        this.searchStockService = searchStockService;
    }

    @GetMapping("/stocksname")
    public ResponseEntity<List<SearchStockName>> stockNameSearch(
            @RequestParam(value = "stockName", required = false) String stockName,
            @RequestParam(value = "q", required = false) String q) {

        String query = (stockName != null && !stockName.isBlank()) ? stockName : q;
        return ResponseEntity.ok(searchStockService.stockNameSearch(query));
    }
}