package com.ATSapp.RecruitIQ.service;

import com.ATSapp.RecruitIQ.model.Candidate;
import com.ATSapp.RecruitIQ.model.Resume;
import com.ATSapp.RecruitIQ.repository.CandidateRepository;
import com.ATSapp.RecruitIQ.repository.ResumeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AppiComplianceService {

    private static final Logger log = LoggerFactory.getLogger(AppiComplianceService.class);

    private final CandidateRepository candidateRepository;
    private final ResumeRepository resumeRepository;

    public AppiComplianceService(CandidateRepository candidateRepository, ResumeRepository resumeRepository) {
        this.candidateRepository = candidateRepository;
        this.resumeRepository = resumeRepository;
    }

    @Transactional
    public void executeAppiRightToBeForgotten(Long candidateId, String requesterAuditReason) {
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new RuntimeException("Candidate not found: " + candidateId));

        if (candidate.isAnonymized()) {
            throw new IllegalStateException("Candidate ID " + candidateId + " has already been anonymized under APPI.");
        }

        // 1. Physically delete all resume files from storage disk
        List<Resume> resumes = resumeRepository.findByCandidateId(candidateId);
        for (Resume resume : resumes) {
            try {
                Path filePath = Paths.get(resume.getFilePath());
                Files.deleteIfExists(filePath);
                log.info("APPI Compliance: Securely deleted resume file on disk: {}", filePath);
            } catch (IOException e) {
                log.error("Failed to delete physical resume file: {}", resume.getFilePath(), e);
            }
            resume.setFilePath("[DELETED_UNDER_APPI]");
            resume.setFileName("ANONYMIZED_DOCUMENT.pdf");
            resumeRepository.save(resume);
        }

        // 2. Scrub PII from Candidate entity while preserving anonymized metrics for fairness auditing
        candidate.setFullName("APPI_REDACTED_" + candidate.getId());
        candidate.setEmail("redacted_" + candidate.getId() + "@appi-deleted.local");
        candidate.setPhoneNumber(null);
        candidate.setAnonymized(true);
        candidate.setAnonymizedAt(LocalDateTime.now());
        candidateRepository.save(candidate);

        log.info("APPI Compliance: Candidate ID {} successfully anonymized. Audit Reason: {}", candidateId, requesterAuditReason);
    }
}