package com.ATSapp.RecruitIQ.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI recruitIqOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("RecruitIQ — Explainable AI Recruitment Intelligence API")
                        .description("Decision-support ATS engine tailored for the Japanese enterprise recruitment market. "
                                + "Features evidence-backed scoring, Rirekisho/Shokumu Keirekisho parsing, "
                                + "interview claim verification, and APPI data governance.")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("RecruitIQ Engineering Team")
                                .email("engineering@recruitiq.local"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://springdoc.org")));
    }
}