package com.finai.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger logger =
            LoggerFactory.getLogger(JwtAuthFilter.class);

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // No JWT -> continue normally
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            if (jwtUtil.isTokenValid(token)) {

                String email = jwtUtil.extractEmail(token);
                String role = jwtUtil.extractRole(token);

                logger.info(
                        "JWT valid: email={}, role={}",
                        email,
                        role
                );

                List<SimpleGrantedAuthority> authorities =
                        List.of(
                                new SimpleGrantedAuthority("ROLE_" + role)
                        );

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                email,
                                null,
                                authorities
                        );

                SecurityContextHolder
                        .getContext()
                        .setAuthentication(authentication);

            } else {
                logger.warn("Invalid or expired JWT token");
            }

        } catch (Exception e) {
            logger.error("JWT authentication failed", e);
        }

        filterChain.doFilter(request, response);
    }
}