package com.weeddetection.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/** Shape of the JSON returned by the Python API. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PythonPrediction(
        String prediction,
        double confidence,
        @JsonProperty("weed_probability") double weedProbability) {
}
