package com.ATSapp.RecruitIQ.config;

import com.ATSapp.RecruitIQ.model.CriterionType;
import com.ATSapp.RecruitIQ.model.JobCriterion;
import com.ATSapp.RecruitIQ.model.JobOpening;
import com.ATSapp.RecruitIQ.repository.JobOpeningRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final JobOpeningRepository jobOpeningRepository;

    public DataInitializer(JobOpeningRepository jobOpeningRepository) {
        this.jobOpeningRepository = jobOpeningRepository;
    }

    @Override
    public void run(String... args) {
        if (jobOpeningRepository.findByTitle("Bilingual Backend Engineer").isEmpty()) {
            JobOpening job = JobOpening.builder()
                    .title("Bilingual Backend Engineer")
                    .department("Enterprise Solutions (Tokyo)")
                    .criteriaVersion(1)
                    .build();

            List<JobCriterion> criteria = List.of(
                    JobCriterion.builder()
                            .name("Java")
                            .type(CriterionType.TECHNICAL_SKILL)
                            .weight(5)
                            .required(true)
                            .build(),
                    JobCriterion.builder()
                            .name("Spring Boot")
                            .type(CriterionType.TECHNICAL_SKILL)
                            .weight(5)
                            .required(true)
                            .build(),
                    JobCriterion.builder()
                            .name("PostgreSQL")
                            .type(CriterionType.TECHNICAL_SKILL)
                            .weight(4)
                            .required(false)
                            .build(),
                    JobCriterion.builder()
                            .name("Japanese")
                            .type(CriterionType.LANGUAGE_PROFICIENCY)
                            .weight(4)
                            .required(true)
                            .build()
            );

            criteria.forEach(job::addCriterion);
            jobOpeningRepository.save(job);
        }
    }
}