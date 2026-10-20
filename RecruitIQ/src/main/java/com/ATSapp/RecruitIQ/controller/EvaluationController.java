package com.ATSapp.RecruitIQ.controller;

import com.ATSapp.RecruitIQ.dto.*;
import com.ATSapp.RecruitIQ.model.DocumentType;
import com.ATSapp.RecruitIQ.model.EvaluationReport;
import com.ATSapp.RecruitIQ.repository.EvaluationReportRepository;
import com.ATSapp.RecruitIQ.service.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/evaluations")
public class EvaluationController {

    private final EvaluationService evaluationService;
    private final EvaluationReportRepository evaluationReportRepository;
    private final JapaneseDocumentService japaneseDocumentService;
    private final ClaimVerificationService claimVerificationService;
    private final PdfParserService pdfParserService;
    private final BlindScreeningService blindScreeningService;

    public EvaluationController(EvaluationService evaluationService,
                                EvaluationReportRepository evaluationReportRepository,
                                JapaneseDocumentService japaneseDocumentService,
                                ClaimVerificationService claimVerificationService,
                                PdfParserService pdfParserService,
                                BlindScreeningService blindScreeningService) {
        this.evaluationService = evaluationService;
        this.evaluationReportRepository = evaluationReportRepository;
        this.japaneseDocumentService = japaneseDocumentService;
        this.claimVerificationService = claimVerificationService;
        this.pdfParserService = pdfParserService;
        this.blindScreeningService = blindScreeningService;
    }

    @PostMapping("/run")
    public ResponseEntity<EvaluationReportResponse> runEvaluation(
            @RequestParam Long resumeId,
            @RequestParam Long jobOpeningId) {
        EvaluationReport report = evaluationService.evaluateResume(resumeId, jobOpeningId);
        return ResponseEntity.ok(EvaluationReportResponse.fromEntity(report));
    }

    @PatchMapping("/{id}/override")
    public ResponseEntity<EvaluationReportResponse> overrideEvaluation(
            @PathVariable Long id,
            @RequestBody OverrideRequest request) {
        EvaluationReport report = evaluationService.overrideEvaluation(
                id, request.recommendation(), request.reason()
        );
        return ResponseEntity.ok(EvaluationReportResponse.fromEntity(report));
    }

    // Day 2 Endpoint: GET /api/v1/evaluations/{id}/interview-kit
    @GetMapping("/{id}/interview-kit")
    public ResponseEntity<VerificationKitResponse> getInterviewKit(@PathVariable Long id) {
        EvaluationReport report = evaluationReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation report not found: " + id));

        String rawText = pdfParserService.extractText(report.getResume().getFilePath());

        DocumentType docType = japaneseDocumentService.classifyDocument(rawText);
        Map<String, String> sections = japaneseDocumentService.extractSections(rawText);
        List<InterviewQuestionDto> questions = claimVerificationService.generateVerificationQuestions(report);

        return ResponseEntity.ok(new VerificationKitResponse(
                report.getId(),
                report.getResume().getCandidate().getId(),
                docType,
                sections,
                questions
        ));
    }

    //Day 3 Endpoint
    @GetMapping("/{id}/blind")
    public ResponseEntity<BlindEvaluationResponse> getBlindEvaluation(@PathVariable Long id) {
        EvaluationReport report = evaluationReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation report not found: " + id));

        BlindEvaluationResponse blindReport = blindScreeningService.generateBlindReport(report);
        return ResponseEntity.ok(blindReport);
    }
}