package com.ATSapp.RecruitIQ.service;

import com.ATSapp.RecruitIQ.model.DocumentType;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class JapaneseDocumentService {

    private static final Pattern RIREKISHO_HEADER = Pattern.compile("(?i)(履歴書|rirekisho)");
    private static final Pattern SHOKUMU_HEADER = Pattern.compile("(?i)(職務経歴書|shokumu\\s*keirekisho)");

    // Fixed: properly closed lookahead groups (?=(?:...|$))
    private static final Map<String, Pattern> SECTION_PATTERNS = Map.of(
            "summary", Pattern.compile("(?:【?職務要約】?|職務概要)(.*?)(?=(?:【?職務経歴】?|【?自己PR】?|【?志望動機】?|【?スキル】?|$))", Pattern.DOTALL),
            "selfPr", Pattern.compile("(?:【?自己PR】?|自己アピール)(.*?)(?=(?:【?志望動機】?|【?職務要約】?|【?スキル】?|$))", Pattern.DOTALL),
            "motivation", Pattern.compile("(?:【?志望動機】?|志望理由)(.*?)(?=(?:【?自己PR】?|【?職務要約】?|【?スキル】?|$))", Pattern.DOTALL)
    );

    public DocumentType classifyDocument(String text) {
        if (SHOKUMU_HEADER.matcher(text).find()) {
            return DocumentType.SHOKUMU_KEIREKISHO;
        } else if (RIREKISHO_HEADER.matcher(text).find()) {
            return DocumentType.RIREKISHO;
        }
        return DocumentType.STANDARD_RESUME;
    }

    public Map<String, String> extractSections(String text) {
        Map<String, String> extracted = new HashMap<>();

        for (Map.Entry<String, Pattern> entry : SECTION_PATTERNS.entrySet()) {
            Matcher matcher = entry.getValue().matcher(text);
            if (matcher.find()) {
                String content = matcher.group(1).trim();
                if (!content.isBlank()) {
                    extracted.put(entry.getKey(), content);
                }
            }
        }
        return extracted;
    }
}