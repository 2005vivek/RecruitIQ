export type Recommendation = 'PASS' | 'REVIEW' | 'REJECT';
export type MatchStatus = 'MATCHED' | 'PARTIAL' | 'MISSING';
export type DocumentType = 'RIREKISHO' | 'SHOKUMU_KEIREKISHO' | 'STANDARD_RESUME';

export interface Candidate {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: string;
  appiConsentGiven?: boolean;
  isAnonymized?: boolean;
  anonymizedAt?: string | null;
  createdAt?: string;
}

export interface ResumeUploadResponse {
  resumeId: number;
  candidateId: number;
  fileName: string;
  parsingStatus: string;
  uploadedAt: string;
}

export interface RawTextResponse {
  resumeId: number;
  fileName: string;
  extractedLength: number;
  rawText: string;
}

export interface CriterionEvidence {
  criterionName: string;
  criterionType: string;
  required: boolean;
  status: MatchStatus;
  supportingExcerpt: string | null;
  gapAnalysis: string | null;
  confidence: number;
}

export interface EvaluationReport {
  reportId: number;
  resumeId: number;
  jobOpeningId: number;
  jobTitle: string;
  criteriaVersion: number;
  recommendation: Recommendation;
  matchRatio: number;
  humanOverride: boolean;
  overrideReason: string | null;
  evidence: CriterionEvidence[];
  evaluatedAt: string;
}

export interface BlindEvaluationReport {
  reportId: number;
  anonymousCandidateCode: string;
  jobTitle: string;
  criteriaVersion: number;
  recommendation: Recommendation;
  matchRatio: number;
  humanOverride: boolean;
  overrideReason: string | null;
  sanitizedEvidence: CriterionEvidence[];
  evaluatedAt: string;
}

export interface InterviewQuestion {
  targetArea: string;
  sourceExcerpt: string;
  verificationGoal: string;
  suggestedQuestion: string;
  evaluationCriteria: string;
}

export interface VerificationKit {
  reportId: number;
  candidateId: number;
  documentType: DocumentType;
  extractedSections: Record<string, string>;
  interviewQuestions: InterviewQuestion[];
}

export interface BenchmarkCaseResult {
  caseId: string;
  candidateProfile: string;
  documentType: DocumentType;
  language: string;
  expectedRecommendation: Recommendation;
  actualRecommendation: Recommendation;
  isRecommendationAccurate: boolean;
  matchRatio: number;
  matchedCriteria: string[];
  missingCriteria: string[];
}

export interface BenchmarkReport {
  reportTitle: string;
  evaluatedJobTitle: string;
  criteriaVersion: number;
  totalTestCases: number;
  accurateDecisions: number;
  overallAccuracyPercentage: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  caseResults: BenchmarkCaseResult[];
  executedAt: string;
}