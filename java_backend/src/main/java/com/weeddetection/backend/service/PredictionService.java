package com.weeddetection.backend.service;

import com.weeddetection.backend.dto.PythonPrediction;
import com.weeddetection.backend.entity.PredictionRecord;
import com.weeddetection.backend.repository.PredictionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class PredictionService {

    private final RestTemplate restTemplate;
    private final PredictionRepository repository;

    @Value("${python.api.url}")
    private String pythonApiUrl;

    public PredictionService(RestTemplate restTemplate, PredictionRepository repository) {
        this.restTemplate = restTemplate;
        this.repository = repository;
    }

    /** Sends the image to the Python CNN API, saves the result, returns it. */
    public PredictionRecord predict(MultipartFile file, String thumbnail, Long userId) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No image uploaded.");
        }

        final String name = file.getOriginalFilename() == null ? "image" : file.getOriginalFilename();

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read the uploaded file.");
        }

        ByteArrayResource resource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return name;
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", resource);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

        PythonPrediction result;
        try {
            result = restTemplate.postForObject(pythonApiUrl + "/predict", request, PythonPrediction.class);
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Python CNN API is not reachable at " + pythonApiUrl + ". Start it first.");
        } catch (HttpStatusCodeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "CNN API error: " + e.getResponseBodyAsString());
        }

        if (result == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "CNN API returned an empty response.");
        }

        PredictionRecord record = new PredictionRecord();
        record.setFileName(name);
        record.setPrediction(result.prediction());
        record.setConfidence(result.confidence());
        record.setWeedProbability(result.weedProbability());
        record.setCreatedAt(LocalDateTime.now());
        record.setUserId(userId);
        if (thumbnail != null && thumbnail.startsWith("data:image/") && thumbnail.length() < 300_000) {
            record.setThumbnail(thumbnail);
        }
        return repository.save(record);
    }

    public List<PredictionRecord> historyFor(Long userId) {
        return repository.findTop500ByUserIdOrderByCreatedAtDesc(userId);
    }

    /** "ok" if the Python API answers /health, otherwise "unreachable". */
    public String pythonStatus() {
        try {
            restTemplate.getForObject(pythonApiUrl + "/health", String.class);
            return "ok";
        } catch (RestClientException e) {
            return "unreachable";
        }
    }
}
