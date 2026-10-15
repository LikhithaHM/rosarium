package com.weeddetection.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** A sign-in session. The token string is what the browser sends as "Authorization: Bearer ...". */
@Entity
@Table(name = "auth_tokens")
public class AuthToken {

    @Id
    private String token;
    private Long userId;
    private LocalDateTime createdAt;

    public AuthToken() {
    }

    public AuthToken(String token, Long userId, LocalDateTime createdAt) {
        this.token = token;
        this.userId = userId;
        this.createdAt = createdAt;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
