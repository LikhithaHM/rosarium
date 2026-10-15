package com.weeddetection.backend.repository;

import com.weeddetection.backend.entity.PredictionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PredictionRepository extends JpaRepository<PredictionRecord, Long> {

    List<PredictionRecord> findAllByOrderByCreatedAtDesc();

    /** A signed-in user's own history, newest first. */
    List<PredictionRecord> findTop500ByUserIdOrderByCreatedAtDesc(Long userId);

    /** Lightweight rows for analytics (no thumbnails): prediction, confidence, createdAt, userId. */
    @Query("select r.prediction, r.confidence, r.createdAt, r.userId from PredictionRecord r")
    List<Object[]> summaryRows();
}
