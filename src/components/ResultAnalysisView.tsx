import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Sparkles,
  BookOpen,
  Target,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  RotateCcw,
  Download,
  School,
  AlertTriangle,
  Zap,
  Bot,
  Layers,
  User,
  GraduationCap,
  Hash,
  Printer,
  Share2,
  Folder,
  FolderOpen,
  UploadCloud,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Minimize2,
  Maximize2,
  AlertCircle,
  FileWarning,
  Send,
  Globe,
  Link2,
  Award,
  Lock,
  Unlock,
  LogOut,
  Calendar,
  Home,
  FileCheck2,
  Search,
  Filter,
  Check,
  X,
  Tag,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  FileText,
  ListOrdered,
} from 'lucide-react';
import {
  ExamPackage,
  ExamResult,
  PtnTarget,
  SubtestScoreSummary,
  ProctoringSummary,
  SeparatedSubjectScore,
  NisSecuritySettings,
  SchoolInfo,
  DEFAULT_SCHOOL_INFO,
  ExamDisplaySettings,
  Question,
  UserAnswerRecord,
} from '../types';
import { SchoolKopHeader } from './SchoolKopHeader';
import {
  googleSignIn,
  getAccessToken,
  uploadExamResultToDrive,
  getOrCreateRootCbtFolder,
} from '../utils/googleDriveService';
import { TransferAnswersModal } from './TransferAnswersModal';
import { SupervisorPinModal } from './SupervisorPinModal';
import { isAnswerCorrect } from '../utils/scoringEngine';
import { AiTutorModal } from './AiTutorModal';
import { AudioPlayerBadge } from './AudioPlayerBadge';
import { fetchAiDiagnosticSafe, generateLocalAiDiagnostic } from '../utils/aiDiagnosticHelper';

interface ResultAnalysisViewProps {
  result: ExamResult;
  pkg: ExamPackage;
  selectedTargets: PtnTarget[];
  isAdmin?: boolean;
  securitySettings?: NisSecuritySettings;
  displaySettings?: ExamDisplaySettings;
  onReviewSolutions: () => void;
  onRetakeExam: () => void;
  onBackToDashboard: () => void;
  onNavigateToScheduleList?: () => void;
  onExitExam?: () => void;
  onNavigateToDrive?: () => void;
  schoolInfo?: SchoolInfo;
  onOpenEditKop?: () => void;
}

export const ResultAnalysisView: React.FC<ResultAnalysisViewProps> = ({
  result,
  pkg,
  selectedTargets,
  isAdmin = false,
  securitySettings,
  displaySettings,
  onReviewSolutions,
  onRetakeExam,
  onBackToDashboard,
  onNavigateToScheduleList,
  onExitExam,
  onNavigateToDrive,
  schoolInfo = DEFAULT_SCHOOL_INFO,
  onOpenEditKop,
}) => {
  const [aiReport, setAiReport] = useState<any>(result.aiDiagnostic || null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'answers_analysis' | 'subtests' | 'time' | 'ptn' | 'integrity'>('overview');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isAnalysisDropdownOpen, setIsAnalysisDropdownOpen] = useState(false);
  const analysisDropdownRef = useRef<HTMLDivElement>(null);

  // Fold / Collapse State - Halaman analisis tertutup jadi default, kecuali penampilan skor/nilai & kop surat
  const [isAnalysisPageFolded, setIsAnalysisPageFolded] = useState<boolean>(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        analysisDropdownRef.current &&
        !analysisDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAnalysisDropdownOpen(false);
      }
    };
    if (isAnalysisDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAnalysisDropdownOpen]);

  // Answer Analysis Filters & Interactive States
  const [answerStatusFilter, setAnswerStatusFilter] = useState<'ALL' | 'INCORRECT_BLANK' | 'CORRECT' | 'DOUBTFUL' | 'BLANK'>('ALL');
  const [answerSubtestFilter, setAnswerSubtestFilter] = useState<string>('ALL');
  const [searchQuestionQuery, setSearchQuestionQuery] = useState<string>('');
  const [answerViewMode, setAnswerViewMode] = useState<'cards' | 'table'>('cards');
  const [aiTutorQuestion, setAiTutorQuestion] = useState<Question | null>(null);
  const [isAiTutorModalOpen, setIsAiTutorModalOpen] = useState(false);
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});

  // Flag if Answer Analysis & Key Solutions are permitted by settings or admin
  const isAnswerAnalysisAllowed = isAdmin || (displaySettings?.showAnswerKeyAndExplanation ?? true);

  const toggleSolutionExpand = (qId: string) => {
    setExpandedSolutions(prev => ({
      ...prev,
      [qId]: prev[qId] === undefined ? false : !prev[qId],
    }));
  };

  const handleOpenAiTutorForQuestion = (q: Question) => {
    setAiTutorQuestion(q);
    setIsAiTutorModalOpen(true);
  };

  // Transfer & Export Answers Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Google Drive Sync State
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveSyncSuccess, setDriveSyncSuccess] = useState<{
    fileLink: string;
    folderLink: string;
    fileName: string;
  } | null>(null);
  const [driveSyncError, setDriveSyncError] = useState<string | null>(null);

  const handleSyncToGoogleDrive = async () => {
    setIsSyncingDrive(true);
    setDriveSyncError(null);
    try {
      let token = getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes) {
          // Pengguna membatalkan / menutup jendela popup login
          return;
        }
      }
      const syncRes = await uploadExamResultToDrive(result);
      setDriveSyncSuccess({
        fileLink: syncRes.webViewLink,
        folderLink: syncRes.folderLink,
        fileName: syncRes.fileName,
      });
    } catch (err: any) {
      console.warn('Google Drive Sync:', err?.message || err);
      setDriveSyncError(err.message || 'Gagal menyimpan ke Google Drive');
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Trigger celebration confetti on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b'],
      });
    } catch (e) {}
  }, []);

  // Fetch Gemini AI Comprehensive Diagnostic if not already cached
  useEffect(() => {
    let isMounted = true;
    if (!aiReport && !loadingAi) {
      setLoadingAi(true);
      const targetPtn = selectedTargets[0]?.ptnName || 'Universitas Indonesia';
      const targetMajor = selectedTargets[0]?.majorName || 'Program Studi Impian';

      fetchAiDiagnosticSafe(result, targetPtn, targetMajor)
        .then(diagnostic => {
          if (isMounted && diagnostic) {
            setAiReport(diagnostic);
            result.aiDiagnostic = diagnostic;
          }
        })
        .catch(() => {
          if (isMounted) {
            const fallback = generateLocalAiDiagnostic(result, targetPtn, targetMajor);
            setAiReport(fallback);
            result.aiDiagnostic = fallback;
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoadingAi(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Find slowest questions
  const questionsWithTime = pkg.questions.map(q => {
    const record = result.answers[q.id];
    return {
      question: q,
      timeSpent: record?.timeSpentSeconds || 0,
      isCorrect:
        record?.selectedOption === q.correctAnswer ||
        record?.numericAnswer === String(q.correctAnswer),
    };
  });

  questionsWithTime.sort((a, b) => b.timeSpent - a.timeSpent);
  const timeTrapQuestions = questionsWithTime.slice(0, 3);

  // Raport Nilai Mapel (Hanya Satu Kolom Nilai)
  const raportRows = (() => {
    if (result.separatedSubjectScores && Object.keys(result.separatedSubjectScores).length > 0) {
      return (Object.values(result.separatedSubjectScores) as SeparatedSubjectScore[]).map((subScore, idx) => {
        const score = typeof subScore.score100 === 'number'
          ? subScore.score100
          : Math.round((subScore.correct / Math.max(1, subScore.totalQuestions)) * 100);
        const kkm = subScore.kkmScore || 75;
        const isPassed = subScore.isPassedKkm !== undefined ? subScore.isPassedKkm : score >= kkm;
        let predicate = 'D';
        if (score >= 90) predicate = 'A';
        else if (score >= 80) predicate = 'B';
        else if (score >= kkm) predicate = 'C';

        return {
          no: idx + 1,
          subjectName: subScore.subjectName,
          kkm,
          score,
          predicate,
          isPassed,
          correct: subScore.correct,
          total: subScore.totalQuestions,
        };
      });
    }

    if (result.subtestSummaries && Object.keys(result.subtestSummaries).length > 0) {
      return (Object.values(result.subtestSummaries) as SubtestScoreSummary[]).map((summary, idx) => {
        const score = Math.round((summary.correct / Math.max(1, summary.totalQuestions)) * 100);
        const kkm = 75;
        const isPassed = score >= kkm;
        let predicate = 'D';
        if (score >= 90) predicate = 'A';
        else if (score >= 80) predicate = 'B';
        else if (score >= kkm) predicate = 'C';

        return {
          no: idx + 1,
          subjectName: summary.subtestName,
          kkm,
          score,
          predicate,
          isPassed,
          correct: summary.correct,
          total: summary.totalQuestions,
        };
      });
    }

    const singleScore = Math.round((result.totalCorrect / Math.max(1, result.totalQuestions)) * 100);
    const kkm = 75;
    const isPassed = singleScore >= kkm;
    let predicate = 'D';
    if (singleScore >= 90) predicate = 'A';
    else if (singleScore >= 80) predicate = 'B';
    else if (singleScore >= kkm) predicate = 'C';

    return [
      {
        no: 1,
        subjectName: result.packageTitle || 'Mata Pelajaran Ujian',
        kkm,
        score: singleScore,
        predicate,
        isPassed,
        correct: result.totalCorrect,
        total: result.totalQuestions,
      },
    ];
  })();

  const averageRaportScore = raportRows.length > 0
    ? Math.round(raportRows.reduce((acc, row) => acc + row.score, 0) / raportRows.length)
    : 0;
  const isAllSubjectsPassed = raportRows.every(row => row.isPassed);

  // Nilai Ujian Utama (10 - 100) dan Nilai Perguruan Tinggi (100 - 1000)
  const calculatedExamScore = typeof result.score === 'number'
    ? result.score
    : (typeof result.totalScore === 'number' && result.totalScore <= 100
      ? result.totalScore
      : (averageRaportScore > 0 ? averageRaportScore : Math.round((result.totalCorrect / Math.max(1, result.totalQuestions)) * 100)));

  const calculatedPtnScore = result.totalIrtScore || (typeof result.totalScore === 'number' && result.totalScore > 100 ? result.totalScore : Math.min(1000, Math.round(calculatedExamScore * 10)));

  const renderRaportNilaiTable = () => (
    <div id="card-raport-nilai-mapel" className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/40 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-base sm:text-lg">
                Raport Nilai Mapel
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {raportRows.length} Mata Pelajaran
              </span>
              {isAllSubjectsPassed ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Tuntas Seluruhnya</span>
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Ada Perbaikan / Remedial</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rekapitulasi perolehan nilai resmi berdasarkan Kriteria Ketuntasan Minimal (KKM).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Rata-rata Nilai:</span>
            <span className="text-xl font-black font-mono text-emerald-400">
              {averageRaportScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </span>
          </div>
        </div>
      </div>

      {/* Table with EXACTLY ONE SCORE COLUMN */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
        <table className="w-full min-w-[620px] text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-800 text-[11px] uppercase tracking-wider font-bold">
              <th className="py-3 px-3 text-center w-12">No</th>
              <th className="py-3 px-4">Mata Pelajaran</th>
              <th className="py-3 px-3 text-center w-24">KKM</th>
              <th className="py-3 px-4 text-center w-32 bg-indigo-950/50 text-indigo-200 border-x border-slate-800/80">
                Nilai
              </th>
              <th className="py-3 px-3 text-center w-24">Predikat</th>
              <th className="py-3 px-4 text-center w-36">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {raportRows.map((row) => (
              <tr key={row.no} className="hover:bg-slate-900/50 transition-colors">
                <td className="py-3 px-3 text-center font-mono text-slate-400">
                  {row.no}
                </td>
                <td className="py-3 px-4 font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <span>{row.subjectName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({row.correct}/{row.total} Benar)
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-mono text-slate-400">
                  {row.kkm}
                </td>
                {/* HANYA SATU KOLOM NILAI */}
                <td className="py-3 px-4 text-center bg-indigo-950/20 border-x border-slate-800/60 font-mono">
                  <span className={`text-base font-black ${row.isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {row.score}
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                    row.predicate === 'A'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : row.predicate === 'B'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : row.predicate === 'C'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {row.predicate}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {row.isPassed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>TUNTAS KKM</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>BELUM TUNTAS</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900/90 border-t-2 border-slate-800 font-bold text-xs">
              <td colSpan={2} className="py-3 px-4 text-slate-200">
                Rata-rata Nilai Raport
              </td>
              <td className="py-3 px-3 text-center font-mono text-slate-400">
                75
              </td>
              {/* HANYA SATU KOLOM NILAI (Rata-rata) */}
              <td className="py-3 px-4 text-center bg-indigo-950/40 border-x border-slate-800 font-mono text-base font-black text-emerald-400">
                {averageRaportScore}
              </td>
              <td className="py-3 px-3 text-center font-mono text-indigo-300">
                {averageRaportScore >= 90 ? 'A' : averageRaportScore >= 80 ? 'B' : averageRaportScore >= 75 ? 'C' : 'D'}
              </td>
              <td className="py-3 px-4 text-center">
                <span className={`text-[11px] font-bold ${isAllSubjectsPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isAllSubjectsPassed ? 'Tuntas Keseluruhan' : 'Perlu Remedial'}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Status Bar: Status Laporan Hasil Ujian */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide">
              Laporan Hasil & Analisis Ujian CBT
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase">
              Terkunci Selesai
            </span>
          </div>
        </div>

        {/* Official School Letterhead (Kop Surat Sekolah Resmi) - Tampilan Langsung Logo & Identitas */}
        <SchoolKopHeader
          schoolInfo={schoolInfo}
          variant="full"
        />

        {/* Top Hero Banner & Score Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ujian Telah Selesai Dinilai Otomatis</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Laporan Hasil & Analisis Nilai Ujian
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                {result.packageTitle} • Diselesaikan pada{' '}
                {new Date(result.submittedAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                pukul{' '}
                {new Date(result.submittedAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </p>
            </div>

            {/* Integrated Score Badge: Prioritize Exam Score (10-100), College Score (100-1000) in the same place */}
            <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 text-center min-w-[240px] sm:min-w-[280px] shadow-xl shadow-emerald-950/40">
              <span className="text-[11px] sm:text-xs font-extrabold text-emerald-300 uppercase tracking-wider block">
                Nilai Ujian Sekolah (Skala 10 - 100)
              </span>
              <div className="my-1 flex items-baseline justify-center space-x-1.5">
                <span className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-300 font-mono tracking-tight">
                  {calculatedExamScore}
                </span>
                <span className="text-sm sm:text-base text-slate-400 font-bold">/ 100</span>
              </div>

              {/* Tempat yang sama: Nilai Perguruan Tinggi / UTBK (100 - 1000) berukuran proporsional */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 px-2 bg-slate-900/60 rounded-lg py-1.5">
                <span className="text-[11px] text-indigo-300 font-semibold flex items-center gap-1">
                  <span>Nilai Perguruan Tinggi:</span>
                </span>
                <span className="text-sm font-extrabold text-indigo-200 font-mono">
                  {calculatedPtnScore} <span className="text-[10px] text-slate-400 font-normal">/ 1000</span>
                </span>
              </div>

              <div className="text-[11px] text-emerald-400/90 font-medium mt-1.5 flex items-center justify-center gap-1.5">
                <span>Akurasi: {result.overallAccuracy}%</span>
                <span>•</span>
                <span>{result.totalCorrect} dari {result.totalQuestions} Benar</span>
              </div>
            </div>
          </div>

          {/* Student Profile Identity Strip */}
          {result.studentProfile && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Nama Peserta:</span>
                  <p className="font-bold text-white text-sm">{result.studentProfile.fullName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Kelas / Rombel:</span>
                  <p className="font-bold text-white text-sm">{result.studentProfile.studentClass}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Nomor Induk (NIS):</span>
                  <p className="font-bold text-white text-sm font-mono">{result.studentProfile.nis}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-center sm:text-left">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 block">Total Waktu:</span>
              <span className="font-bold text-sm sm:text-base text-white flex items-center justify-center sm:justify-start space-x-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>{formatDuration(result.totalDurationSeconds)}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 block">Jawaban Benar:</span>
              <span className="font-bold text-sm sm:text-base text-emerald-400 flex items-center justify-center sm:justify-start space-x-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {result.totalCorrect} / {result.totalQuestions}
                </span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 block">Jawaban Salah:</span>
              <span className="font-bold text-sm sm:text-base text-rose-400 flex items-center justify-center sm:justify-start space-x-1.5 mt-0.5">
                <XCircle className="w-4 h-4" />
                <span>{result.totalIncorrect} butir</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 block">Soal Kosong:</span>
              <span className="font-bold text-sm sm:text-base text-amber-400 flex items-center justify-center sm:justify-start space-x-1.5 mt-0.5">
                <HelpCircle className="w-4 h-4" />
                <span>{result.totalBlank} butir</span>
              </span>
            </div>
          </div>
        </div>

        {/* Google Drive Status Notification */}
        {driveSyncSuccess && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40">
                <Folder className="w-5 h-5 fill-amber-400/30" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">
                  Lembar Jawaban & Nilai Berhasil Disimpan ke Google Drive!
                </p>
                <p className="text-slate-300 text-xs mt-0.5">
                  Berkas tersimpan di folder <span className="font-mono text-amber-300 font-semibold">UJIANKU - Rekap Jawaban & Nilai Siswa SMAN 19 Bandung</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={driveSyncSuccess.fileLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
              >
                <span>Buka Berkas</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={driveSyncSuccess.folderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
              >
                <span>Buka Folder Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {onNavigateToDrive && (
                <button
                  type="button"
                  onClick={onNavigateToDrive}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer"
                >
                  <span>Hub Drive</span>
                </button>
              )}
            </div>
          </div>
        )}

        {driveSyncError && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{driveSyncError}</span>
            </div>
            <button
              onClick={() => setDriveSyncError(null)}
              className="text-rose-400 hover:text-white font-bold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Navigation Tabs with Droplist for Analysis */}
        {(() => {
          const analysisDropdownTabs = [
            {
              id: 'answers_analysis' as const,
              label: 'Analisis Jawaban & Kunci Benar',
              description: 'Kunci jawaban resmi, evaluasi butir soal & pembahasan lengkap',
              icon: FileCheck2,
              badge: null,
              isWarning: false,
            },
            {
              id: 'subtests' as const,
              label: 'Raport Nilai Mapel',
              description: 'Tabel raport nilai mata pelajaran, KKM, predikat mutu & ketuntasan',
              icon: GraduationCap,
              badge: null,
              isWarning: false,
            },
            {
              id: 'time' as const,
              label: 'Analisis Waktu & Kecepatan',
              description: 'Manajemen waktu & rata-rata durasi pengerjaan per butir soal',
              icon: Clock,
              badge: null,
              isWarning: false,
            },
            {
              id: 'integrity' as const,
              label: 'Integritas & Pengawas',
              description: 'Audit aktivitas kecurangan, split layar, minimize & keluar tab',
              icon: ShieldAlert,
              badge:
                result.proctoringSummary && result.proctoringSummary.totalViolations > 0
                  ? `${result.proctoringSummary.totalViolations} Pelanggaran`
                  : null,
              isWarning: Boolean(
                result.proctoringSummary && result.proctoringSummary.totalViolations > 0
              ),
            },
            {
              id: 'ptn' as const,
              label: 'Peluang Target PTN',
              description: 'Simulasi passing grade SNBT & peluang kelulusan target prodi',
              icon: Target,
              badge: null,
              isWarning: false,
            },
          ];

          const isDropdownTabActive = activeTab !== 'overview' && activeTab !== 'subtests';
          const activeDropdownTab = analysisDropdownTabs.find(tab => tab.id === activeTab);

          return (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {/* Tab 1: Ringkasan */}
                <button
                  id="tab-btn-overview"
                  type="button"
                  onClick={() => {
                    setActiveTab('overview');
                    setIsAnalysisDropdownOpen(false);
                    setIsAnalysisPageFolded(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95 border ${
                    activeTab === 'overview'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50 border-indigo-400/30'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-slate-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Ringkasan</span>
                </button>

                {/* Tab 2: Analisis per Subtes (Sejajar dengan tombol ringkasan) */}
                <button
                  id="tab-btn-subtests"
                  type="button"
                  onClick={() => {
                    setActiveTab('subtests');
                    setIsAnalysisDropdownOpen(false);
                    setIsAnalysisPageFolded(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95 border ${
                    activeTab === 'subtests'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50 border-indigo-400/30'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Analisis per Subtes</span>
                </button>

                {/* Droplist for: Analisis Jawaban, Waktu, Integritas, & Target PTN */}
                <div className="relative" ref={analysisDropdownRef}>
                  <button
                    id="btn-analysis-droplist"
                    type="button"
                    onClick={() => setIsAnalysisDropdownOpen(prev => !prev)}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95 border ${
                      isDropdownTabActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50 border-indigo-400/40'
                        : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800/90 border-slate-700/80 shadow-sm'
                    }`}
                    aria-haspopup="true"
                    aria-expanded={isAnalysisDropdownOpen}
                  >
                    {isDropdownTabActive && activeDropdownTab ? (
                      <>
                        <activeDropdownTab.icon className="w-4 h-4 text-cyan-300 shrink-0" />
                        <span className="font-bold">{activeDropdownTab.label}</span>
                        {activeDropdownTab.badge && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                            {activeDropdownTab.badge}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Menu Analisis</span>
                        {result.proctoringSummary && result.proctoringSummary.totalViolations > 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 ml-1 transition-transform duration-200 ${
                        isAnalysisDropdownOpen ? 'rotate-180 text-white' : 'text-slate-400'
                      }`}
                    />
                  </button>

                  {/* Droplist Popover Menu */}
                  {isAnalysisDropdownOpen && (
                    <div
                      id="menu-analysis-droplist"
                      className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl shadow-black/80 z-50 py-2 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      <div className="px-3.5 py-2 border-b border-slate-800/80 flex items-center justify-between">
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          Menu Analisis Ujian
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                          5 Pilihan
                        </span>
                      </div>

                      <div className="p-1.5 space-y-1">
                        {analysisDropdownTabs.map(tab => {
                          const Icon = tab.icon;
                          const isSelected = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              id={`droplist-item-${tab.id}`}
                              type="button"
                              onClick={() => {
                                setActiveTab(tab.id);
                                setIsAnalysisDropdownOpen(false);
                                setIsAnalysisPageFolded(false);
                              }}
                              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600/20 text-white border border-indigo-500/40'
                                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : tab.isWarning
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`text-xs sm:text-sm font-semibold truncate ${
                                      isSelected ? 'text-indigo-300 font-bold' : 'text-slate-200'
                                    }`}
                                  >
                                    {tab.label}
                                  </span>
                                  {tab.badge && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                                      {tab.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                  {tab.description}
                                </p>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* FOLDED BANNER (Default View: Tertutup) vs OPEN VIEW */}
        {isAnalysisPageFolded ? (
          <div
            id="card-analysis-folded-banner"
            onClick={() => setIsAnalysisPageFolded(false)}
            className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 shadow-xl transition-all cursor-pointer group flex flex-col sm:flex-row items-center justify-between gap-5"
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Folder className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                    Halaman Analisis & Pembahasan Sedang Dilipat
                  </h3>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    Tertutup (Default)
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                  Rincian evaluasi kunci jawaban, rekomendasi AI advisor, analisis materi per subtes, durasi waktu, integritas pengawas, dan target PTN dalam kondisi dilipat.
                </p>
              </div>
            </div>

            {/* Tombol buka halaman - Cukup Icon */}
            <button
              id="btn-unfold-analysis-cta"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAnalysisPageFolded(false);
              }}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/50 transition-all cursor-pointer active:scale-95 border border-indigo-400/30 shrink-0"
              title="Buka Halaman"
              aria-label="Buka Halaman"
            >
              <FolderOpen className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Active page header with fold button */}
            <div className="flex items-center justify-between p-3.5 px-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400">
                  Menampilkan Halaman:{' '}
                  <strong className="text-white">
                    {activeTab === 'overview' && 'Ringkasan & AI Advisor'}
                    {activeTab === 'answers_analysis' && 'Analisis Jawaban & Kunci Benar'}
                    {activeTab === 'subtests' && 'Raport Nilai Mapel'}
                    {activeTab === 'time' && 'Analisis Waktu & Kecepatan'}
                    {activeTab === 'integrity' && 'Integritas & Pengawas'}
                    {activeTab === 'ptn' && 'Peluang Target PTN'}
                  </strong>
                </span>
              </div>
              <button
                id="btn-fold-current-tab"
                type="button"
                onClick={() => setIsAnalysisPageFolded(true)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold transition-all cursor-pointer border border-slate-700 text-xs shrink-0"
                title="Lipat Halaman"
                aria-label="Lipat Halaman"
              >
                <ChevronUp className="w-4 h-4 text-slate-400" />
              </button>
            </div>

        {/* TAB 1: Overview & AI Advisor */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* EXECUTIVE ANSWER ANALYSIS & KEY SOLUTIONS CALLOUT */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Analisis Butir Jawaban & Kunci Resmi
                      </h3>
                      {isAnswerAnalysisAllowed ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                          Tersedia Lengkap
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                          Kunci Dirahasiakan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isAnswerAnalysisAllowed
                        ? 'Periksa perbandingan opsi yang kamu pilih dengan kunci jawaban resmi dan pembahasan langkah demi langkah.'
                        : 'Kunci jawaban dan pembahasan saat ini dinonaktifkan pada pengaturan tampilan ujian.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('answers_analysis')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 transition-all cursor-pointer active:scale-95 border border-indigo-400/30"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Buka Analisis Jawaban & Kunci</span>
                  </button>

                  {isAnswerAnalysisAllowed && onReviewSolutions && (
                    <button
                      type="button"
                      onClick={onReviewSolutions}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer active:scale-95"
                    >
                      <span>Mode Review Penuh</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Answer Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Jawaban Benar</span>
                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                      {result.totalCorrect} butir
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Jawaban Salah</span>
                    <span className="text-base font-extrabold text-rose-400 font-mono">
                      {result.totalIncorrect} butir
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Kosong / Dilewati</span>
                    <span className="text-base font-extrabold text-amber-400 font-mono">
                      {result.totalBlank} butir
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Akurasi Soal</span>
                    <span className="text-base font-extrabold text-cyan-400 font-mono">
                      {result.overallAccuracy}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RAPORT NILAI MAPEL (Single Score Column Table) */}
            {renderRaportNilaiTable()}

            {/* AI Advisor Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      AI Diagnostic & Rekomendasi Belajar Personal
                    </h3>
                    <p className="text-xs text-purple-300">
                      Dianalisis cerdas oleh Gemini AI berdasarkan kelemahan topik Anda
                    </p>
                  </div>
                </div>
                {loadingAi && (
                  <span className="text-xs text-purple-400 animate-pulse font-medium">
                    Sedang menyusun rencana...
                  </span>
                )}
              </div>

              {aiReport ? (
                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/20 text-slate-200 leading-relaxed">
                    <p className="font-medium">{aiReport.overallSummary}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Strongest */}
                    <div className="p-4 rounded-xl bg-slate-950/50 border border-emerald-500/30 space-y-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Kekuatan Utama Anda:</span>
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {aiReport.strongestSubjects?.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Needs Improvement */}
                    <div className="p-4 rounded-xl bg-slate-950/50 border border-rose-500/30 space-y-2">
                      <span className="text-xs font-bold text-rose-400 flex items-center space-x-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Fokus Perbaikan Prioritas:</span>
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {aiReport.areasToImprove?.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Schedule */}
                  {aiReport.recommendedSchedule && (
                    <div className="p-4 rounded-xl bg-slate-950/50 border border-indigo-500/20 space-y-2">
                      <span className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Rekomendasi Rencana Belajar Mingguan:</span>
                      </span>
                      <div className="space-y-1.5 text-slate-300">
                        {aiReport.recommendedSchedule.map((item: string, idx: number) => (
                          <div key={idx} className="flex items-start space-x-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 font-bold text-[11px] flex items-center justify-center shrink-0 border border-indigo-800">
                              {idx + 1}
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Menghubungi AI Consultant untuk analisis terperinci...
                </div>
              )}
            </div>

            {/* Proctoring & Integrity Overview Card */}
            <div
              className={`p-6 rounded-2xl border space-y-4 ${
                !result.proctoringSummary || result.proctoringSummary.totalViolations === 0
                  ? 'bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border-emerald-500/30'
                  : result.proctoringSummary.integrityScore >= 70
                  ? 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/30'
                  : 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-900 border-rose-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${
                      !result.proctoringSummary || result.proctoringSummary.totalViolations === 0
                        ? 'bg-emerald-600'
                        : result.proctoringSummary.integrityScore >= 70
                        ? 'bg-amber-600'
                        : 'bg-rose-600'
                    }`}
                  >
                    {!result.proctoringSummary || result.proctoringSummary.totalViolations === 0 ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      Catatan Integritas & Pengawasan Ujian
                    </h3>
                    <p className="text-xs text-slate-400">
                      Rekapitulasi otomatis pendeteksi split layar, memperkecil jendela, dan keluar aplikasi.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                      !result.proctoringSummary || result.proctoringSummary.totalViolations === 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : result.proctoringSummary.integrityScore >= 70
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {result.proctoringSummary?.integrityStatus || 'Sangat Tertib / Bersih'}
                  </span>
                  <button
                    onClick={() => setActiveTab('integrity')}
                    className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    Detail Log →
                  </button>
                </div>
              </div>

              {/* 3 Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Keluar Aplikasi / Pindah Tab:
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-white font-mono">
                      {result.proctoringSummary?.exitAppCount || 0} kali
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Durasi:{' '}
                      <strong className="text-slate-200">
                        {result.proctoringSummary?.logs
                          ? result.proctoringSummary.logs
                              .filter(l => l.type === 'tab_switch_or_blur' || l.type === 'fullscreen_exit')
                              .reduce((acc, l) => acc + l.durationSeconds, 0)
                          : 0}{' '}
                        detik
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Split Layar / Memperkecil Layar:
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-white font-mono">
                      {result.proctoringSummary?.splitResizeCount || 0} kali
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Durasi:{' '}
                      <strong className="text-slate-200">
                        {result.proctoringSummary?.logs
                          ? result.proctoringSummary.logs
                              .filter(l => l.type === 'split_or_resize')
                              .reduce((acc, l) => acc + l.durationSeconds, 0)
                          : 0}{' '}
                        detik
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Skor Kepatuhan Integritas:
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span
                      className={`text-lg font-black font-mono ${
                        (result.proctoringSummary?.integrityScore || 100) >= 80
                          ? 'text-emerald-400'
                          : (result.proctoringSummary?.integrityScore || 100) >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {result.proctoringSummary?.integrityScore ?? 100} / 100
                    </span>
                    <span className="text-xs text-slate-400">
                      Total:{' '}
                      <strong className="text-slate-200">
                        {result.proctoringSummary?.totalOutOfExamDurationSeconds || 0} dtk di luar
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Analisis Jawaban & Kunci Benar (Grand Try Out UTBK / CBT) */}
        {activeTab === 'answers_analysis' && (
          <div className="space-y-6">
            {!isAnswerAnalysisAllowed ? (
              /* LOCKED STATE: Answer Key & Explanation Disabled in Settings */
              <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border border-amber-500/30 text-center space-y-5 shadow-2xl relative overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto shadow-lg">
                  <Lock className="w-8 h-8" />
                </div>

                <div className="max-w-xl mx-auto space-y-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                    Kunci Jawaban & Pembahasan Dinonaktifkan
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Pengawas atau Guru telah menonaktifkan fitur tampilan kunci jawaban dan pembahasan untuk sesi ujian ini pada <span className="text-amber-300 font-semibold">Pengaturan Tampilan Ujian</span> demi menjaga kerahasiaan soal.
                  </p>
                  <p className="text-xs text-slate-400">
                    Nilai dan rekapitulasi performa Anda tetap terekam secara resmi pada sistem.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    Kembali ke Ringkasan Nilai
                  </button>

                  {!isAdmin && onBackToDashboard && (
                    <button
                      type="button"
                      onClick={() => {
                        if (securitySettings?.enableSupervisorPin === false) {
                          onBackToDashboard();
                        } else {
                          setIsPinModalOpen(true);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-950/40 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Kunci Pengawas (Guru)</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* UNLOCKED & ACTIVE: Full Question-by-Question Analysis & Answer Keys */
              <div className="space-y-6">
                {/* Top Control Bar: Filters, Search, and Display Modes */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Status Filter Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setAnswerStatusFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          answerStatusFilter === 'ALL'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        Semua Soal ({pkg.questions.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnswerStatusFilter('INCORRECT_BLANK')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          answerStatusFilter === 'INCORRECT_BLANK'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                            : 'bg-slate-950 text-rose-400 hover:bg-rose-950/30 border border-slate-800'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Salah & Kosong ({result.totalIncorrect + result.totalBlank})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnswerStatusFilter('CORRECT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          answerStatusFilter === 'CORRECT'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                            : 'bg-slate-950 text-emerald-400 hover:bg-emerald-950/30 border border-slate-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Benar ({result.totalCorrect})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnswerStatusFilter('DOUBTFUL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          answerStatusFilter === 'DOUBTFUL'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                            : 'bg-slate-950 text-amber-400 hover:bg-amber-950/30 border border-slate-800'
                        }`}
                      >
                        Ragu-Ragu ({
                          pkg.questions.filter(q => result.answers[q.id]?.isDoubtful).length
                        })
                      </button>
                    </div>

                    {/* View Mode & Full Review Action */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Mode Toggle: Cards vs Table */}
                      <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setAnswerViewMode('cards')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            answerViewMode === 'cards'
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Tampilan Kartu Soal & Pembahasan Lengkap"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Kartu Lengkap</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnswerViewMode('table')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            answerViewMode === 'table'
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Tampilan Tabel Rekapitulasi Cepat"
                        >
                          <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Tabel Rekap</span>
                        </button>
                      </div>

                      {onReviewSolutions && (
                        <button
                          type="button"
                          onClick={onReviewSolutions}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                          title="Buka Mode Review Interaktif Soal per Soal"
                        >
                          <span>Review Interaktif</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtest Selector & Search Query */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80">
                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Filter Subtes / Mata Pelajaran
                      </label>
                      <select
                        value={answerSubtestFilter}
                        onChange={e => setAnswerSubtestFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ALL">Semua Subtes ({pkg.subtests.length} Bidang)</option>
                        {pkg.subtests.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({pkg.questions.filter(q => q.subtestId === s.id).length} butir)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Cari Soal, Topik, atau Kata Kunci
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuestionQuery}
                          onChange={e => setSearchQuestionQuery(e.target.value)}
                          placeholder="Cari teks pertanyaan, materi, bab, nomor soal..."
                          className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                        {searchQuestionQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuestionQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FILTER LOGIC */}
                {(() => {
                  const filteredList = pkg.questions
                    .map((q, originalIdx) => {
                      const record = result.answers[q.id];
                      const isCorrect = isAnswerCorrect(q, record);
                      const isBlank =
                        !record ||
                        (record.selectedOption === undefined &&
                          (!record.selectedOptions || record.selectedOptions.length === 0) &&
                          (!record.numericAnswer || record.numericAnswer.trim() === '') &&
                          (!record.complexAnswers || Object.keys(record.complexAnswers).length === 0));
                      const isDoubtful = Boolean(record?.isDoubtful);
                      const isIncorrect = !isCorrect && !isBlank;

                      return {
                        question: q,
                        record,
                        originalIndex: originalIdx + 1,
                        isCorrect,
                        isBlank,
                        isDoubtful,
                        isIncorrect,
                        timeSpent: record?.timeSpentSeconds || 0,
                      };
                    })
                    .filter(item => {
                      // Subtest filter
                      if (answerSubtestFilter !== 'ALL' && item.question.subtestId !== answerSubtestFilter) {
                        return false;
                      }
                      // Status filter
                      if (answerStatusFilter === 'CORRECT' && !item.isCorrect) return false;
                      if (answerStatusFilter === 'INCORRECT_BLANK' && item.isCorrect) return false;
                      if (answerStatusFilter === 'BLANK' && !item.isBlank) return false;
                      if (answerStatusFilter === 'DOUBTFUL' && !item.isDoubtful) return false;

                      // Text search filter
                      if (searchQuestionQuery.trim()) {
                        const qTerm = searchQuestionQuery.toLowerCase();
                        const matchText = item.question.questionText?.toLowerCase().includes(qTerm);
                        const matchTopic = item.question.topic?.toLowerCase().includes(qTerm);
                        const matchSubtest = item.question.subtestName?.toLowerCase().includes(qTerm);
                        const matchStimulus = item.question.stimulus?.toLowerCase().includes(qTerm);
                        const matchNumber = String(item.originalIndex) === qTerm.trim();
                        return matchText || matchTopic || matchSubtest || matchStimulus || matchNumber;
                      }

                      return true;
                    });

                  if (filteredList.length === 0) {
                    return (
                      <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
                        <h4 className="font-bold text-white text-base">
                          Tidak Ada Soal yang Cocok
                        </h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Tidak ditemukan butir soal dengan kriteria filter atau pencarian saat ini. Silakan ubah filter atau kata kunci Anda.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setAnswerStatusFilter('ALL');
                            setAnswerSubtestFilter('ALL');
                            setSearchQuestionQuery('');
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          Reset Semua Filter
                        </button>
                      </div>
                    );
                  }

                  // 1. TABLE VIEW
                  if (answerViewMode === 'table') {
                    return (
                      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                                <th className="py-3.5 px-4 text-center w-14">No</th>
                                <th className="py-3.5 px-4">Subtes & Topik</th>
                                <th className="py-3.5 px-4">Tipe Soal</th>
                                <th className="py-3.5 px-4">Jawaban Anda</th>
                                <th className="py-3.5 px-4">Kunci Benar</th>
                                <th className="py-3.5 px-4 text-center">Status</th>
                                <th className="py-3.5 px-4 text-center">Waktu</th>
                                <th className="py-3.5 px-4 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80">
                              {filteredList.map(item => {
                                const q = item.question;
                                const r = item.record;

                                // Resolve readable user answer
                                let userAnsDisplay = 'Kosong';
                                if (r?.selectedOption) {
                                  userAnsDisplay = `Opsi ${r.selectedOption}`;
                                } else if (r?.selectedOptions && r.selectedOptions.length > 0) {
                                  userAnsDisplay = r.selectedOptions.join(', ');
                                } else if (r?.numericAnswer) {
                                  userAnsDisplay = r.numericAnswer;
                                } else if (r?.complexAnswers) {
                                  userAnsDisplay = 'Tabel Isian';
                                }

                                // Resolve readable correct key
                                let correctKeyDisplay = '-';
                                if (typeof q.correctAnswer === 'string' || typeof q.correctAnswer === 'number') {
                                  correctKeyDisplay = `Opsi ${q.correctAnswer}`;
                                } else if (Array.isArray(q.correctAnswer)) {
                                  correctKeyDisplay = q.correctAnswer.join(', ');
                                } else if (typeof q.correctAnswer === 'object') {
                                  correctKeyDisplay = 'Kunci Tabel';
                                }

                                return (
                                  <tr
                                    key={q.id}
                                    className={`hover:bg-slate-850/60 transition-colors ${
                                      item.isCorrect
                                        ? 'bg-emerald-950/10'
                                        : item.isBlank
                                        ? 'bg-amber-950/10'
                                        : 'bg-rose-950/10'
                                    }`}
                                  >
                                    <td className="py-3 px-4 text-center font-bold text-slate-200">
                                      #{item.originalIndex}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-white">{q.subtestName}</div>
                                      <div className="text-[11px] text-slate-400">{q.topic}</div>
                                    </td>
                                    <td className="py-3 px-4 text-slate-300">
                                      <span className="capitalize">{q.type.replace(/_/g, ' ')}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`font-semibold ${
                                          item.isCorrect
                                            ? 'text-emerald-400'
                                            : item.isBlank
                                            ? 'text-amber-400 italic'
                                            : 'text-rose-400'
                                        }`}
                                      >
                                        {userAnsDisplay}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="font-bold text-emerald-400">
                                        {correctKeyDisplay}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      {item.isCorrect ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                          <Check className="w-3 h-3" /> Benar
                                        </span>
                                      ) : item.isBlank ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                          Kosong
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                          <X className="w-3 h-3" /> Salah
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                                      {item.timeSpent} dtk
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAnswerViewMode('cards');
                                          setSearchQuestionQuery(String(item.originalIndex));
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-[11px] font-bold transition-all cursor-pointer"
                                      >
                                        Lihat Detail
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }

                  // 2. CARDS VIEW (Full Detailed Breakdown with Concept & Steps)
                  return (
                    <div className="space-y-6">
                      {filteredList.map(item => {
                        const q = item.question;
                        const record = item.record;
                        const isExpanded = expandedSolutions[q.id] !== false; // default expanded

                        return (
                          <div
                            key={q.id}
                            id={`question-card-${item.originalIndex}`}
                            className={`rounded-2xl sm:rounded-3xl border transition-all shadow-xl overflow-hidden ${
                              item.isCorrect
                                ? 'bg-slate-900 border-emerald-500/40 shadow-emerald-950/20'
                                : item.isBlank
                                ? 'bg-slate-900 border-amber-500/40 shadow-amber-950/20'
                                : 'bg-slate-900 border-rose-500/40 shadow-rose-950/20'
                            }`}
                          >
                            {/* Card Header Bar */}
                            <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0 ${
                                    item.isCorrect
                                      ? 'bg-emerald-600'
                                      : item.isBlank
                                      ? 'bg-amber-600'
                                      : 'bg-rose-600'
                                  }`}
                                >
                                  #{item.originalIndex}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-sm sm:text-base text-white">
                                      {q.subtestName}
                                    </h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                                      {q.topic}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 font-semibold border border-indigo-800/60">
                                      {q.difficulty}
                                    </span>
                                    {q.irtWeight && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-800/60">
                                        Bobot IRT: {q.irtWeight}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Waktu pengerjaan: <strong className="text-slate-200">{item.timeSpent} detik</strong>
                                    {item.isDoubtful && (
                                      <span className="ml-2 text-amber-400 font-semibold">
                                        • (Ditandai Ragu-Ragu)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Status Badge & Actions */}
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {item.isCorrect ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Jawaban Anda Benar</span>
                                  </span>
                                ) : item.isBlank ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>Tidak Dijawab (Kosong)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Jawaban Anda Salah</span>
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleOpenAiTutorForQuestion(q)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95"
                                  title="Tanya AI Tutor untuk bedah soal ini"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                                  <span className="hidden sm:inline">Tutor AI</span>
                                </button>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 sm:p-6 space-y-6">
                              {/* Stimulus / Wacana Teks jika ada */}
                              {(q.stimulus || q.stimulusImage || q.stimulusAudio) && (
                                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                    <FileText className="w-4 h-4" />
                                    <span>{q.stimulusTitle || 'Wacana / Teks Pendukung'}</span>
                                  </div>

                                  {q.stimulus && (
                                    <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
                                      {q.stimulus}
                                    </div>
                                  )}

                                  {q.stimulusImage && (
                                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 flex justify-center">
                                      <img
                                        src={q.stimulusImage}
                                        alt="Wacana"
                                        className="max-h-60 w-auto object-contain rounded-lg"
                                      />
                                    </div>
                                  )}

                                  {q.stimulusAudio && (
                                    <AudioPlayerBadge
                                      src={q.stimulusAudio}
                                      title="Audio Wacana Pendukung"
                                    />
                                  )}
                                </div>
                              )}

                              {/* Question Text & Media */}
                              <div className="space-y-3">
                                <div className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                                  {q.questionText}
                                </div>

                                {q.questionImage && (
                                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 flex justify-center">
                                    <img
                                      src={q.questionImage}
                                      alt="Pertanyaan"
                                      className="max-h-60 w-auto object-contain rounded-lg"
                                    />
                                  </div>
                                )}

                                {q.questionAudio && (
                                  <AudioPlayerBadge
                                    src={q.questionAudio}
                                    title="Audio Soal / Listening"
                                  />
                                )}
                              </div>

                              {/* Answer Options & Comparisons */}
                              <div className="space-y-2.5">
                                {/* Type 1: Multiple Choice & Cause Reason */}
                                {(q.type === 'multiple_choice' || q.type === 'cause_reason') &&
                                  q.options?.map(opt => {
                                    const isUserChoice = record?.selectedOption === opt.id;
                                    const isOfficialCorrect = q.correctAnswer === opt.id;

                                    let cardStyle = 'bg-slate-950/60 border-slate-800 text-slate-300';
                                    if (isOfficialCorrect) {
                                      cardStyle =
                                        'bg-emerald-950/40 border-emerald-500/60 text-emerald-100 shadow-sm ring-1 ring-emerald-500/30';
                                    } else if (isUserChoice && !isOfficialCorrect) {
                                      cardStyle =
                                        'bg-rose-950/40 border-rose-500/60 text-rose-100 shadow-sm ring-1 ring-rose-500/30';
                                    }

                                    return (
                                      <div
                                        key={opt.id}
                                        className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${cardStyle}`}
                                      >
                                        <div className="flex items-start gap-3 w-full">
                                          <div
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                              isOfficialCorrect
                                                ? 'bg-emerald-600 text-white'
                                                : isUserChoice
                                                ? 'bg-rose-600 text-white'
                                                : 'bg-slate-800 text-slate-400'
                                            }`}
                                          >
                                            {opt.label}
                                          </div>
                                          <div className="flex-1 text-xs sm:text-sm pt-0.5">
                                            <span>{opt.text}</span>
                                            {isOfficialCorrect && (
                                              <span className="block text-xs font-bold text-emerald-400 mt-1">
                                                ✓ Kunci Jawaban Resmi
                                              </span>
                                            )}
                                            {isUserChoice && !isOfficialCorrect && (
                                              <span className="block text-xs font-bold text-rose-400 mt-1">
                                                ✗ Jawaban yang Anda Pilih
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Option Image or Audio */}
                                        {(opt.image || opt.audio) && (
                                          <div className="pl-10 flex flex-wrap items-center gap-3 pt-1">
                                            {opt.image && (
                                              <img
                                                src={opt.image}
                                                alt={`Opsi ${opt.label}`}
                                                className="max-h-36 w-auto object-contain rounded border border-slate-700 bg-slate-900 p-1"
                                              />
                                            )}
                                            {opt.audio && (
                                              <AudioPlayerBadge
                                                src={opt.audio}
                                                title={`Audio Opsi ${opt.label}`}
                                                size="sm"
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                {/* Type 2: Short Numeric or Long Essay */}
                                {(q.type === 'short_numeric' || q.type === 'long_essay') && (
                                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                                    <div className={q.type === 'long_essay' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
                                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] text-slate-400 block font-medium">
                                            {q.type === 'long_essay' ? 'Jawaban Esai Anda:' : 'Jawaban yang Anda Masukkan:'}
                                          </span>
                                          {q.minWordCount && q.minWordCount > 0 && (
                                            <span className="text-[10px] text-slate-400">
                                              Target Min: {q.minWordCount} Kata
                                            </span>
                                          )}
                                        </div>
                                        <div
                                          className={`mt-1.5 leading-relaxed whitespace-pre-wrap ${
                                            q.type === 'long_essay' ? 'text-xs sm:text-sm font-normal' : 'text-base font-black font-mono'
                                          } ${
                                            item.isCorrect
                                              ? 'text-emerald-400'
                                              : record?.numericAnswer
                                              ? 'text-rose-400'
                                              : 'text-amber-400 italic'
                                          }`}
                                        >
                                          {record?.numericAnswer || '(Tidak Diisi / Kosong)'}
                                        </div>
                                      </div>

                                      <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40">
                                        <span className="text-[11px] text-emerald-300 block font-medium">
                                          {q.type === 'long_essay' ? 'Model Jawaban / Rubrik Esai Resmi:' : 'Kunci Jawaban Resmi:'}
                                        </span>
                                        <div className={`mt-1.5 leading-relaxed whitespace-pre-wrap text-emerald-400 ${
                                          q.type === 'long_essay' ? 'text-xs sm:text-sm font-normal' : 'text-base font-black font-mono'
                                        }`}>
                                          {String(q.correctAnswer)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Type 3: Complex Statements Table */}
                                {q.type === 'complex_multiple_choice' && q.complexStatements && (
                                  <div className="rounded-xl border border-slate-800 overflow-x-auto">
                                    <table className="w-full min-w-[360px] text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                                          <th className="py-2.5 px-3">Pernyataan</th>
                                          <th className="py-2.5 px-3 text-center w-28">Pilihan Anda</th>
                                          <th className="py-2.5 px-3 text-center w-28">Kunci Resmi</th>
                                          <th className="py-2.5 px-3 text-center w-24">Hasil</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                                        {q.complexStatements.map(stmt => {
                                          const userVal = record?.complexAnswers?.[stmt.id];
                                          const correctVal = (q.correctAnswer as Record<string, boolean>)?.[stmt.id];
                                          const isStmtMatch = userVal === correctVal;

                                          return (
                                            <tr key={stmt.id} className="hover:bg-slate-900/60">
                                              <td className="py-2.5 px-3 text-slate-200">{stmt.text}</td>
                                              <td className="py-2.5 px-3 text-center">
                                                <span
                                                  className={`font-bold ${
                                                    userVal === true
                                                      ? 'text-indigo-400'
                                                      : userVal === false
                                                      ? 'text-rose-400'
                                                      : 'text-slate-500 italic'
                                                  }`}
                                                >
                                                  {userVal === true ? 'Benar' : userVal === false ? 'Salah' : '-'}
                                                </span>
                                              </td>
                                              <td className="py-2.5 px-3 text-center">
                                                <span className="font-bold text-emerald-400">
                                                  {correctVal === true ? 'Benar' : 'Salah'}
                                                </span>
                                              </td>
                                              <td className="py-2.5 px-3 text-center">
                                                {isStmtMatch ? (
                                                  <span className="text-emerald-400 font-bold text-[11px]">✓ Sesuai</span>
                                                ) : (
                                                  <span className="text-rose-400 font-bold text-[11px]">✗ Meleset</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* OFFICIAL SOLUTION & EXPLANATION ACCORDION */}
                              <div className="rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-500/30 overflow-hidden shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => toggleSolutionExpand(q.id)}
                                  className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-indigo-950/30 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-xs sm:text-sm">
                                    <Sparkles className="w-4 h-4 text-cyan-400" />
                                    <span>Analisis & Pembahasan Lengkap Resmi</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span>{isExpanded ? 'Tutup Pembahasan' : 'Lihat Pembahasan'}</span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-indigo-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-indigo-400" />
                                    )}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="p-4 sm:p-6 border-t border-indigo-500/20 space-y-4 text-xs sm:text-sm">
                                    {/* Summary */}
                                    {q.explanation?.summary && (
                                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 leading-relaxed font-medium">
                                        {q.explanation.summary}
                                      </div>
                                    )}

                                    {/* Concept */}
                                    {q.explanation?.concept && (
                                      <div className="space-y-1">
                                        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                          <Lightbulb className="w-3.5 h-3.5" />
                                          <span>Konsep / Rumus Teori Dasar:</span>
                                        </span>
                                        <p className="text-slate-300 leading-relaxed font-serif bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                                          {q.explanation.concept}
                                        </p>
                                      </div>
                                    )}

                                    {/* Steps */}
                                    {q.explanation?.steps && q.explanation.steps.length > 0 && (
                                      <div className="space-y-2">
                                        <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                                          Langkah-Langkah Penyelesaian Sistematis:
                                        </span>
                                        <div className="space-y-1.5">
                                          {q.explanation.steps.map((step, sIdx) => (
                                            <div key={sIdx} className="flex items-start gap-2 text-slate-300 leading-relaxed">
                                              <span className="w-5 h-5 rounded-full bg-indigo-900/80 text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 border border-indigo-700/60 mt-0.5">
                                                {sIdx + 1}
                                              </span>
                                              <span>{step}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Fast Trick */}
                                    {q.explanation?.fastTrick && (
                                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                                        <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                          <strong className="block text-amber-300 mb-0.5">
                                            Trik Cepat & Rumus Sakti UTBK:
                                          </strong>
                                          <span>{q.explanation.fastTrick}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Tutor AI Interactive CTA */}
                                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                                      <span className="text-[11px] text-slate-400">
                                        Masih belum paham materi ini?
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAiTutorForQuestion(q)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                                      >
                                        <Bot className="w-3.5 h-3.5 text-cyan-300" />
                                        <span>Diskusikan Lebih Lanjut dengan Tutor AI</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Raport Nilai Mapel */}
        {activeTab === 'subtests' && (
          <div className="space-y-6">
            {renderRaportNilaiTable()}

            {result.subtestSummaries && Object.keys(result.subtestSummaries).length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span>Rincian Statistik & Penguasaan Topik per Mapel:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.values(result.subtestSummaries) as SubtestScoreSummary[]).map(summary => (
                    <div
                      key={summary.subtestId}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase tracking-wider">
                            {summary.category}
                          </span>
                          <h4 className="font-bold text-base text-white mt-1">
                            {summary.subtestName}
                          </h4>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Skor IRT</span>
                          <span className="text-xl font-extrabold text-cyan-400">
                            {summary.irtScore}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar Accuracy */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300 font-medium">
                          <span>Akurasi Jawaban</span>
                          <span>
                            {summary.correct}/{summary.totalQuestions} Soal ({summary.accuracyPercentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              summary.accuracyPercentage >= 75
                                ? 'bg-emerald-500'
                                : summary.accuracyPercentage >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${summary.accuracyPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Time & Strengths */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
                        <div>
                          <span className="text-slate-400 block">Waktu Dihabiskan:</span>
                          <span className="font-semibold text-white">
                            {formatDuration(summary.timeSpentSeconds)} (avg {summary.avgTimePerQuestionSeconds}s/soal)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Topik Dikuasai:</span>
                          <span className="font-semibold text-emerald-400 truncate block">
                            {summary.strengths.join(', ') || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Time Tracking & Speed Analysis */}
        {activeTab === 'time' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <span>Analisis Manajemen Waktu & Kecepatan Pengerjaan</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Di UTBK nyata, peserta rata-rata memiliki waktu 50 hingga 90 detik per butir soal.
                Berikut adalah identifikasi soal yang menguras waktu paling banyak:
              </p>

              {/* Time Traps List */}
              <div className="space-y-3">
                {timeTrapQuestions.map((item, idx) => (
                  <div
                    key={item.question.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-amber-400">
                          #{idx + 1} Terlama
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-white">
                          {item.question.subtestName}
                        </span>
                        <span className="text-xs text-slate-500">({item.question.topic})</span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-1">
                        {item.question.questionText}
                      </p>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <span className="text-sm font-bold text-white block">
                        {item.timeSpent} detik
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          item.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.isCorrect ? 'Terjawab Benar' : 'Salah/Kosong'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Integrity & Proctoring Detailed Logs */}
        {activeTab === 'integrity' && (
          <div className="space-y-6">
            {/* Header Integrity Report Banner */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
                      !result.proctoringSummary || result.proctoringSummary.totalViolations === 0
                        ? 'bg-emerald-600'
                        : result.proctoringSummary.integrityScore >= 70
                        ? 'bg-amber-600'
                        : 'bg-rose-600'
                    }`}
                  >
                    {!result.proctoringSummary || result.proctoringSummary.totalViolations === 0 ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <ShieldAlert className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white">
                        Laporan Pengawasan & Integritas Pengerjaan Ujian
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Rekap detail deteksi sistem takala siswa melakukan split layar, memperkecil jendela ujian, atau keluar dari aplikasi.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-400">Status Kepatuhan:</span>
                  <span
                    className={`text-sm font-black px-3 py-1 rounded-xl border mt-1 ${
                      !result.proctoringSummary || result.proctoringSummary.totalViolations === 0
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                        : result.proctoringSummary.integrityScore >= 70
                        ? 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                        : 'bg-rose-950/60 text-rose-300 border-rose-500/50'
                    }`}
                  >
                    {result.proctoringSummary?.integrityStatus || 'Sangat Tertib / Bersih'}
                  </span>
                </div>
              </div>

              {/* Integrity Stats Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Total Pelanggaran:</span>
                  <span className="text-2xl font-bold font-mono text-white mt-1 block">
                    {result.proctoringSummary?.totalViolations || 0}{' '}
                    <span className="text-xs font-normal text-slate-400">kejadian</span>
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Keluar Aplikasi / Blur:</span>
                  <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
                    {result.proctoringSummary?.exitAppCount || 0}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (
                      {result.proctoringSummary?.logs
                        ? result.proctoringSummary.logs
                            .filter(l => l.type === 'tab_switch_or_blur' || l.type === 'fullscreen_exit')
                            .reduce((acc, l) => acc + l.durationSeconds, 0)
                        : 0}{' '}
                      detik)
                    </span>
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Split / Perkecil Layar:</span>
                  <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                    {result.proctoringSummary?.splitResizeCount || 0}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (
                      {result.proctoringSummary?.logs
                        ? result.proctoringSummary.logs
                            .filter(l => l.type === 'split_or_resize')
                            .reduce((acc, l) => acc + l.durationSeconds, 0)
                        : 0}{' '}
                      detik)
                    </span>
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Total Durasi di Luar Ujian:</span>
                  <span className="text-2xl font-bold font-mono text-indigo-300 mt-1 block">
                    {result.proctoringSummary?.totalOutOfExamDurationSeconds || 0}{' '}
                    <span className="text-xs font-normal text-slate-400">detik</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Chronological Event Logs Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm space-y-0">
              <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileWarning className="w-4 h-4 text-indigo-400" />
                  <h4 className="font-bold text-sm text-white">
                    Kronologi Lengkap Aktivitas Siswa Saat Ujian
                  </h4>
                </div>
                <span className="text-xs text-slate-400">
                  {result.proctoringSummary?.logs?.length || 0} Catatan Tercatat
                </span>
              </div>

              {!result.proctoringSummary?.logs || result.proctoringSummary.logs.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h5 className="font-bold text-white text-base">Tidak Ada Pelanggaran Terdeteksi</h5>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Peserta mengerjakan ujian dengan tertib di jendela penuh tanpa berpindah aplikasi atau membagi layar (split screen).
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Waktu Kejadian</th>
                        <th className="p-3.5">Jenis Kejadian</th>
                        <th className="p-3.5">Posisi Soal</th>
                        <th className="p-3.5">Lama Durasi</th>
                        <th className="p-3.5">Keterangan & Catatan Sistem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {result.proctoringSummary.logs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                            {log.formattedTime}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                log.type === 'split_or_resize'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              {log.type === 'split_or_resize'
                                ? 'Split Layar / Resize'
                                : log.type === 'fullscreen_exit'
                                ? 'Keluar Layar Penuh'
                                : 'Keluar Aplikasi / Pindah Tab'}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-white whitespace-nowrap">
                            {log.questionNumber ? `Soal No. ${log.questionNumber}` : '-'}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-300 whitespace-nowrap">
                            {log.durationSeconds} Detik
                          </td>
                          <td className="p-3.5 text-slate-300 max-w-md">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Target PTN Simulator */}
        {activeTab === 'ptn' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              Perhitungan kelulusan disimulasikan berdasarkan rata-rata passing grade UTBK nasional
              dan tingkat keketatan kuota pendaftar resmi.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.targetPtnEvaluations.map((evalItem, idx) => {
                const isPassed = evalItem.difference >= 0;
                return (
                  <div
                    key={evalItem.ptn.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isPassed
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          <School className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                            Pilihan #{idx + 1} • {evalItem.ptn.category}
                          </span>
                          <h4 className="font-bold text-base text-white mt-0.5">
                            {evalItem.ptn.majorName}
                          </h4>
                          <p className="text-xs text-slate-400">{evalItem.ptn.ptnName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Gauge metrics */}
                    <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Peluang Lolos:</span>
                        <span
                          className={
                            evalItem.chanceLabel === 'Sangat Tinggi' || evalItem.chanceLabel === 'Tinggi'
                              ? 'text-emerald-400 font-bold'
                              : evalItem.chanceLabel === 'Peluang Bersaing'
                              ? 'text-amber-400 font-bold'
                              : 'text-rose-400 font-bold'
                          }
                        >
                          {evalItem.chanceLabel} ({evalItem.chancePercentage}%)
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            evalItem.chancePercentage >= 70
                              ? 'bg-emerald-500'
                              : evalItem.chancePercentage >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${evalItem.chancePercentage}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Skor Anda: <strong className="text-white">{result.totalIrtScore}</strong></span>
                        <span>Passing Target: <strong className="text-amber-400">{evalItem.ptn.passingScoreEstimate}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

            {/* Bottom Quick Fold Button */}
            <div className="flex items-center justify-center pt-2">
              <button
                id="btn-bottom-fold-page"
                type="button"
                onClick={() => {
                  setIsAnalysisPageFolded(true);
                  window.scrollTo({ top: 200, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
                <span>Lipat Kembali Halaman Analisis</span>
              </button>
            </div>
          </div>
        )}

        {/* Status Final Ujian & Action Buttons */}
        <div className="pt-6 border-t border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Sesi Ujian Selesai & Terkunci</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              {/* Admin Only Action: Kembali ke Dashboard Utama */}
              {isAdmin && onBackToDashboard && (
                <button
                  id="btn-bottom-back-to-dashboard-admin"
                  type="button"
                  onClick={onBackToDashboard}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-amber-950/40 transition-all cursor-pointer active:scale-95 border border-amber-400/40"
                  title="Kembali ke Dashboard Utama (Khusus Admin / Guru)"
                >
                  <Home className="w-4 h-4" />
                  <span>Kembali ke Dashboard (Admin)</span>
                </button>
              )}

              {/* Print Button - Icon Only */}
              <button
                id="btn-bottom-print-result"
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto inline-flex items-center justify-center p-3 sm:px-3.5 sm:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer active:scale-95"
                title="Cetak Laporan / Rapor Hasil Ujian Resmi"
                aria-label="Cetak Hasil"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
              </button>

              {onNavigateToScheduleList && (
                <button
                  id="btn-bottom-back-to-schedule"
                  type="button"
                  onClick={onNavigateToScheduleList}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-indigo-950/40 transition-all cursor-pointer active:scale-95 border border-indigo-400/30"
                  title="Kembali"
                >
                  <Calendar className="w-4 h-4 text-indigo-200" />
                  <span>Kembali</span>
                </button>
              )}

              <button
                id="btn-bottom-exit-exam-from-result"
                type="button"
                onClick={() => {
                  if (onExitExam) {
                    onExitExam();
                  } else if (onNavigateToScheduleList) {
                    onNavigateToScheduleList();
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 text-xs sm:text-sm font-black shadow-lg shadow-rose-950/50 transition-all cursor-pointer active:scale-95"
                title="Keluar"
              >
                <LogOut className="w-4 h-4 text-white" />
                <span>Keluar</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4 text-xs pt-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">
                Status: Lembar Jawaban Resmi Telah Tersimpan Permanen & Terkunci di Server
              </span>
            </div>
            <div className="flex items-center gap-3">
              {!isAdmin && onBackToDashboard && (
                <button
                  type="button"
                  id="btn-proctor-pin-from-result"
                  onClick={() => {
                    if (securitySettings?.enableSupervisorPin === false) {
                      onBackToDashboard();
                    } else {
                      setIsPinModalOpen(true);
                    }
                  }}
                  className="text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  title={securitySettings?.enableSupervisorPin === false ? "Kembali ke Dashboard Utama (PIN Dinonaktifkan)" : "Otorisasi Guru/Pengawas (PIN 4 Digit)"}
                >
                  {securitySettings?.enableSupervisorPin === false ? (
                    <Unlock className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Lock className="w-3 h-3" />
                  )}
                  <span>
                    {securitySettings?.enableSupervisorPin === false ? 'Kembali ke Dashboard' : 'Akses Dashboard Pengawas'}
                  </span>
                </button>
              )}
              <div className="text-slate-400 text-[11px]">
                Sesi CBT #{result.id.slice(0, 8)} • Terkunci Otomatis
              </div>
            </div>
          </div>
        </div>

        {/* Official Signature Footer for Print Layout */}
        <div className="hidden print:block pt-8 text-black text-xs bg-white p-6 rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="text-center w-64">
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala Sekolah</p>
              <div className="h-20" />
              <p className="font-bold underline">{schoolInfo.headmasterName || 'Drs. H. Bambang Sujarwo, M.Pd.'}</p>
              <p>{schoolInfo.headmasterNip || 'NIP. 19740512 199903 1 002'}</p>
            </div>

            <div className="text-center w-64">
              <p>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold">Guru Pengampu / Panitia CBT</p>
              <div className="h-20" />
              <p className="font-bold underline">Dra. Hj. Siti Aminah, M.Pd.</p>
              <p>NIP. 19800817 200501 2 004</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer & Export Answers Modal */}
      <TransferAnswersModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        result={result}
        pkg={pkg}
      />

      {/* Supervisor PIN Modal */}
      <SupervisorPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        isEnabled={securitySettings?.enableSupervisorPin !== false}
        onSuccess={() => {
          onBackToDashboard();
        }}
        targetPin={securitySettings?.supervisorPin || '1234'}
        title="Otorisasi Dashboard Pengawas"
        description="Masukkan 4 digit PIN Pengawas/Guru untuk kembali ke Dashboard Utama."
      />

      {/* AI Tutor Discussion Modal for Selected Question */}
      {isAiTutorModalOpen && aiTutorQuestion && (
        <AiTutorModal
          isOpen={isAiTutorModalOpen}
          onClose={() => {
            setIsAiTutorModalOpen(false);
            setAiTutorQuestion(null);
          }}
          question={aiTutorQuestion}
          userAnswer={result.answers[aiTutorQuestion.id]}
          subtestName={aiTutorQuestion.subtestName || 'UTBK SNBT'}
        />
      )}
    </div>
  );
};
