package com.ATSapp.RecruitIQ.controller; // Ensure this matches your exact package name

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class RecruitIQHealthController {

    @GetMapping("/health")
    public Map<String, String> healthCheck() {
        return Map.of(
                "status", "UP",
                "service", "RecruitIQ Backend"
        );
    }
}