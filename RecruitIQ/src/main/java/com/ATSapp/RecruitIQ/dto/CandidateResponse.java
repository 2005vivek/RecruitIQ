package com.ATSapp.RecruitIQ.dto;

import com.ATSapp.RecruitIQ.model.Candidate;

import java.time.LocalDateTime;

public record CandidateResponse(
        Long id,
        String fullName,
        String email,
        String phoneNumber,
        String status,
        LocalDateTime createdAt
) {
    // Factory method: Converts a database Entity into a clean API Response DTO
    public static CandidateResponse fromEntity(Candidate candidate) {
        return new CandidateResponse(
                candidate.getId(),
                candidate.getFullName(),
                candidate.getEmail(),
                candidate.getPhoneNumber(),
                candidate.getStatus().name(),
                candidate.getCreatedAt()
        );
    }
}