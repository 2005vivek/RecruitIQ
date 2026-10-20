package com.ATSapp.RecruitIQ.dto;

import java.time.LocalDateTime;
import java.util.List;

public record BlindEvaluationResponse(
        Long reportId,
        String anonymousCandidateCode,
        String jobTitle,
        Integer criteriaVersion,
        String recommendation,
        Double matchRatio,
        boolean humanOverride,
        String overrideReason,
        List<EvidenceResponse> sanitizedEvidence,
        LocalDateTime evaluatedAt
) {
}