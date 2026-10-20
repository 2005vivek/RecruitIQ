package com.ATSapp.RecruitIQ.controller;

import com.ATSapp.RecruitIQ.dto.AppiDeletionRequest;
import com.ATSapp.RecruitIQ.dto.CandidateCreateRequest;
import com.ATSapp.RecruitIQ.dto.CandidateResponse;
import com.ATSapp.RecruitIQ.service.AppiComplianceService;
import com.ATSapp.RecruitIQ.service.CandidateService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/candidates")
public class CandidateController {

    private final CandidateService candidateService;
    private final AppiComplianceService appiComplianceService;

    // Constructor injection: Spring provides the CandidateService bean
    public CandidateController(CandidateService candidateService,
                               AppiComplianceService appiComplianceService) {
        this.candidateService = candidateService;
        this.appiComplianceService = appiComplianceService;
    }

    // 1. Create a Candidate: POST /api/v1/candidates
    @PostMapping
    public ResponseEntity<CandidateResponse> createCandidate(@RequestBody CandidateCreateRequest request) {
        CandidateResponse created = candidateService.createCandidate(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // 2. Fetch candidate by ID: GET /api/v1/candidates/{id}
    @GetMapping("/{id}")
    public ResponseEntity<CandidateResponse> getCandidateById(@PathVariable Long id) {
        CandidateResponse response = candidateService.getCandidateById(id);
        return ResponseEntity.ok(response);
    }

    // 3. Fetch all candidates: GET /api/v1/candidates
    @GetMapping
    public ResponseEntity<List<CandidateResponse>> getAllCandidates() {
        List<CandidateResponse> candidates = candidateService.getAllCandidates();
        return ResponseEntity.ok(candidates);
    }
    @PostMapping("/{id}/appi-forget")
    public ResponseEntity<Map<String, Object>> forgetCandidate(
            @PathVariable Long id,
            @RequestBody AppiDeletionRequest request) {

        appiComplianceService.executeAppiRightToBeForgotten(id, request.auditReason());

        return ResponseEntity.ok(Map.of(
                "candidateId", id,
                "status", "ANONYMIZED",
                "message", "Personal data scrubbed and files purged in accordance with Japan APPI regulations.",
                "auditReason", request.auditReason()
        ));
    }
}