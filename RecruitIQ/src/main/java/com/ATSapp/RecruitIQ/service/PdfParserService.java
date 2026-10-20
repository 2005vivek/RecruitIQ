package com.ATSapp.RecruitIQ.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;

@Service
public class PdfParserService {

    public String extractText(String absoluteFilePath) {
        File file = new File(absoluteFilePath);

        if (!file.exists()) {
            throw new IllegalArgumentException("File not found on disk at: " + absoluteFilePath);
        }

        try (PDDocument document = Loader.loadPDF(file)) {
            if (document.isEncrypted()) {
                throw new IllegalStateException("Cannot extract text from a password-protected PDF.");
            }

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);

            String rawText = stripper.getText(document);

            if (rawText == null || rawText.isBlank()) {
                throw new IllegalStateException("The PDF contains no readable text. It may be an image scan.");
            }

            return rawText.trim();
        } catch (IOException e) {
            throw new RuntimeException("Failed to read PDF file: " + file.getName(), e);
        }
    }
}