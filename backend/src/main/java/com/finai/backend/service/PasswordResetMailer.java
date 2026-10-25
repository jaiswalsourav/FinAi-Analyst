package com.finai.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Sends the password reset link by email. The token must only ever reach the inbox of
 * the account owner, never the HTTP response, or anyone could reset anyone's password.
 */
@Service
public class PasswordResetMailer {

    private static final Logger logger = LoggerFactory.getLogger(PasswordResetMailer.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String mailHost;
    private final String from;
    private final String baseUrl;

    public PasswordResetMailer(ObjectProvider<JavaMailSender> mailSender,
                               @Value("${spring.mail.host:}") String mailHost,
                               @Value("${mail.from}") String from,
                               @Value("${app.base-url}") String baseUrl) {
        this.mailSender = mailSender;
        this.mailHost = mailHost;
        this.from = from;
        this.baseUrl = baseUrl;
    }

    // Async so the forgot-password response takes the same time whether or not the email exists
    @Async
    public void sendResetLink(String email, String token) {
        String link = UriComponentsBuilder.fromHttpUrl(baseUrl).queryParam("resetToken", token).toUriString();

        // Compose passes SPRING_MAIL_HOST as "" when unset, which still creates a (useless) sender
        JavaMailSender sender = mailHost.isBlank() ? null : mailSender.getIfAvailable();
        if (sender == null) {
            // Local development without SMTP: the link only goes to the server log
            logger.warn("SPRING_MAIL_HOST is not set, so no email was sent. Reset link for {}: {}", email, link);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Reset your FinAI Analyst password");
        message.setText("Someone asked to reset the password for this account.\n\n"
                + "Open this link within 1 hour to choose a new password:\n" + link + "\n\n"
                + "If it wasn't you, ignore this email; your password stays the same.");
        try {
            sender.send(message);
            logger.info("Password reset email sent to {}", email);
        } catch (Exception e) {
            logger.error("Failed to send password reset email to {}", email, e);
        }
    }
}
