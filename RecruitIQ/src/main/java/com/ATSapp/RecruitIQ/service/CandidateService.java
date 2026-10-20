package com.ATSapp.RecruitIQ.service;

import com.ATSapp.RecruitIQ.dto.CandidateCreateRequest;
import com.ATSapp.RecruitIQ.dto.CandidateResponse;
import com.ATSapp.RecruitIQ.model.Candidate;
import com.ATSapp.RecruitIQ.repository.CandidateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CandidateService {

    private final CandidateRepository candidateRepository;

    // 1. Constructor Injection: Spring supplies the CandidateRepository bean automatically
    public CandidateService(CandidateRepository candidateRepository) {
        this.candidateRepository = candidateRepository;
    }

    // 2. Write Operation: Needs a database transaction
    @Transactional
    public CandidateResponse createCandidate(CandidateCreateRequest request) {
        // Business Rule: Duplicate email prevention
        if (candidateRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Candidate with email " + request.email() + " already exists.");
        }

        // Map DTO -> Entity (Preparing the object for PostgreSQL)
        Candidate candidate = Candidate.builder()
                .fullName(request.fullName())
                .email(request.email())
                .phoneNumber(request.phoneNumber())
                .build();

        // Save through the dynamic proxy implementation
        Candidate savedCandidate = candidateRepository.save(candidate);

        // Map Entity -> DTO (Preparing clean data for the client)
        return CandidateResponse.fromEntity(savedCandidate);
    }

    // 3. Read Operation: Read-only transaction optimization
    @Transactional(readOnly = true)
    public CandidateResponse getCandidateById(Long id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidate not found with id: " + id));

        return CandidateResponse.fromEntity(candidate);
    }

    // 4. Read Operation: Fetch all records and map via Java Streams
    @Transactional(readOnly = true)
    public List<CandidateResponse> getAllCandidates() {
        return candidateRepository.findAll()
                .stream()
                .map(CandidateResponse::fromEntity)
                .toList();
    }
}