package com.ATSapp.RecruitIQ.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "evaluation_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluationReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_opening_id", nullable = false)
    private JobOpening jobOpening;

    @Column(name = "criteria_version_evaluated", nullable = false)
    private Integer criteriaVersionEvaluated;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Recommendation recommendation;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    // Human-in-the-loop: lets HR override an AI recommendation with an audit reason
    @Column(name = "human_override", nullable = false)
    @Builder.Default
    private boolean humanOverride = false;

    @Column(name = "override_reason")
    private String overrideReason;

    @OneToMany(mappedBy = "evaluationReport", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CriterionEvidence> evidenceList = new ArrayList<>();

    @Column(name = "evaluated_at", updatable = false)
    private LocalDateTime evaluatedAt;

    @PrePersist
    protected void onEvaluate() {
        this.evaluatedAt = LocalDateTime.now();
    }

    public void addEvidence(CriterionEvidence evidence) {
        evidenceList.add(evidence);
        evidence.setEvaluationReport(this);
    }
}