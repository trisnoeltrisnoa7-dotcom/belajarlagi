import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileCode,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  User,
  GraduationCap,
  ShieldCheck,
  Trash2,
  Eye,
  Download,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  KeyRound,
  LogOut,
  Layers,
  ChevronRight,
  TrendingUp,
  Table,
  Plus,
  Copy,
  Check,
  BookOpen,
  Users,
  BarChart3,
  Link as LinkIcon,
  FileUp,
  Share2,
  Award,
  Globe,
  HelpCircle,
  AlertTriangle,
  FileDown,
  ShieldAlert,
} from 'lucide-react';
import { ExamResult, StudentRosterEntry, Question, SchoolInfo, DEFAULT_SCHOOL_INFO } from '../types';
import {
  initAuth,
  googleSignIn,
  googleLogout,
  getAccessToken,
  getCurrentUser,
  getOrCreateRootCbtFolder,
  uploadExamResultToDrive,
  updateMasterCsvInDrive,
  listCbtDriveFiles,
  deleteDriveFile,
  DriveFileItem,
  DriveFolderInfo,
  getFirebaseProjectId,
  getFirebaseConsoleAuthorizedDomainsUrl,
  getGoogleDriveApiEnableUrl,
  getGoogleSheetsApiEnableUrl,
  downloadExamResultsCsv,
} from '../utils/googleDriveService';
import {
  listUserSpreadsheets,
  getSpreadsheetDetails,
  readSheetRange,
  appendSheetRows,
  createMasterGradesSpreadsheet,
  exportRosterToSpreadsheet,
  importRosterFromGoogleSheet,
  importQuestionsFromGoogleSheet,
  extractSpreadsheetId,
  GoogleSpreadsheetItem,
  SheetTabInfo,
} from '../utils/googleSheetsService';
import { User as FirebaseUser } from 'firebase/auth';

interface GoogleDriveExamSyncViewProps {
  examHistory: ExamResult[];
  rosterStudents?: StudentRosterEntry[];
  onUpdateRoster?: (students: StudentRosterEntry[]) => void;
  questionsBank?: Question[];
  onAddQuestion?: (question: Question) => void;
  schoolInfo?: SchoolInfo;
  onNavigateToDashboard?: () => void;
  onBack?: () => void;
  onNavigateToSma?: () => void;
  onViewExamResult?: (result: ExamResult) => void;
}

export const GoogleDriveExamSyncView: React.FC<GoogleDriveExamSyncViewProps> = ({
  examHistory,
  rosterStudents = [],
  onUpdateRoster,
  questionsBank = [],
  onAddQuestion,
  schoolInfo = DEFAULT_SCHOOL_INFO,
  onNavigateToDashboard,
  onBack,
  onNavigateToSma,
  onViewExamResult,
}) => {
  const handleGoBack = onBack || onNavigateToDashboard || (() => {});
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(getCurrentUser());
  const [hasActiveToken, setHasActiveToken] = useState<boolean>(Boolean(getAccessToken()));
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Main Tab: 'sheets' | 'roster_import' | 'questions_import' | 'drive_files'
  const [activeMainTab, setActiveMainTab] = useState<'sheets' | 'roster_import' | 'questions_import' | 'drive_files'>('sheets');

  // Drive state
  const [rootFolder, setRootFolder] = useState<DriveFolderInfo | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Google Sheets state
  const [userSpreadsheets, setUserSpreadsheets] = useState<GoogleSpreadsheetItem[]>([]);
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>('');
  const [customSheetUrlInput, setCustomSheetUrlInput] = useState<string>('');
  const [activeSheetDetails, setActiveSheetDetails] = useState<{
    id: string;
    title: string;
    sheets: SheetTabInfo[];
    webViewLink: string;
  } | null>(null);
  const [sheetPreviewData, setSheetPreviewData] = useState<string[][]>([]);
  const [isLoadingSheetPreview, setIsLoadingSheetPreview] = useState(false);
  const [isCreatingMasterSheet, setIsCreatingMasterSheet] = useState(false);
  const [isAppendingToSheet, setIsAppendingToSheet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Roster import state
  const [parsedRosterPreview, setParsedRosterPreview] = useState<StudentRosterEntry[]>([]);
  const [rosterImportSummary, setRosterImportSummary] = useState<string | null>(null);
  const [isParsingRoster, setIsParsingRoster] = useState(false);

  // Question bank import state
  const [parsedQuestionsPreview, setParsedQuestionsPreview] = useState<Question[]>([]);
  const [isParsingQuestions, setIsParsingQuestions] = useState(false);

  // Search and filters for Drive tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<'ALL' | 'json' | 'txt' | 'csv'>('ALL');

  // Modals & previews
  const [previewFile, setPreviewFile] = useState<DriveFileItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Vercel / Firebase Authorized Domain Guide modal & state
  const [isVercelGuideModalOpen, setIsVercelGuideModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Domain & Firebase Diagnostics
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'aplikasi.vercel.app';
  const firebaseProjectId = getFirebaseProjectId();
  const firebaseConsoleSettingsUrl = getFirebaseConsoleAuthorizedDomainsUrl();

  const isUnauthorizedDomain = Boolean(
    authError &&
      (authError.includes('auth/unauthorized-domain') ||
        authError.toLowerCase().includes('unauthorized-domain') ||
        authError.includes('belum diotorisasi') ||
        authError.includes('Domain hosting'))
  );

  // Google Cloud API activation detection (Google Drive & Sheets API)
  const isGoogleApiDisabled = Boolean(
    authError &&
      (authError.includes('API_DISABLED') ||
        authError.includes('has not been used in project') ||
        authError.includes('is disabled') ||
        authError.includes('SERVICE_DISABLED') ||
        authError.includes('accessNotConfigured') ||
        authError.includes('drive.googleapis.com') ||
        authError.includes('sheets.googleapis.com'))
  );

  const isSheetsApiDisabled = Boolean(
    authError &&
      (authError.includes('Google Sheets API') ||
        authError.includes('sheets.googleapis.com'))
  );

  const detectedProjectId = useMemo(() => {
    if (!authError) return firebaseProjectId;
    const match = authError.match(/project[=:\s]+([0-9a-zA-Z_-]+)/i);
    return match ? match[1] : firebaseProjectId;
  }, [authError, firebaseProjectId]);

  const driveApiEnableUrl = getGoogleDriveApiEnableUrl(detectedProjectId);
  const sheetsApiEnableUrl = getGoogleSheetsApiEnableUrl(detectedProjectId);

  const handleCopyText = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleDownloadOfflineCsv = () => {
    try {
      downloadExamResultsCsv(examHistory, schoolInfo.schoolName || 'SMAN 19 Bandung');
      setDownloadSuccessToast('File CSV Nilai berhasil diunduh ke perangkat Anda!');
      setTimeout(() => setDownloadSuccessToast(null), 4000);
    } catch (e: any) {
      setAuthError('Gagal mengunduh CSV: ' + (e.message || String(e)));
    }
  };

  // Check auth on mount
  useEffect(() => {
    const checkInitialAuth = () => {
      const token = getAccessToken();
      setHasActiveToken(Boolean(token));
      if (token && currentUser) {
        loadWorkspaceData();
      }
    };
    checkInitialAuth();

    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasActiveToken(Boolean(token));
        loadWorkspaceData();
      },
      () => {
        // Token expired or unauthenticated
        setHasActiveToken(Boolean(getAccessToken()));
      }
    );
    return () => unsubscribe();
  }, []);

  const loadWorkspaceData = async () => {
    if (!getAccessToken()) return;
    setIsLoadingFiles(true);
    setIsLoadingSpreadsheets(true);
    setAuthError(null);

    try {
      // 1. Load Root Folder & Files
      const folder = await getOrCreateRootCbtFolder();
      setRootFolder(folder);
      const files = await listCbtDriveFiles(folder.id);
      setDriveFiles(files);

      // 2. Load User's Spreadsheets
      try {
        const sheetsList = await listUserSpreadsheets();
        setUserSpreadsheets(sheetsList);
        if (sheetsList.length > 0 && !selectedSpreadsheetId) {
          setSelectedSpreadsheetId(sheetsList[0].id);
          loadSheetDetails(sheetsList[0].id);
        }
      } catch (sheetErr: any) {
        console.warn('Sheets listing:', sheetErr);
      }
    } catch (err: any) {
      console.warn('Notice: Google Workspace data not loaded yet:', err);
      setAuthError(err.message || 'Gagal memuat data Google Workspace');
    } finally {
      setIsLoadingFiles(false);
      setIsLoadingSpreadsheets(false);
    }
  };

  const loadSheetDetails = async (sheetId: string) => {
    if (!sheetId || !getAccessToken()) return;
    setIsLoadingSheetPreview(true);
    try {
      const details = await getSpreadsheetDetails(sheetId);
      setActiveSheetDetails(details);
      const firstTab = details.sheets[0]?.title || 'Sheet1';
      const rows = await readSheetRange(sheetId, `'${firstTab}'!A1:Z50`);
      setSheetPreviewData(rows);
    } catch (err: any) {
      console.warn('Load sheet details:', err);
    } finally {
      setIsLoadingSheetPreview(false);
    }
  };

  // Helper to ensure valid access token exists before performing Workspace actions
  const ensureWorkspaceAuth = async (): Promise<string | null> => {
    const existingToken = getAccessToken();
    if (existingToken) {
      setHasActiveToken(true);
      return existingToken;
    }

    // Attempt interactive Google login / authorization
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const authRes = await googleSignIn();
      if (!authRes) {
        setAuthError('Otorisasi Google Workspace dibatalkan.');
        return null;
      }
      setCurrentUser(authRes.user);
      setHasActiveToken(true);
      await loadWorkspaceData();
      return authRes.accessToken;
    } catch (err: any) {
      console.warn('Google Sign In error:', err?.message || err);
      setAuthError(err.message || 'Otentikasi Google gagal. Silakan coba kembali.');
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    await ensureWorkspaceAuth();
  };

  const handleGoogleLogout = async () => {
    await googleLogout();
    setCurrentUser(null);
    setHasActiveToken(false);
    setRootFolder(null);
    setDriveFiles([]);
    setUserSpreadsheets([]);
    setActiveSheetDetails(null);
    setSheetPreviewData([]);
  };

  // Create new Master Google Spreadsheet
  const handleCreateMasterSheet = async () => {
    setAuthError(null);
    const token = await ensureWorkspaceAuth();
    if (!token) return;

    setIsCreatingMasterSheet(true);
    try {
      const res = await createMasterGradesSpreadsheet(examHistory, schoolInfo);
      setSelectedSpreadsheetId(res.id);
      await loadSheetDetails(res.id);
      // Refresh user spreadsheets
      const updatedList = await listUserSpreadsheets();
      setUserSpreadsheets(updatedList);

      setSyncMessage(`Master Spreadsheet "${res.title}" berhasil dibuat dan disimpan di Google Drive!`);
      setTimeout(() => setSyncMessage(null), 6000);
    } catch (err: any) {
      console.warn('Create sheet warning/notice:', err);
      setAuthError(err.message || 'Gagal membuat Google Spreadsheet baru');
    } finally {
      setIsCreatingMasterSheet(false);
    }
  };

  // Connect custom sheet via URL
  const handleConnectCustomSheet = async () => {
    if (!customSheetUrlInput.trim()) return;
    const cleanId = extractSpreadsheetId(customSheetUrlInput);
    if (!cleanId) {
      setAuthError('ID / Link Google Sheets tidak valid.');
      return;
    }

    const token = await ensureWorkspaceAuth();
    if (!token) return;

    setIsLoadingSheetPreview(true);
    try {
      await loadSheetDetails(cleanId);
      setSelectedSpreadsheetId(cleanId);
      setSyncMessage('Google Spreadsheet berhasil terhubung!');
      setTimeout(() => setSyncMessage(null), 4000);
      setCustomSheetUrlInput('');
    } catch (err: any) {
      setAuthError(err.message || 'Gagal menghubungkan Google Sheet tersebut. Pastikan Anda memiliki izin akses.');
    } finally {
      setIsLoadingSheetPreview(false);
    }
  };

  // Append new exam records to connected sheet
  const handleAppendExamResultsToSheet = async () => {
    if (!selectedSpreadsheetId || !activeSheetDetails) {
      setAuthError('Pilih atau buat Google Spreadsheet terlebih dahulu.');
      return;
    }
    if (examHistory.length === 0) {
      setSyncMessage('Belum ada riwayat hasil ujian untuk ditambahkan ke Google Sheets.');
      setTimeout(() => setSyncMessage(null), 4000);
      return;
    }

    const token = await ensureWorkspaceAuth();
    if (!token) return;

    setIsAppendingToSheet(true);
    try {
      const targetTab = activeSheetDetails.sheets[0]?.title || 'DAFTAR NILAI SISWA';
      const rowsToAdd: (string | number)[][] = examHistory.map((r, idx) => [
        idx + 1,
        r.studentProfile?.nis || '-',
        r.studentProfile?.fullName || 'Siswa CBT',
        r.studentProfile?.studentClass || '12 MIPA',
        r.packageTitle || 'Paket Ujian',
        new Date(r.submittedAt).toLocaleString('id-ID'),
        Math.round(r.totalDurationSeconds / 60),
        r.totalCorrect,
        r.totalIncorrect,
        r.totalBlank,
        r.totalQuestions,
        Math.round((r.totalCorrect / Math.max(1, r.totalQuestions)) * 100),
        r.totalIrtScore,
        `${Math.round(r.overallAccuracy)}%`,
        Math.round((r.totalCorrect / Math.max(1, r.totalQuestions)) * 100) >= 75 ? 'TUNTAS' : 'REMEDIAL',
        r.proctoringSummary?.integrityStatus || 'Tertib',
      ]);

      const result = await appendSheetRows(selectedSpreadsheetId, `'${targetTab}'!A:P`, rowsToAdd);
      await loadSheetDetails(selectedSpreadsheetId);

      setSyncMessage(`Sukses! ${result.updatedRows} baris nilai hasil ujian berhasil ditambahkan ke sheet "${targetTab}".`);
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      console.warn('Append to sheet notice/warning:', err);
      setAuthError(err.message || 'Gagal menambahkan baris ke Google Sheets.');
    } finally {
      setIsAppendingToSheet(false);
    }
  };

  // Preview Roster from Sheet
  const handleParseRosterFromSheet = async () => {
    const targetId = selectedSpreadsheetId || extractSpreadsheetId(customSheetUrlInput);
    if (!targetId) {
      setAuthError('Pilih atau masukkan link Google Spreadsheet terlebih dahulu.');
      return;
    }

    const token = await ensureWorkspaceAuth();
    if (!token) return;

    setIsParsingRoster(true);
    setAuthError(null);
    try {
      const targetTab = activeSheetDetails?.sheets.find((s) => s.title.toLowerCase().includes('roster') || s.title.toLowerCase().includes('siswa'))?.title || activeSheetDetails?.sheets[0]?.title || 'Sheet1';
      const res = await importRosterFromGoogleSheet(targetId, `'${targetTab}'!A1:Z500`);
      setParsedRosterPreview(res.students);
      setRosterImportSummary(res.summary);
    } catch (err: any) {
      setAuthError(err.message || 'Gagal mengekstrak roster siswa dari Google Sheets.');
    } finally {
      setIsParsingRoster(false);
    }
  };

  // Save parsed roster to CBT database
  const handleApplyImportedRoster = () => {
    if (parsedRosterPreview.length === 0 || !onUpdateRoster) return;
    onUpdateRoster(parsedRosterPreview);
    setSyncMessage(`Berhasil menyimpan ${parsedRosterPreview.length} siswa ke database roster CBT.`);
    setTimeout(() => setSyncMessage(null), 5000);
  };

  // Export current CBT roster to Google Sheet
  const handleExportRosterToSheet = async () => {
    if (!selectedSpreadsheetId) {
      setAuthError('Pilih Google Spreadsheet terlebih dahulu.');
      return;
    }
    if (rosterStudents.length === 0) {
      setAuthError('Database roster siswa masih kosong.');
      return;
    }

    const token = await ensureWorkspaceAuth();
    if (!token) return;

    setIsLoadingSheetPreview(true);
    try {
      await exportRosterToSpreadsheet(selectedSpreadsheetId, rosterStudents);
      await loadSheetDetails(selectedSpreadsheetId);
      setSyncMessage(`Berhasil mengekspor ${rosterStudents.length} siswa ke tab "DATA SISWA ROSTER" di Google Sheets!`);
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      setAuthError(err.message || 'Gagal mengekspor roster ke Google Sheets.');
    } finally {
      setIsLoadingSheetPreview(false);
    }
  };

  // Parse questions from Sheet
  const handleParseQuestionsFromSheet = async () => {
    const targetId = selectedSpreadsheetId || extractSpreadsheetId(customSheetUrlInput);
    if (!targetId) {
      setAuthError('Pilih atau masukkan link Google Spreadsheet terlebih dahulu.');
      return;
    }

    const token = await ensureWorkspaceAuth();
    if (!token) return;

    setIsParsingQuestions(true);
    setAuthError(null);
    try {
      const res = await importQuestionsFromGoogleSheet(targetId);
      setParsedQuestionsPreview(res.questions);
      setSyncMessage(`Berhasil menemukan ${res.count} butir soal pada Google Spreadsheet!`);
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      setAuthError(err.message || 'Gagal mengekstrak soal dari Google Sheets.');
    } finally {
      setIsParsingQuestions(false);
    }
  };

  // Save parsed questions to CBT bank
  const handleApplyImportedQuestions = () => {
    if (parsedQuestionsPreview.length === 0 || !onAddQuestion) return;
    let added = 0;
    parsedQuestionsPreview.forEach((q) => {
      onAddQuestion(q);
      added++;
    });
    setSyncMessage(`Berhasil menambahkan ${added} butir soal ke Bank Soal CBT.`);
    setParsedQuestionsPreview([]);
    setTimeout(() => setSyncMessage(null), 5000);
  };

  // Sync all local history to Google Drive files
  const handleSyncAllDriveFiles = async () => {
    const token = await ensureWorkspaceAuth();
    if (!token) return;

    if (examHistory.length === 0) {
      setSyncMessage('Belum ada riwayat hasil ujian siswa untuk disimpan ke Drive.');
      setTimeout(() => setSyncMessage(null), 4000);
      return;
    }

    setIsSyncingAll(true);
    setSyncMessage(null);
    try {
      const folder = await getOrCreateRootCbtFolder();
      setRootFolder(folder);

      let successCount = 0;
      for (const res of examHistory) {
        await uploadExamResultToDrive(res, folder.id);
        successCount++;
      }

      await updateMasterCsvInDrive(folder.id, examHistory);
      const updatedFiles = await listCbtDriveFiles(folder.id);
      setDriveFiles(updatedFiles);

      setSyncMessage(`Sukses! ${successCount} berkas jawaban siswa & rekap berhasil disinkronkan ke Google Drive.`);
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      console.warn('Drive sync notice/warning:', err);
      setAuthError(err.message || 'Gagal menyinkronkan berkas ke Google Drive');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Delete file with confirmation
  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(fileToDelete.id);
      setDriveFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setFileToDelete(null);
      setSyncMessage(`Berkas "${fileToDelete.name}" berhasil dihapus dari Google Drive.`);
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      setAuthError(err.message || 'Gagal menghapus berkas dari Google Drive');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered drive files
  const filteredFiles = useMemo(() => {
    return driveFiles.filter((file) => {
      const matchQuery =
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (file.studentName && file.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (file.packageTitle && file.packageTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (file.nis && file.nis.includes(searchQuery));

      let matchClass = true;
      if (selectedClassFilter !== 'ALL') {
        matchClass = file.studentClass?.includes(selectedClassFilter) || file.name.includes(selectedClassFilter);
      }

      let matchFormat = true;
      if (selectedFormatFilter === 'json') matchFormat = file.name.endsWith('.json');
      if (selectedFormatFilter === 'txt') matchFormat = file.name.endsWith('.txt');
      if (selectedFormatFilter === 'csv') matchFormat = file.name.endsWith('.csv');

      return matchQuery && matchClass && matchFormat;
    });
  }, [driveFiles, searchQuery, selectedClassFilter, selectedFormatFilter]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-100">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <button
              onClick={handleGoBack}
              className="hover:text-indigo-400 transition-colors font-medium cursor-pointer"
            >
              Dashboard
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-emerald-400 font-semibold">Integrasi Google Sheets & Drive</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
            <span>Integrasi Google Sheets & Google Drive</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ekspor rekap nilai, sinkronkan master spreadsheet, dan kelola arsip jawaban ujian CBT langsung ke Google Workspace
          </p>
        </div>

        {/* Action Controls Top */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            id="btn-open-vercel-domain-guide"
            type="button"
            onClick={() => setIsVercelGuideModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-amber-200 text-xs font-semibold border border-amber-500/30 hover:border-amber-500/50 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Panduan Otorisasi Domain Vercel (auth/unauthorized-domain)"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>Panduan Domain Vercel</span>
          </button>

          {currentUser && (
            <button
              id="btn-refresh-workspace"
              type="button"
              onClick={loadWorkspaceData}
              disabled={isLoadingFiles || isLoadingSpreadsheets}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Perbarui data Google Sheets & Drive"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles || isLoadingSpreadsheets ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Segarkan</span>
            </button>
          )}

          {activeSheetDetails && (
            <a
              id="btn-open-active-gsheet"
              href={activeSheetDetails.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 fill-slate-950" />
              <span>Buka di Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Download Toast */}
      {downloadSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{downloadSuccessToast}</span>
          </div>
          <button
            onClick={() => setDownloadSuccessToast(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Specialized Diagnostics for auth/unauthorized-domain on Vercel */}
      {isUnauthorizedDomain && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-rose-950/40 border-2 border-amber-500/50 shadow-2xl space-y-4 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 relative z-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold tracking-wide uppercase mb-1">
                  Firebase Auth: auth/unauthorized-domain
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Domain Hosting Vercel Belum Diizinkan di Firebase Authentication
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                  Firebase secara ketat memblokir login Google Workspace karena domain hosting saat ini (<code className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold">{currentHostname}</code>) belum didaftarkan di daftar <strong className="text-white">Authorized Domains</strong> proyek Firebase (<code className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300 font-mono">{firebaseProjectId}</code>).
                </p>
              </div>
            </div>

            <button
              onClick={() => setAuthError(null)}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors self-start cursor-pointer shrink-0"
            >
              Tutup Notifikasi
            </button>
          </div>

          {/* Action Row & Copy Buttons */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 relative z-10">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Salin Domain untuk Dimasukkan ke Firebase Authorized Domains:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Option 1: vercel.app */}
              <button
                type="button"
                onClick={() => handleCopyText('vercel.app', 'vercel')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {copiedKey === 'vercel' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin <strong className="font-mono text-white">vercel.app</strong></span>
              </button>

              {/* Option 2: specific hostname */}
              <button
                type="button"
                onClick={() => handleCopyText(currentHostname, 'host')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {copiedKey === 'host' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Salin Domain Terdeteksi: <strong className="font-mono text-amber-300">{currentHostname}</strong></span>
              </button>

              {/* Button: Direct to Firebase Console */}
              <a
                id="btn-goto-firebase-console-domains"
                href={firebaseConsoleSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-950/50 transition-all cursor-pointer active:scale-95 ml-auto"
              >
                <span>Buka Firebase Console Settings</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
              </a>
            </div>
          </div>

          {/* Why it still appears checklist */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-2.5 relative z-10">
            <h4 className="font-bold text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Sudah Dimasukkan Tapi Notifikasi Tetap Muncul? Periksa 5 Hal Ini:</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 text-[11px] leading-relaxed">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="font-bold text-white block mb-0.5">1. Format Penulisan Domain:</span>
                Pastikan hanya menulis nama host murni, <strong className="text-amber-300 font-mono">tanpa https://</strong> dan <strong className="text-amber-300 font-mono">tanpa tanda garis miring (/)</strong>. Contoh benar: <code className="text-emerald-400 font-mono">cbt-sman19.vercel.app</code>.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="font-bold text-white block mb-0.5">2. Tambahkan Domain Spesifik Vercel:</span>
                Beberapa peramban menolak wildcard. Masukkan nama lengkap subdomain Vercel Anda (misal: <code className="text-emerald-400 font-mono">nama-web.vercel.app</code>), bukan hanya <code className="font-mono">vercel.app</code>.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="font-bold text-white block mb-0.5">3. Google Sign-In Wajib "Enabled":</span>
                Di Firebase Console menu <strong className="text-white">Authentication &gt; Sign-in method</strong>, pastikan penyedia <strong className="text-amber-300">Google</strong> sudah berstatus <strong className="text-emerald-400">Enabled</strong> dan Email Dukungan sudah disimpan.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="font-bold text-white block mb-0.5">4. Deploy Ulang Vercel (Penting!):</span>
                Konfigurasi proyek <code className="text-amber-300 font-mono">{firebaseProjectId}</code> baru saja diterapkan di kode. Pastikan Vercel Anda sudah di-deploy ulang agar tidak menjalankan kode lama.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 md:col-span-2">
                <span className="font-bold text-white block mb-0.5">5. Jika Anda Menguji di Pratinjau Ini:</span>
                Jika tombol ditekan di pratinjau ini, domainnya adalah <code className="text-amber-300 font-mono">{currentHostname}</code>. Tambahkan juga domain tersebut ke Firebase Console.
              </div>
            </div>
          </div>

          {/* Retry & Fallback Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 relative z-10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${isLoggingIn ? 'animate-spin' : ''}`} />
                <span>{isLoggingIn ? 'Mencoba Menghubungkan...' : 'Coba Masuk Google Lagi'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsVercelGuideModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Buka Panduan Lengkap</span>
              </button>
            </div>

            {/* Emergency Offline CSV Export */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden lg:inline">Perlu data nilai sekarang juga?</span>
              <button
                type="button"
                onClick={handleDownloadOfflineCsv}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer"
                title="Unduh hasil ujian dalam format CSV untuk diunggah manual ke Google Drive"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unduh Rekap Nilai Siswa (CSV Offline)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Specialized Diagnostics for Google Cloud API Disabled (Google Drive & Google Sheets API) */}
      {isGoogleApiDisabled && !isUnauthorizedDomain && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-sky-950/50 border-2 border-indigo-500/50 shadow-2xl space-y-4 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 relative z-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold tracking-wide uppercase mb-1">
                  Google Cloud Console: API Wajib Diaktifkan
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Google Drive API Belum Diaktifkan di Proyek Google Cloud Anda
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                  Login Google Anda telah berhasil, namun proyek Google Cloud <code className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-indigo-300 font-mono font-bold">{detectedProjectId}</code> belum mengaktifkan layanan <strong className="text-white">Google Drive API</strong>. Google mewajibkan aktivasi satu kali di konsol agar aplikasi dapat membuat folder rekapan dan menyimpan berkas ujian siswa.
                </p>
              </div>
            </div>

            <button
              onClick={() => setAuthError(null)}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors self-start cursor-pointer shrink-0"
            >
              Tutup Notifikasi
            </button>
          </div>

          {/* Quick Activation Action Buttons */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 relative z-10">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Aktivasi 1-Klik: Buka Tautan di Bawah &amp; Klik Tombol Biru "ENABLE"</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Button 1: Enable Google Drive API */}
              <a
                id="btn-enable-drive-api"
                href={driveApiEnableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-md shadow-sky-950/50 transition-all cursor-pointer active:scale-95"
              >
                <Folder className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>1. Buka &amp; Aktifkan Google Drive API (Wajib)</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
              </a>

              {/* Button 2: Enable Google Sheets API */}
              <a
                id="btn-enable-sheets-api"
                href={sheetsApiEnableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>2. Aktifkan Google Sheets API (Disarankan)</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              </a>

              {/* Retry button */}
              <button
                type="button"
                onClick={loadWorkspaceData}
                disabled={isLoadingFiles}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 ml-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                <span>{isLoadingFiles ? 'Sedang Memeriksa...' : 'Coba Muat Ulang Sekarang'}</span>
              </button>
            </div>
          </div>

          {/* 3 Steps Guide Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs relative z-10">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
              <p className="text-slate-300">
                Klik tombol biru <strong className="text-white">Aktifkan Google Drive API</strong> di atas. Tab baru Google Cloud Console akan terbuka.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
              <p className="text-slate-300">
                Tekan tombol biru bertuliskan <strong className="text-sky-300">ENABLE (Aktifkan)</strong>. Tunggu 15-30 detik hingga proses aktivasi selesai.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
              <p className="text-slate-300">
                Kembali ke tab aplikasi ini, lalu klik tombol <strong className="text-white">Coba Muat Ulang Sekarang</strong> di atas.
              </p>
            </div>
          </div>

          {/* Fallback Offline CSV */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs relative z-10">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Butuh data nilai segera? Anda tetap bisa mengunduh rekapitulasi CSV lokal langsung ke perangkat.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadOfflineCsv}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Unduh Rekap Nilai (CSV)</span>
            </button>
          </div>
        </div>
      )}

      {/* Standard error for non-domain and non-api-disabled errors */}
      {authError && !isUnauthorizedDomain && !isGoogleApiDisabled && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-3 animate-fade-in shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Pemberitahuan Google Workspace:</p>
            <p className="mt-0.5">{authError}</p>
          </div>
          <button
            onClick={() => setAuthError(null)}
            className="text-rose-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {syncMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-3 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{syncMessage}</div>
          <button
            onClick={() => setSyncMessage(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: GOOGLE AUTHENTICATION CARD */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        {!currentUser ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Google Sheets & Drive Workspace API</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Hubungkan Akun Google untuk Akses Spreadsheet & Cloud Storage
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Sinkronkan rekapitulasi nilai ujian, daftar roster siswa, dan butir soal langsung ke Google Sheets sekolah secara otomatis.
              </p>
            </div>

            {/* Official Google Sign In Button */}
            <div className="shrink-0">
              <button
                id="btn-google-workspace-signin"
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-xl shadow-slate-950/50 transition-all active:scale-95 border border-slate-200 cursor-pointer w-full sm:w-auto"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                  />
                </svg>
                <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google (Google Sheets & Drive)'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            {/* User Profile Info */}
            <div className="flex items-center space-x-4">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google User'}
                  className="w-12 h-12 rounded-2xl border-2 border-emerald-400/60 shadow-md object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-lg border border-emerald-500/40">
                  {currentUser.displayName ? currentUser.displayName[0] : 'G'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {currentUser.displayName || 'Pengguna Google Terverifikasi'}
                  </h3>
                  {hasActiveToken ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Terhubung Google Sheets &amp; Drive</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Izin Workspace Perlu Diperbarui</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
              </div>
            </div>

            {/* Account & Storage Quick Status */}
            <div className="flex items-center gap-3 flex-wrap">
              {!hasActiveToken && (
                <button
                  id="btn-reconnect-workspace-token"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Perbarui izin akses Google Sheets & Google Drive"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isLoggingIn ? 'animate-spin' : ''}`} />
                  <span>{isLoggingIn ? 'Menghubungkan...' : 'Perbarui Izin Workspace (1-Klik)'}</span>
                </button>
              )}

              {rootFolder && (
                <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                  <Folder className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Folder CBT Drive</p>
                    <p className="font-bold text-slate-200 truncate max-w-[150px]">{rootFolder.name}</p>
                  </div>
                </div>
              )}

              <button
                id="btn-google-logout"
                type="button"
                onClick={handleGoogleLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                title="Keluar dari akun Google"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        )}

        {/* Warning notification when user is logged in to Firebase but needs Workspace authorization */}
        {currentUser && !hasActiveToken && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start sm:items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-bold text-white">Akun Google Terhubung, Namun Izin Google Sheets &amp; Drive Belum Aktif</p>
                <p className="text-amber-300/90 mt-0.5">
                  Masa aktif token Google Workspace telah kedaluwarsa atau belum diberikan. Sistem akan secara otomatis meminta izin ketika Anda membuat Master Spreadsheet, atau Anda dapat memperbaruinya langsung.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoggingIn ? 'Menghubungkan...' : 'Perbarui Izin Sekarang'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          {
            id: 'sheets',
            label: 'Rekap Nilai Google Sheets',
            icon: FileSpreadsheet,
            badge: userSpreadsheets.length > 0 ? `${userSpreadsheets.length} Sheet` : undefined,
          },
          {
            id: 'roster_import',
            label: 'Impor / Ekspor Roster Siswa',
            icon: Users,
            badge: rosterStudents.length > 0 ? `${rosterStudents.length} Siswa` : undefined,
          },
          {
            id: 'questions_import',
            label: 'Impor Bank Soal dari Sheets',
            icon: BookOpen,
          },
          {
            id: 'drive_files',
            label: 'Arsip Berkas Google Drive',
            icon: Folder,
            badge: driveFiles.length > 0 ? `${driveFiles.length} Berkas` : undefined,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMainTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-workspace-${tab.id}`}
              onClick={() => setActiveMainTab(tab.id as any)}
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60 border border-emerald-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-emerald-900/80 text-emerald-200' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GOOGLE SHEETS SYNC & LIVE PREVIEW */}
      {/* ========================================================================= */}
      {activeMainTab === 'sheets' && (
        <div className="space-y-6 animate-fade-in">
          {/* Action Row: Create Master Sheet & Connect Custom Sheet */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Action 1: Create Master Sheet */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 relative overflow-hidden flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Buat Master Google Sheet CBT Baru</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Membuat Google Spreadsheet terstruktur dengan 3 tab otomatis: <strong className="text-slate-200">Daftar Nilai Siswa</strong>, <strong className="text-slate-200">Statistik & KKM</strong>, dan <strong className="text-slate-200">Data Roster</strong>.
                </p>
              </div>

              <button
                id="btn-create-master-spreadsheet"
                type="button"
                onClick={handleCreateMasterSheet}
                disabled={isCreatingMasterSheet}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreatingMasterSheet ? 'Membuat Spreadsheet...' : 'Buat Master Spreadsheet'}</span>
              </button>
            </div>

            {/* Action 2: Select / Connect Existing Spreadsheet */}
            <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                      <LinkIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Pilih atau Hubungkan Google Sheet</h3>
                      <p className="text-xs text-slate-400">Pilih dari daftar Google Drive Anda atau tempel link spreadsheet</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Select from user's Drive spreadsheets */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Pilih dari Drive Anda:
                    </label>
                    <select
                      id="select-user-gsheet"
                      value={selectedSpreadsheetId}
                      onChange={(e) => {
                        setSelectedSpreadsheetId(e.target.value);
                        loadSheetDetails(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Spreadsheet --</option>
                      {userSpreadsheets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Or paste custom URL */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Atau Tempel Link / ID Sheet:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={customSheetUrlInput}
                        onChange={(e) => setCustomSheetUrlInput(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleConnectCustomSheet}
                        className="px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Hubungkan
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Active Exam History to Selected Sheet */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {examHistory.length} hasil ujian siswa di memori siap disinkronkan ke Google Sheets.
                  </span>
                </div>

                <button
                  id="btn-append-grades-to-sheet"
                  type="button"
                  onClick={handleAppendExamResultsToSheet}
                  disabled={isAppendingToSheet || !selectedSpreadsheetId || examHistory.length === 0}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isAppendingToSheet ? 'Menambahkan Baris...' : 'Kirim Nilai ke Google Sheet'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Connected Sheet Information & Live Data Preview */}
          {activeSheetDetails ? (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              {/* Header Bar */}
              <div className="p-4 sm:p-5 bg-slate-850/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Table className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{activeSheetDetails.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Aktif
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>ID: {activeSheetDetails.id.substring(0, 16)}...</span>
                      <span>•</span>
                      <span>Tab: {activeSheetDetails.sheets.map((s) => s.title).join(', ')}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(activeSheetDetails.webViewLink)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
                  </button>

                  <a
                    href={activeSheetDetails.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                  >
                    <span>Buka di Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Table Preview */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Pratinjau Data Langsung (Live Sheet Preview):</span>
                  </p>
                  <span className="text-[11px] text-slate-500">
                    Menampilkan {sheetPreviewData.length} baris teratas
                  </span>
                </div>

                {isLoadingSheetPreview ? (
                  <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>Memuat data cell dari Google Sheets...</span>
                  </div>
                ) : sheetPreviewData.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    Spreadsheet ini masih kosong atau belum memiliki data pada range awal.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800/90 text-slate-200 border-b border-slate-700">
                          {sheetPreviewData[0]?.map((col, idx) => (
                            <th key={idx} className="p-3 font-bold border-r border-slate-700 last:border-r-0 whitespace-nowrap">
                              {col || `Kolom ${idx + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-950/50">
                        {sheetPreviewData.slice(1).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-3 border-r border-slate-800/60 last:border-r-0 text-slate-300 font-medium whitespace-nowrap">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white">Belum Ada Google Sheet yang Terpilih</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Klik tombol "Buat Master Spreadsheet" di atas untuk membuat buku nilai baru, atau pilih salah satu Google Spreadsheet dari akun Anda.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROSTER IMPORT & EXPORT VIA GOOGLE SHEETS */}
      {/* ========================================================================= */}
      {activeMainTab === 'roster_import' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>Impor & Ekspor Roster Siswa Menggunakan Google Sheets</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Sinkronkan daftar nama, NIS, dan kelas siswa langsung dari Google Spreadsheet guru/tata usaha.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportRosterToSheet}
                  disabled={!selectedSpreadsheetId || rosterStudents.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                  title="Ekspor daftar siswa saat ini ke Google Sheets"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span>Ekspor Roster ke Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={handleParseRosterFromSheet}
                  disabled={isParsingRoster || (!selectedSpreadsheetId && !customSheetUrlInput)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  <FileUp className="w-4 h-4" />
                  <span>{isParsingRoster ? 'Membaca Sheet...' : 'Baca & Pratinjau Siswa'}</span>
                </button>
              </div>
            </div>

            {/* Column Guide Card */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="font-bold text-indigo-300">Format Kolom Google Sheets yang Didukung:</p>
              <p className="text-slate-400 leading-relaxed">
                Sistem otomatis mengenali kolom header seperti: <strong className="text-slate-200">NIS / NISN</strong>, <strong className="text-slate-200">Nama Lengkap Siswa</strong>, <strong className="text-slate-200">Kelas / Rombel</strong>, dan <strong className="text-slate-200">Asal Sekolah</strong>.
              </p>
            </div>

            {/* Parsed Preview Table */}
            {parsedRosterPreview.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Hasil Ekstraksi Roster: {parsedRosterPreview.length} Siswa</span>
                    </h4>
                    {rosterImportSummary && <p className="text-xs text-slate-400 mt-0.5">{rosterImportSummary}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyImportedRoster}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Terapkan ke Database CBT</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-800 text-slate-200">
                      <tr>
                        <th className="p-3 font-bold border-b border-slate-700">No</th>
                        <th className="p-3 font-bold border-b border-slate-700">NIS</th>
                        <th className="p-3 font-bold border-b border-slate-700">Nama Lengkap</th>
                        <th className="p-3 font-bold border-b border-slate-700">Kelas</th>
                        <th className="p-3 font-bold border-b border-slate-700">Sekolah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                      {parsedRosterPreview.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-800/30">
                          <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 text-emerald-400 font-mono font-bold">{s.nis}</td>
                          <td className="p-3 text-white font-semibold">{s.name || s.fullName}</td>
                          <td className="p-3 text-slate-300">{s.className || s.studentClass}</td>
                          <td className="p-3 text-slate-400">{s.schoolName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUESTION BANK IMPORT VIA GOOGLE SHEETS */}
      {/* ========================================================================= */}
      {activeMainTab === 'questions_import' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <span>Impor Butir Soal Ujian dari Google Sheets</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Impor cepat puluhan hingga ratusan butir soal pilihan ganda lengkap dengan kunci dan pembahasan.
                </p>
              </div>

              <button
                type="button"
                onClick={handleParseQuestionsFromSheet}
                disabled={isParsingQuestions || (!selectedSpreadsheetId && !customSheetUrlInput)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <FileUp className="w-4 h-4" />
                <span>{isParsingQuestions ? 'Membaca Soal...' : 'Baca & Pratinjau Soal'}</span>
              </button>
            </div>

            {/* Column Guide */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="font-bold text-purple-300">Format Kolom Spreadsheet Soal:</p>
              <p className="text-slate-400 leading-relaxed">
                Header yang dikenali: <strong className="text-slate-200">Soal / Pertanyaan</strong>, <strong className="text-slate-200">Opsi A</strong>, <strong className="text-slate-200">Opsi B</strong>, <strong className="text-slate-200">Opsi C</strong>, <strong className="text-slate-200">Opsi D</strong>, <strong className="text-slate-200">Opsi E</strong>, <strong className="text-slate-200">Kunci Jawaban (A-E)</strong>, dan <strong className="text-slate-200">Pembahasan</strong>.
              </p>
            </div>

            {/* Parsed Questions List */}
            {parsedQuestionsPreview.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Ditemukan {parsedQuestionsPreview.length} Butir Soal Valid</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleApplyImportedQuestions}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50 transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Simpan ke Bank Soal CBT</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {parsedQuestionsPreview.map((q, idx) => (
                    <div key={q.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-400">Nomor {idx + 1} ({q.subtestCategory || q.subtestName || 'General'})</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          Kunci: {q.correctOptionIndex !== undefined ? String.fromCharCode(65 + q.correctOptionIndex) : String(q.correctAnswer || '-')}
                        </span>
                      </div>
                      <p className="text-white font-medium">{q.questionText}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-400 pt-1">
                        {q.options && q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-1.5 rounded-lg ${
                              q.correctOptionIndex !== undefined && oIdx === q.correctOptionIndex
                                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-900/60'
                            }`}
                          >
                            <span className="font-bold mr-1">{String.fromCharCode(65 + oIdx)}.</span> {typeof opt === 'string' ? opt : (opt as any)?.text || (opt as any)?.label || ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GOOGLE DRIVE FILES ARTIFACTS & ARCHIVE */}
      {/* ========================================================================= */}
      {activeMainTab === 'drive_files' && (
        <div className="space-y-6 animate-fade-in">
          {/* Action Row Drive */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-400" />
                <span>Arsip Jawaban & Berkas Ujian Google Drive</span>
              </h3>
              <p className="text-xs text-slate-400">
                Penyimpanan berkas cadangan lembar jawaban (.json), laporan teks (.txt), dan rekap nilai (.csv)
              </p>
            </div>

            <button
              id="btn-sync-all-to-drive"
              type="button"
              onClick={handleSyncAllDriveFiles}
              disabled={isSyncingAll || !currentUser || examHistory.length === 0}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-950/50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isSyncingAll ? 'Menyinkronkan...' : `Simpan Semua Jawaban (${examHistory.length}) ke Drive`}</span>
            </button>
          </div>

          {/* Search & Format Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari nama siswa, NIS, atau mapel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedFormatFilter}
                onChange={(e) => setSelectedFormatFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">Semua Format File</option>
                <option value="csv">Rekap CSV / Spreadsheet</option>
                <option value="json">Berkas JSON Lengkap</option>
                <option value="txt">Laporan Teks (.txt)</option>
              </select>
            </div>
          </div>

          {/* Files Grid / List */}
          {isLoadingFiles ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
              <span>Memuat daftar berkas dari Google Drive...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <FolderOpen className="w-12 h-12 mx-auto text-slate-600" />
              <p className="font-bold text-slate-300">Belum Ada Berkas Ujian di Google Drive</p>
              <p>Klik tombol "Simpan Semua Jawaban ke Drive" untuk menyinkronkan hasil ujian.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => {
                const isCsv = file.name.endsWith('.csv');
                const isJson = file.name.endsWith('.json');
                return (
                  <div
                    key={file.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCsv
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isJson
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {isCsv ? <FileSpreadsheet className="w-4 h-4" /> : isJson ? <FileCode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate" title={file.name}>
                            {file.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {file.studentName ? `${file.studentName} (${file.studentClass || '-'})` : 'Arsip Rekap CBT'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{file.createdTime ? new Date(file.createdTime).toLocaleDateString('id-ID') : '-'}</span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                          title="Buka di Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 transition-colors cursor-pointer"
                          title="Hapus dari Google Drive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Hapus Berkas dari Google Drive?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Anda akan menghapus berkas <strong className="text-rose-300 font-mono">{fileToDelete.name}</strong> secara permanen dari Google Drive.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFile}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vercel & Firebase Authorized Domain Guide Modal */}
      {isVercelGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700 p-6 sm:p-7 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold tracking-wide uppercase mb-1">
                    Panduan Konfigurasi Vercel
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Solusi Error Firebase (auth/unauthorized-domain)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mengizinkan domain hosting Vercel untuk otentikasi Google Workspace & Drive
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsVercelGuideModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Explanation Section */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
              <h4 className="font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Mengapa Error Ini Terjadi di Vercel?</span>
              </h4>
              <p>
                Secara default, Firebase Authentication menerapkan pengamanan ketat: hanya domain yang terdaftar secara eksplisit di konsol yang diizinkan melakukan login OAuth Google (Google Popup).
              </p>
              <p>
                Ketika aplikasi CBT di-deploy ke Vercel (misalnya pada alamat <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold">{currentHostname}</code>), Firebase menganggap domain ini belum terverifikasi sehingga mengeluarkan kode: <strong className="text-rose-400 font-mono">auth/unauthorized-domain</strong>.
              </p>
            </div>

            {/* Domain Copy Tools */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Nilai Domain untuk Dimasukkan ke Firebase:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Wildcard vercel.app */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 flex flex-col justify-between gap-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">Rekomendasi Utama:</span>
                    <div className="text-sm font-mono font-bold text-white mt-0.5">vercel.app</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Mengizinkan semua URL deployment, pratinjau (preview), dan produksi Vercel sekaligus.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText('vercel.app', 'modal_vercel')}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
                  >
                    {copiedKey === 'modal_vercel' ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'modal_vercel' ? 'Tersalin!' : 'Salin "vercel.app"'}</span>
                  </button>
                </div>

                {/* Specific Hostname */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Domain Saat Ini:</span>
                    <div className="text-sm font-mono font-bold text-slate-200 mt-0.5 truncate" title={currentHostname}>
                      {currentHostname}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Mengizinkan domain spesifik aplikasi saat ini di peramban Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(currentHostname, 'modal_host')}
                    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  >
                    {copiedKey === 'modal_host' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'modal_host' ? 'Tersalin!' : 'Salin Domain Ini'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step by Step Guide */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Langkah-Langkah Penambahan di Firebase Console:
              </h4>

              <ol className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-white">Buka Firebase Console Settings</p>
                    <p className="text-slate-400 mt-0.5">
                      Klik tombol <strong className="text-amber-300">Buka Firebase Console</strong> di bawah. Anda akan diarahkan langsung ke halaman pengaturan proyek <code className="text-slate-300 font-mono">{firebaseProjectId}</code>.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-white">Masuk ke Bagian "Authorized domains"</p>
                    <p className="text-slate-400 mt-0.5">
                      Pada menu <strong className="text-white">Authentication</strong>, pastikan tab <strong className="text-white">Settings</strong> (Pengaturan) aktif, lalu gulir ke bawah ke daftar tabel <strong className="text-amber-300">Authorized domains</strong>.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-white">Klik "Add domain" & Tempelkan vercel.app</p>
                    <p className="text-slate-400 mt-0.5">
                      Klik tombol <strong className="text-white">Add domain</strong> (Tambahkan domain), ketikkan <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono">vercel.app</code> (atau domain kustom sekolah Anda), lalu klik <strong className="text-emerald-400">Add</strong> atau <strong className="text-emerald-400">Save</strong>.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <p className="font-semibold text-white">Selesai & Coba Masuk Kembali</p>
                    <p className="text-slate-400 mt-0.5">
                      Perubahan biasanya langsung berlaku dalam 10-30 detik. Kembali ke halaman ini dan klik tombol <strong className="text-white">Coba Masuk Google Lagi</strong> di bawah.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Why still appears checklist inside modal */}
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-2">
              <h4 className="font-bold text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Sudah Ditambahkan Tapi Masih Muncul Pesan Ini?</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                <li><strong className="text-white">Format penulisan:</strong> Jangan sertakan <code className="text-amber-300 font-mono">https://</code> atau tanda <code className="text-amber-300 font-mono">/</code> di akhir. Cukup tulis nama host seperti <code className="text-emerald-400 font-mono">cbt-sman19.vercel.app</code>.</li>
                <li><strong className="text-white">Subdomain spesifik:</strong> Masukkan nama subdomain spesifik Vercel Anda, bukan hanya <code className="font-mono">vercel.app</code>.</li>
                <li><strong className="text-white">Google Provider di Firebase:</strong> Buka menu <em>Authentication &gt; Sign-in method</em>, pastikan penyedia Google berstatus <strong>Enabled</strong> dan Email Dukungan sudah disimpan.</li>
                <li><strong className="text-white">Redeploy Vercel:</strong> Pastikan Anda telah melakukan redeploy atau push kode terbaru di Vercel agar Vercel membaca konfigurasi proyek baru <code className="text-amber-300 font-mono">{firebaseProjectId}</code>.</li>
                <li><strong className="text-white">Jika menguji di jendela pratinjau ini:</strong> Tambahkan juga domain <code className="text-amber-300 font-mono">{currentHostname}</code> ke Authorized domains.</li>
              </ul>
            </div>

            {/* Offline Fallback Callout */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <FileDown className="w-4 h-4 text-emerald-400" />
                  <span>Solusi Sementara bagi Guru Tanpa Akses Admin Firebase</span>
                </p>
                <p className="text-slate-300 mt-0.5">
                  Unduh data rekapitulasi nilai dalam format CSV dan unggah manual ke Google Drive sekolah.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadOfflineCsv}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer shrink-0"
              >
                Unduh CSV Nilai
              </button>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsVercelGuideModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={firebaseConsoleSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <span>Buka Firebase Console</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setIsVercelGuideModalOpen(false);
                    handleGoogleLogin();
                  }}
                  disabled={isLoggingIn}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoggingIn ? 'animate-spin' : ''}`} />
                  <span>{isLoggingIn ? 'Menghubungkan...' : 'Coba Masuk Google Lagi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
