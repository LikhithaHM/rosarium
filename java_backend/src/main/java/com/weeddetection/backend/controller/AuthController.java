package com.weeddetection.backend.controller;

import com.weeddetection.backend.config.AuthInterceptor;
import com.weeddetection.backend.entity.User;
import com.weeddetection.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record RegisterRequest(String name, String email, String password) {
    }

    public record LoginRequest(String email, String password) {
    }

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthService.Session register(@RequestBody RegisterRequest body) {
        return authService.register(body.name(), body.email(), body.password());
    }

    @PostMapping("/login")
    public AuthService.Session login(@RequestBody LoginRequest body) {
        return authService.login(body.email(), body.password());
    }

    @GetMapping("/me")
    public AuthService.UserView me(@RequestAttribute("currentUser") User user) {
        return AuthService.UserView.of(user);
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletRequest request) {
        authService.logout(AuthInterceptor.bearerToken(request));
        return Map.of("status", "signed out");
    }
}
