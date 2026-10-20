package com.ATSapp.RecruitIQ.dto;

import com.ATSapp.RecruitIQ.model.CriterionEvidence;

public record EvidenceResponse(
        String criterionName,
        String criterionType,
        boolean required,
        String status,
        String supportingExcerpt,
        String gapAnalysis,
        Double confidence
) {
    public static EvidenceResponse fromEntity(CriterionEvidence evidence) {
        return new EvidenceResponse(
                evidence.getCriterion().getName(),
                evidence.getCriterion().getType().name(),
                evidence.getCriterion().isRequired(),
                evidence.getStatus().name(),
                evidence.getSupportingExcerpt(),
                evidence.getGapAnalysis(),
                evidence.getConfidence()
        );
    }
}