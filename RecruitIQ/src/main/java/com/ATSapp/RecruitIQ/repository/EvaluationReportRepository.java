package com.ATSapp.RecruitIQ.repository;

import com.ATSapp.RecruitIQ.model.EvaluationReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvaluationReportRepository extends JpaRepository<EvaluationReport, Long> {
    List<EvaluationReport> findByJobOpeningId(Long jobOpeningId);
    List<EvaluationReport> findByResumeId(Long resumeId);
}