Copy the Markdown block below and save it directly as **`V:\Projects\RecruitIQ\README.md`**.

```markdown
# RecruitIQ — Explainable AI Recruitment Decision-Support Platform

> **Human decisions. AI assistance. Evidence for every recommendation.**
> 採用意思決定支援システム — ブラックボックスを排除した日本企業向け説明可能AI採用基盤

![Java 21](https://img.shields.io/badge/Java-21-007396?style=flat-square&logo=openjdk)
![Spring Boot 3](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=flat-square&logo=springboot)
![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![APPI Compliant](https://img.shields.io/badge/Governance-APPI_Compliant-0f4c81?style=flat-square)

---

## 1. Executive Summary & Case Study Overview

**RecruitIQ** is a full-stack, explainable Applicant Tracking and Recruitment Intelligence platform engineered specifically for the Japanese enterprise hiring market. 

Rather than operating as an autonomous "black-box" filter that assigns arbitrary percentage scores to job applicants, RecruitIQ constructs a deterministic, auditable evidence chain:

$$\text{PDF Document} \longrightarrow \text{UTF-8 Sentence Stream} \longrightarrow \text{Versioned Criterion Rule} \longrightarrow \text{Line Citation / Gap Analysis} \longrightarrow \text{Human-Verified Verdict}$$

This case study documents the architectural decisions, domain engineering, and regulatory compliance workflows built to bridge Western software engineering practices with Japanese HR governance standards.

---

## 2. The Problem Statement: Why Traditional AI ATS Platforms Fail in Japan

During technical discovery into enterprise recruitment workflows in Japan, three structural failure modes of conventional ATS platforms were identified:

### 2.1 The Opaque Scoring Problem
Standard AI screening tools output unexplainable numeric scores (e.g., *"Candidate Match: 84%"*). When Japanese HR managers and technical directors conduct consensus-based hiring reviews (*Ringi* / 稟議), they cannot defend or audit how a black-box score was calculated—leading to distrust and low tool adoption.

### 2.2 The Dual-Document Standard (履歴書 & 職務経歴書)
Unlike Western recruitment, which relies on a single free-form CV, Japanese applicants submit two distinct documents:
* **履歴書 (*Rirekisho*):** A standardized chronological record of education, biographical metadata, and certifications.
* **職務経歴書 (*Shokumu Keirekisho*):** A structured engineering narrative detailing project histories, technical architectures, and self-PR (`【職務要約】`, `【自己PR】`, `【志望動機】`).
Western parsers frequently mangle CJK (Chinese-Japanese-Korean) character boundaries and fail to distinguish between these document formats.

### 2.3 Regulatory Strictness Under APPI (個人情報保護法)
Under Japan's **Act on the Protection of Personal Information (APPI)**, enterprises face strict mandates regarding candidate data retention, bias mitigation, and the **Right-to-be-Forgotten** (Article 35). Standard CRUD deletions often leave orphaned PDF files on disk or destroy historical model evaluation metrics when purging candidate records.

---

## 3. Architectural Solution & Key Capabilities

| Engineering Pillar | Enterprise Problem Solved | RecruitIQ Implementation |
| :--- | :--- | :--- |
| **1. Evidence-Backed Matching** | Eliminates black-box percentage scores. | Extracts the exact sentence citation (`supportingExcerpt`) from the PDF for every matched skill and generates a structured `gapAnalysis` ("Why not this candidate?") for missing requirements. |
| **2. Japanese Document Parser** | Handles *Rirekisho* and *Shokumu Keirekisho* formats natively. | Classifies documents (`RIREKISHO`, `SHOKUMU_KEIREKISHO`, `STANDARD_RESUME`) and segments core Japanese sections (`【職務要約】`, `【自己PR】`, `【志望動機】`) via lookahead regex engines. |
| **3. Claim Verification Kit** | Replaces unreliable "AI text detectors" with actionable verification. | Flags high-impact resume claims (`architected`, `microservices`, `latency`, `最適化`) and generates a tailored technical interview rubric with pass/fail scoring criteria. |
| **4. Human-in-the-Loop Override** | Prevents automated AI authority over hiring decisions. | Provides a mandatory **"Disagree with AI"** workflow (`PATCH /evaluations/{id}/override`) that logs the recruiter's identity, updated verdict, and audit justification. |
| **5. Blind Screening Engine** | Mitigates unconscious demographic bias during initial review. | Real-time regex sanitization scrubbing candidate names, emails, phone numbers, gender markers, and ages/birthdates (`[REDACTED_*]`) from extracted citations. |
| **6. APPI Data Governance** | Enforces Article 35 Right-to-be-Forgotten compliance. | Single-transaction purge that physically shreds PDF resumes from the filesystem via Java NIO.2 and anonymizes PII in PostgreSQL while preserving aggregate accuracy metrics. |
| **7. AI Evaluation Lab** | Validates screening consistency across bilingual profiles. | Built-in synthetic benchmark runner executing ground-truth Japanese and English profiles to compute Precision, Recall, F1 Score, FPR, and FNR on demand. |

---

## 4. System Architecture & Data Flow

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                 ENTERPRISE WORKBENCH UI (recruitiq-ui :5173)                 │
│     React 18 + TypeScript + Vite SPA + Tailwind CSS v3 + Axios + Lucide      │
│  ┌──────────────────┬──────────────────┬──────────────────┬───────────────┐  │
│  │ Evidence Matrix  │ Document Parser  │ Claim Probe Kit  │ Benchmark Lab │  │
│  └──────────────────┴──────────────────┴──────────────────┴───────────────┘  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ HTTP REST / Multipart (Vite Proxy / CORS)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      SPRING BOOT 3 API LAYER (:8080)                         │
│        Spring MVC + GlobalExceptionHandler + SpringDoc OpenAPI 3 / Swagger   │
│   CandidateController │ ResumeController │ EvaluationController │ Benchmark  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        CORE DOMAIN & SERVICE LAYER                           │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                    │
│  │   EvaluationService     │  │ JapaneseDocumentService │                    │
│  │ (Citations & Gap Logic) │  │ (Rirekisho / Sections)  │                    │
│  ├─────────────────────────┤  ├─────────────────────────┤                    │
│  │ClaimVerificationService │  │  BlindScreeningService  │                    │
│  │ (Interview Rubric Gen)  │  │ (Regex PII Sanitizer)   │                    │
│  ├─────────────────────────┤  ├─────────────────────────┤                    │
│  │  AppiComplianceService  │  │    BenchmarkService     │                    │
│  │ (NIO Shred & DB Scrub)  │  │ (Precision/Recall/F1)   │                    │
│  └─────────────────────────┘  └─────────────────────────┘                    │
└──────────────────┬───────────────────────────────────────┬───────────────────┘
                   │                                       │
                   ▼                                       ▼
┌─────────────────────────────────────┐ ┌──────────────────────────────────────┐
│   DOCUMENT & STORAGE SUBSYSTEM      │ │     PERSISTENCE LAYER (:5432)        │
│ - FileStorageService (Java NIO.2)   │ │ - PostgreSQL 16 + Hibernate / JPA    │
│ - PdfParserService (Apache PDFBox)  │ │ - 6 Normalized Relational Tables     │
└─────────────────────────────────────┘ └──────────────────────────────────────┘

```

---

## 5. Deep-Dive Engineering Trade-Offs & Design Decisions

### 5.1 Deterministic Rule Citations vs. LLM Hallucinations

* **Decision:** Built a deterministic sentence-boundary and regex extraction engine (`EvaluationService`) backed by versioned `JobCriterion` weights rather than delegating scoring to a generative LLM API.
* **Rationale:** Generative LLMs are non-deterministic and prone to hallucinating candidate qualifications. In enterprise HR compliance, evaluating the exact same PDF against `Criteria Version v1.0` must yield the exact same line citations 100% of the time.
* **Verdict Formula:**

$$\text{Match Ratio} = \frac{\sum \text{Earned Criterion Weights}}{\sum \text{Total Criterion Weights}}$$


* Any missing **Mandatory (`isRequired = true`)** criterion immediately routes the candidate to **`REVIEW`** (preventing silent automated rejection while alerting the human screener).
* Candidates meeting all mandatory gates with $\text{Match Ratio} \ge 0.75$ receive **`PASS`**; otherwise **`REJECT`**.



### 5.2 Interview Claim Verification vs. "AI Resume Detection"

* **Decision:** Rejected building an "AI-generated text detector" in favor of the **Claim Verification Engine (`ClaimVerificationService`)**.
* **Rationale:** Statistical AI-text detectors suffer from high false-positive rates, especially against non-native speakers using translation aids. Instead, RecruitIQ isolates high-impact engineering claims (e.g., *"reduced p99 latency by 45%"*, *"architected distributed microservices"*) and equips the human interviewer with targeted probe questions and pass/fail rubrics to verify real-world depth during the live interview.

### 5.3 High-Density Enterprise UI vs. Consumer Templates

* **Decision:** Designed a decoupled **React 18 + TypeScript + Vite SPA** styled with a strict 1px structural grid, tabular monospace numerals (`tabular-nums`), and bilingual Japanese/English micro-labels.
* **Rationale:** Modeled after leading Japanese B2B SaaS platforms (SmartHR, Sansan, Kintone), where recruiters inspect dozens of criteria rows and raw document streams simultaneously without visual clutter.

---

## 6. Database Schema (PostgreSQL 16)

RecruitIQ models its domain across six normalized relational tables:

1. **`candidates`:** Stores applicant metadata (`full_name`, `email`, `phone_number`, `status`) and APPI compliance flags (`appi_consent_given`, `is_anonymized`, `anonymized_at`).
2. **`resumes`:** Tracks uploaded PDF files (`file_name`, `file_path`, `parsing_status`) and caches the UTF-8 `extracted_text` parsed by Apache PDFBox.
3. **`job_openings`:** Stores target requisitions (`title`, `department`, `criteria_version`).
4. **`job_criteria`:** Versioned requirements (`name`, `type`, `weight` 1–5, `is_required`) associated with a `JobOpening`.
5. **`evaluation_reports`:** Records each screening run (`criteria_version_evaluated`, `recommendation`, `confidence_score`) and human override audit fields (`human_override`, `override_reason`).
6. **`criterion_evidence`:** Stores per-criterion proof (`status`, `supporting_excerpt`, `gap_analysis`, `confidence`).

---

## 7. AI Evaluation Laboratory (Benchmark Report v1.0)

RecruitIQ includes an automated validation harness (`POST /api/v1/benchmarks/run`) that tests synthetic bilingual ground-truth candidate profiles against active job criteria:

| Case ID | Candidate Profile | Lang / Document Type | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- |
| `CASE-JP-001` | Senior Backend Engineer (Bilingual) | `JA` / `SHOKUMU_KEIREKISHO` | `PASS` | `PASS` | **VERIFIED** |
| `CASE-EN-002` | Java Backend Specialist (Monolingual) | `EN` / `STANDARD_RESUME` | `REVIEW` | `REVIEW` | **VERIFIED** |
| `CASE-EN-003` | Python Data Developer (Missing Core Stack) | `EN` / `STANDARD_RESUME` | `REVIEW` | `REVIEW` | **VERIFIED** |
| `CASE-EN-004` | Tokyo FinTech Lead Engineer | `EN` / `STANDARD_RESUME` | `PASS` | `PASS` | **VERIFIED** |

* **Overall Accuracy:** `100.0%` | **Precision:** `1.00` | **Recall:** `1.00` | **F1 Score:** `1.00` | **False Negative Rate:** `0.00`

---

## 8. Monorepo Structure

```text
RecruitIQ/
├── RecruitIQ/                                  # Spring Boot 3 Backend (Java 21)
│   ├── src/main/java/com/ATSapp/RecruitIQ/
│   │   ├── config/                             # CORS, OpenAPI 3, DataInitializer
│   │   ├── controller/                         # REST Controllers (Candidate, Resume, Eval, Benchmark)
│   │   ├── dto/                                # Immutable Java Records for API Contracts
│   │   ├── exception/                          # GlobalExceptionHandler
│   │   ├── model/                              # JPA Entities & Domain Enums
│   │   ├── repository/                         # Spring Data JPA Repositories
│   │   ├── service/                            # Core Evaluation, Japanese Parser, Blind & APPI Services
│   │   └── RecruitIqApplication.java           # Spring Boot Main Entrypoint
│   ├── Dockerfile                              # Multi-stage Maven build & Alpine JRE runtime
│   ├── docker-compose.yml                      # Orchestrates PostgreSQL 16 + API Container
│   └── pom.xml                                 # Maven configuration (PDFBox 3, SpringDoc, Lombok)
│
├── recruitiq-ui/                               # Enterprise Frontend Workbench (React + TS + Vite)
│   ├── src/
│   │   ├── services/api.ts                     # Typed Axios API Client
│   │   ├── types/api.ts                        # Strict TypeScript Domain Interfaces
│   │   ├── App.tsx                             # 6-Module Split-Screen Governance Workbench
│   │   └── index.css                           # Tailwind v3 Directives & Tabular Typography
│   ├── tailwind.config.js                      # Enterprise Slate Theme Configuration
│   └── vite.config.ts                          # Vite Dev Server & /api Proxy to :8080
│
└── README.md                                   # Case Study & Technical Documentation

```

---

## 9. Quickstart & Local Deployment

### Prerequisites

* **Docker & Docker Compose** (for containerized PostgreSQL + Backend) *OR* **JDK 21 + PostgreSQL 16**
* **Node.js 18+** and **npm** (for the React frontend workbench)

### Step 1: Launch the Backend & PostgreSQL via Docker Compose

```bash
cd RecruitIQ
docker compose up --build -d

```

* **Backend API:** `http://localhost:8080`
* **Interactive Swagger UI:** `http://localhost:8080/swagger-ui/index.html`

### Step 2: Launch the Enterprise React Workbench

Open a second terminal:

```bash
cd recruitiq-ui
npm install
npm run dev

```

* **Frontend Workbench:** `http://localhost:5173`

---

## 10. REST API Reference

| HTTP Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/candidates` | Register a new applicant profile with APPI consent. |
| `GET` | `/api/v1/candidates/{id}` | Retrieve candidate status and anonymization metadata. |
| `POST` | `/api/v1/candidates/{id}/appi-forget` | Execute APPI Right-to-be-Forgotten (file shred + DB PII scrub). |
| `POST` | `/api/v1/resumes/upload` | Ingest a PDF resume (`multipart/form-data`) and extract UTF-8 text via PDFBox. |
| `GET` | `/api/v1/resumes/{id}/raw-text` | Inspect the raw UTF-8 text stream extracted from a resume. |
| `POST` | `/api/v1/evaluations/run` | Evaluate a resume against versioned job criteria (`resumeId`, `jobOpeningId`). |
| `PATCH` | `/api/v1/evaluations/{id}/override` | **"Disagree with AI"**: Override verdict with mandatory recruiter audit reason. |
| `GET` | `/api/v1/evaluations/{id}/interview-kit` | Classify Japanese document format, segment sections, and build interview probes. |
| `GET` | `/api/v1/evaluations/{id}/blind` | Retrieve evaluation report with all candidate PII redacted. |
| `POST` | `/api/v1/benchmarks/run` | Execute the synthetic bilingual benchmark suite and output accuracy metrics. |

---

## 11. Author

**Vivek Chidanand Kubavat**

*Backend & Full-Stack Software Engineering — Java, Spring Boot, PostgreSQL, React, TypeScript*

