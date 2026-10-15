package com.weeddetection.backend.controller;

import com.weeddetection.backend.repository.PredictionRepository;
import com.weeddetection.backend.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Analytics for the admin dashboard. Only ADMIN accounts get past AuthInterceptor. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    public record DayCount(String date, long count) {
    }

    public record Stats(long totalPredictions,
                        long roseCount,
                        long weedCount,
                        double averageConfidence,
                        long registeredUsers,
                        long activeUsers,
                        List<DayCount> perDay) {
    }

    private static final int DAYS_SHOWN = 14;

    private final PredictionRepository predictions;
    private final UserRepository users;

    public AdminController(PredictionRepository predictions, UserRepository users) {
        this.predictions = predictions;
        this.users = users;
    }

    @GetMapping("/stats")
    public Stats stats() {
        List<Object[]> rows = predictions.summaryRows();

        long rose = 0;
        long weed = 0;
        double confidenceSum = 0;
        Set<Long> activeUserIds = new HashSet<>();
        Map<LocalDate, Long> byDay = new HashMap<>();

        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);

        for (Object[] row : rows) {
            String label = row[0] == null ? "" : row[0].toString().toLowerCase();
            boolean isWeed = label.contains("weed") && !label.contains("no weed");
            if (isWeed) {
                weed++;
            } else {
                rose++;
            }

            confidenceSum += row[1] == null ? 0 : ((Number) row[1]).doubleValue();

            LocalDateTime when = (LocalDateTime) row[2];
            if (when != null) {
                byDay.merge(when.toLocalDate(), 1L, Long::sum);
                if (row[3] != null && when.isAfter(weekAgo)) {
                    activeUserIds.add(((Number) row[3]).longValue());
                }
            }
        }

        List<DayCount> perDay = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = DAYS_SHOWN - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            perDay.add(new DayCount(day.toString(), byDay.getOrDefault(day, 0L)));
        }

        long total = rows.size();
        double average = total == 0 ? 0 : confidenceSum / total;

        return new Stats(total, rose, weed, average, users.count(), activeUserIds.size(), perDay);
    }
}
