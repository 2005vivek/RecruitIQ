package com.ATSapp.RecruitIQ.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "job_criteria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobCriterion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_opening_id", nullable = false)
    private JobOpening jobOpening;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CriterionType type;

    // Weight priority (e.g. 1 to 5)
    @Column(nullable = false)
    private Integer weight;

    @Column(nullable = false)
    private boolean required;
}