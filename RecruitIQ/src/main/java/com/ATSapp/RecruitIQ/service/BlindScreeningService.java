package com.ATSapp.RecruitIQ.service;

import com.ATSapp.RecruitIQ.dto.BlindEvaluationResponse;
import com.ATSapp.RecruitIQ.dto.EvidenceResponse;
import com.ATSapp.RecruitIQ.model.Candidate;
import com.ATSapp.RecruitIQ.model.EvaluationReport;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

@Service
public class BlindScreeningService {

    // Patterns matching emails, phone numbers, and common Japanese/Western date-of-birth indicators
    private static final Pattern EMAIL_PATTERN = Pattern.compile("(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}");
    private static final Pattern PHONE_PATTERN = Pattern.compile("\\b(?:\\+?\\d{1,3}[- ]?)?\\(?\\d{2,4}\\)?[- ]?\\d{3,4}[- ]?\\d{4}\\b");
    private static final Pattern AGE_BIRTH_PATTERN = Pattern.compile("(?i)(\\b\\d{1,2}\\s*(?:years old|歳)\\b|(?:生年月日|born on|dob)[:\\s]*\\d{4}[-/年]\\d{1,2}[-/月]\\d{1,2})");
    private static final Pattern GENDER_PATTERN = Pattern.compile("(?i)\\b(male|female|性別[:\\s]*[男女])\\b");

    public BlindEvaluationResponse generateBlindReport(EvaluationReport report) {
        Candidate candidate = report.getResume().getCandidate();

        // 1. Assign an anonymous masking identifier
        String maskedCandidateCode = "CANDIDATE-ANON-" + String.format("%04d", candidate.getId());

        // 2. Sanitize all evidence excerpts to remove accidental PII leaks
        List<EvidenceResponse> sanitizedEvidence = report.getEvidenceList().stream()
                .map(evidence -> {
                    String originalExcerpt = evidence.getSupportingExcerpt();
                    String redactedExcerpt = originalExcerpt != null ? maskPii(originalExcerpt, candidate.getFullName()) : null;

                    return new EvidenceResponse(
                            evidence.getCriterion().getName(),
                            evidence.getCriterion().getType().name(),
                            evidence.getCriterion().isRequired(),
                            evidence.getStatus().name(),
                            redactedExcerpt,
                            evidence.getGapAnalysis(),
                            evidence.getConfidence()
                    );
                })
                .toList();

        return new BlindEvaluationResponse(
                report.getId(),
                maskedCandidateCode,
                report.getJobOpening().getTitle(),
                report.getCriteriaVersionEvaluated(),
                report.getRecommendation().name(),
                report.getConfidenceScore(),
                report.isHumanOverride(),
                report.getOverrideReason(),
                sanitizedEvidence,
                report.getEvaluatedAt()
        );
    }

    public String maskPii(String input, String candidateName) {
        if (input == null || input.isBlank()) {
            return input;
        }

        String sanitized = input;

        // Mask Candidate Name
        if (candidateName != null && !candidateName.isBlank()) {
            sanitized = Pattern.compile(Pattern.quote(candidateName), Pattern.CASE_INSENSITIVE)
                    .matcher(sanitized).replaceAll("[REDACTED_NAME]");
        }

        // Mask Email, Phone, Age/Birth, Gender
        sanitized = EMAIL_PATTERN.matcher(sanitized).replaceAll("[REDACTED_EMAIL]");
        sanitized = PHONE_PATTERN.matcher(sanitized).replaceAll("[REDACTED_PHONE]");
        sanitized = AGE_BIRTH_PATTERN.matcher(sanitized).replaceAll("[REDACTED_AGE]");
        sanitized = GENDER_PATTERN.matcher(sanitized).replaceAll("[REDACTED_GENDER]");

        return sanitized;
    }
}