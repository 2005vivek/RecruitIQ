package com.ATSapp.RecruitIQ.dto;

import com.ATSapp.RecruitIQ.model.Recommendation;

public record OverrideRequest(
        Recommendation recommendation,
        String reason
) {
}