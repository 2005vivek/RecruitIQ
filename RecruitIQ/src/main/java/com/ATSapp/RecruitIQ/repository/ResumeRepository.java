package com.ATSapp.RecruitIQ.repository;

import com.ATSapp.RecruitIQ.model.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResumeRepository extends JpaRepository<Resume, Long> {
    // Finds all resumes submitted by a specific candidate ID
    List<Resume> findByCandidateId(Long candidateId);
}