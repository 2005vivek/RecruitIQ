package com.ATSapp.RecruitIQ.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "resumes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resume {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Foreign Key: Multiple resumes can belong to one candidate (e.g. updated versions)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "parsing_status", nullable = false)
    private ParsingStatus parsingStatus;

    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onUpload() {
        this.uploadedAt = LocalDateTime.now();
        if (this.parsingStatus == null) {
            this.parsingStatus = ParsingStatus.PENDING;
        }
    }

    public enum ParsingStatus {
        PENDING,
        PROCESSING,
        COMPLETED,
        FAILED
    }
}