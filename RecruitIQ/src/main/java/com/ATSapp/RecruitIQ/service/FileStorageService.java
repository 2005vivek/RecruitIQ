package com.ATSapp.RecruitIQ.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path storageDirectory;

    // Reads the "file.upload-dir" property from application.properties
    public FileStorageService(@Value("${file.upload-dir:uploads/resumes}") String uploadDir) {
        this.storageDirectory = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            // Create directories if they do not exist (equivalent to mkdir -p)
            Files.createDirectories(this.storageDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize upload directory: " + this.storageDirectory, e);
        }
    }

    public String storeFile(MultipartFile file) {
        // 1. Validation: Reject empty files
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("Only PDF files are supported.");
        }

        // 2. Prevent Overwrites: If two candidates upload "resume.pdf", UUID ensures unique names
        String uniqueFilename = UUID.randomUUID() + "_" + originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");

        try {
            Path targetLocation = this.storageDirectory.resolve(uniqueFilename);

            // 3. Plain Java File I/O: Stream bytes from upload to disk
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }

            return targetLocation.toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file on disk: " + originalFilename, e);
        }
    }
}