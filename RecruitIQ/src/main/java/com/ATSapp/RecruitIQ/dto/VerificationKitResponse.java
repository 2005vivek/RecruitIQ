package com.ATSapp.RecruitIQ.dto;

import com.ATSapp.RecruitIQ.model.DocumentType;

import java.util.List;
import java.util.Map;

public record VerificationKitResponse(
        Long reportId,
        Long candidateId,
        DocumentType documentType,
        Map<String, String> extractedSections,
        List<InterviewQuestionDto> interviewQuestions
) {
}