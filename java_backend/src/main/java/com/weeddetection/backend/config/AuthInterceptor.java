package com.weeddetection.backend.config;

import com.weeddetection.backend.entity.User;
import com.weeddetection.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Checks the "Authorization: Bearer <token>" header on every protected /api route. */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String CURRENT_USER = "currentUser";

    private final AuthService authService;

    public AuthInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true; // CORS preflight
        }

        User user = authService.resolve(bearerToken(request));
        if (user == null) {
            reject(response, HttpServletResponse.SC_UNAUTHORIZED, "Please sign in to continue.");
            return false;
        }

        if (request.getRequestURI().startsWith("/api/admin") && !"ADMIN".equals(user.getRole())) {
            reject(response, HttpServletResponse.SC_FORBIDDEN, "This page is for administrators only.");
            return false;
        }

        request.setAttribute(CURRENT_USER, user);
        return true;
    }

    public static String bearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        return null;
    }

    private static void reject(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
