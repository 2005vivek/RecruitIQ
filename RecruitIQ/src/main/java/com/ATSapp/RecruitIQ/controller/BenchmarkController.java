package com.ATSapp.RecruitIQ.controller;

import com.ATSapp.RecruitIQ.dto.BenchmarkReportResponse;
import com.ATSapp.RecruitIQ.service.BenchmarkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/benchmarks")
@Tag(name = "AI Evaluation Laboratory", description = "Benchmark runner validating screening accuracy, precision, and bias across bilingual datasets.")
public class BenchmarkController {

    private final BenchmarkService benchmarkService;

    public BenchmarkController(BenchmarkService benchmarkService) {
        this.benchmarkService = benchmarkService;
    }

    @PostMapping("/run")
    @Operation(summary = "Execute AI Evaluation Benchmark v1.0", description = "Runs pre-defined synthetic Japanese and English applicant profiles against active job criteria to generate precision, recall, and error rate metrics.")
    public ResponseEntity<BenchmarkReportResponse> runBenchmarks() {
        BenchmarkReportResponse report = benchmarkService.runBenchmarkSuite();
        return ResponseEntity.ok(report);
    }
}