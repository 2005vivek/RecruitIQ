package com.ATSapp.RecruitIQ.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "candidates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.APPLIED;

    // APPI Governance & Compliance Fields
    @Column(name = "appi_consent_given", nullable = false)
    @Builder.Default
    private boolean appiConsentGiven = true;

    @Column(name = "is_anonymized", nullable = false)
    @Builder.Default
    private boolean isAnonymized = false;

    @Column(name = "anonymized_at")
    private LocalDateTime anonymizedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = ApplicationStatus.APPLIED;
        }
    }

    public enum ApplicationStatus {
        APPLIED,
        SCREENING,
        INTERVIEW,
        OFFERED,
        REJECTED
    }
}