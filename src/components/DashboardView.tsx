import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Clock,
  CheckCircle2,
  Trophy,
  Target,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  BrainCircuit,
  Zap,
  School,
  BarChart2,
  Layers,
  Play,
  RotateCcw,
  PlusCircle,
  GraduationCap,
  Share2,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Folder,
  ExternalLink,
  FolderOpen,
  Sliders,
  SlidersHorizontal,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Type,
  Edit3,
  Bookmark,
  Strikethrough,
  Maximize2,
  FileCheck2,
  User,
  Tag,
  HelpCircle,
  Info,
  Settings2,
  Check,
  Users,
  Shield,
  Radio,
  Bell,
  Trash2,
  AlertTriangle,
  KeyRound,
  Unlock,
  Search,
  Calendar,
  Building2,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import {
  ExamPackage,
  ExamResult,
  PtnTarget,
  ExamDisplaySettings,
  DEFAULT_EXAM_DISPLAY_SETTINGS,
  StudentRosterEntry,
  NisSecuritySettings,
  DEFAULT_NIS_SECURITY_SETTINGS,
  MAX_ROSTER_STUDENTS,
} from '../types';
import { EXAM_PACKAGES, SUBTEST_CONFIGS } from '../data/mockPackages';
import { INITIAL_SMA_EXAM_PACKAGES } from '../data/mockSmaData';
import { ShareExamModal } from './ShareExamModal';
import { ResetPackagesModal } from './ResetPackagesModal';
import { ResetExamHistoryModal } from './ResetExamHistoryModal';
import {
  getAllActiveSessions,
  getAllFinishedExamLocks,
  forceResetSessionByNis,
  unlockFinishedExamRecord,
  unlockEverythingForParticipant,
  unlockAllEverything,
  isGlobalLockingDisabled as checkGlobalDisabled,
  setGlobalLockingDisabled as updateGlobalDisabled,
} from '../utils/sessionManager';
import {
  setGlobalTimeBypassActive,
  isGlobalTimeBypassActive,
} from '../utils/examScheduleTimer';

interface DashboardViewProps {
  selectedTargets: PtnTarget[];
  onSelectPackage: (pkg: ExamPackage) => void;
  examHistory: ExamResult[];
  onOpenTargetModal: () => void;
  onOpenAiDrillModal: () => void;
  onViewHistoryResult: (result: ExamResult) => void;
  onNavigateToSma?: () => void;
  onNavigateToQuestionBank?: () => void;
  onNavigateToGoogleDrive?: () => void;
  onOpenStudentNotifications?: () => void;
  onDeletePackage?: (pkgId: string) => void;
  onResetPackages?: (mode: 'restore_default' | 'clear_all' | 'clear_custom_only') => void;
  onResetHistory?: (
    mode: 'clear_all' | 'restore_demo' | 'clear_by_package',
    targetPackageId?: string
  ) => void;
  smaPackages?: ExamPackage[];
  displaySettings?: ExamDisplaySettings;
  onUpdateDisplaySettings?: (settings: ExamDisplaySettings) => void;
  rosterStudents?: StudentRosterEntry[];
  securitySettings?: NisSecuritySettings;
  onOpenNisSettings?: () => void;
  onUpdateSecuritySettings?: (settings: NisSecuritySettings) => void;
  onNavigateToLockedStatus?: () => void;
  onNavigateToScheduleList?: () => void;
  onNavigateToScheduleManagement?: () => void;
  isGlobalLockingDisabled?: boolean;
  onToggleGlobalLocking?: (disabled: boolean) => void;
  onMasterUnlockAll?: () => { activeCount: number; finishedCount: number } | void;
  onOpenHelpModal?: () => void;
  targetSectionTrigger?: {
    section: 'sectionA'  | 'sectionD' | 'sectionE' | 'expandAll' | 'collapseAll';
    timestamp: number;
  } | null;
  isSectionDCollapsed?: boolean;
  onToggleSectionDCollapse?: (collapsed: boolean) => void;
  isSectionECollapsed?: boolean;
  onToggleSectionECollapse?: (collapsed: boolean) => void;
  isSupervisorUnlocked?: boolean;
  onToggleSupervisorUnlocked?: (unlocked: boolean) => void;
  onOpenSupervisorPinModal?: () => void;
  onOpenSchoolKopModal?: () => void;
  scheduleRole?: 'admin' | 'student';
  onRoleChange?: (role: 'admin' | 'student') => void;
  onNavigateToLayoutEditor?: () => void;
  onOpenCentralSubjectClass?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedTargets = [],
  onSelectPackage,
  examHistory = [],
  onOpenTargetModal,
  onOpenAiDrillModal,
  onViewHistoryResult,
  onNavigateToSma,
  onNavigateToQuestionBank,
  onNavigateToGoogleDrive,
  onOpenStudentNotifications,
  onDeletePackage,
  onResetPackages,
  onResetHistory,
  smaPackages = INITIAL_SMA_EXAM_PACKAGES,
  displaySettings: propsDisplaySettings,
  onUpdateDisplaySettings,
  rosterStudents = [],
  securitySettings = DEFAULT_NIS_SECURITY_SETTINGS,
  onOpenNisSettings,
  onUpdateSecuritySettings,
  onNavigateToLockedStatus,
  onNavigateToScheduleList,
  onNavigateToScheduleManagement,
  isGlobalLockingDisabled: propIsGlobalLockingDisabled,
  onToggleGlobalLocking,
  onMasterUnlockAll,
  onOpenHelpModal,
  targetSectionTrigger,
  isSectionDCollapsed: propIsSectionDCollapsed,
  onToggleSectionDCollapse,
  isSectionECollapsed: propIsSectionECollapsed,
  onToggleSectionECollapse,
  isSupervisorUnlocked = true,
  onToggleSupervisorUnlocked,
  onOpenSupervisorPinModal,
  onOpenSchoolKopModal,
  scheduleRole = 'admin',
  onRoleChange,
  onNavigateToLayoutEditor,
  onOpenCentralSubjectClass,
}) => {
  const [sharingPackage, setSharingPackage] = useState<ExamPackage | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<ExamPackage | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const [isResetPackagesModalOpen, setIsResetPackagesModalOpen] = useState(false);
  const [isResetHistoryModalOpen, setIsResetHistoryModalOpen] = useState(false);

  // Custom packages count
  const customPackagesCount = useMemo(() => {
    const defaultIds = new Set(INITIAL_SMA_EXAM_PACKAGES.map((p) => p.id));
    return smaPackages.filter((p) => p.isCustomCreated || !defaultIds.has(p.id)).length;
  }, [smaPackages]);

  // Section collapse state: Default collapsed (terlipat) as requested
  const [internalHistoryCollapsed, setInternalHistoryCollapsed] = useState<boolean>(true);
  const [internalDisplaySettingsCollapsed, setInternalDisplaySettingsCollapsed] = useState<boolean>(true);

  const isHistoryCollapsed = propIsSectionDCollapsed !== undefined ? propIsSectionDCollapsed : internalHistoryCollapsed;
  const setIsHistoryCollapsed = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isHistoryCollapsed) : val;
    setInternalHistoryCollapsed(nextVal);
    onToggleSectionDCollapse?.(nextVal);
  };

  const isDisplaySettingsCollapsed = propIsSectionECollapsed !== undefined ? propIsSectionECollapsed : internalDisplaySettingsCollapsed;
  const setIsDisplaySettingsCollapsed = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isDisplaySettingsCollapsed) : val;
    setInternalDisplaySettingsCollapsed(nextVal);
    onToggleSectionECollapse?.(nextVal);
  };

  // Exam Display Settings State (Managed in Dashboard Bagian E)
  const [currentDisplaySettings, setCurrentDisplaySettings] = useState<ExamDisplaySettings>(() => {
    if (propsDisplaySettings) return propsDisplaySettings;
    try {
      const saved = localStorage.getItem('cbt_exam_display_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_EXAM_DISPLAY_SETTINGS;
  });

  // Sync with prop changes if any
  useEffect(() => {
    if (propsDisplaySettings) {
      setCurrentDisplaySettings(propsDisplaySettings);
    }
  }, [propsDisplaySettings]);

  const handleToggleDisplaySetting = (key: keyof ExamDisplaySettings) => {
    const updated = {
      ...currentDisplaySettings,
      [key]: !currentDisplaySettings[key],
    };
    setCurrentDisplaySettings(updated);
    if (onUpdateDisplaySettings) {
      onUpdateDisplaySettings(updated);
    }
    try {
      localStorage.setItem('cbt_exam_display_settings', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleApplyPreset = (preset: Partial<ExamDisplaySettings>) => {
    const updated = {
      ...currentDisplaySettings,
      ...preset,
    };
    setCurrentDisplaySettings(updated);
    if (onUpdateDisplaySettings) {
      onUpdateDisplaySettings(updated);
    }
    try {
      localStorage.setItem('cbt_exam_display_settings', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleResetToDefault = () => {
    setCurrentDisplaySettings(DEFAULT_EXAM_DISPLAY_SETTINGS);
    if (onUpdateDisplaySettings) {
      onUpdateDisplaySettings(DEFAULT_EXAM_DISPLAY_SETTINGS);
    }
    try {
      localStorage.setItem('cbt_exam_display_settings', JSON.stringify(DEFAULT_EXAM_DISPLAY_SETTINGS));
    } catch (e) {}
  };

  // Check which preset matches currentDisplaySettings
  const isDashboardOfficialPreset =
    currentDisplaySettings.showTimer === true &&
    currentDisplaySettings.showStudentIdentity === true &&
    currentDisplaySettings.showQuestionCounter === true &&
    currentDisplaySettings.showSubtestBadge === true &&
    currentDisplaySettings.showDifficultyBadge === false &&
    currentDisplaySettings.showTopicTag === false &&
    currentDisplaySettings.showQuestionGrid === true &&
    currentDisplaySettings.showDoubtfulButton === true &&
    currentDisplaySettings.showOptionElimination === true &&
    currentDisplaySettings.showAiTutorHelper === false &&
    currentDisplaySettings.showFontSizeControls === true &&
    currentDisplaySettings.showScratchpad === true &&
    currentDisplaySettings.showOptionLetters === true &&
    currentDisplaySettings.showProctoringAlerts === true &&
    currentDisplaySettings.showWatermark === true &&
    currentDisplaySettings.forceFullscreen === true &&
    currentDisplaySettings.showImmediateScore === false &&
    currentDisplaySettings.showAnswerKeyAndExplanation === false &&
    currentDisplaySettings.showIrtAnalytics === false;

  const isDashboardPracticePreset =
    currentDisplaySettings.showTimer === true &&
    currentDisplaySettings.showStudentIdentity === true &&
    currentDisplaySettings.showQuestionCounter === true &&
    currentDisplaySettings.showSubtestBadge === true &&
    currentDisplaySettings.showDifficultyBadge === true &&
    currentDisplaySettings.showTopicTag === true &&
    currentDisplaySettings.showQuestionGrid === true &&
    currentDisplaySettings.showDoubtfulButton === true &&
    currentDisplaySettings.showOptionElimination === true &&
    currentDisplaySettings.showAiTutorHelper === true &&
    currentDisplaySettings.showFontSizeControls === true &&
    currentDisplaySettings.showScratchpad === true &&
    currentDisplaySettings.showOptionLetters === true &&
    currentDisplaySettings.showProctoringAlerts === true &&
    currentDisplaySettings.showWatermark === false &&
    currentDisplaySettings.forceFullscreen === false &&
    currentDisplaySettings.showImmediateScore === true &&
    currentDisplaySettings.showAnswerKeyAndExplanation === true &&
    currentDisplaySettings.showIrtAnalytics === true;

  const isDashboardRelaxedPreset =
    currentDisplaySettings.showTimer === false &&
    currentDisplaySettings.showStudentIdentity === true &&
    currentDisplaySettings.showQuestionCounter === true &&
    currentDisplaySettings.showSubtestBadge === true &&
    currentDisplaySettings.showDifficultyBadge === true &&
    currentDisplaySettings.showTopicTag === true &&
    currentDisplaySettings.showQuestionGrid === true &&
    currentDisplaySettings.showDoubtfulButton === true &&
    currentDisplaySettings.showOptionElimination === true &&
    currentDisplaySettings.showAiTutorHelper === true &&
    currentDisplaySettings.showFontSizeControls === true &&
    currentDisplaySettings.showScratchpad === true &&
    currentDisplaySettings.showOptionLetters === true &&
    currentDisplaySettings.showProctoringAlerts === false &&
    currentDisplaySettings.showWatermark === false &&
    currentDisplaySettings.forceFullscreen === false &&
    currentDisplaySettings.showImmediateScore === true &&
    currentDisplaySettings.showAnswerKeyAndExplanation === true &&
    currentDisplaySettings.showIrtAnalytics === true;

  const isDashboardDistractionFreePreset =
    currentDisplaySettings.showTimer === true &&
    currentDisplaySettings.showStudentIdentity === false &&
    currentDisplaySettings.showQuestionCounter === true &&
    currentDisplaySettings.showSubtestBadge === false &&
    currentDisplaySettings.showDifficultyBadge === false &&
    currentDisplaySettings.showTopicTag === false &&
    currentDisplaySettings.showQuestionGrid === false &&
    currentDisplaySettings.showDoubtfulButton === false &&
    currentDisplaySettings.showOptionElimination === true &&
    currentDisplaySettings.showAiTutorHelper === false &&
    currentDisplaySettings.showFontSizeControls === true &&
    currentDisplaySettings.showScratchpad === false &&
    currentDisplaySettings.showOptionLetters === true &&
    currentDisplaySettings.showProctoringAlerts === false &&
    currentDisplaySettings.showWatermark === false &&
    currentDisplaySettings.forceFullscreen === false &&
    currentDisplaySettings.showImmediateScore === true &&
    currentDisplaySettings.showAnswerKeyAndExplanation === true &&
    currentDisplaySettings.showIrtAnalytics === false;

  // Live locked status states for Dashboard Quick Icon Badge
  const [dashboardActiveSessions, setDashboardActiveSessions] = useState(() => getAllActiveSessions(securitySettings.sessionTimeoutMinutes || 60));
  const [dashboardFinishedLocks, setDashboardFinishedLocks] = useState(() => getAllFinishedExamLocks());

  // Menu Guru dropdown state & ref
  const [isMenuGuruOpen, setIsMenuGuruOpen] = useState(false);
  const menuGuruDropdownRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close Menu Guru dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuGuruDropdownRef.current && !menuGuruDropdownRef.current.contains(e.target as Node)) {
        setIsMenuGuruOpen(false);
      }
    };
    if (isMenuGuruOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuGuruOpen]);

  // Refresh live locks periodically
  useEffect(() => {
    const updateDashboardLocks = () => {
      try {
        setDashboardActiveSessions(getAllActiveSessions(securitySettings.sessionTimeoutMinutes || 60));
        setDashboardFinishedLocks(getAllFinishedExamLocks());
      } catch (e) {}
    };
    updateDashboardLocks();
    const interval = setInterval(updateDashboardLocks, 3000);
    return () => clearInterval(interval);
  }, [securitySettings.sessionTimeoutMinutes]);

  const handleNavigateToSection = (sectionKey: 'sectionA'  | 'sectionD' | 'sectionE') => {
    if (sectionKey === 'sectionD') {
      setIsHistoryCollapsed(false);
    }
    if (sectionKey === 'sectionE') {
      setIsDisplaySettingsCollapsed(false);
    }

    const sectionIdMap: Record<string, string> = {
      sectionA: 'dashboard-section-a',
      sectionD: 'dashboard-section-d',
      sectionE: 'dashboard-section-e',
    };

    setTimeout(() => {
      const targetId = sectionIdMap[sectionKey];
      const el = targetId ? document.getElementById(targetId) : null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-indigo-400', 'shadow-2xl');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-indigo-400', 'shadow-2xl');
        }, 1800);
      }
    }, 80);
  };

  // Respond to Main Menu trigger (from CBT Edu Logo menu)
  useEffect(() => {
    if (!targetSectionTrigger) return;
    const { section } = targetSectionTrigger;
    if (section === 'expandAll') {
      setIsHistoryCollapsed(false);
      setIsDisplaySettingsCollapsed(false);
      return;
    }
    if (section === 'collapseAll') {
      setIsHistoryCollapsed(true);
      setIsDisplaySettingsCollapsed(true);
      return;
    }
    if (section === 'sectionD') {
      setIsHistoryCollapsed(false);
    }
    if (section === 'sectionE') {
      setIsDisplaySettingsCollapsed(false);
    }

    handleNavigateToSection(section);
  }, [targetSectionTrigger]);

  // Calculate aggregate stats
  const totalCompleted = examHistory.length;
  const avgScore =
    totalCompleted > 0
      ? Math.round(examHistory.reduce((acc, h) => acc + h.totalIrtScore, 0) / totalCompleted)
      : 0;
  const bestScore =
    totalCompleted > 0 ? Math.max(...examHistory.map(h => h.totalIrtScore)) : 0;

  const totalSmaCount = smaPackages?.length || INITIAL_SMA_EXAM_PACKAGES.length;

  // Calculate unique students count and class distribution
  const uniqueStudentsCount = useMemo(() => {
    const studentKeys = new Set<string>();
    examHistory.forEach(h => {
      const key = h.studentProfile?.nis || h.studentProfile?.fullName || h.id;
      studentKeys.add(key);
    });
    return studentKeys.size;
  }, [examHistory]);

  const classBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    examHistory.forEach(h => {
      const cls = h.studentProfile?.studentClass || 'Umum';
      counts[cls] = (counts[cls] || 0) + 1;
    });
    return counts;
  }, [examHistory]);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Quick Actions (Icon Only): Folder Google (Penyimpanan), Jadwal Ujian, Input Soal, Mapel & Kelas, Pengatur NIS, Status Terkunci, Menu Guru */}
      <div className="relative flex items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
        <div className="w-full flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap mx-auto">
          {/* 1. Folder Google (Penyimpanan) */}
          {onNavigateToGoogleDrive && (
            <button
              type="button"
              id="btn-icon-google-drive"
              onClick={onNavigateToGoogleDrive}
              className="relative flex items-center justify-center p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-all active:scale-95 cursor-pointer shadow-sm group"
              title="Folder Google Drive Rekap Jawaban & Nilai Siswa (Penyimpanan)"
              aria-label="Folder Google Drive"
            >
              <FolderOpen className="w-5 h-5 fill-amber-400/20 group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* 2. Jadwal Ujian */}
          {(onNavigateToScheduleManagement || onNavigateToScheduleList) && (
            <button
              type="button"
              id="btn-icon-exam-schedule"
              onClick={() => {
                if (onNavigateToScheduleManagement) {
                  onNavigateToScheduleManagement();
                } else if (onNavigateToScheduleList) {
                  onNavigateToScheduleList();
                }
              }}
              className="relative flex items-center justify-center p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-all active:scale-95 cursor-pointer shadow-sm group"
              title="Manajemen Jadwal Ujian (Mode Guru & Pengawas)"
              aria-label="Manajemen Jadwal Ujian"
            >
              <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* 3. Input Bank Soal (Rapat Tengah) */}
          {onNavigateToQuestionBank && (
            <button
              type="button"
              id="btn-icon-input-soal"
              onClick={onNavigateToQuestionBank}
              className="relative flex items-center justify-center p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 transition-all active:scale-95 cursor-pointer shadow-sm group"
              title="Input Bank Soal Baru & Kelola Soal"
              aria-label="Input Bank Soal"
            >
              <PlusCircle className="w-5 h-5 mx-auto group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* 4. Edit Mapel & Rombel Kelas */}
          {onOpenCentralSubjectClass && (
            <button
              type="button"
              id="btn-icon-central-mapel"
              onClick={onOpenCentralSubjectClass}
              className="relative flex items-center justify-center p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 transition-all active:scale-95 cursor-pointer shadow-sm group"
              title="Pusat Edit Mata Pelajaran & Rombel Kelas Tersinkronkan"
              aria-label="Edit Mapel & Kelas"
            >
              <Layers className="w-5 h-5 mx-auto group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* 5. Pengatur NIS */}
          {onOpenNisSettings && (
            <button
              type="button"
              id="btn-icon-nis-settings"
              onClick={onOpenNisSettings}
              className="relative flex items-center justify-center p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 transition-all active:scale-95 cursor-pointer shadow-sm group"
              title={`Pengatur NIS Siswa & Validasi Login (${rosterStudents.length}/${MAX_ROSTER_STUDENTS} Siswa)`}
              aria-label="Pengatur NIS"
            >
              <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {rosterStudents.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-600 text-white border border-slate-900 shadow">
                  {rosterStudents.length}
                </span>
              )}
            </button>
          )}

          {/* 6. Status Terkunci & Buka Kunci (Icon Kunci) */}
          {onNavigateToLockedStatus && (
            <button
              type="button"
              id="btn-icon-locked-status"
              onClick={onNavigateToLockedStatus}
              className="relative flex items-center justify-center p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-all active:scale-95 cursor-pointer shadow-sm group"
              title={
                propIsGlobalLockingDisabled
                  ? 'Status Terkunci: Mode Bebas Aktif (Klik untuk Buka Manajemen Kunci)'
                  : dashboardActiveSessions.length + dashboardFinishedLocks.length > 0
                    ? `Status Terkunci: ${dashboardActiveSessions.length + dashboardFinishedLocks.length} Gembok Aktif (Klik untuk Buka Kunci)`
                    : 'Status Terkunci: Semua Siswa Bebas Gembok'
              }
              aria-label="Status Terkunci"
            >
              {propIsGlobalLockingDisabled ? (
                <Unlock className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              ) : (
                <KeyRound className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              )}
              {(dashboardActiveSessions.length > 0 || dashboardFinishedLocks.length > 0) && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white border border-slate-900 animate-pulse shadow">
                  {dashboardActiveSessions.length + dashboardFinishedLocks.length}
                </span>
              )}
            </button>
          )}

          {/* 7. Menu Guru & Pengawas (Rapat Tengah Sejajar dengan Penyimpanan) */}
          {scheduleRole !== 'student' && (
            <div className="relative" ref={menuGuruDropdownRef}>
              <button
                type="button"
                id="btn-icon-menu-guru"
                onClick={() => {
                  if (!isSupervisorUnlocked) {
                    if (securitySettings.enableSupervisorPin === false) {
                      if (onToggleSupervisorUnlocked) onToggleSupervisorUnlocked(true);
                      if (onRoleChange) onRoleChange('admin');
                      setIsMenuGuruOpen(true);
                    } else {
                      if (onOpenSupervisorPinModal) onOpenSupervisorPinModal();
                    }
                  } else {
                    setIsMenuGuruOpen((prev) => !prev);
                  }
                }}
                className={`relative p-2.5 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-sm group flex items-center justify-center ${
                  isSupervisorUnlocked
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 hover:text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                    : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-amber-300 border-slate-700/80 hover:border-amber-500/40'
                }`}
                title={
                  !isSupervisorUnlocked
                    ? securitySettings.enableSupervisorPin === false
                      ? 'Buka Menu Guru & Pengawas (PIN Dinonaktifkan)'
                      : 'Buka Menu Guru & Pengawas (Perlu PIN)'
                    : 'Menu Guru & Pengawas'
                }
                aria-label="Menu Guru"
              >
                <GraduationCap className="w-5 h-5 mx-auto group-hover:scale-110 transition-transform" />
                {isSupervisorUnlocked && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow" />
                )}
              </button>

              {/* Popover Action Menu Guru: Rapat tengah terhadap icon menu guru */}
              {isMenuGuruOpen && isSupervisorUnlocked && (
                <div
                  id="popover-dashboard-menu-guru"
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 sm:w-72 p-2.5 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl shadow-black/90 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 space-y-1.5 text-xs z-50 text-slate-200"
                >
                  {/* Panah penunjuk ke arah icon menu guru di tengah */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-slate-700/80 rotate-45 pointer-events-none" />
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 px-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Menu Guru & Pengawas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[9px] border border-emerald-500/30">
                        Aktif 🔓
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsMenuGuruOpen(false)}
                        className="p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Quick actions list */}
                  <div className="space-y-0.5 pt-0.5">
                    {onOpenCentralSubjectClass && (
                      <button
                        type="button"
                        id="btn-menu-guru-central-mapel"
                        onClick={() => {
                          setIsMenuGuruOpen(false);
                          onOpenCentralSubjectClass();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-cyan-300 hover:text-cyan-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
                      >
                        <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>Edit Mapel & Rombel Kelas</span>
                      </button>
                    )}

                    {onNavigateToScheduleManagement && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuGuruOpen(false);
                          onNavigateToScheduleManagement();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                      >
                        <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Manajemen Jadwal Ujian</span>
                      </button>
                    )}

                    {onOpenNisSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuGuruOpen(false);
                          onOpenNisSettings();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Pengaturan NIS & Keamanan</span>
                      </button>
                    )}

                    {onOpenSchoolKopModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuGuruOpen(false);
                          onOpenSchoolKopModal();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-indigo-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                      >
                        <School className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>Ubah Kop & Logo Sekolah</span>
                      </button>
                    )}

                    {onOpenStudentNotifications && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuGuruOpen(false);
                          onOpenStudentNotifications();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-emerald-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                      >
                        <Users className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Rekap & Notifikasi Siswa</span>
                      </button>
                    )}

                    {onOpenHelpModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuGuruOpen(false);
                          onOpenHelpModal();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-sky-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3 text-sky-400 shrink-0" />
                        <span>Buku Panduan Guru</span>
                      </button>
                    )}

                    {onResetPackages && (
                      <button
                        type="button"
                        id="btn-menu-guru-reset-packages"
                        onClick={() => {
                          setIsMenuGuruOpen(false);
                          setIsResetPackagesModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Reset Paket Mata Pelajaran</span>
                      </button>
                    )}

                    {onResetHistory && (
                      <button
                        type="button"
                        id="btn-menu-guru-reset-history"
                        onClick={() => {
                          setIsMenuGuruOpen(false);
                          setIsResetHistoryModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>Reset Laporan Riwayat Ujian</span>
                      </button>
                    )}

                    {/* Quick Toggle Proteksi PIN Mode Guru */}
                    <div className="px-2 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Proteksi PIN Guru</span>
                      </div>
                      <button
                        type="button"
                        id="btn-dash-menu-toggle-pin"
                        onClick={() => {
                          const nextState = !(securitySettings.enableSupervisorPin !== false);
                          const updated = {
                            ...securitySettings,
                            enableSupervisorPin: nextState,
                          };
                          if (onUpdateSecuritySettings) {
                            onUpdateSecuritySettings(updated);
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border ${
                          securitySettings.enableSupervisorPin !== false
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                        title={securitySettings.enableSupervisorPin !== false ? 'Klik untuk nonaktifkan PIN' : 'Klik untuk aktifkan PIN'}
                      >
                        {securitySettings.enableSupervisorPin !== false ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>

                    <div className="pt-1 mt-0.5 border-t border-slate-800 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuGuruOpen(false);
                          if (onToggleSupervisorUnlocked) onToggleSupervisorUnlocked(false);
                          if (onRoleChange) onRoleChange('student');
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-slate-300 hover:text-amber-300 bg-slate-800/80 hover:bg-slate-800 text-[10px] font-semibold border border-slate-700/80 transition-colors cursor-pointer"
                        title="Sembunyikan Menu dan beralih ke Mode Siswa"
                      >
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        <span>Kunci (Mode Siswa)</span>
                      </button>
                      {onOpenSupervisorPinModal && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuGuruOpen(false);
                            onOpenSupervisorPinModal();
                          }}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 text-[10px] font-semibold transition-colors cursor-pointer"
                          title="Ganti atau input PIN Pengawas"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>PIN</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Akses Cepat Pengawas (Subtle indicator on wide screens, non-disruptive to center alignment) */}
        <div className="hidden xl:flex items-center gap-2 absolute right-4 pointer-events-none select-none">
          <span className="text-[11px] text-slate-400 font-medium">
            Akses Cepat Pengawas
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KATALOG UJIAN SMA */}
      {/* ========================================================================= */}
      <div id="dashboard-section-a" className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition-all scroll-mt-24">
        {/* Section Header */}
        <div className="w-full p-3.5 sm:p-5 flex items-center justify-between gap-3 bg-slate-900/90 border-b border-slate-800/60">
          <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2 truncate">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 shrink-0" />
                  <span>KUMPULAN MAPEL</span>
                </h2>
                <span className="inline-flex px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60 shrink-0">
                  {totalSmaCount} Paket Mapel
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">
                Ujian Mata Pelajaran SMA (Kelas 10, 11, 12 MIPA & IPS, PTS/PAS/SAS, Input Bank Soal)
              </p>
            </div>
          </div>

          {onResetPackages && (
            <button
              type="button"
              id="btn-open-reset-packages-dashboard"
              onClick={() => setIsResetPackagesModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-amber-200 text-xs font-bold border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer shrink-0 active:scale-95 shadow-md"
              title="Reset Katalog Paket Ujian SMA"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Reset Paket</span>
            </button>
          )}
        </div>

        {/* Section Content */}
        <div className="p-4 sm:p-6 space-y-6 bg-slate-900/40">
            {/* Quick Hub Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/40 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Jadwal Ujianku</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Kop Sekolah, Kartu & Tabel Jadwal
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Logo & kop sekolah resmi di tengah, tampilan kartu & tabel, hari/tanggal, mapel otomatis terimpor dari paket soal, kelas, dan jam waktu ujian.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap mt-3">
                  {onNavigateToScheduleList && (
                    <button
                      type="button"
                      id="btn-goto-schedule-list-section-a"
                      onClick={onNavigateToScheduleList}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Tampilan Siswa</span>
                      <GraduationCap className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onNavigateToScheduleManagement && (
                    <button
                      type="button"
                      id="btn-goto-schedule-management"
                      onClick={onNavigateToScheduleManagement}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Manajemen Jadwal</span>
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-br from-blue-950/60 via-slate-900 to-slate-900 border border-blue-500/30 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-400">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">KUMPULAN MAPEL</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Ujian Mapel MIPA, IPS, & Bahasa
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Filter lengkap per jenjang kelas, jurusan MIPA/IPS, tipe ujian (PTS, PAS, SAS, Ujian Sekolah), kisi-kisi soal, dan kunci jawaban.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-goto-sma-hub-section-a"
                  onClick={onNavigateToSma}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold w-fit shadow-md shadow-blue-900/30 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Mapel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col justify-between space-y-3 text-center items-center">
                <div className="space-y-1.5 flex flex-col items-center">
                  <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <PlusCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Input & Bank Soal</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white text-center">
                    Kelola Bank Soal & Generate AI
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed text-center">
                    Tambah butir soal baru, rumus LaTeX/gambar, buat paket ujian kustom instan, dan manfaatkan AI Gemini untuk auto-generate soal latihan.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-goto-bank-input-section-a"
                  onClick={onNavigateToQuestionBank}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold w-full sm:w-auto shadow-md shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer"
                >
                  <span>Input & Kelola Soal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>


      {/* ========================================================================= */}
      {/* LAPORAN RIWAYAT UJIAN */}
      {/* ========================================================================= */}
      <div id="dashboard-section-d" className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition-all scroll-mt-24 max-w-full min-w-0">
        {/* Section Header */}
        <div
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          className={`w-full p-3.5 sm:p-5 flex items-center justify-between gap-3 bg-slate-900/90 min-w-0 overflow-hidden cursor-pointer hover:bg-slate-850/80 transition-colors select-none ${
            !isHistoryCollapsed ? 'border-b border-slate-800/60' : ''
          }`}
        >
          <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1 overflow-hidden">
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2 truncate max-w-full">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                  <span className="truncate">LAPORAN RIWAYAT UJIAN</span>
                </h2>
                <span className="inline-flex px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 shrink-0">
                  {uniqueStudentsCount} Siswa Telah Ujian
                </span>
                {isHistoryCollapsed && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-emerald-300/90 border border-emerald-500/20">
                    Terlipat
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate block max-w-full" title="Pusat laporan riwayat dan pantauan siswa yang telah menyelesaikan sesi ujian">
                Pusat laporan riwayat dan pantauan siswa yang telah menyelesaikan sesi ujian {isHistoryCollapsed ? '• Klik untuk membuka rincian' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onResetHistory && (
              <button
                type="button"
                id="btn-open-reset-history-dashboard"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsResetHistoryModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/40 hover:border-rose-500/70 transition-all cursor-pointer shrink-0 active:scale-95 shadow-md"
                title="Reset & Bersihkan Riwayat Ujian Siswa"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden xs:inline">Reset Riwayat</span>
              </button>
            )}
            <button
              type="button"
              id="btn-toggle-collapse-section-d"
              onClick={(e) => {
                e.stopPropagation();
                setIsHistoryCollapsed(!isHistoryCollapsed);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer shrink-0"
              title={isHistoryCollapsed ? 'Buka Lipatan Laporan Riwayat Ujian' : 'Lipat Laporan Riwayat Ujian'}
            >
              <span className="hidden xs:inline sm:inline">{isHistoryCollapsed ? 'Buka Lipatan' : 'Lipat Tab'}</span>
              {isHistoryCollapsed ? (
                <ChevronDown className="w-4 h-4 text-emerald-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* Section Content */}
        {!isHistoryCollapsed && (
          <div className="p-3.5 sm:p-5 md:p-6 bg-slate-900/40 space-y-4 max-w-full min-w-0 overflow-hidden animate-in fade-in duration-200">
            {/* Kolom Laporan Riwayat Ujian Siswa */}
            {examHistory.length > 0 ? (
              <div className="space-y-3 max-w-full min-w-0 overflow-hidden">
                <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-950/80 to-slate-950/80 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 max-w-full min-w-0 overflow-hidden">
                  <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1 overflow-hidden">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h3 className="text-xs sm:text-sm md:text-base font-bold text-white truncate max-w-full">
                          <span className="text-emerald-400 font-extrabold">{uniqueStudentsCount} Siswa</span> Telah Mengikuti Ujian
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                          {totalCompleted} Sesi Selesai
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate block max-w-full" title="Laporan riwayat pengerjaan aktif dan rincian nilai peserta.">
                        Laporan riwayat pengerjaan aktif dan rincian nilai peserta.
                      </p>
                    </div>
                  </div>

                  {onOpenStudentNotifications && (
                    <button
                      type="button"
                      onClick={onOpenStudentNotifications}
                      className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40 cursor-pointer flex items-center justify-center space-x-2 shrink-0 active:scale-95 whitespace-nowrap"
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      <span className="truncate">Lihat Siswa & Rincian Nilai</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  )}
                </div>

                {/* Daftar Riwayat Sesi Pengerjaan Terbaru dengan Scrollable Container */}
                <div className="space-y-2.5 max-w-full min-w-0 overflow-hidden">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5">
                      <span>Sesi Pengerjaan Terbaru</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-emerald-300 border border-slate-700">
                        {examHistory.length} Sesi
                      </span>
                    </div>
                    {examHistory.length > 2 && (
                      <span className="text-slate-500 text-[10px] lowercase flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        scroll ke bawah untuk melihat riwayat lengkap
                      </span>
                    )}
                  </div>

                  {/* Scrollable List Area with Custom Scrollbar */}
                  <div className="max-h-[340px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2 space-y-2 custom-scrollbar overscroll-contain">
                    {examHistory.map((res, idx) => {
                      const studentName = res.studentProfile?.fullName || 'Peserta Ujian';
                      const studentNis = res.studentProfile?.nis || '-';
                      const studentClass = res.studentProfile?.studentClass || 'Umum';
                      const submittedDate = res.submittedAt
                        ? new Date(res.submittedAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: 'short',
                          })
                        : null;

                      return (
                        <div
                          key={res.id || idx}
                          className="p-2.5 sm:p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 flex items-center justify-between gap-2.5 max-w-full min-w-0 overflow-hidden transition-all duration-150 group"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1 overflow-hidden">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-white truncate block max-w-full group-hover:text-emerald-300 transition-colors" title={studentName}>
                                  {studentName}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-800 text-indigo-300 shrink-0 border border-slate-700/60">
                                  {studentClass}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0 hidden sm:inline">
                                  NIS: {studentNis}
                                </span>
                                {submittedDate && (
                                  <span className="text-[9px] text-slate-500 shrink-0 ml-auto hidden md:inline">
                                    {submittedDate}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 min-w-0 overflow-hidden">
                                <span className="truncate max-w-[160px] sm:max-w-[260px] md:max-w-[340px]" title={res.packageTitle}>
                                  {res.packageTitle}
                                </span>
                                <span className="shrink-0 text-slate-500">•</span>
                                <span className="shrink-0 text-emerald-400 font-medium">Benar: {res.totalCorrect}/{res.totalQuestions}</span>
                                <span className="shrink-0 text-slate-500">•</span>
                                <span className="shrink-0">Akurasi: {res.overallAccuracy}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 pl-1">
                            <div className="text-right shrink-0">
                              <span className="text-[9px] text-slate-500 block uppercase font-medium leading-none">Skor IRT</span>
                              <span className="text-xs sm:text-sm font-black text-cyan-400">{res.totalIrtScore}</span>
                            </div>
                            {onViewHistoryResult && (
                              <button
                                type="button"
                                onClick={() => onViewHistoryResult(res)}
                                className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
                                title="Lihat Detail Hasil Siswa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/50 border border-slate-800 text-center space-y-2 max-w-full min-w-0 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-white truncate">Belum Ada Siswa yang Mengikuti Ujian</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto truncate block">
                  Laporan riwayat dan status pengerjaan akan otomatis terbarui di sini setelah ada siswa yang menyelesaikan ujian.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PENGATURAN TAMPILAN UJIAN SISWA & MODE CBT */}
      {/* ========================================================================= */}
      <div id="dashboard-section-e" className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition-all scroll-mt-24">
        {/* Section Header */}
        <div
          onClick={() => setIsDisplaySettingsCollapsed(!isDisplaySettingsCollapsed)}
          className={`w-full p-3.5 sm:p-5 flex items-center justify-between gap-3 bg-slate-900/90 min-w-0 overflow-hidden cursor-pointer hover:bg-slate-850/80 transition-colors select-none ${
            !isDisplaySettingsCollapsed ? 'border-b border-slate-800/60' : ''
          }`}
        >
          <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2 truncate">
                  <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 shrink-0" />
                  <span>PENGATURAN TAMPILAN UJIAN SISWA & MODE CBT</span>
                </h2>
                <span className="inline-flex px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-purple-950 text-purple-300 border border-purple-800/60 shrink-0">
                  16 Kontrol Elemen
                </span>
                {isDisplaySettingsCollapsed && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-purple-300/90 border border-purple-500/20">
                    Terlipat
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">
                Konfigurasi elemen visual layar ujian siswa, pengatur waktu, alat bantu, privasi nilai & integritas {isDisplaySettingsCollapsed ? '• Klik untuk membuka pengaturan' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-toggle-collapse-section-e"
              onClick={(e) => {
                e.stopPropagation();
                setIsDisplaySettingsCollapsed(!isDisplaySettingsCollapsed);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer shrink-0"
              title={isDisplaySettingsCollapsed ? 'Buka Lipatan Pengaturan Tampilan' : 'Lipat Pengaturan Tampilan'}
            >
              <span className="hidden xs:inline sm:inline">{isDisplaySettingsCollapsed ? 'Buka Lipatan' : 'Lipat Tab'}</span>
              {isDisplaySettingsCollapsed ? (
                <ChevronDown className="w-4 h-4 text-purple-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-purple-400" />
              )}
            </button>
          </div>
        </div>

        {/* Section Content */}
        {!isDisplaySettingsCollapsed && (
          <div className="p-4 sm:p-6 space-y-6 bg-slate-900/40 animate-in fade-in duration-200">
            {/* Quick Preset Selector Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preset Mode Ujian Siap Pakai (1-Klik Terapkan)</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Preset 1: Mode Ujian Resmi */}
                <button
                  id="dash-preset-official"
                  type="button"
                  onClick={() =>
                    handleApplyPreset({
                      showTimer: true,
                      showStudentIdentity: true,
                      showQuestionCounter: true,
                      showSubtestBadge: true,
                      showDifficultyBadge: false,
                      showTopicTag: false,
                      showQuestionGrid: true,
                      showDoubtfulButton: true,
                      showOptionElimination: true,
                      showAiTutorHelper: false,
                      showFontSizeControls: true,
                      showScratchpad: true,
                      showOptionLetters: true,
                      showProctoringAlerts: true,
                      showWatermark: true,
                      forceFullscreen: true,
                      showImmediateScore: false,
                      showAnswerKeyAndExplanation: false,
                      showIrtAnalytics: false,
                    })
                  }
                  className={`p-3.5 rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                    isDashboardOfficialPreset
                      ? 'bg-indigo-950/80 border-2 border-indigo-400 ring-2 ring-indigo-400/80 ring-offset-2 ring-offset-slate-950 shadow-xl shadow-indigo-950/70'
                      : 'bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      {isDashboardOfficialPreset ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500 text-white shadow-sm flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Terpilih & Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Resmi & Ketat
                        </span>
                      )}
                      <ShieldCheck className={`w-4 h-4 ${isDashboardOfficialPreset ? 'text-indigo-300' : 'text-indigo-400'}`} />
                    </div>
                    <h4 className={`text-xs font-bold transition-colors ${isDashboardOfficialPreset ? 'text-white font-black' : 'text-white group-hover:text-indigo-300'}`}>
                      Mode Ujian / PTS / PAS
                    </h4>
                    <p className={`text-[11px] leading-relaxed ${isDashboardOfficialPreset ? 'text-indigo-200/80' : 'text-slate-400'}`}>
                      AI Tutor mati, watermark aktif, fullscreen wajib, nilai & kunci dirahasiakan sementara.
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold mt-2.5 inline-flex items-center gap-1 ${isDashboardOfficialPreset ? 'text-indigo-300 font-bold' : 'text-indigo-400'}`}>
                    <span>{isDashboardOfficialPreset ? '✓ Preset Sedang Aktif' : 'Terapkan Preset'}</span>
                    {!isDashboardOfficialPreset && <ArrowRight className="w-3 h-3" />}
                  </span>
                </button>

                {/* Preset 2: Mode Latihan Mandiri */}
                <button
                  id="dash-preset-practice"
                  type="button"
                  onClick={() =>
                    handleApplyPreset({
                      showTimer: true,
                      showStudentIdentity: true,
                      showQuestionCounter: true,
                      showSubtestBadge: true,
                      showDifficultyBadge: true,
                      showTopicTag: true,
                      showQuestionGrid: true,
                      showDoubtfulButton: true,
                      showOptionElimination: true,
                      showAiTutorHelper: true,
                      showFontSizeControls: true,
                      showScratchpad: true,
                      showOptionLetters: true,
                      showProctoringAlerts: true,
                      showWatermark: false,
                      forceFullscreen: false,
                      showImmediateScore: true,
                      showAnswerKeyAndExplanation: true,
                      showIrtAnalytics: true,
                    })
                  }
                  className={`p-3.5 rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                    isDashboardPracticePreset
                      ? 'bg-emerald-950/80 border-2 border-emerald-400 ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-slate-950 shadow-xl shadow-emerald-950/70'
                      : 'bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      {isDashboardPracticePreset ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 shadow-sm flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Terpilih & Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Latihan Lengkap
                        </span>
                      )}
                      <Sparkles className={`w-4 h-4 ${isDashboardPracticePreset ? 'text-emerald-300' : 'text-emerald-400'}`} />
                    </div>
                    <h4 className={`text-xs font-bold transition-colors ${isDashboardPracticePreset ? 'text-white font-black' : 'text-white group-hover:text-emerald-300'}`}>
                      Mode Latihan Mandiri
                    </h4>
                    <p className={`text-[11px] leading-relaxed ${isDashboardPracticePreset ? 'text-emerald-200/80' : 'text-slate-400'}`}>
                      Semua alat bantu aktif, AI Tutor siap membimbing, skor IRT & kunci langsung terbuka.
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold mt-2.5 inline-flex items-center gap-1 ${isDashboardPracticePreset ? 'text-emerald-300 font-bold' : 'text-emerald-400'}`}>
                    <span>{isDashboardPracticePreset ? '✓ Preset Sedang Aktif' : 'Terapkan Preset'}</span>
                    {!isDashboardPracticePreset && <ArrowRight className="w-3 h-3" />}
                  </span>
                </button>

                {/* Preset 3: Mode Santai Bebas Cemas */}
                <button
                  id="dash-preset-relaxed"
                  type="button"
                  onClick={() =>
                    handleApplyPreset({
                      showTimer: false,
                      showStudentIdentity: true,
                      showQuestionCounter: true,
                      showSubtestBadge: true,
                      showDifficultyBadge: true,
                      showTopicTag: true,
                      showQuestionGrid: true,
                      showDoubtfulButton: true,
                      showOptionElimination: true,
                      showAiTutorHelper: true,
                      showFontSizeControls: true,
                      showScratchpad: true,
                      showOptionLetters: true,
                      showProctoringAlerts: false,
                      showWatermark: false,
                      forceFullscreen: false,
                      showImmediateScore: true,
                      showAnswerKeyAndExplanation: true,
                      showIrtAnalytics: true,
                    })
                  }
                  className={`p-3.5 rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                    isDashboardRelaxedPreset
                      ? 'bg-amber-950/80 border-2 border-amber-400 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-slate-950 shadow-xl shadow-amber-950/70'
                      : 'bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      {isDashboardRelaxedPreset ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Terpilih & Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Tanpa Timer
                        </span>
                      )}
                      <Clock className={`w-4 h-4 ${isDashboardRelaxedPreset ? 'text-amber-300' : 'text-amber-400'}`} />
                    </div>
                    <h4 className={`text-xs font-bold transition-colors ${isDashboardRelaxedPreset ? 'text-white font-black' : 'text-white group-hover:text-amber-300'}`}>
                      Mode Santai Bebas Cemas
                    </h4>
                    <p className={`text-[11px] leading-relaxed ${isDashboardRelaxedPreset ? 'text-amber-200/80' : 'text-slate-400'}`}>
                      Hitung mundur disembunyikan agar siswa fokus menelaah konsep tanpa rasa tertekan.
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold mt-2.5 inline-flex items-center gap-1 ${isDashboardRelaxedPreset ? 'text-amber-300 font-bold' : 'text-amber-400'}`}>
                    <span>{isDashboardRelaxedPreset ? '✓ Preset Sedang Aktif' : 'Terapkan Preset'}</span>
                    {!isDashboardRelaxedPreset && <ArrowRight className="w-3 h-3" />}
                  </span>
                </button>

                {/* Preset 4: Mode Minimalis & Fokus */}
                <button
                  id="dash-preset-distraction-free"
                  type="button"
                  onClick={() =>
                    handleApplyPreset({
                      showTimer: true,
                      showStudentIdentity: false,
                      showQuestionCounter: true,
                      showSubtestBadge: false,
                      showDifficultyBadge: false,
                      showTopicTag: false,
                      showQuestionGrid: false,
                      showDoubtfulButton: false,
                      showOptionElimination: true,
                      showAiTutorHelper: false,
                      showFontSizeControls: true,
                      showScratchpad: false,
                      showOptionLetters: true,
                      showProctoringAlerts: false,
                      showWatermark: false,
                      forceFullscreen: false,
                      showImmediateScore: true,
                      showAnswerKeyAndExplanation: true,
                      showIrtAnalytics: false,
                    })
                  }
                  className={`p-3.5 rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                    isDashboardDistractionFreePreset
                      ? 'bg-cyan-950/80 border-2 border-cyan-400 ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-slate-950 shadow-xl shadow-cyan-950/70'
                      : 'bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      {isDashboardDistractionFreePreset ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-400 text-slate-950 shadow-sm flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Terpilih & Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Minimalis
                        </span>
                      )}
                      <Maximize2 className={`w-4 h-4 ${isDashboardDistractionFreePreset ? 'text-cyan-300' : 'text-cyan-400'}`} />
                    </div>
                    <h4 className={`text-xs font-bold transition-colors ${isDashboardDistractionFreePreset ? 'text-white font-black' : 'text-white group-hover:text-cyan-300'}`}>
                      Mode Fokus & Bersih
                    </h4>
                    <p className={`text-[11px] leading-relaxed ${isDashboardDistractionFreePreset ? 'text-cyan-200/80' : 'text-slate-400'}`}>
                      Tata letak sederhana tanpa ornamen sekunder untuk konsentrasi membaca stimulus teks.
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold mt-2.5 inline-flex items-center gap-1 ${isDashboardDistractionFreePreset ? 'text-cyan-300 font-bold' : 'text-cyan-400'}`}>
                    <span>{isDashboardDistractionFreePreset ? '✓ Preset Sedang Aktif' : 'Terapkan Preset'}</span>
                    {!isDashboardDistractionFreePreset && <ArrowRight className="w-3 h-3" />}
                  </span>
                </button>
              </div>
            </div>

            {/* 4 Categorized Toggle Blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Category 1: Header & Informasi Soal */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3.5">
                <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800/80 pb-2.5">
                  <Eye className="w-4 h-4" />
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                    1. Header & Informasi Soal Ujian
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {/* showTimer */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Hitung Mundur Waktu (Timer)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Menampilkan sisa waktu pengerjaan di bar atas layar ujian.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showTimer')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showTimer ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showTimer ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showStudentIdentity */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Identitas Siswa (Nama, Kelas, NIS)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Tampilkan badge profil peserta yang sedang aktif di header.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showStudentIdentity')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showStudentIdentity ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showStudentIdentity ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showQuestionCounter */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Indikator Nomor & Total Soal (Soal X dari Y)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Menampilkan posisi butir soal yang sedang dibuka.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showQuestionCounter')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showQuestionCounter ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showQuestionCounter ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showSubtestBadge */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Badge Nama Subtes / Mata Pelajaran</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Label subtes aktif di bagian atas kartu soal (cth: Penalaran Umum / Fisika).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showSubtestBadge')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showSubtestBadge ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showSubtestBadge ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showDifficultyBadge */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Label Tingkat Kesulitan (Mudah/Sedang/HOTS)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Tampilkan indikator kesulitan soal (dapat disembunyikan saat ujian resmi).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showDifficultyBadge')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showDifficultyBadge ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showDifficultyBadge ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showTopicTag */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Tag Bab / Topik Kurikulum</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Menampilkan nama materi atau bab di atas stimulus soal.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showTopicTag')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showTopicTag ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showTopicTag ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category 2: Alat Bantu & Interaktivitas Pengerjaan */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3.5">
                <div className="flex items-center gap-2 text-emerald-400 border-b border-slate-800/80 pb-2.5">
                  <Edit3 className="w-4 h-4" />
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                    2. Alat Bantu & Interaktivitas Siswa
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {/* showQuestionGrid */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Kisi Navigasi Nomor Soal (Question Grid)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Sidebar dan pop-up daftar nomor soal untuk lompat antar nomor cepat.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showQuestionGrid')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showQuestionGrid ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showQuestionGrid ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showDoubtfulButton */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tombol Tandai 'Ragu-Ragu' (Kuning)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Fitur penandaan soal yang belum yakin untuk dicek kembali sebelum kumpul.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showDoubtfulButton')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showDoubtfulButton ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showDoubtfulButton ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showOptionElimination */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Strikethrough className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Fitur Coret / Eliminasi Opsi Salah</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Memungkinkan siswa mencoret pilihan yang dianggap salah untuk mempermudah analisa.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showOptionElimination')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showOptionElimination ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showOptionElimination ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showAiTutorHelper */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Bantuan AI Tutor & Petunjuk Konsep</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Tombol AI Tutor di header ujian untuk memberikan petunjuk bertahap (non-bocoran).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showAiTutorHelper')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showAiTutorHelper ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showAiTutorHelper ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showFontSizeControls */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Type className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pengatur Ukuran Font Teks (A / A+ / A++)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Memudahkan siswa menyesuaikan keterbacaan teks stimulus panjang.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showFontSizeControls')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showFontSizeControls ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showFontSizeControls ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showScratchpad */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Papan Coretan & Catatan Hitung Virtual</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Scratchpad digital untuk corat-coret rumus dan perhitungan singkat saat ujian.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showScratchpad')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showScratchpad ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showScratchpad ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showOptionLetters */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Tag className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Label Huruf Pilihan (A, B, C, D, E)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Tampilkan alfabet di sebelah kiri opsi jawaban ganda.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showOptionLetters')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showOptionLetters ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showOptionLetters ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category 3: Keamanan & Integritas Siswa */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3.5">
                <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800/80 pb-2.5">
                  <ShieldAlert className="w-4 h-4" />
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                    3. Keamanan & Integritas Siswa (Proctoring)
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {/* showProctoringAlerts */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                        <span>Status Pengawas & Deteksi Pindah Tab</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Mencatat pelanggaran saat siswa berpindah jendela browser atau minimize.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showProctoringAlerts')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showProctoringAlerts ? 'bg-rose-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showProctoringAlerts ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showWatermark */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                        <span>Watermark Identitas Anti-Joki / Screenshot</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Cetak watermark transparan Nama + NIS di latar belakang lembar soal.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showWatermark')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showWatermark ? 'bg-rose-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showWatermark ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* forceFullscreen */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Paksa Mode Layar Penuh (Fullscreen Required)</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Otomatis masuk layar penuh saat ujian dimulai untuk mencegah multitasking.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('forceFullscreen')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.forceFullscreen ? 'bg-rose-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.forceFullscreen ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category 4: Pasca Ujian & Transparansi Hasil */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3.5">
                <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-800/80 pb-2.5">
                  <BarChart2 className="w-4 h-4" />
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                    4. Pasca Ujian & Transparansi Hasil Siswa
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {/* showImmediateScore */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Tampilkan Skor IRT Langsung Selesai Ujian</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Jika dimatikan, nilai akan ditahan hingga seluruh sesi ujian dirilis pengawas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showImmediateScore')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showImmediateScore ? 'bg-cyan-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showImmediateScore ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showAnswerKeyAndExplanation */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Kunci Jawaban & Pembahasan Lengkap</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Buka akses review solusi, trik cepat, dan penjelasan konsep tiap nomor.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showAnswerKeyAndExplanation')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showAnswerKeyAndExplanation ? 'bg-cyan-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showAnswerKeyAndExplanation ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* showIrtAnalytics */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Grafik Radar IRT & Rekomendasi Jurusan PTN</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Tampilkan visualisasi kompetensi 7 subtes dan prediksi passing grade kampus.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDisplaySetting('showIrtAnalytics')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentDisplaySettings.showIrtAnalytics ? 'bg-cyan-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          currentDisplaySettings.showIrtAnalytics ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category 5: Mode NIS Siswa & Pencegahan Ujian Bersamaan (Anti-Dual Login) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-indigo-500/40 space-y-3.5 md:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <ShieldCheck className="w-4 h-4" />
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                      5. Pengaturan Mode NIS Siswa & Anti-Ujian Bersamaan (Single-Session Lock)
                    </h3>
                  </div>

                  {onOpenNisSettings && (
                    <button
                      type="button"
                      onClick={onOpenNisSettings}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Buka Panel Roster & Monitor Sesi</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Mode NIS */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Mode Validasi NIS Siswa</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        securitySettings.validationMode === 'registered_only'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {securitySettings.validationMode === 'registered_only' ? 'Strict Roster' : 'Bebas / Terbuka'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {securitySettings.validationMode === 'registered_only'
                        ? 'Hanya NIS yang terdaftar dalam daftar roster yang diizinkan memulai ujian CBT.'
                        : 'Siswa dapat mengetikkan sembarang nomor NIS baru saat pengerjaan.'}
                    </p>
                    {onUpdateSecuritySettings && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSecuritySettings({
                              ...securitySettings,
                              validationMode:
                                securitySettings.validationMode === 'registered_only' ? 'open' : 'registered_only',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                        >
                          Ganti ke Mode {securitySettings.validationMode === 'registered_only' ? 'Terbuka' : 'Hanya NIS Terdaftar'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Anti-Dual Login Lock */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                        <span>Kunci 1 Sesi Aktif per NIS (Anti-Dual Login)</span>
                      </span>
                      {onUpdateSecuritySettings && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSecuritySettings({
                              ...securitySettings,
                              enforceSingleSession: !securitySettings.enforceSingleSession,
                            })
                          }
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            securitySettings.enforceSingleSession ? 'bg-indigo-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                              securitySettings.enforceSingleSession ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Mencegah dua browser/laptop berbeda mengerjakan ujian bersamaan menggunakan nomor NIS yang sama.
                    </p>
                  </div>

                  {/* Supervisor PIN Toggle & Status */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        {securitySettings.enableSupervisorPin !== false ? (
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>Proteksi PIN Guru / Pengawas</span>
                      </span>
                      {onUpdateSecuritySettings && (
                        <button
                          type="button"
                          id="dashboard-toggle-pin-guru"
                          onClick={() =>
                            onUpdateSecuritySettings({
                              ...securitySettings,
                              enableSupervisorPin: securitySettings.enableSupervisorPin === false ? true : false,
                            })
                          }
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            securitySettings.enableSupervisorPin !== false ? 'bg-amber-600' : 'bg-slate-700'
                          }`}
                          title={securitySettings.enableSupervisorPin !== false ? 'Klik untuk nonaktifkan PIN' : 'Klik untuk aktifkan PIN'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                              securitySettings.enableSupervisorPin !== false ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {securitySettings.enableSupervisorPin !== false
                        ? 'Memerlukan PIN 4 digit untuk membuka menu admin, beralih peran, dan mereset sesi.'
                        : 'PIN dinonaktifkan. Akses menu pengawas dan reset sesi dapat dibuka langsung tanpa PIN.'}
                    </p>
                    <div className="text-[10px] flex items-center justify-between font-mono pt-0.5">
                      <div className="flex items-center gap-1 text-slate-400">
                        <span>Status PIN: </span>
                        {securitySettings.enableSupervisorPin !== false ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 font-bold border border-amber-800/60">
                            Aktif ({securitySettings.supervisorPin || '1234'})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/60">
                            Dinonaktifkan (Bebas Akses)
                          </span>
                        )}
                      </div>
                      {onOpenNisSettings && (
                        <button
                          type="button"
                          onClick={onOpenNisSettings}
                          className="text-indigo-400 hover:text-indigo-300 text-[10px] font-sans underline cursor-pointer"
                        >
                          Ubah Pengaturan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Interactive Simulator Preview (Mini Layar Ujian Siswa) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-purple-400">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Simulasi Pratinjau Layar Siswa (Live CBT Preview)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    ↕️ Bisa Di-scroll
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersimpan Otomatis</span>
                  </span>
                </div>
              </div>

              {/* Simulated Exam Header & Card (Scrollable Mockup) */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 sm:p-4 space-y-3 relative max-h-[420px] overflow-y-auto custom-scrollbar select-none">
                {/* Simulated Watermark */}
                {currentDisplaySettings.showWatermark && (
                  <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-10 rotate-[-15deg] select-none">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-indigo-400 uppercase tracking-widest text-center">
                      CBT SISWA • NIS: 20261104 • PROTECTED
                    </span>
                  </div>
                )}

                {/* Simulated Header Bar */}
                <div className="relative z-10 flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    {currentDisplaySettings.showQuestionCounter && (
                      <span className="font-bold text-white bg-indigo-600/30 px-2 py-0.5 rounded text-[11px] border border-indigo-500/30">
                        Soal 1 / 30
                      </span>
                    )}
                    {currentDisplaySettings.showStudentIdentity && (
                      <span className="hidden sm:inline-flex text-slate-300 font-medium text-[11px]">
                        Ahmad Pratama (XII MIPA 1)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {currentDisplaySettings.showAiTutorHelper && (
                      <span className="px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                        ✨ AI Tutor
                      </span>
                    )}
                    {currentDisplaySettings.showScratchpad && (
                      <span className="px-2 py-0.5 rounded bg-cyan-600/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                        📝 Coretan
                      </span>
                    )}
                    {currentDisplaySettings.showFontSizeControls && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        A A+ A++
                      </span>
                    )}
                    {currentDisplaySettings.showTimer ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-mono font-bold text-[11px] border border-slate-700">
                        ⏱️ 44:59
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 text-[10px] italic">
                        (Timer Disembunyikan)
                      </span>
                    )}
                  </div>
                </div>

                {/* Simulated Question Card */}
                <div className="relative z-10 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentDisplaySettings.showSubtestBadge && (
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                        Penalaran Matematika SMA
                      </span>
                    )}
                    {currentDisplaySettings.showTopicTag && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Bab: Aljabar & Fungsi
                      </span>
                    )}
                    {currentDisplaySettings.showDifficultyBadge && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                        HOTS
                      </span>
                    )}
                  </div>

                  <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                    Diberikan suatu fungsi <code className="px-1 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono">f(x) = 2x + 3</code>. Jika nilai komposisi <code className="px-1 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono">(f ∘ f)(a) = 17</code>, berapakah nilai <code className="text-amber-300 font-mono">a</code>?
                  </p>

                  <div className="space-y-1.5 pt-1">
                    {['2', '4', '5'].map((opt, i) => {
                      const letter = ['A', 'B', 'C'][i];
                      return (
                        <div
                          key={letter}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {currentDisplaySettings.showOptionLetters && (
                              <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-300">
                                {letter}
                              </span>
                            )}
                            <span className="text-slate-200">{opt}</span>
                          </div>
                          {currentDisplaySettings.showOptionElimination && (
                            <span className="text-[10px] text-slate-500 hover:text-rose-400 px-1.5 py-0.5 rounded bg-slate-800/50 cursor-pointer">
                              Coret
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Scratchpad Mockup if active */}
                  {currentDisplaySettings.showScratchpad && (
                    <div className="p-2 rounded-lg bg-slate-900 border border-blue-500/30 text-[11px] text-blue-200 space-y-1">
                      <span className="font-bold flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Papan Coretan Siswa
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono">
                        f(f(a)) = 2(2a+3)+3 = 4a+9 = 17 ➔ 4a=8 ➔ a=2
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                    {currentDisplaySettings.showDoubtfulButton ? (
                      <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-semibold flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        <span>Ragu-Ragu</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Tanpa Tombol Ragu-Ragu</span>
                    )}

                    {currentDisplaySettings.showQuestionGrid && (
                      <span className="px-2 py-1 rounded bg-indigo-600/30 text-indigo-300 font-semibold">
                        Kisi Soal (30) ▾
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Success Toast Banner */}
      {deleteToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-950/90 text-rose-200 border border-rose-500/40 shadow-xl shadow-rose-950/50 animate-in slide-in-from-top-4 duration-200 text-xs sm:text-sm font-medium">
          <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{deleteToast}</span>
        </div>
      )}

      {/* Share Exam Link & Preview Modal */}
      <ShareExamModal
        isOpen={sharingPackage !== null}
        onClose={() => setSharingPackage(null)}
        pkg={sharingPackage}
        onOpenStudentGate={onSelectPackage}
      />

      {/* Delete Exam Package Confirmation Dialog Modal */}
      {deletingPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30 shrink-0">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Hapus Paket Soal Ujian</h3>
                <p className="text-xs text-rose-300 font-medium">Konfirmasi Penghapusan Paket</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5 text-[11px] uppercase tracking-wider font-semibold">Judul Paket Ujian:</span>
                <strong className="text-white text-sm font-bold block">{deletingPackage.title}</strong>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-slate-400 pt-2 border-t border-slate-800/80">
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  {deletingPackage.subject || 'Paket UTBK'}
                </span>
                <span>•</span>
                <span>{deletingPackage.questions?.length || deletingPackage.totalQuestions} Butir Soal</span>
                <span>•</span>
                <span>{deletingPackage.durationMinutes} Menit</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus paket soal ini? Paket ujian ini akan dihapus dari daftar katalog simulasi dan CBT.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                id="btn-cancel-delete-package-dashboard"
                onClick={() => setDeletingPackage(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-delete-package-dashboard"
                onClick={() => {
                  const title = deletingPackage.title;
                  if (onDeletePackage) {
                    onDeletePackage(deletingPackage.id);
                  }
                  setDeletingPackage(null);
                  setDeleteToast(`Paket soal "${title}" berhasil dihapus.`);
                  setTimeout(() => setDeleteToast(null), 3500);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg shadow-rose-950/50 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Paket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Packages Modal */}
      {onResetPackages && (
        <ResetPackagesModal
          isOpen={isResetPackagesModalOpen}
          onClose={() => setIsResetPackagesModalOpen(false)}
          onResetPackages={(mode) => {
            onResetPackages(mode);
            setIsResetPackagesModalOpen(false);
            let toastMsg = 'Paket ujian berhasil di-reset ke paket standar resmi SMA.';
            if (mode === 'clear_custom_only') toastMsg = 'Paket kustom berhasil dibersihkan.';
            if (mode === 'clear_all') toastMsg = 'Seluruh paket ujian berhasil dikosongkan.';
            setDeleteToast(toastMsg);
            setTimeout(() => setDeleteToast(null), 3500);
          }}
          totalPackagesCount={smaPackages.length}
          customPackagesCount={customPackagesCount}
        />
      )}

      {/* Reset Exam History Modal */}
      {onResetHistory && (
        <ResetExamHistoryModal
          isOpen={isResetHistoryModalOpen}
          onClose={() => setIsResetHistoryModalOpen(false)}
          examHistory={examHistory}
          onResetHistory={(mode, pkgId) => {
            onResetHistory(mode, pkgId);
            setIsResetHistoryModalOpen(false);
            let toastMsg = 'Seluruh riwayat ujian siswa berhasil dikosongkan.';
            if (mode === 'clear_by_package') toastMsg = 'Riwayat ujian untuk paket terpilih berhasil dihapus.';
            if (mode === 'restore_demo') toastMsg = 'Data contoh simulasi riwayat ujian berhasil dipulihkan.';
            setDeleteToast(toastMsg);
            setTimeout(() => setDeleteToast(null), 3500);
          }}
        />
      )}
    </div>
  );
};
