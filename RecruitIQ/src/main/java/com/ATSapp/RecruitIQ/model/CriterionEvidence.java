package com.ATSapp.RecruitIQ.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "criterion_evidence")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CriterionEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_report_id", nullable = false)
    private EvaluationReport evaluationReport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criterion_id", nullable = false)
    private JobCriterion criterion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status;

    // Exact supporting text snippet located in the resume
    @Column(name = "supporting_excerpt", columnDefinition = "TEXT")
    private String supportingExcerpt;

    // "Why not this candidate?": Details missing or unverifiable experience
    @Column(name = "gap_analysis", columnDefinition = "TEXT")
    private String gapAnalysis;

    @Column(name = "confidence")
    private Double confidence;
}