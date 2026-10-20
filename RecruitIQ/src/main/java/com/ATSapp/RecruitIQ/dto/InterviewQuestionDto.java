package com.ATSapp.RecruitIQ.dto;

public record InterviewQuestionDto(
        String targetArea,
        String sourceExcerpt,
        String verificationGoal,
        String suggestedQuestion,
        String evaluationCriteria
) {
}