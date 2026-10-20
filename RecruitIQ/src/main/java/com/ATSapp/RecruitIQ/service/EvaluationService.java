package com.ATSapp.RecruitIQ.service;

import com.ATSapp.RecruitIQ.model.*;
import com.ATSapp.RecruitIQ.repository.EvaluationReportRepository;
import com.ATSapp.RecruitIQ.repository.JobOpeningRepository;
import com.ATSapp.RecruitIQ.repository.ResumeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class EvaluationService {

    private final EvaluationReportRepository evaluationReportRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final ResumeRepository resumeRepository;
    private final PdfParserService pdfParserService;

    public EvaluationService(EvaluationReportRepository evaluationReportRepository,
                             JobOpeningRepository jobOpeningRepository,
                             ResumeRepository resumeRepository,
                             PdfParserService pdfParserService) {
        this.evaluationReportRepository = evaluationReportRepository;
        this.jobOpeningRepository = jobOpeningRepository;
        this.resumeRepository = resumeRepository;
        this.pdfParserService = pdfParserService;
    }

    @Transactional
    public EvaluationReport evaluateResume(Long resumeId, Long jobOpeningId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new RuntimeException("Resume not found: " + resumeId));

        JobOpening job = jobOpeningRepository.findById(jobOpeningId)
                .orElseThrow(() -> new RuntimeException("Job Opening not found: " + jobOpeningId));

        // 1. Extract plain text from the PDF
        String resumeText = pdfParserService.extractText(resume.getFilePath());

        EvaluationReport report = EvaluationReport.builder()
                .resume(resume)
                .jobOpening(job)
                .criteriaVersionEvaluated(job.getCriteriaVersion())
                .build();

        int totalWeight = 0;
        int earnedWeight = 0;
        boolean missingRequiredCriterion = false;

        // 2. Break resume text into individual sentences for evidence citation
        List<String> sentences = Arrays.stream(resumeText.split("(?<=[.!?\\n])\\s+"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();

        // 3. Evaluate each criterion against extracted sentences
        for (JobCriterion criterion : job.getCriteria()) {
            totalWeight += criterion.getWeight();
            String keyword = criterion.getName();

            // Regex search (case-insensitive boundary check)
            Pattern pattern = Pattern.compile("(?i)\\b" + Pattern.quote(keyword) + "\\b");

            String matchedSentence = sentences.stream()
                    .filter(s -> pattern.matcher(s).find())
                    .findFirst()
                    .orElse(null);

            CriterionEvidence evidence;
            if (matchedSentence != null) {
                earnedWeight += criterion.getWeight();
                evidence = CriterionEvidence.builder()
                        .criterion(criterion)
                        .status(MatchStatus.MATCHED)
                        .supportingExcerpt(matchedSentence)
                        .gapAnalysis(null)
                        .confidence(0.95)
                        .build();
            } else {
                if (criterion.isRequired()) {
                    missingRequiredCriterion = true;
                }
                evidence = CriterionEvidence.builder()
                        .criterion(criterion)
                        .status(MatchStatus.MISSING)
                        .supportingExcerpt(null)
                        .gapAnalysis("Explicit mention of '" + keyword + "' was not detected in the document text.")
                        .confidence(0.85)
                        .build();
            }
            report.addEvidence(evidence);
        }

        // 4. Determine recommendation based on evidence and required criteria
        double matchRatio = totalWeight > 0 ? (double) earnedWeight / totalWeight : 0.0;
        report.setConfidenceScore(Math.round(matchRatio * 100.0) / 100.0);

        if (missingRequiredCriterion) {
            report.setRecommendation(Recommendation.REVIEW);
        } else if (matchRatio >= 0.75) {
            report.setRecommendation(Recommendation.PASS);
        } else {
            report.setRecommendation(Recommendation.REJECT);
        }

        // Update resume parsing status
        resume.setParsingStatus(Resume.ParsingStatus.COMPLETED);
        resumeRepository.save(resume);

        return evaluationReportRepository.save(report);
    }

    // "Disagree with AI": Human Recruiter Override
    @Transactional
    public EvaluationReport overrideEvaluation(Long reportId, Recommendation newRecommendation, String reason) {
        EvaluationReport report = evaluationReportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Evaluation Report not found: " + reportId));

        report.setHumanOverride(true);
        report.setRecommendation(newRecommendation);
        report.setOverrideReason(reason);

        return evaluationReportRepository.save(report);
    }
}