package com.ATSapp.RecruitIQ.dto;

import com.ATSapp.RecruitIQ.model.DocumentType;
import com.ATSapp.RecruitIQ.model.Recommendation;

import java.util.List;

public record BenchmarkCaseResult(
        String caseId,
        String candidateProfile,
        DocumentType documentType,
        String language,
        Recommendation expectedRecommendation,
        Recommendation actualRecommendation,
        boolean isRecommendationAccurate,
        Double matchRatio,
        List<String> matchedCriteria,
        List<String> missingCriteria
) {
}