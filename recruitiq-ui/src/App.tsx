import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  Terminal,
  ClipboardCheck,
  Scale,
  AlertCircle,
  Search,
  Check,
  Building2,
  FolderInput,
  Lock,
  UserCheck,
} from 'lucide-react';
import { recruitApi } from './services/api';
import type {
  Candidate,
  EvaluationReport,
  BlindEvaluationReport,
  VerificationKit,
  BenchmarkReport,
  RawTextResponse,
  Recommendation,
} from './types/api';

type ModuleKey = 'ingestion' | 'evidence' | 'document' | 'interview' | 'benchmark' | 'appi';

export default function App() {
  // Navigation & Active Identifiers
  const [activeModule, setActiveModule] = useState<ModuleKey>('ingestion');
  const [activeResumeId, setActiveResumeId] = useState<number | null>(null);
  const [activeCandidateId, setActiveCandidateId] = useState<number>(1);
  const [activeJobOpeningId] = useState<number>(1);
  const [resumeLookupInput, setResumeLookupInput] = useState<string>('1');

  // Core Domain Data
  const [candidateInfo, setCandidateInfo] = useState<Candidate | null>(null);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [blindReport, setBlindReport] = useState<BlindEvaluationReport | null>(null);
  const [interviewKit, setInterviewKit] = useState<VerificationKit | null>(null);
  const [rawTextData, setRawTextData] = useState<RawTextResponse | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);

  // Governance & UI State
  const [isBlindMode, setIsBlindMode] = useState<boolean>(false);
  const [selectedCriterionIndex, setSelectedCriterionIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Ingestion Form State
  const [uploadMode, setUploadMode] = useState<'existing' | 'new'>('existing');
  const [existingCandidateIdInput, setExistingCandidateIdInput] = useState<string>('1');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Override Form State
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideRec, setOverrideRec] = useState<Recommendation>('PASS');
  const [overrideReason, setOverrideReason] = useState<string>('');

  // APPI Purge Form State
  const [appiTargetCandidateId, setAppiTargetCandidateId] = useState<string>('1');
  const [appiAuditReason, setAppiAuditReason] = useState<string>(
    'APPI Article 35 Request: Candidate requested complete erasure of retained personal data and uploaded CVs.'
  );
  const [appiAuditHistory, setAppiAuditHistory] = useState<
    Array<{ candidateId: number; timestamp: string; reason: string }>
  >([]);

  const extractErrorMessage = (err: unknown, fallback: string): string => {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as Record<string, unknown> | undefined;
      if (data && typeof data.message === 'string') return data.message;
      if (data && typeof data.error === 'string') return `${data.error} (HTTP ${err.response?.status})`;
      if (err.message) return err.message;
    } else if (err instanceof Error) {
      return err.message;
    }
    return fallback;
  };

  // Check backend connectivity & load default Candidate #1 on mount without throwing errors if no resume exists yet
  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        const cand = await recruitApi.getCandidate(1);
        setCandidateInfo(cand);
        setApiConnected(true);
      } catch {
        // Even if candidate #1 isn't found, test benchmark endpoint or mark status
        setApiConnected(false);
      }
    };
    initializeWorkspace();
  }, []);

  const loadEvaluationForResume = useCallback(
    async (resumeId: number, switchTab = true) => {
      setLoading(true);
      setErrorBanner(null);
      try {
        const evalData = await recruitApi.runEvaluation(resumeId, activeJobOpeningId);
        setReport(evalData);
        setActiveResumeId(resumeId);
        setResumeLookupInput(String(resumeId));
        setSelectedCriterionIndex(0);
        setApiConnected(true);

        const [kitRes, rawRes] = await Promise.allSettled([
          recruitApi.getInterviewKit(evalData.reportId),
          recruitApi.getResumeRawText(resumeId),
        ]);

        if (kitRes.status === 'fulfilled') {
          setInterviewKit(kitRes.value);
          setActiveCandidateId(kitRes.value.candidateId);
          setAppiTargetCandidateId(String(kitRes.value.candidateId));
          try {
            const c = await recruitApi.getCandidate(kitRes.value.candidateId);
            setCandidateInfo(c);
          } catch {
            // ignore candidate metadata error
          }
        }

        if (rawRes.status === 'fulfilled') {
          setRawTextData(rawRes.value);
        }

        if (isBlindMode) {
          const blindData = await recruitApi.getBlindEvaluation(evalData.reportId);
          setBlindReport(blindData);
        }

        if (switchTab) {
          setActiveModule('evidence');
        }
        setStatusNotice(`Loaded Evaluation Report #${evalData.reportId} for Resume #${resumeId}.`);
      } catch (err: unknown) {
        setErrorBanner(
          `Could not evaluate Resume ID #${resumeId}: ${extractErrorMessage(
            err,
            'Verify that a PDF resume with this ID has been uploaded.'
          )}`
        );
      } finally {
        setLoading(false);
      }
    },
    [activeJobOpeningId, isBlindMode]
  );

  const handleUploadAndEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPdf) {
      setErrorBanner('Please select a valid .pdf document before submitting.');
      return;
    }

    setUploading(true);
    setErrorBanner(null);
    setStatusNotice(null);

    try {
      let targetCandidateId = parseInt(existingCandidateIdInput, 10);

      if (uploadMode === 'new') {
        if (!newFullName.trim() || !newEmail.trim()) {
          setErrorBanner('Candidate Full Name and Email are required to register a new candidate.');
          setUploading(false);
          return;
        }
        const created = await recruitApi.createCandidate(
          newFullName.trim(),
          newEmail.trim(),
          newPhone.trim()
        );
        targetCandidateId = created.id;
        setCandidateInfo(created);
      }

      const uploadRes = await recruitApi.uploadResume(targetCandidateId, selectedPdf);
      setSelectedPdf(null);
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setActiveCandidateId(targetCandidateId);
      setExistingCandidateIdInput(String(targetCandidateId));

      setStatusNotice(
        `Ingested "${uploadRes.fileName}" as Resume ID #${uploadRes.resumeId}. Running evidence evaluation...`
      );
      await loadEvaluationForResume(uploadRes.resumeId, true);
    } catch (err: unknown) {
      setErrorBanner(
        `PDF Ingestion failed: ${extractErrorMessage(
          err,
          'Ensure Spring Boot is running and the candidate ID or unique email is valid.'
        )}`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleToggleBlindMode = async () => {
    if (!isBlindMode) {
      if (report) {
        setLoading(true);
        try {
          const blind = await recruitApi.getBlindEvaluation(report.reportId);
          setBlindReport(blind);
          setIsBlindMode(true);
          setStatusNotice('Blind Screening Mode ENABLED: All candidate PII masked.');
        } catch (err: unknown) {
          setErrorBanner(`Blind Screening error: ${extractErrorMessage(err, 'Failed to redact PII.')}`);
        } finally {
          setLoading(false);
        }
      } else {
        setIsBlindMode(true);
        setStatusNotice('Blind Screening Mode ENABLED.');
      }
    } else {
      setIsBlindMode(false);
      setStatusNotice('Blind Screening Mode DISABLED.');
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !overrideReason.trim()) return;

    setLoading(true);
    setErrorBanner(null);
    try {
      const updated = await recruitApi.overrideEvaluation(
        report.reportId,
        overrideRec,
        overrideReason.trim()
      );
      setReport(updated);
      if (isBlindMode) {
        const updatedBlind = await recruitApi.getBlindEvaluation(updated.reportId);
        setBlindReport(updatedBlind);
      }
      setShowOverrideModal(false);
      setOverrideReason('');
      setStatusNotice(
        `Audit log updated: Report #${updated.reportId} overridden to ${updated.recommendation}.`
      );
    } catch (err: unknown) {
      setErrorBanner(`Override failed: ${extractErrorMessage(err, 'Unable to save override.')}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBenchmarkLab = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const bench = await recruitApi.runBenchmarks();
      setBenchmarkReport(bench);
      setActiveModule('benchmark');
      setApiConnected(true);
      setStatusNotice(
        `Executed ${bench.reportTitle}: ${bench.overallAccuracyPercentage}% accuracy across ${bench.totalTestCases} bilingual test cases.`
      );
    } catch (err: unknown) {
      setErrorBanner(
        `Benchmark Suite failed: ${extractErrorMessage(
          err,
          'Ensure BenchmarkService has @Transactional and the backend server was restarted.'
        )}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAppiPurge = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = parseInt(appiTargetCandidateId, 10);
    if (isNaN(targetId) || targetId < 1 || !appiAuditReason.trim()) return;

    setLoading(true);
    setErrorBanner(null);
    try {
      await recruitApi.executeAppiForget(targetId, appiAuditReason.trim());
      setAppiAuditHistory((prev) => [
        {
          candidateId: targetId,
          timestamp: new Date().toISOString(),
          reason: appiAuditReason.trim(),
        },
        ...prev,
      ]);
      if (activeCandidateId === targetId) {
        const refreshed = await recruitApi.getCandidate(targetId);
        setCandidateInfo(refreshed);
      }
      setStatusNotice(
        `APPI Right-to-be-Forgotten executed for Candidate #${targetId}. Physical PDF files shredded and PII scrubbed.`
      );
    } catch (err: unknown) {
      setErrorBanner(
        `APPI Purge failed for Candidate #${targetId}: ${extractErrorMessage(
          err,
          'Candidate may not exist or is already anonymized.'
        )}`
      );
    } finally {
      setLoading(false);
    }
  };

  const evidenceList = isBlindMode
    ? blindReport?.sanitizedEvidence ?? []
    : report?.evidence ?? [];

  const activeVerdict = isBlindMode
    ? blindReport?.recommendation
    : report?.recommendation;

  const selectedEvidence = evidenceList[selectedCriterionIndex] ?? null;
  const matchedCount = evidenceList.filter((e) => e.status === 'MATCHED').length;
  const mandatoryMissingCount = evidenceList.filter(
    (e) => e.status === 'MISSING' && e.required
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f8] text-slate-900">
      {/* Top Institutional System Bar */}
      <header className="h-12 bg-[#0b1324] text-slate-200 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 bg-sky-700 flex items-center justify-center border border-sky-500">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-sm text-white">RECRUITIQ</span>
            <span className="text-[11px] font-mono text-slate-400 border-l border-slate-700 pl-2.5">
              採用意思決定支援システム // ENTERPRISE GOVERNANCE WORKBENCH
            </span>
          </div>

          <div className="hidden xl:flex items-center space-x-2 text-[11px] font-mono">
            <span
              className={`px-2 py-0.5 border ${
                apiConnected === false
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                  : 'bg-slate-900 text-emerald-400 border-slate-700'
              }`}
            >
              API_PORT_8080: {apiConnected === false ? 'OFFLINE' : 'ONLINE'}
            </span>
            <span className="px-2 py-0.5 bg-slate-900 text-slate-300 border border-slate-700">
              APPI_COMPLIANCE: ENFORCED
            </span>
          </div>
        </div>

        {/* Right Global Bar Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Direct Resume ID Loader */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const id = parseInt(resumeLookupInput, 10);
              if (!isNaN(id) && id > 0) {
                loadEvaluationForResume(id, true);
              }
            }}
            className="flex items-center bg-slate-900 border border-slate-700 text-xs"
          >
            <span className="px-2 text-[11px] font-mono text-slate-400">LOAD RESUME_ID:</span>
            <input
              type="number"
              min={1}
              value={resumeLookupInput}
              onChange={(e) => setResumeLookupInput(e.target.value)}
              className="w-12 bg-slate-950 text-white font-mono text-xs px-1.5 py-1 focus:outline-none border-l border-slate-700 tabular-nums"
            />
            <button
              type="submit"
              title="Evaluate Resume ID"
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 border-l border-slate-700 transition"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Blind Screening Switch */}
          <button
            onClick={handleToggleBlindMode}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-mono border transition ${
              isBlindMode
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {isBlindMode ? (
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>BLIND_SCREENING: {isBlindMode ? 'ON (PII MASKED)' : 'OFF'}</span>
          </button>
        </div>
      </header>

      {/* Main Split Layout: Left Navigation Rail + Right Operational Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Enterprise Navigation Rail */}
        <aside className="w-64 bg-[#111827] text-slate-300 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
          <div className="p-3 space-y-5">
            <div>
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                01 // INGESTION & PIPELINE
              </div>
              <button
                onClick={() => setActiveModule('ingestion')}
                className={`w-full mt-1 flex items-center justify-between px-3 py-2 text-xs font-medium border-l-2 transition ${
                  activeModule === 'ingestion'
                    ? 'bg-slate-800/90 text-white border-sky-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center space-x-2.5">
                  <FolderInput className="w-4 h-4 text-sky-400" />
                  <span>PDF Document Ingestion</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">登録</span>
              </button>
            </div>

            <div>
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                02 // EXPLAINABLE SCREENING
              </div>
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => setActiveModule('evidence')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium border-l-2 transition ${
                    activeModule === 'evidence'
                      ? 'bg-slate-800/90 text-white border-sky-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center space-x-2.5">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>Evidence Matrix</span>
                  </span>
                  <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 text-slate-300 border border-slate-700 tabular-nums">
                    {evidenceList.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveModule('document')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium border-l-2 transition ${
                    activeModule === 'document'
                      ? 'bg-slate-800/90 text-white border-sky-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span>Japanese Doc Parser</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">解析</span>
                </button>

                <button
                  onClick={() => setActiveModule('interview')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium border-l-2 transition ${
                    activeModule === 'interview'
                      ? 'bg-slate-800/90 text-white border-sky-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center space-x-2.5">
                    <ClipboardCheck className="w-4 h-4 text-amber-400" />
                    <span>Claim Verification Kit</span>
                  </span>
                  <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 text-slate-300 border border-slate-700 tabular-nums">
                    {interviewKit?.interviewQuestions.length ?? 0}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                03 // AUDIT & QUALITY LAB
              </div>
              <div className="mt-1 space-y-1">
                <button
                  onClick={handleRunBenchmarkLab}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium border-l-2 transition ${
                    activeModule === 'benchmark'
                      ? 'bg-slate-800/90 text-white border-sky-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center space-x-2.5">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    <span>AI Benchmark Lab</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">v1.0</span>
                </button>

                <button
                  onClick={() => setActiveModule('appi')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium border-l-2 transition ${
                    activeModule === 'appi'
                      ? 'bg-slate-800/90 text-white border-rose-500 font-semibold'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center space-x-2.5">
                    <Lock className="w-4 h-4 text-rose-400" />
                    <span>APPI Data Governance</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">準拠</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Session Context Box */}
          <div className="p-3 border-t border-slate-800 bg-[#0d1424] text-[11px] font-mono space-y-1.5">
            <div className="text-slate-500 uppercase text-[10px]">ACTIVE SESSION STATE</div>
            <div className="flex justify-between">
              <span className="text-slate-400">ACTIVE_RESUME:</span>
              <span className="text-white font-bold">
                {activeResumeId ? `#00${activeResumeId}` : 'NONE'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">CANDIDATE_ID:</span>
              <span className="text-white font-bold">
                {isBlindMode ? 'REDACTED' : `#00${activeCandidateId}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DOC_STANDARD:</span>
              <span className="text-sky-400">
                {interviewKit?.documentType ?? 'UNCLASSIFIED'}
              </span>
            </div>
          </div>
        </aside>

        {/* Right Operational Workspace */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Alert & Status Strips */}
          {errorBanner && (
            <div className="bg-rose-950 text-rose-100 border-b border-rose-800 px-6 py-2.5 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-mono">{errorBanner}</span>
              </div>
              <button
                onClick={() => setErrorBanner(null)}
                className="text-[11px] font-mono underline hover:text-white ml-4 shrink-0"
              >
                DISMISS
              </button>
            </div>
          )}

          {statusNotice && (
            <div className="bg-slate-800 text-slate-100 border-b border-slate-700 px-6 py-2 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-mono text-[11px]">{statusNotice}</span>
              </div>
              <button
                onClick={() => setStatusNotice(null)}
                className="text-[10px] font-mono text-slate-400 hover:text-white"
              >
                CLEAR
              </button>
            </div>
          )}

          {/* Persistent Role & Verdict Header Ribbon */}
          <div className="bg-white border-b border-slate-300 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>REQUISITION #00{report?.jobOpeningId ?? 1}</span>
                <span>//</span>
                <span>CRITERIA VERSION v{report?.criteriaVersion ?? 1}.0</span>
              </div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
                {report?.jobTitle ?? 'Bilingual Backend Engineer'}{' '}
                <span className="text-xs font-normal text-slate-500">
                  — Tokyo Enterprise Engineering Division
                </span>
              </h1>
            </div>

            {/* KPI Telemetry Strip */}
            <div className="flex items-center divide-x divide-slate-200 border border-slate-300 bg-slate-50">
              <div className="px-4 py-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  APPLICANT IDENTIFIER
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                  {isBlindMode
                    ? blindReport?.anonymousCandidateCode ?? 'CANDIDATE-ANON-MASKED'
                    : candidateInfo
                    ? `${candidateInfo.fullName} (#00${candidateInfo.id})`
                    : `CANDIDATE #00${activeCandidateId}`}
                </span>
              </div>

              <div className="px-4 py-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  WEIGHTED MATCH RATIO
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                  {report ? `${Math.round(report.matchRatio * 100)}% (${matchedCount}/${evidenceList.length})` : 'N/A'}
                </span>
              </div>

              <div className="px-4 py-1.5 flex items-center space-x-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    SCREENING VERDICT
                  </span>
                  <span
                    className={`inline-block text-xs font-mono font-bold px-2 py-0.5 mt-0.5 border ${
                      !activeVerdict
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : activeVerdict === 'PASS'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                        : activeVerdict === 'REVIEW'
                        ? 'bg-amber-50 text-amber-800 border-amber-400'
                        : 'bg-rose-50 text-rose-800 border-rose-400'
                    }`}
                  >
                    {activeVerdict ?? 'AWAITING_PDF'}
                  </span>
                </div>

                {report && (
                  <button
                    onClick={() => {
                      setOverrideRec(report.recommendation);
                      setShowOverrideModal(true);
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-medium flex items-center space-x-1.5 transition"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Override Verdict</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Human Override Active Audit Banner */}
          {report?.humanOverride && (
            <div className="bg-sky-50 border-b border-sky-300 px-6 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-sky-950">
                <span className="font-mono font-bold uppercase px-1.5 py-0.5 bg-sky-200 text-sky-900 text-[10px] border border-sky-300">
                  HUMAN_OVERRIDE_LOGGED
                </span>
                <span className="font-semibold">Recruiter Audit Rationale:</span>
                <span className="font-mono text-sky-900">"{report.overrideReason}"</span>
              </div>
              <span className="font-mono text-[11px] text-sky-800 tabular-nums">
                REPORT_ID: #{report.reportId}
              </span>
            </div>
          )}

          {/* WORKSPACE BODY */}
          <main className="p-6 max-w-[1600px] w-full mx-auto space-y-6">
            {/* MODULE 1: PDF DOCUMENT INGESTION & CANDIDATE REGISTRATION */}
            {activeModule === 'ingestion' && (
              <div className="grid grid-cols-12 gap-6 items-start">
                {/* Left 7 Cols: PDF Ingestion Form */}
                <div className="col-span-12 lg:col-span-7 bg-white border border-slate-300">
                  <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Candidate & PDF Document Ingestion // 応募書類アップロード・解析実行
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Upload a Japanese Rirekisho (履歴書), Shokumu Keirekisho (職務経歴書), or English CV in PDF format.
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">NIO.2 + PDFBOX</span>
                  </div>

                  <form onSubmit={handleUploadAndEvaluate} className="p-5 space-y-5 text-xs">
                    {/* Candidate Target Selector */}
                    <div>
                      <label className="block font-mono font-bold uppercase text-[11px] text-slate-700 mb-2">
                        1. SELECT APPLICANT RECORD MODE
                      </label>
                      <div className="grid grid-cols-2 border border-slate-300 bg-slate-100 p-0.5 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => setUploadMode('existing')}
                          className={`py-2 font-bold transition ${
                            uploadMode === 'existing'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          USE EXISTING CANDIDATE ID (#1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadMode('new')}
                          className={`py-2 font-bold transition ${
                            uploadMode === 'new'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          REGISTER NEW CANDIDATE
                        </button>
                      </div>
                    </div>

                    {uploadMode === 'existing' ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                        <label className="block font-mono font-bold uppercase text-[11px] text-slate-700">
                          TARGET CANDIDATE ID (候補者ID)
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            min={1}
                            required
                            value={existingCandidateIdInput}
                            onChange={(e) => setExistingCandidateIdInput(e.target.value)}
                            className="w-28 border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-slate-900 tabular-nums"
                          />
                          <span className="text-slate-600 font-mono text-[11px]">
                            (Candidate #1 is pre-seeded by DataInitializer on startup)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 space-y-3">
                        <div>
                          <label className="block font-mono font-bold uppercase text-[11px] text-slate-700 mb-1">
                            CANDIDATE FULL NAME (氏名) *
                          </label>
                          <input
                            type="text"
                            required
                            value={newFullName}
                            onChange={(e) => setNewFullName(e.target.value)}
                            placeholder="Kenji Takahashi"
                            className="w-full border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-slate-900"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-mono font-bold uppercase text-[11px] text-slate-700 mb-1">
                              UNIQUE EMAIL ADDRESS *
                            </label>
                            <input
                              type="email"
                              required
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              placeholder="kenji.takahashi@example.jp"
                              className="w-full border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-mono font-bold uppercase text-[11px] text-slate-700 mb-1">
                              PHONE NUMBER
                            </label>
                            <input
                              type="text"
                              value={newPhone}
                              onChange={(e) => setNewPhone(e.target.value)}
                              placeholder="+81 90-1234-5678"
                              className="w-full border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PDF File Selector */}
                    <div>
                      <label className="block font-mono font-bold uppercase text-[11px] text-slate-700 mb-2">
                        2. ATTACH PDF RESUME DOCUMENT (PDFファイル選択)
                      </label>
                      <div className="border border-dashed border-slate-400 bg-slate-50 p-5">
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          required
                          onChange={(e) => setSelectedPdf(e.target.files?.[0] ?? null)}
                          className="w-full font-mono text-xs text-slate-700 file:mr-4 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-mono file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                        />
                        {selectedPdf && (
                          <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between font-mono text-[11px] text-emerald-800">
                            <span>SELECTED: {selectedPdf.name}</span>
                            <span>{(selectedPdf.size / 1024).toFixed(1)} KB</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={uploading}
                        className="px-5 py-2.5 bg-sky-700 hover:bg-sky-600 text-white font-mono text-xs font-bold flex items-center space-x-2 disabled:opacity-50 transition"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {uploading
                            ? 'STORING PDF & RUNNING EVIDENCE ENGINE...'
                            : 'INGEST PDF & EXECUTE EVALUATION'}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right 5 Cols: Quick Actions & System Pipeline Info */}
                <div className="col-span-12 lg:col-span-5 space-y-4">
                  <div className="bg-white border border-slate-300 p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Evaluate Previously Uploaded Resume // 既存履歴書の再評価
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      If you have already uploaded a PDF into PostgreSQL during this session, enter its{' '}
                      <code className="font-mono bg-slate-100 px-1">RESUME_ID</code> below to load its Evidence Matrix and Interview Kit:
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const id = parseInt(resumeLookupInput, 10);
                        if (!isNaN(id) && id > 0) {
                          loadEvaluationForResume(id, true);
                        }
                      }}
                      className="flex items-center space-x-2 pt-1"
                    >
                      <input
                        type="number"
                        min={1}
                        value={resumeLookupInput}
                        onChange={(e) => setResumeLookupInput(e.target.value)}
                        className="w-24 border border-slate-300 px-3 py-1.5 font-mono text-xs tabular-nums focus:outline-none focus:border-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition"
                      >
                        LOAD RESUME #{resumeLookupInput}
                      </button>
                    </form>
                  </div>

                  <div className="bg-white border border-slate-300 p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      No PDF Handy? Run the Synthetic Benchmark Suite
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You can immediately test the AI Evaluation Laboratory without uploading a PDF. It executes 4 built-in Japanese (職務経歴書) and English candidate profiles against the criteria engine.
                    </p>
                    <button
                      onClick={handleRunBenchmarkLab}
                      disabled={loading}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono text-xs font-bold border border-slate-700 transition"
                    >
                      LAUNCH AI BENCHMARK SUITE v1.0 &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 2: EVIDENCE MATRIX & CITATION INSPECTOR */}
            {activeModule === 'evidence' && (
              <>
                {!report ? (
                  <div className="bg-white border border-slate-300 p-10 text-center space-y-3">
                    <p className="text-xs font-mono text-slate-600">
                      No resume evaluation is currently loaded in memory. Upload a PDF document or load an existing Resume ID first.
                    </p>
                    <button
                      onClick={() => setActiveModule('ingestion')}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-mono font-bold"
                    >
                      GO TO PDF DOCUMENT INGESTION
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-6 items-start">
                    {/* Left 7 Cols: Criteria Matrix */}
                    <div className="col-span-12 lg:col-span-7 bg-white border border-slate-300">
                      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div>
                          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Criteria Verification Matrix // 評価基準エビデンス一覧
                          </h2>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Click any criterion row to inspect its extracted PDF sentence citation or missing requirement gap analysis.
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                          MANDATORY_GAPS: {mandatoryMissingCount}
                        </span>
                      </div>

                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-300 bg-slate-100 text-[10px] font-mono uppercase text-slate-600">
                            <th className="py-2.5 px-3">Criterion</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Gate Rule</th>
                            <th className="py-2.5 px-3">Confidence</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {evidenceList.map((item, idx) => {
                            const isSelected = idx === selectedCriterionIndex;
                            return (
                              <tr
                                key={idx}
                                onClick={() => setSelectedCriterionIndex(idx)}
                                className={`cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-slate-900 text-white'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <td className="py-3 px-3 font-bold">{item.criterionName}</td>
                                <td className="py-3 px-3 font-mono text-[11px]">
                                  <span
                                    className={`px-1.5 py-0.5 border ${
                                      isSelected
                                        ? 'bg-slate-800 text-slate-200 border-slate-700'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {item.criterionType}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-mono text-[11px]">
                                  {item.required ? (
                                    <span
                                      className={`font-semibold ${
                                        isSelected ? 'text-rose-300' : 'text-rose-700'
                                      }`}
                                    >
                                      MANDATORY (必須)
                                    </span>
                                  ) : (
                                    <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>
                                      OPTIONAL (歓迎)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-mono tabular-nums">
                                  {(item.confidence * 100).toFixed(0)}%
                                </td>
                                <td className="py-3 px-3">
                                  {item.status === 'MATCHED' ? (
                                    <span
                                      className={`inline-flex items-center space-x-1 font-mono text-[11px] font-bold px-2 py-0.5 border ${
                                        isSelected
                                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      }`}
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>VERIFIED</span>
                                    </span>
                                  ) : (
                                    <span
                                      className={`inline-flex items-center space-x-1 font-mono text-[11px] font-bold px-2 py-0.5 border ${
                                        isSelected
                                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                                          : 'bg-amber-50 text-amber-800 border-amber-300'
                                      }`}
                                    >
                                      <XCircle className="w-3 h-3" />
                                      <span>MISSING</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Right 5 Cols: Evidence Citation & Gap Inspector */}
                    <div className="col-span-12 lg:col-span-5 bg-white border border-slate-300">
                      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Line Citation & Gap Inspector // 根拠インスペクタ
                        </h2>
                        <span className="font-mono text-[11px] text-slate-500">
                          {selectedEvidence?.criterionName ?? 'NONE'}
                        </span>
                      </div>

                      {selectedEvidence ? (
                        <div className="p-5 space-y-5">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div>
                              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                                SELECTED CRITERION
                              </span>
                              <h3 className="text-base font-bold text-slate-900">
                                {selectedEvidence.criterionName}
                              </h3>
                            </div>
                            <div className="text-right font-mono">
                              <span className="text-[10px] uppercase text-slate-400 block">
                                CONFIDENCE
                              </span>
                              <span className="text-sm font-bold text-slate-900 tabular-nums">
                                {(selectedEvidence.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {selectedEvidence.status === 'MATCHED' &&
                          selectedEvidence.supportingExcerpt ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-mono font-bold uppercase text-emerald-800">
                                  DIRECT PDF SENTENCE CITATION (原文引用)
                                </span>
                                {isBlindMode && (
                                  <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 border border-amber-300">
                                    PII_REDACTED
                                  </span>
                                )}
                              </div>
                              <div className="p-4 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed border-l-4 border-emerald-500">
                                "{selectedEvidence.supportingExcerpt}"
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <span className="text-[11px] font-mono font-bold uppercase text-amber-800 block">
                                GAP ANALYSIS — "WHY NOT THIS CANDIDATE?" (不足要件)
                              </span>
                              <div className="p-4 bg-amber-50/70 text-amber-950 font-mono text-xs leading-relaxed border border-amber-300 border-l-4 border-l-amber-600">
                                {selectedEvidence.gapAnalysis}
                              </div>
                            </div>
                          )}

                          <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-600">
                            <div className="bg-slate-50 p-2.5 border border-slate-200">
                              <span className="text-[10px] text-slate-400 block">CRITERION_TYPE</span>
                              <span className="font-bold text-slate-800">
                                {selectedEvidence.criterionType}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 border border-slate-200">
                              <span className="text-[10px] text-slate-400 block">GATE_POLICY</span>
                              <span className="font-bold text-slate-800">
                                {selectedEvidence.required ? 'REQUIRED_GATE' : 'WEIGHTED_PREFERENCE'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs font-mono text-slate-500">
                          Select a criterion row from the table.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* MODULE 3: JAPANESE DOCUMENT PARSER & RAW PDFBOX STREAM */}
            {activeModule === 'document' && (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-5 bg-white border border-slate-300">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Japanese Document Segmentation // 職務経歴書セクション解析
                    </h2>
                    <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-200 text-slate-800 font-bold">
                      {interviewKit?.documentType ?? 'UNCLASSIFIED'}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">CLASSIFIED_STANDARD:</span>
                        <span className="font-bold text-slate-900">
                          {interviewKit?.documentType ?? 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">FILE_NAME:</span>
                        <span className="font-bold text-slate-900">
                          {rawTextData?.fileName ?? 'No PDF Loaded'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">EXTRACTED_LENGTH:</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {rawTextData?.extractedLength ?? 0} chars
                        </span>
                      </div>
                    </div>

                    {interviewKit && Object.keys(interviewKit.extractedSections).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(interviewKit.extractedSections).map(([secKey, content]) => (
                          <div key={secKey} className="border border-slate-300 p-3 bg-white">
                            <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-slate-900 text-white">
                              SECTION // {secKey.toUpperCase()}
                            </span>
                            <p className="mt-2 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-mono">
                              {content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-slate-200 p-4 text-xs text-slate-600 bg-slate-50 font-mono leading-relaxed">
                        No explicit Japanese section headers (【職務要約】, 【自己PR】, 【志望動機】) segmented in current document. Full PDFBox stream is shown on the right.
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-7 bg-white border border-slate-300">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Apache PDFBox Extracted Text Stream // PDF抽出テキスト原文
                    </h2>
                    <span className="font-mono text-[11px] text-slate-500">UTF-8 STREAM</span>
                  </div>
                  <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-[540px] overflow-y-auto leading-relaxed">
                    {rawTextData?.rawText ? (
                      rawTextData.rawText.split('\n').map((line, i) => (
                        <div key={i} className="flex hover:bg-slate-900 px-1">
                          <span className="w-10 shrink-0 text-slate-600 select-none text-right pr-3 tabular-nums">
                            {i + 1}
                          </span>
                          <span className="break-all">
                            {isBlindMode ? '[BLIND_SCREENING_ACTIVE — RAW_STREAM_HIDDEN]' : line || ' '}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 py-10 text-center">
                        Ingest or load a PDF resume to inspect its extracted Apache PDFBox stream.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 4: INTERVIEW CLAIM VERIFICATION KIT */}
            {activeModule === 'interview' && (
              <div className="bg-white border border-slate-300">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Interview Claim Verification Kit // 候補者クレーム検証・面接質問票
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Targeted technical interview questions generated from high-impact resume claims and missing mandatory qualifications.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-slate-700 font-bold">
                    PROBES: {interviewKit?.interviewQuestions.length ?? 0}
                  </span>
                </div>

                {interviewKit && interviewKit.interviewQuestions.length > 0 ? (
                  <div className="divide-y divide-slate-200">
                    {interviewKit.interviewQuestions.map((q, idx) => (
                      <div key={idx} className="p-5 grid grid-cols-12 gap-6 hover:bg-slate-50/60">
                        <div className="col-span-12 lg:col-span-4 space-y-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-900 text-white inline-block">
                            PROBE #{idx + 1} // {q.targetArea}
                          </span>
                          <p className="text-xs font-semibold text-slate-800">{q.verificationGoal}</p>
                          <div className="p-2.5 bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-600">
                            <span className="text-[10px] uppercase text-slate-400 block mb-0.5">
                              TRIGGERING EXCERPT:
                            </span>
                            "{q.sourceExcerpt}"
                          </div>
                        </div>

                        <div className="col-span-12 lg:col-span-8 space-y-3">
                          <div className="p-3 bg-white border border-slate-300 border-l-4 border-l-sky-700">
                            <span className="text-[10px] font-mono font-bold uppercase text-sky-800 block mb-1">
                              SUGGESTED INTERVIEWER QUESTION (面接官確認質問)
                            </span>
                            <p className="text-xs font-bold text-slate-900">{q.suggestedQuestion}</p>
                          </div>

                          <div className="p-3 bg-emerald-50/50 border border-emerald-200">
                            <span className="text-[10px] font-mono font-bold uppercase text-emerald-900 block mb-1">
                              EVALUATION SCORING RUBRIC (評価基準ルーブリック)
                            </span>
                            <p className="text-xs text-emerald-950">{q.evaluationCriteria}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-xs font-mono text-slate-500">
                    Upload or load a resume first to generate its customized Interview Verification Kit.
                  </div>
                )}
              </div>
            )}

            {/* MODULE 5: AI EVALUATION BENCHMARK LAB */}
            {activeModule === 'benchmark' && (
              <div className="space-y-6">
                {benchmarkReport ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-6 bg-white border border-slate-300 divide-x divide-slate-200">
                      <div className="p-4">
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">
                          OVERALL ACCURACY
                        </span>
                        <span className="text-2xl font-mono font-bold text-emerald-700 tabular-nums">
                          {benchmarkReport.overallAccuracyPercentage}%
                        </span>
                      </div>
                      <div className="p-4">
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">
                          PRECISION (適合率)
                        </span>
                        <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                          {benchmarkReport.precision.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-4">
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">
                          RECALL (再現率)
                        </span>
                        <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                          {benchmarkReport.recall.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-4">
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">
                          F1 SCORE
                        </span>
                        <span className="text-2xl font-mono font-bold text-sky-700 tabular-nums">
                          {benchmarkReport.f1Score.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-4">
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">
                          FALSE POSITIVE RATE
                        </span>
                        <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                          {benchmarkReport.falsePositiveRate.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-4">
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">
                          FALSE NEGATIVE RATE
                        </span>
                        <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                          {benchmarkReport.falseNegativeRate.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-300">
                      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          {benchmarkReport.reportTitle} — Bilingual Ground-Truth Validation Matrix
                        </h3>
                        <button
                          onClick={handleRunBenchmarkLab}
                          className="px-2.5 py-1 bg-slate-900 text-white font-mono text-[11px] flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>RE-RUN SUITE</span>
                        </button>
                      </div>

                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-300 bg-slate-100 text-[10px] font-mono uppercase text-slate-600">
                            <th className="py-2.5 px-3">Case ID</th>
                            <th className="py-2.5 px-3">Synthetic Profile</th>
                            <th className="py-2.5 px-3">Lang / Standard</th>
                            <th className="py-2.5 px-3">Matched Criteria</th>
                            <th className="py-2.5 px-3">Missing Criteria</th>
                            <th className="py-2.5 px-3">Expected</th>
                            <th className="py-2.5 px-3">Actual</th>
                            <th className="py-2.5 px-3">Audit Verdict</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {benchmarkReport.caseResults.map((c) => (
                            <tr key={c.caseId} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                {c.caseId}
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-800">
                                {c.candidateProfile}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                                {c.language} // {c.documentType}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-emerald-800">
                                {c.matchedCriteria.join(', ') || 'NONE'}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-rose-700">
                                {c.missingCriteria.join(', ') || 'NONE'}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold">
                                {c.expectedRecommendation}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold">
                                {c.actualRecommendation}
                              </td>
                              <td className="py-3 px-3 font-mono">
                                {c.isRecommendationAccurate ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[11px]">
                                    EXACT_MATCH
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-300 font-bold text-[11px]">
                                    MISMATCH
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-slate-300 p-10 text-center space-y-3">
                    <p className="text-xs font-mono text-slate-600">
                      Click below to execute the synthetic bilingual benchmark suite (no uploaded PDF required).
                    </p>
                    <button
                      onClick={handleRunBenchmarkLab}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-mono font-bold hover:bg-slate-800"
                    >
                      EXECUTE BENCHMARK SUITE v1.0
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MODULE 6: APPI DATA GOVERNANCE & RIGHT-TO-BE-FORGOTTEN */}
            {activeModule === 'appi' && (
              <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-12 lg:col-span-6 bg-white border border-slate-300">
                  <div className="px-5 py-3.5 border-b border-slate-200 bg-rose-950 text-white flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase">
                      APPI Right-to-be-Forgotten Execution // 個人情報削除・物理ファイル破棄
                    </span>
                    <Trash2 className="w-4 h-4 text-rose-300" />
                  </div>

                  <form onSubmit={handleExecuteAppiPurge} className="p-5 space-y-4 text-xs">
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-950 font-mono text-[11px] leading-relaxed">
                      Executing this workflow enforces Japan's Act on the Protection of Personal Information (APPI):
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Physically deletes all PDF resumes for the candidate from disk via Java NIO.2.</li>
                        <li>Scrubs Full Name, Email, and Phone Number in PostgreSQL (`APPI_REDACTED_#`).</li>
                        <li>Retains anonymized evaluation statistics for fairness auditing.</li>
                      </ul>
                    </div>

                    <div>
                      <label className="block font-mono font-bold uppercase text-[11px] text-slate-700 mb-1">
                        TARGET CANDIDATE ID FOR ERASURE (対象候補者ID)
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={appiTargetCandidateId}
                        onChange={(e) => setAppiTargetCandidateId(e.target.value)}
                        className="w-32 border border-slate-300 px-3 py-1.5 font-mono text-xs tabular-nums focus:outline-none focus:border-rose-700"
                      />
                    </div>

                    <div>
                      <label className="block font-mono font-bold uppercase text-[11px] text-slate-700 mb-1">
                        MANDATORY COMPLIANCE AUDIT REASON (削除監査理由)
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={appiAuditReason}
                        onChange={(e) => setAppiAuditReason(e.target.value)}
                        className="w-full border border-slate-300 p-2.5 font-mono text-xs focus:outline-none focus:border-rose-700"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white font-mono text-xs font-bold transition"
                      >
                        EXECUTE APPI FILE SHRED & PII SCRUB
                      </button>
                    </div>
                  </form>
                </div>

                <div className="col-span-12 lg:col-span-6 bg-white border border-slate-300">
                  <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Session Compliance Audit Log // 削除監査ログ
                    </h3>
                    <UserCheck className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="p-5">
                    {appiAuditHistory.length > 0 ? (
                      <div className="space-y-3">
                        {appiAuditHistory.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 border border-slate-200 font-mono text-xs space-y-1"
                          >
                            <div className="flex justify-between text-[11px]">
                              <span className="font-bold text-rose-800">
                                CANDIDATE #{item.candidateId} ANONYMIZED
                              </span>
                              <span className="text-slate-500">{item.timestamp}</span>
                            </div>
                            <p className="text-slate-700 text-[11px]">{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 font-mono text-xs text-slate-500">
                        No APPI erasure operations executed during this session.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* HUMAN OVERRIDE MODAL ("Disagree with AI") */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-400 max-w-md w-full shadow-2xl">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase">
                HUMAN-IN-THE-LOOP // OVERRIDE AI VERDICT
              </span>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-xs font-mono text-slate-400 hover:text-white"
              >
                [CLOSE]
              </button>
            </div>
            <form onSubmit={handleOverrideSubmit} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Japanese enterprise governance requires a permanent recruiter justification whenever an automated recommendation is overridden.
              </p>

              <div>
                <label className="block font-mono font-bold uppercase text-[11px] text-slate-700 mb-1">
                  NEW RECRUITER VERDICT
                </label>
                <select
                  value={overrideRec}
                  onChange={(e) => setOverrideRec(e.target.value as Recommendation)}
                  className="w-full border border-slate-300 bg-white px-3 py-2 font-mono text-xs focus:outline-none focus:border-slate-900"
                >
                  <option value="PASS">PASS (選考通過・面接へ進行)</option>
                  <option value="REVIEW">REVIEW (要確認・保留)</option>
                  <option value="REJECT">REJECT (見送り)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono font-bold uppercase text-[11px] text-slate-700 mb-1">
                  MANDATORY AUDIT JUSTIFICATION (上書き理由)
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Verified N2 Japanese conversation and production Spring Boot experience during initial phone screening."
                  className="w-full border border-slate-300 p-2.5 font-mono text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-mono"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white font-mono font-bold hover:bg-slate-800"
                >
                  COMMIT OVERRIDE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}