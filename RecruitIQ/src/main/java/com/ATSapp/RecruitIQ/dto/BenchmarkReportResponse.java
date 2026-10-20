package com.ATSapp.RecruitIQ.dto;

import java.time.LocalDateTime;
import java.util.List;

public record BenchmarkReportResponse(
        String reportTitle,
        String evaluatedJobTitle,
        Integer criteriaVersion,
        int totalTestCases,
        int accurateDecisions,
        double overallAccuracyPercentage,
        double precision,
        double recall,
        double f1Score,
        double falsePositiveRate,
        double falseNegativeRate,
        List<BenchmarkCaseResult> caseResults,
        LocalDateTime executedAt
) {
}