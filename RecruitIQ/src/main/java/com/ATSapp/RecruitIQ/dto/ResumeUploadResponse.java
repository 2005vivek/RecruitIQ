package com.ATSapp.RecruitIQ.dto;

import com.ATSapp.RecruitIQ.model.Resume;

import java.time.LocalDateTime;

public record ResumeUploadResponse(
        Long resumeId,
        Long candidateId,
        String fileName,
        String parsingStatus,
        LocalDateTime uploadedAt
) {
    public static ResumeUploadResponse fromEntity(Resume resume) {
        return new ResumeUploadResponse(
                resume.getId(),
                resume.getCandidate().getId(),
                resume.getFileName(),
                resume.getParsingStatus().name(),
                resume.getUploadedAt()
        );
    }
}