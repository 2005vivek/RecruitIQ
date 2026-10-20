package com.ATSapp.RecruitIQ.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "job_openings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobOpening {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String department;

    // Incremented whenever HR updates requirements to ensure evaluation auditability
    @Column(name = "criteria_version", nullable = false)
    @Builder.Default
    private Integer criteriaVersion = 1;

    @OneToMany(mappedBy = "jobOpening", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<JobCriterion> criteria = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.criteriaVersion == null) {
            this.criteriaVersion = 1;
        }
    }

    public void addCriterion(JobCriterion criterion) {
        criteria.add(criterion);
        criterion.setJobOpening(this);
    }
}