package com.ATSapp.RecruitIQ.service;

import com.ATSapp.RecruitIQ.dto.BenchmarkCaseResult;
import com.ATSapp.RecruitIQ.dto.BenchmarkReportResponse;
import com.ATSapp.RecruitIQ.model.DocumentType;
import com.ATSapp.RecruitIQ.model.JobCriterion;
import com.ATSapp.RecruitIQ.model.JobOpening;
import com.ATSapp.RecruitIQ.model.Recommendation;
import com.ATSapp.RecruitIQ.repository.JobOpeningRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class BenchmarkService {

    private final JobOpeningRepository jobOpeningRepository;
    private final JapaneseDocumentService japaneseDocumentService;

    public BenchmarkService(
            JobOpeningRepository jobOpeningRepository,
            JapaneseDocumentService japaneseDocumentService) {
        this.jobOpeningRepository = jobOpeningRepository;
        this.japaneseDocumentService = japaneseDocumentService;
    }

    @Transactional(readOnly = true)
    public BenchmarkReportResponse runBenchmarkSuite() {
        JobOpening job = jobOpeningRepository
                .findByTitle("Bilingual Backend Engineer")
                .or(() -> jobOpeningRepository.findAll().stream().findFirst())
                .orElseGet(this::createFallbackJobOpening);

        List<JobCriterion> criteria =
                (job.getCriteria() != null && !job.getCriteria().isEmpty())
                        ? job.getCriteria()
                        : createFallbackJobOpening().getCriteria();

        List<SyntheticTestCase> testSuite = buildBenchmarkDataset();
        List<BenchmarkCaseResult> results = new ArrayList<>();

        int tp = 0;
        int fp = 0;
        int tn = 0;
        int fn = 0;

        for (SyntheticTestCase testCase : testSuite) {
            EvaluationRun outcome = evaluateTextAgainstCriteria(
                    testCase.documentText(), criteria);

            boolean accurate = outcome.recommendation()
                    == testCase.expectedRecommendation();

            boolean expectedPositive =
                    testCase.expectedRecommendation() == Recommendation.PASS;
            boolean actualPositive =
                    outcome.recommendation() == Recommendation.PASS;

            if (expectedPositive && actualPositive) {
                tp++;
            } else if (!expectedPositive && actualPositive) {
                fp++;
            } else if (!expectedPositive) {
                tn++;
            } else {
                fn++;
            }

            DocumentType docType =
                    japaneseDocumentService.classifyDocument(
                            testCase.documentText());

            results.add(new BenchmarkCaseResult(
                    testCase.caseId(),
                    testCase.description(),
                    docType,
                    testCase.language(),
                    testCase.expectedRecommendation(),
                    outcome.recommendation(),
                    accurate,
                    outcome.matchRatio(),
                    outcome.matched(),
                    outcome.missing()
            ));
        }

        int totalCases = testSuite.size();

        long accurateCount = results.stream()
                .filter(BenchmarkCaseResult::isRecommendationAccurate)
                .count();

        double accuracy = totalCases > 0
                ? Math.round(((double) accurateCount / totalCases) * 1000.0)
                / 10.0
                : 0.0;

        double precision = (tp + fp) > 0
                ? (double) tp / (tp + fp) : 1.0;

        double recall = (tp + fn) > 0
                ? (double) tp / (tp + fn) : 1.0;

        double f1 = (precision + recall) > 0
                ? 2 * (precision * recall) / (precision + recall) : 0.0;

        double fpRate = (fp + tn) > 0
                ? (double) fp / (fp + tn) : 0.0;

        double fnRate = (fn + tp) > 0
                ? (double) fn / (fn + tp) : 0.0;

        return new BenchmarkReportResponse(
                "RecruitIQ Evaluation Report v1.0",
                job.getTitle() != null
                        ? job.getTitle() : "Bilingual Backend Engineer",
                job.getCriteriaVersion() != null
                        ? job.getCriteriaVersion() : 1,
                totalCases,
                (int) accurateCount,
                accuracy,
                Math.round(precision * 100.0) / 100.0,
                Math.round(recall * 100.0) / 100.0,
                Math.round(f1 * 100.0) / 100.0,
                Math.round(fpRate * 100.0) / 100.0,
                Math.round(fnRate * 100.0) / 100.0,
                results,
                LocalDateTime.now()
        );
    }

    private EvaluationRun evaluateTextAgainstCriteria(
            String text, List<JobCriterion> criteria) {

        List<String> sentences = Arrays.stream(
                        text.split("(?<=[.!?。\\n])\\s*"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();

        int totalWeight = 0;
        int earnedWeight = 0;
        boolean missingRequired = false;

        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        for (JobCriterion criterion : criteria) {
            totalWeight += criterion.getWeight();

            String keyword = criterion.getName();
            Pattern pattern = Pattern.compile(
                    "(?i)" + Pattern.quote(keyword));

            boolean found = sentences.stream()
                    .anyMatch(s -> pattern.matcher(s).find());

            if (found) {
                earnedWeight += criterion.getWeight();
                matched.add(keyword);
            } else {
                if (criterion.isRequired()) {
                    missingRequired = true;
                }
                missing.add(keyword);
            }
        }

        double matchRatio = totalWeight > 0
                ? Math.round(
                ((double) earnedWeight / totalWeight) * 100.0)
                / 100.0
                : 0.0;

        Recommendation recommendation;

        if (missingRequired) {
            recommendation = Recommendation.REVIEW;
        } else if (matchRatio >= 0.75) {
            recommendation = Recommendation.PASS;
        } else {
            recommendation = Recommendation.REJECT;
        }

        return new EvaluationRun(
                matchRatio, recommendation, matched, missing);
    }

    private JobOpening createFallbackJobOpening() {
        JobOpening fallback = new JobOpening();

        fallback.setTitle("Bilingual Backend Engineer");
        fallback.setDepartment("Tokyo Engineering Division");
        fallback.setCriteriaVersion(1);

        List<JobCriterion> criteria = List.of(
                JobCriterion.builder()
                        .name("Java")
                        .weight(5)
                        .required(true)
                        .jobOpening(fallback)
                        .build(),

                JobCriterion.builder()
                        .name("Spring Boot")
                        .weight(5)
                        .required(true)
                        .jobOpening(fallback)
                        .build(),

                JobCriterion.builder()
                        .name("PostgreSQL")
                        .weight(4)
                        .required(false)
                        .jobOpening(fallback)
                        .build(),

                JobCriterion.builder()
                        .name("Japanese")
                        .weight(4)
                        .required(true)
                        .jobOpening(fallback)
                        .build()
        );

        fallback.setCriteria(criteria);
        return fallback;
    }

    private List<SyntheticTestCase> buildBenchmarkDataset() {
        return List.of(
                new SyntheticTestCase(
                        "CASE-JP-001",
                        "Senior Backend Engineer (Bilingual Shokumu Keirekisho)",
                        "JA",
                        "職務経歴書\n【職務要約】JavaおよびSpring Bootを用いた高トラフィックAPIの開発に5年間従事。\n"
                                + "PostgreSQLのチューニングと最適化を担当。\n"
                                + "【自己PR】英語およびJapaneseによる多言語チームでのリード経験あり。",
                        Recommendation.PASS
                ),

                new SyntheticTestCase(
                        "CASE-EN-002",
                        "Java Backend Specialist (Monolingual — Missing Required Japanese)",
                        "EN",
                        "SUMMARY:\nExpert Backend Engineer with 6 years of enterprise experience building microservices.\n"
                                + "Primary skills: Java, Spring Boot, and PostgreSQL distributed clustering.\n"
                                + "No foreign language skills listed.",
                        Recommendation.REVIEW
                ),

                new SyntheticTestCase(
                        "CASE-EN-003",
                        "Python Data Developer (Missing Core Java Stack)",
                        "EN",
                        "SUMMARY:\nPython developer with experience in Django, Flask, Pandas, and MySQL.\n"
                                + "Elementary understanding of Japanese conversation.",
                        Recommendation.REVIEW
                ),

                new SyntheticTestCase(
                        "CASE-EN-004",
                        "Tokyo FinTech Lead Engineer (Complete Match)",
                        "EN",
                        "EXPERIENCE:\nSoftware Engineer at Tokyo FinTech. Architected payment gateways in Java and Spring Boot.\n"
                                + "Managed PostgreSQL relational schemas.\n"
                                + "Fluent in business Japanese (JLPT N1 certified).",
                        Recommendation.PASS
                )
        );
    }

    private record SyntheticTestCase(
            String caseId,
            String description,
            String language,
            String documentText,
            Recommendation expectedRecommendation) {
    }

    private record EvaluationRun(
            double matchRatio,
            Recommendation recommendation,
            List<String> matched,
            List<String> missing) {
    }
}