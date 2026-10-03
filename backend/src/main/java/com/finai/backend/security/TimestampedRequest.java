package com.finai.backend.security;

/**
 * Base class for every decrypted request body. The client stamps each request with its
 * clock (epoch millis) so the server can reject replayed requests.
 */
public abstract class TimestampedRequest {

    private Long timestamp;

    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
}
