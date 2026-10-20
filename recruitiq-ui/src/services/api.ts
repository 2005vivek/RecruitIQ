import axios from 'axios';
import type {
  Candidate,
  ResumeUploadResponse,
  RawTextResponse,
  EvaluationReport,
  BlindEvaluationReport,
  VerificationKit,
  BenchmarkReport,
  Recommendation,
} from '../types/api';

const api = axios.create({
  baseURL: '/api/v1',
});

export const recruitApi = {
  createCandidate: async (fullName: string, email: string, phoneNumber: string): Promise<Candidate> => {
    const res = await api.post<Candidate>('/candidates', {
      fullName,
      email,
      phoneNumber,
    });
    return res.data;
  },

  getCandidate: async (id: number): Promise<Candidate> => {
    const res = await api.get<Candidate>(`/candidates/${id}`);
    return res.data;
  },

  uploadResume: async (candidateId: number, file: File): Promise<ResumeUploadResponse> => {
    const formData = new FormData();
    formData.append('candidateId', String(candidateId));
    formData.append('file', file);

    // Let the browser automatically set Content-Type with the multipart boundary
    const res = await api.post<ResumeUploadResponse>('/resumes/upload', formData);
    return res.data;
  },

  getResumeRawText: async (resumeId: number): Promise<RawTextResponse> => {
    const res = await api.get<RawTextResponse>(`/resumes/${resumeId}/raw-text`);
    return res.data;
  },

  runEvaluation: async (resumeId: number, jobOpeningId: number): Promise<EvaluationReport> => {
    const res = await api.post<EvaluationReport>(
      `/evaluations/run?resumeId=${resumeId}&jobOpeningId=${jobOpeningId}`
    );
    return res.data;
  },

  overrideEvaluation: async (
    reportId: number,
    recommendation: Recommendation,
    reason: string
  ): Promise<EvaluationReport> => {
    const res = await api.patch<EvaluationReport>(`/evaluations/${reportId}/override`, {
      recommendation,
      reason,
    });
    return res.data;
  },

  getBlindEvaluation: async (reportId: number): Promise<BlindEvaluationReport> => {
    const res = await api.get<BlindEvaluationReport>(`/evaluations/${reportId}/blind`);
    return res.data;
  },

  getInterviewKit: async (reportId: number): Promise<VerificationKit> => {
    const res = await api.get<VerificationKit>(`/evaluations/${reportId}/interview-kit`);
    return res.data;
  },

  executeAppiForget: async (candidateId: number, auditReason: string): Promise<Record<string, unknown>> => {
    const res = await api.post<Record<string, unknown>>(`/candidates/${candidateId}/appi-forget`, {
      auditReason,
    });
    return res.data;
  },

  runBenchmarks: async (): Promise<BenchmarkReport> => {
    const res = await api.post<BenchmarkReport>('/benchmarks/run');
    return res.data;
  },
};