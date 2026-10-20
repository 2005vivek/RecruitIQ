package com.ATSapp.RecruitIQ.dto;

public record CandidateCreateRequest(
        String fullName,
        String email,
        String phoneNumber
) {
}