package com.ATSapp.RecruitIQ.repository;

import com.ATSapp.RecruitIQ.model.JobOpening;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JobOpeningRepository extends JpaRepository<JobOpening, Long> {
    Optional<JobOpening> findByTitle(String title);

}