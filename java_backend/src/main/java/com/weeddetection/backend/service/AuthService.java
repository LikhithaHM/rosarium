package com.weeddetection.backend.service;

import com.weeddetection.backend.entity.AuthToken;
import com.weeddetection.backend.entity.User;
import com.weeddetection.backend.repository.AuthTokenRepository;
import com.weeddetection.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private static final Duration TOKEN_LIFETIME = Duration.ofDays(7);

    private final UserRepository users;
    private final AuthTokenRepository tokens;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository users, AuthTokenRepository tokens) {
        this.users = users;
        this.tokens = tokens;
    }

    /** What the browser gets back after signing in or registering. */
    public record UserView(Long id, String name, String email, String role) {
        public static UserView of(User u) {
            return new UserView(u.getId(), u.getName(), u.getEmail(), u.getRole());
        }
    }

    public record Session(String token, UserView user) {
    }

    public Session register(String name, String email, String password) {
        String cleanName = name == null ? "" : name.trim();
        String cleanEmail = normalise(email);

        if (cleanName.length() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please enter your name.");
        }
        if (!cleanEmail.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please enter a valid email address.");
        }
        if (password == null || password.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters.");
        }
        if (users.findByEmail(cleanEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        User user = new User();
        user.setName(cleanName);
        user.setEmail(cleanEmail);
        user.setPasswordHash(encoder.encode(password));
        user.setRole("USER");
        user.setCreatedAt(LocalDateTime.now());
        users.save(user);
        return startSession(user);
    }

    public Session login(String email, String password) {
        User user = users.findByEmail(normalise(email)).orElse(null);
        if (user == null || password == null || !encoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password.");
        }
        return startSession(user);
    }

    public void logout(String token) {
        if (token != null && tokens.existsById(token)) {
            tokens.deleteById(token);
        }
    }

    /** Returns the user for a valid, unexpired token, otherwise null. */
    public User resolve(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        AuthToken stored = tokens.findById(token).orElse(null);
        if (stored == null) {
            return null;
        }
        if (stored.getCreatedAt().plus(TOKEN_LIFETIME).isBefore(LocalDateTime.now())) {
            tokens.deleteById(token);
            return null;
        }
        return users.findById(stored.getUserId()).orElse(null);
    }

    /** Creates the default admin account the first time the app runs. */
    public void ensureDefaultAdmin() {
        if (users.existsByRole("ADMIN")) {
            return;
        }
        User admin = new User();
        admin.setName("Administrator");
        admin.setEmail("admin@rosarium.com");
        String adminPassword = System.getenv("ADMIN_PASSWORD");
        if (adminPassword == null || adminPassword.isBlank()) {
            adminPassword = "Admin@123";
        }
        admin.setPasswordHash(encoder.encode(adminPassword));
        admin.setRole("ADMIN");
        admin.setCreatedAt(LocalDateTime.now());
        users.save(admin);
    }

    private Session startSession(User user) {
        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        tokens.save(new AuthToken(token, user.getId(), LocalDateTime.now()));
        return new Session(token, UserView.of(user));
    }

    private static String normalise(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
