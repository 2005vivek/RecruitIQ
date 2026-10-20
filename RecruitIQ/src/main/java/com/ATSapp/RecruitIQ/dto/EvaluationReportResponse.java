package com.ATSapp.RecruitIQ.dto;

import com.ATSapp.RecruitIQ.model.EvaluationReport;

import java.time.LocalDateTime;
import java.util.List;

public record EvaluationReportResponse(
        Long reportId,
        Long resumeId,
        Long jobOpeningId,
        String jobTitle,
        Integer criteriaVersion,
        String recommendation,
        Double matchRatio,
        boolean humanOverride,
        String overrideReason,
        List<EvidenceResponse> evidence,
        LocalDateTime evaluatedAt
) {
    public static EvaluationReportResponse fromEntity(EvaluationReport report) {
        return new EvaluationReportResponse(
                report.getId(),
                report.getResume().getId(),
                report.getJobOpening().getId(),
                report.getJobOpening().getTitle(),
                report.getCriteriaVersionEvaluated(),
                report.getRecommendation().name(),
                report.getConfidenceScore(),
                report.isHumanOverride(),
                report.getOverrideReason(),
                report.getEvidenceList().stream().map(EvidenceResponse::fromEntity).toList(),
                report.getEvaluatedAt()
        );
    }
}