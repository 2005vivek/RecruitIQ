package com.ATSapp.RecruitIQ.service;

import com.ATSapp.RecruitIQ.dto.InterviewQuestionDto;
import com.ATSapp.RecruitIQ.model.CriterionEvidence;
import com.ATSapp.RecruitIQ.model.EvaluationReport;
import com.ATSapp.RecruitIQ.model.MatchStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class ClaimVerificationService {

    // Regex triggers for high-impact architecture, performance, or leadership claims
    private static final Pattern HIGH_IMPACT_PATTERN = Pattern.compile(
            "(?i)\\b(architected|scaled|distributed|concurrency|performance|optimized|reduced latency|high availability|構築|設計|最適化|リーダー)\\b"
    );

    public List<InterviewQuestionDto> generateVerificationQuestions(EvaluationReport report) {
        List<InterviewQuestionDto> questions = new ArrayList<>();

        for (CriterionEvidence evidence : report.getEvidenceList()) {
            String criterionName = evidence.getCriterion().getName();

            // Scenario 1: Candidate explicitly matched a criterion
            if (evidence.getStatus() == MatchStatus.MATCHED && evidence.getSupportingExcerpt() != null) {
                String excerpt = evidence.getSupportingExcerpt();

                if (HIGH_IMPACT_PATTERN.matcher(excerpt).find()) {
                    questions.add(new InterviewQuestionDto(
                            criterionName,
                            excerpt,
                            "Candidate claims architecture or optimization experience with " + criterionName + ".",
                            "Can you walk through the system constraints and exact metrics used to validate your " + criterionName + " design?",
                            "Look for concrete trade-off analysis, failure modes, and monitoring tools rather than general definitions."
                    ));
                } else {
                    questions.add(new InterviewQuestionDto(
                            criterionName,
                            excerpt,
                            "Standard claimed experience with " + criterionName + ".",
                            "How was " + criterionName + " structured within your most recent project pipeline?",
                            "Confirm hands-on operational experience versus passive maintenance."
                    ));
                }
            }

            // Scenario 2: Candidate is missing a required criterion
            if (evidence.getStatus() == MatchStatus.MISSING && evidence.getCriterion().isRequired()) {
                questions.add(new InterviewQuestionDto(
                        criterionName,
                        "Not found in submitted documentation",
                        "Missing required qualification: " + criterionName + ".",
                        "We noted no direct mention of " + criterionName + " in your documents. Have you worked with this stack in production or personal projects?",
                        "Assess willingness to upskill and transferable architectural concepts."
                ));
            }
        }

        return questions;
    }
}