package com.ATSapp.RecruitIQ.controller;

import com.ATSapp.RecruitIQ.dto.ResumeUploadResponse;
import com.ATSapp.RecruitIQ.model.Candidate;
import com.ATSapp.RecruitIQ.model.Resume;
import com.ATSapp.RecruitIQ.repository.CandidateRepository;
import com.ATSapp.RecruitIQ.repository.ResumeRepository;
import com.ATSapp.RecruitIQ.service.FileStorageService;
import com.ATSapp.RecruitIQ.service.PdfParserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/resumes")
public class ResumeController {

    private final FileStorageService fileStorageService;
    private final CandidateRepository candidateRepository;
    private final ResumeRepository resumeRepository;
    private final PdfParserService pdfParserService;

    public ResumeController(FileStorageService fileStorageService,
                            CandidateRepository candidateRepository,
                            ResumeRepository resumeRepository,
                            PdfParserService pdfParserService) {
        this.fileStorageService = fileStorageService;
        this.candidateRepository = candidateRepository;
        this.resumeRepository = resumeRepository;
        this.pdfParserService = pdfParserService;
    }

    @PostMapping("/upload")
    public ResponseEntity<ResumeUploadResponse> uploadResume(
            @RequestParam("candidateId") Long candidateId,
            @RequestParam("file") MultipartFile file) {

        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new RuntimeException("Candidate not found with id: " + candidateId));

        String savedFilePath = fileStorageService.storeFile(file);

        Resume resume = Resume.builder()
                .candidate(candidate)
                .fileName(file.getOriginalFilename())
                .filePath(savedFilePath)
                .fileSize(file.getSize())
                .build();

        Resume savedResume = resumeRepository.save(resume);

        return ResponseEntity.status(HttpStatus.CREATED).body(ResumeUploadResponse.fromEntity(savedResume));
    }

    @GetMapping("/{id}/raw-text")
    public ResponseEntity<Map<String, Object>> getRawText(@PathVariable Long id) {
        Resume resume = resumeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resume not found with id: " + id));

        String text = pdfParserService.extractText(resume.getFilePath());

        return ResponseEntity.ok(Map.of(
                "resumeId", resume.getId(),
                "fileName", resume.getFileName(),
                "characterCount", text.length(),
                "extractedText", text
        ));
    }
}