package com.finai.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Caps how often a client can hit the sensitive endpoints: the auth endpoints (password
 * guessing, reset-email spam) and /api/ask (each call spends Gemini quota).
 * In-memory fixed one-minute windows, which is enough for a single backend instance.
 *
 * Not a @Component: Spring Boot would also register it as a servlet filter that runs before
 * CORS, so its 429 replies would be unreadable in the browser. SecurityConfig adds it instead.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000;
    private static final int MAX_TRACKED_KEYS = 10_000;

    // Requests allowed per minute for each limited path
    private static final Map<String, Integer> LIMITS = Map.of(
            "/api/login", 10,
            "/api/register", 5,
            "/api/forgot-password", 5,
            "/api/reset-password", 10,
            "/api/ask", 15
    );

    private record Window(long start, AtomicInteger count) {}

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Integer limit = "POST".equals(request.getMethod()) ? LIMITS.get(request.getRequestURI()) : null;
        if (limit == null) {
            filterChain.doFilter(request, response);
            return;
        }

        long now = System.currentTimeMillis();
        if (windows.size() > MAX_TRACKED_KEYS) {
            windows.values().removeIf(window -> now - window.start() >= WINDOW_MS);
        }

        String key = request.getRequestURI() + "|" + clientKey(request);
        Window window = windows.compute(key, (k, current) ->
                current == null || now - current.start() >= WINDOW_MS ? new Window(now, new AtomicInteger()) : current);

        if (window.count().incrementAndGet() > limit) {
            long retryAfterS = Math.max(1, (window.start() + WINDOW_MS - now) / 1000);
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(retryAfterS));
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests. Please wait " + retryAfterS
                    + " seconds and try again.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    // Signed-in users are limited per account (runs after JwtAuthFilter), everyone else per IP
    private static String clientKey(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null && !"anonymousUser".equals(auth.getName())) {
            return "user:" + auth.getName();
        }
        return "ip:" + request.getRemoteAddr();
    }
}
