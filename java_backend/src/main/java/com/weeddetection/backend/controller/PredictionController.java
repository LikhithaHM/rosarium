package com.weeddetection.backend.controller;

import com.weeddetection.backend.entity.PredictionRecord;
import com.weeddetection.backend.entity.User;
import com.weeddetection.backend.service.PredictionService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PredictionController {

    private final PredictionService service;

    public PredictionController(PredictionService service) {
        this.service = service;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("java", "ok", "python", service.pythonStatus());
    }

    @PostMapping(value = "/predict", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PredictionRecord predict(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "thumbnail", required = false) String thumbnail,
                                    @RequestAttribute("currentUser") User user) {
        return service.predict(file, thumbnail, user.getId());
    }

    /** The signed-in user's own predictions, newest first. */
    @GetMapping("/history")
    public List<PredictionRecord> history(@RequestAttribute("currentUser") User user) {
        return service.historyFor(user.getId());
    }
}
