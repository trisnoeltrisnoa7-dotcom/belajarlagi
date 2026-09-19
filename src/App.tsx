import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { StudentExamGateView } from './components/StudentExamGateView';
import { CbtExamView } from './components/CbtExamView';
import { ResultAnalysisView } from './components/ResultAnalysisView';
import { ReviewSolutionsView } from './components/ReviewSolutionsView';
import { TargetPtnModal } from './components/TargetPtnModal';
import { CustomDrillModal } from './components/CustomDrillModal';
import { SmaExamHubView } from './components/SmaExamHubView';
import { QuestionBankInputView } from './components/QuestionBankInputView';
import { GoogleDriveExamSyncView } from './components/GoogleDriveExamSyncView';
import { NisManagementModal } from './components/NisManagementModal';
import { StudentExamNotificationModal } from './components/StudentExamNotificationModal';
import { LockedStatusManagementView } from './components/LockedStatusManagementView';
import { ExamFinishedExitView } from './components/ExamFinishedExitView';
import { ExamScheduleListView, generateSubjectExamToken } from './components/ExamScheduleListView';
import { ExamScheduleManagementView } from './components/ExamScheduleManagementView';
import { SupervisorPinModal } from './components/SupervisorPinModal';
import { EditSchoolKopModal } from './components/EditSchoolKopModal';
import { OfflinePracticeModal } from './components/OfflinePracticeModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { AppLayoutEditorView } from './components/AppLayoutEditorView';
import { DashboardBottomMenu } from './components/DashboardBottomMenu';
import { ResetPackagesModal } from './components/ResetPackagesModal';
import { ResetExamHistoryModal } from './components/ResetExamHistoryModal';
import { CentralSubjectClassModal } from './components/CentralSubjectClassModal';
import {
  isGlobalLockingDisabled,
  setGlobalLockingDisabled,
  unlockAllEverything,
  unlockAllFinishedExamRecords,
} from './utils/sessionManager';
import {
  isGlobalTimeBypassActive,
  setGlobalTimeBypassActive,
} from './utils/examScheduleTimer';
import { setGlobalTokenRequired } from './utils/tokenSecurity';
import { loadNavigationState, saveNavigationState } from './utils/navigationState';
import {
  cacheAllExamPackagesLocally,
  queueOfflineExamResult,
  getCachedExamPackages,
  isNetworkOnline,
  clearOfflineExamResultsQueue,
} from './utils/offlineStorage';
import {
  loadAppLayoutSettings,
  saveAppLayoutSettings,
  applyAppLayoutCustomizationsToDom,
} from './utils/appLayoutHelper';
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  X,
  HelpCircle,
  School,
  Users,
  Settings,
  ChevronUp,
  GitBranch,
  RotateCcw,
  Trash2,
  Layers,
} from 'lucide-react';
import {
  ExamPackage,
  ExamResult,
  ExamViewMode,
  PtnTarget,
  UserAnswerRecord,
  Question,
  StudentProfile,
  ProctoringSummary,
  ExamDisplaySettings,
  DEFAULT_EXAM_DISPLAY_SETTINGS,
  StudentRosterEntry,
  NisSecuritySettings,
  DEFAULT_NIS_SECURITY_SETTINGS,
  MAX_ROSTER_STUDENTS,
  SchoolInfo,
  DEFAULT_SCHOOL_INFO,
  AppLayoutSettings,
} from './types';
import { EXAM_PACKAGES } from './data/mockPackages';
import { ALL_MOCK_QUESTIONS } from './data/mockQuestions';
import { INITIAL_SMA_EXAM_PACKAGES, INITIAL_SMA_QUESTIONS } from './data/mockSmaData';
import { INITIAL_STUDENT_ROSTER } from './data/mockStudentRoster';
import { INITIAL_MOCK_EXAM_HISTORY } from './data/mockStudentHistory';
import { POPULAR_PTN_TARGETS } from './data/mockPtn';
import { evaluateExamSubmission } from './utils/scoringEngine';
import { terminateActiveExamSession } from './utils/sessionManager';
import {
  batchSyncRosterToFirebase,
  deleteMultipleStudentsFromFirebase,
  subscribeToStudentRoster,
  saveExamSubmissionToFirebase,
  saveSystemSettingToFirebase,
  loadSystemSettingFromFirebase,
  subscribeToSystemSetting,
  testConnection,
  clearAllExamSubmissionsFromFirebase,
  deleteExamSubmissionsByPackageFromFirebase,
} from './firebase';

const STORAGE_KEYS = {
  HISTORY: 'utbk_cbt_exam_history',
  TARGETS: 'utbk_cbt_ptn_targets',
  SMA_PACKAGES: 'cbt_sma_packages_list',
  ALL_QUESTIONS: 'cbt_all_questions_bank',
  DISPLAY_SETTINGS: 'cbt_exam_display_settings',
  STUDENT_ROSTER: 'cbt_student_roster_data',
  NIS_SETTINGS: 'cbt_nis_security_settings',
  SCHOOL_INFO: 'cbt_school_info_config',
  ALL_LINKS_DISABLED: 'cbt_all_exam_links_disabled',
  GLOBAL_LOCKING_DISABLED: 'cbt_global_locking_disabled',
  ACTIVE_PACKAGE_ID: 'cbt_active_selected_package_id',
  ACTIVE_VIEW_MODE: 'cbt_active_selected_view_mode',
  ACTIVE_SCHEDULE_ROLE: 'cbt_active_schedule_role',
  LOGO_TAP_COUNT: 'cbt_logo_tap_count_v1',
};

const loadInitialSmaPackages = (): ExamPackage[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SMA_PACKAGES);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return INITIAL_SMA_EXAM_PACKAGES;
};

const getInitialAppState = (packages: ExamPackage[]): {
  view: ExamViewMode;
  activePkg: ExamPackage;
  role: 'admin' | 'student';
} => {
  let initialView: ExamViewMode = 'dashboard';
  let initialRole: 'admin' | 'student' = 'admin';
  let initialPkg = packages[0] || EXAM_PACKAGES[0];

  try {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const examId = urlParams.get('exam') || urlParams.get('pkg') || urlParams.get('id');
      const viewParam = urlParams.get('view');
      const isSchedule =
        urlParams.get('schedule') ||
        urlParams.get('jadwal') ||
        urlParams.get('daftar') ||
        urlParams.get('daftar_ujian') ||
        viewParam === 'schedule' ||
        viewParam === 'jadwal' ||
        viewParam === 'daftar_ujian' ||
        viewParam === 'exam_schedule_list' ||
        viewParam === 'exam_schedule_management';

      const roleParam = (urlParams.get('role') || urlParams.get('akses') || '').toLowerCase();
      const modeParam = (urlParams.get('mode') || urlParams.get('exam_mode') || '').toLowerCase();
      const freeParam = (urlParams.get('free') || urlParams.get('bebas') || urlParams.get('bypass') || '').toLowerCase();

      // Sinkronisasi Mode Ujian dari URL Parameter ke seluruh memori browser (Safari, Chrome, dll)
      const isFreeModeRequested = modeParam === 'bebas' || modeParam === 'free' || freeParam === '1' || freeParam === 'true';
      const isNormalModeRequested = modeParam === 'normal' || freeParam === '0' || freeParam === 'false';

      if (isFreeModeRequested) {
        setGlobalTimeBypassActive(true);
        setGlobalLockingDisabled(true);
        setGlobalTokenRequired(false, false);
      } else if (isNormalModeRequested) {
        setGlobalTimeBypassActive(false);
        setGlobalLockingDisabled(false);
        setGlobalTokenRequired(true, false);
      }

      if (roleParam === 'student' || roleParam === 'siswa' || modeParam === 'student' || modeParam === 'siswa') {
        initialRole = 'student';
      } else if (roleParam === 'admin' || roleParam === 'guru' || roleParam === 'pengawas' || modeParam === 'admin' || modeParam === 'guru' || modeParam === 'pengawas') {
        initialRole = 'admin';
      } else if (isSchedule) {
        // Tautan daftar ujian yang dibagikan secara default membuka Mode Ujian Siswa (bersih & aman)
        initialRole = 'student';
      }

      // 1. Direct Exam Package link has highest priority (?exam=pkg-id or ?pkg=pkg-id)
      if (examId) {
        const cleanExamId = decodeURIComponent(examId).trim().toLowerCase();
        const found = packages.find(
          p =>
            p.id.toLowerCase() === cleanExamId ||
            p.title.trim().toLowerCase() === cleanExamId ||
            (p.subject && p.subject.trim().toLowerCase() === cleanExamId) ||
            p.id.toLowerCase().includes(cleanExamId)
        );
        if (found) {
          initialPkg = found;
          initialView = 'student_gate';
          return { view: initialView, activePkg: initialPkg, role: initialRole };
        } else if (packages.length > 0) {
          initialPkg = packages[0];
          initialView = 'student_gate';
          return { view: initialView, activePkg: initialPkg, role: initialRole };
        }
      }

      // 2. Schedule list link: Membuka jadwal dalam Mode Ujian Siswa (atau Admin bila diminta)
      if (isSchedule) {
        initialView = 'exam_schedule_management';
        return { view: initialView, activePkg: initialPkg, role: initialRole };
      }

      // 3. Other explicit viewParam
      if (
        viewParam &&
        [
          'dashboard',
          'sma_hub',
          'question_bank_input',
          'google_drive_hub',
          'locked_status',
          'exam_schedule_management',
          'exam_schedule_list',
          'student_gate',
        ].includes(viewParam)
      ) {
        initialView = viewParam === 'exam_schedule_list' ? 'exam_schedule_management' : (viewParam as ExamViewMode);
        return { view: initialView, activePkg: initialPkg, role: initialRole };
      }

      // 4. Session / Local storage fallback on browser refresh
      const navigationState = loadNavigationState();
      const savedPkgId =
        navigationState?.activePackageId ||
        sessionStorage.getItem(STORAGE_KEYS.ACTIVE_PACKAGE_ID) ||
        localStorage.getItem(STORAGE_KEYS.ACTIVE_PACKAGE_ID);
      const savedView =
        navigationState?.view ||
        (sessionStorage.getItem(STORAGE_KEYS.ACTIVE_VIEW_MODE) ||
          localStorage.getItem(STORAGE_KEYS.ACTIVE_VIEW_MODE)) as ExamViewMode;
      const savedRole =
        navigationState?.scheduleRole ||
        (sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SCHEDULE_ROLE) as 'admin' | 'student');

      if (savedRole && !isSchedule) initialRole = savedRole;

      if (savedPkgId) {
        const found = packages.find(p => p.id.toLowerCase() === savedPkgId.toLowerCase());
        if (found) {
          initialPkg = found;
          // If the user was in student_gate or exam_cbt, restore the selected package gate!
          if (savedView === 'student_gate' || savedView === 'exam_cbt') {
            initialView = 'student_gate';
            return { view: initialView, activePkg: initialPkg, role: initialRole };
          }
        }
      }

      if (savedView && [
        'dashboard','exam_schedule_list','exam_schedule_management','sma_hub',
        'question_bank_input','google_drive_hub','google_calendar_hub','student_gate',
        'exam_cbt','result_analysis','review_solutions','custom_drill','locked_status',
        'exam_exit','app_layout_editor'
      ].includes(savedView)) {
        initialView = savedView === 'exam_schedule_list' ? 'exam_schedule_management' : savedView;
        // CBT state is intentionally restored to the gate unless the app already has
        // a resumable in-memory session; this preserves the existing safe behavior.
        if (initialView === 'exam_cbt') initialView = 'student_gate';
        return { view: initialView, activePkg: initialPkg, role: initialRole };
      }
    }
  } catch (e) {}

  return { view: initialView, activePkg: initialPkg, role: initialRole };
};

export default function App() {
  // SMA Packages state with persistence
  const [smaPackages, setSmaPackages] = useState<ExamPackage[]>(loadInitialSmaPackages);

  // Initialize view and active package from URL and storage
  const [currentView, setCurrentView] = useState<ExamViewMode>(() => {
    const state = getInitialAppState([...EXAM_PACKAGES, ...loadInitialSmaPackages()]);
    return state.view;
  });

  const [activePackage, setActivePackage] = useState<ExamPackage>(() => {
    const state = getInitialAppState([...EXAM_PACKAGES, ...loadInitialSmaPackages()]);
    return state.activePkg;
  });

  const [scheduleRole, setScheduleRole] = useState<'admin' | 'student'>(() => {
    const state = getInitialAppState([...EXAM_PACKAGES, ...loadInitialSmaPackages()]);
    return state.role;
  });

  // App Layout Customization Settings (Flowchart & Root Node Editor)
  const [appLayoutSettings, setAppLayoutSettings] = useState<AppLayoutSettings>(() => loadAppLayoutSettings());

  useEffect(() => {
    applyAppLayoutCustomizationsToDom(appLayoutSettings);
  }, [appLayoutSettings]);

  const handleSaveLayoutSettings = (newSettings: AppLayoutSettings) => {
    setAppLayoutSettings(newSettings);
    saveAppLayoutSettings(newSettings);
    applyAppLayoutCustomizationsToDom(newSettings);
  };

  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);
  const [currentStudentProfile, setCurrentStudentProfile] = useState<StudentProfile | null>(null);

  // Collapsible dashboard sections state (default collapsed / terlipat as requested)
  const [dashboardSectionDCollapsed, setDashboardSectionDCollapsed] = useState<boolean>(true);
  const [dashboardSectionECollapsed, setDashboardSectionECollapsed] = useState<boolean>(true);

  // Targets state with persistence
  const [selectedTargets, setSelectedTargets] = useState<PtnTarget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TARGETS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [POPULAR_PTN_TARGETS[0], POPULAR_PTN_TARGETS[1]];
  });

  // History state with persistence (initialized with realistic mock student submissions if empty)
  const [examHistory, setExamHistory] = useState<ExamResult[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_MOCK_EXAM_HISTORY;
  });

  // Global All Exam Links Disabled State (Synced via localStorage)
  const [areAllLinksDisabled, setAreAllLinksDisabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ALL_LINKS_DISABLED);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return false;
  });

  // Global Lock System Disabled State (Mode Bebas Tanpa Penguncian)
  const [isGlobalLockingDisabledState, setIsGlobalLockingDisabledState] = useState<boolean>(() => {
    return isGlobalLockingDisabled();
  });

  const handleToggleGlobalLocking = (disabled: boolean) => {
    setIsGlobalLockingDisabledState(disabled);
    setGlobalLockingDisabled(disabled);
    saveSystemSettingToFirebase('global_locking', { disabled });
    // Mode Bebas (disabled === true) -> Token TIDAK WAJIB (false)
    // Mode Normal (disabled === false) -> Token WAJIB (true)
    setGlobalTokenRequired(!disabled, true);
  };

  const handleMasterUnlockAll = (): { activeCount: number; finishedCount: number } => {
    const result = unlockAllEverything();
    return result;
  };

  const handleToggleDisableAllLinks = (disabled: boolean) => {
    setAreAllLinksDisabled(disabled);
    try {
      localStorage.setItem(STORAGE_KEYS.ALL_LINKS_DISABLED, JSON.stringify(disabled));
    } catch (e) {}
    saveSystemSettingToFirebase('all_links_disabled', { disabled });
  };

  const handleRegenerateAllLinks = () => {
    // 1. Regenerate custom schedule items tokens in localStorage
    try {
      const savedSchedules = localStorage.getItem('cbt_custom_exam_schedules_v1');
      if (savedSchedules) {
        const parsed = JSON.parse(savedSchedules);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((item: any) => ({
            ...item,
            token: generateSubjectExamToken(item.subjectName),
          }));
          localStorage.setItem('cbt_custom_exam_schedules_v1', JSON.stringify(updated));
        }
      }
    } catch (e) {}

    // 2. Regenerate SMA Exam Packages tokens
    const updatedSma = smaPackages.map(pkg => ({
      ...pkg,
      token: generateSubjectExamToken(pkg.subject || pkg.title),
    }));
    setSmaPackages(updatedSma);
    try {
      localStorage.setItem(STORAGE_KEYS.SMA_PACKAGES, JSON.stringify(updatedSma));
    } catch (e) {}

    // 3. Update active package token if matches
    if (activePackage) {
      const matched = updatedSma.find(p => p.id === activePackage.id);
      if (matched) {
        setActivePackage(matched);
      } else {
        setActivePackage({
          ...activePackage,
          token: generateSubjectExamToken(activePackage.subject || activePackage.title),
        });
      }
    }
  };

  // Student Exam Completion Notification Modal state
  const [isStudentNotificationModalOpen, setIsStudentNotificationModalOpen] = useState(false);

  // Supervisor PIN & Header / Navigation Unlocking State
  const [isSupervisorUnlocked, setIsSupervisorUnlocked] = useState(false);
  const [isSupervisorPinModalOpen, setIsSupervisorPinModalOpen] = useState(false);
  const [isFloatingGuruMenuOpen, setIsFloatingGuruMenuOpen] = useState(false);
  const floatingGuruMenuRef = useRef<HTMLDivElement | null>(null);

  // Close floating guru popup menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (floatingGuruMenuRef.current && !floatingGuruMenuRef.current.contains(e.target as Node)) {
        setIsFloatingGuruMenuOpen(false);
      }
    };
    if (isFloatingGuruMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFloatingGuruMenuOpen]);

  // Auto-lock supervisor access whenever in student mode
  useEffect(() => {
    if (scheduleRole === 'student') {
      setIsSupervisorUnlocked(false);
      setIsFloatingGuruMenuOpen(false);
    }
  }, [scheduleRole]);

  // Student Exam Display & Feature Visibility Settings state
  const [displaySettings, setDisplaySettings] = useState<ExamDisplaySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DISPLAY_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_EXAM_DISPLAY_SETTINGS;
  });

  const handleUpdateDisplaySettings = (newSettings: ExamDisplaySettings) => {
    setDisplaySettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEYS.DISPLAY_SETTINGS, JSON.stringify(newSettings));
    } catch (e) {}
    // Sync to Firestore Cloud Database
    saveSystemSettingToFirebase('display_settings', newSettings);
  };

  // Student Roster state (Registered NIS list) - Max 400
  const [rosterStudents, setRosterStudents] = useState<StudentRosterEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENT_ROSTER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, MAX_ROSTER_STUDENTS);
      }
    } catch (e) {}
    return INITIAL_STUDENT_ROSTER.slice(0, MAX_ROSTER_STUDENTS);
  });

  const handleUpdateRoster = (students: StudentRosterEntry[]) => {
    const clampedStudents = students.slice(0, MAX_ROSTER_STUDENTS);

    // Identify deleted records to remove from Firestore
    const newIds = new Set(clampedStudents.map(s => s.id));
    const removedIds = rosterStudents.filter(s => !newIds.has(s.id)).map(s => s.id);
    if (removedIds.length > 0) {
      deleteMultipleStudentsFromFirebase(removedIds);
    }

    setRosterStudents(clampedStudents);
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENT_ROSTER, JSON.stringify(clampedStudents));
    } catch (e) {}
    // Sync to Firestore Cloud Database
    batchSyncRosterToFirebase(clampedStudents);
  };

  // NIS Security Settings (Validation Mode & Anti-Dual Login Lock)
  const [securitySettings, setSecuritySettings] = useState<NisSecuritySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NIS_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_NIS_SECURITY_SETTINGS,
          ...parsed,
        };
      }
    } catch (e) {}
    return DEFAULT_NIS_SECURITY_SETTINGS;
  });

  const handleUpdateSecuritySettings = (settings: NisSecuritySettings) => {
    setSecuritySettings(settings);
    try {
      localStorage.setItem(STORAGE_KEYS.NIS_SETTINGS, JSON.stringify(settings));
    } catch (e) {}
    // Sync to Firestore Cloud Database
    saveSystemSettingToFirebase('nis_security', settings);
  };

  // NIS Management Modal state
  const [isNisManagementModalOpen, setIsNisManagementModalOpen] = useState(false);

  // Central Subject & Class Master Modal state (tersinkronkan ke seluruh aplikasi)
  const [isCentralSubjectClassModalOpen, setIsCentralSubjectClassModalOpen] = useState(false);
  const [centralSubjectClassInitialTab, setCentralSubjectClassInitialTab] = useState<'subjects' | 'classes' | 'sync'>('subjects');

  const handleOpenCentralSubjectClass = (tab: 'subjects' | 'classes' | 'sync' = 'subjects') => {
    setCentralSubjectClassInitialTab(tab);
    setIsCentralSubjectClassModalOpen(true);
  };

  // School Info / Kop Surat state with persistence
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHOOL_INFO);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.schoolName === 'SMA NEGERI 1 UNGGULAN NUSANTARA' || !parsed.schoolLogo) {
          return {
            ...DEFAULT_SCHOOL_INFO,
            ...parsed,
            schoolName: DEFAULT_SCHOOL_INFO.schoolName,
            schoolAddress: DEFAULT_SCHOOL_INFO.schoolAddress,
            schoolLogo: DEFAULT_SCHOOL_INFO.schoolLogo,
          };
        }
        return parsed;
      }
    } catch (e) {}
    return DEFAULT_SCHOOL_INFO;
  });

  const handleUpdateSchoolInfo = (newInfo: SchoolInfo) => {
    setSchoolInfo(newInfo);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHOOL_INFO, JSON.stringify(newInfo));
    } catch (e) {}
    // Sync to Firestore Cloud Database
    saveSystemSettingToFirebase('school_profile', newInfo);
  };

  const [isEditSchoolKopModalOpen, setIsEditSchoolKopModalOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);
  const [isResetPackagesModalOpen, setIsResetPackagesModalOpen] = useState(false);
  const [isResetHistoryModalOpen, setIsResetHistoryModalOpen] = useState(false);

  // Question bank state with persistence
  const [questionsBank, setQuestionsBank] = useState<Question[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ALL_QUESTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [...ALL_MOCK_QUESTIONS, ...INITIAL_SMA_QUESTIONS];
  });

  // 1. Sync URL search params and Session Storage whenever view or active package changes
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      // Persist active state in session & localStorage
      if (activePackage?.id) {
        sessionStorage.setItem(STORAGE_KEYS.ACTIVE_PACKAGE_ID, activePackage.id);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PACKAGE_ID, activePackage.id);
      }
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW_MODE, currentView);
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_SCHEDULE_ROLE, scheduleRole);
      saveNavigationState({
        view: currentView,
        activePackageId: activePackage?.id,
        scheduleRole,
      });

      // Keep browser address bar in sync
      const url = new URL(window.location.href);
      if (currentView === 'student_gate') {
        url.searchParams.delete('view');
        url.searchParams.set('exam', activePackage.id);
      } else if (currentView === 'exam_cbt') {
        url.searchParams.set('view', 'exam_cbt');
        url.searchParams.set('exam', activePackage.id);
      } else if (currentView === 'exam_schedule_list' || currentView === 'exam_schedule_management') {
        url.searchParams.delete('exam');
        url.searchParams.delete('pkg');
        url.searchParams.set('view', 'schedule');
        url.searchParams.set('role', scheduleRole);
      } else if (currentView === 'sma_hub') {
        url.searchParams.delete('exam');
        url.searchParams.set('view', 'sma_hub');
      } else if (currentView === 'question_bank_input') {
        url.searchParams.delete('exam');
        url.searchParams.set('view', 'question_bank_input');
      } else if (currentView === 'google_drive_hub') {
        url.searchParams.delete('exam');
        url.searchParams.set('view', 'google_drive_hub');
      } else if (currentView === 'locked_status') {
        url.searchParams.delete('exam');
        url.searchParams.set('view', 'locked_status');
      } else if (currentView === 'dashboard') {
        url.searchParams.delete('exam');
        url.searchParams.delete('pkg');
        url.searchParams.delete('view');
        url.searchParams.delete('role');
        url.searchParams.delete('schedule');
        url.searchParams.delete('jadwal');
      }

      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  }, [currentView, activePackage, scheduleRole]);

  // 2. Inbound URL link listener & realtime sync with latest packages
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Direct Exam Package link
        const examId = urlParams.get('exam') || urlParams.get('pkg') || urlParams.get('id');
        if (examId) {
          const allKnown = [...EXAM_PACKAGES, ...smaPackages];
          const matched = allKnown.find(p => p.id.toLowerCase() === examId.toLowerCase());
          if (matched) {
            setActivePackage(matched);
            if (currentView === 'dashboard') {
              setCurrentView('student_gate');
            }
          }
        }
      }
    } catch (e) {}
  }, [smaPackages]);

  // Modals state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isAiDrillModalOpen, setIsAiDrillModalOpen] = useState(false);

  // Firestore initial sync & realtime listeners
  useEffect(() => {
    // 1. Check connection & auto-cache all packages for offline CBT practice
    testConnection();
    try {
      cacheAllExamPackagesLocally([...EXAM_PACKAGES, ...smaPackages]);
    } catch (e) {}

    // 2. Subscribe to remote Student Roster changes
    const unsubscribeRoster = subscribeToStudentRoster(remoteStudents => {
      if (Array.isArray(remoteStudents) && remoteStudents.length > 0) {
        setRosterStudents(remoteStudents.slice(0, MAX_ROSTER_STUDENTS));
        try {
          localStorage.setItem(STORAGE_KEYS.STUDENT_ROSTER, JSON.stringify(remoteStudents.slice(0, MAX_ROSTER_STUDENTS)));
        } catch (e) {}
      }
    });

    // 2b. Subscribe to remote SMA Exam Packages changes from Firebase
    const unsubscribePackages = subscribeToSystemSetting<ExamPackage[]>('sma_packages', (cloudPackages) => {
      if (Array.isArray(cloudPackages)) {
        setSmaPackages(cloudPackages);
        try {
          localStorage.setItem(STORAGE_KEYS.SMA_PACKAGES, JSON.stringify(cloudPackages));
        } catch (e) {}
      }
    });

    // 3. Load cloud settings if present
    loadSystemSettingFromFirebase<SchoolInfo>('school_profile').then(remoteSchool => {
      if (remoteSchool && remoteSchool.schoolName) {
        setSchoolInfo(remoteSchool);
      }
    });

    const unsubscribeNisSecurity = subscribeToSystemSetting<NisSecuritySettings>('nis_security', (remoteSec) => {
      if (remoteSec && remoteSec.validationMode) {
        setSecuritySettings(remoteSec);
        try {
          localStorage.setItem(STORAGE_KEYS.NIS_SETTINGS, JSON.stringify(remoteSec));
        } catch (e) {}
      }
    });

    loadSystemSettingFromFirebase<ExamDisplaySettings>('display_settings').then(remoteDisp => {
      if (remoteDisp) {
        setDisplaySettings(remoteDisp);
      }
    });

    const unsubLinkState = subscribeToSystemSetting<{ disabled: boolean }>('all_links_disabled', remoteLinkState => {
      if (remoteLinkState && typeof remoteLinkState.disabled === 'boolean') {
        setAreAllLinksDisabled(remoteLinkState.disabled);
      }
    });

    const unsubGlobalLock = subscribeToSystemSetting<{ disabled: boolean }>('global_locking', remoteLockState => {
      if (remoteLockState && typeof remoteLockState.disabled === 'boolean') {
        setIsGlobalLockingDisabledState(remoteLockState.disabled);
        setGlobalLockingDisabled(remoteLockState.disabled);
      }
    });

    const unsubTimeBypass = subscribeToSystemSetting<{ active: boolean }>('time_bypass', remoteBypass => {
      if (remoteBypass && typeof remoteBypass.active === 'boolean') {
        setGlobalTimeBypassActive(remoteBypass.active);
        // Mode Bebas aktif: Matikan token requirement
        // Mode Normal aktif: Aktifkan token requirement
        if (remoteBypass.active) {
          setIsGlobalLockingDisabledState(true);
          setGlobalLockingDisabled(true);
          setGlobalTokenRequired(false, false);
        } else {
          setGlobalTokenRequired(true, false);
        }
      }
    });

    const unsubTokenReq = subscribeToSystemSetting<{ isTokenRequired: boolean }>('token_requirement_active', tokenSetting => {
      if (tokenSetting && typeof tokenSetting.isTokenRequired === 'boolean') {
        setGlobalTokenRequired(tokenSetting.isTokenRequired, false);
      }
    });

    return () => {
      unsubscribeRoster();
      unsubscribePackages();
      unsubscribeNisSecurity();
      unsubLinkState();
      unsubGlobalLock();
      unsubTimeBypass();
      unsubTokenReq();
    };
  }, []);

  // Persist targets
  const handleSaveTargets = (targets: PtnTarget[]) => {
    setSelectedTargets(targets);
    try {
      localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(targets));
    } catch (e) {}
  };

  // Start selected package -> Go to Student Identity & Registration Gate
  const handleSelectPackage = (pkg: ExamPackage) => {
    setActivePackage(pkg);
    setIsSupervisorUnlocked(false);
    setCurrentView('student_gate');
  };

  // Start exam with verified student profile (Nama, Kelas, NIS)
  const handleStartExamWithProfile = (profile: StudentProfile) => {
    setCurrentStudentProfile(profile);
    setIsSupervisorUnlocked(false);
    setCurrentView('exam_cbt');
  };

  // Save new/updated question
  const handleSaveQuestion = (newQuestion: Question) => {
    setQuestionsBank(prev => {
      const existsIndex = prev.findIndex(q => q.id === newQuestion.id);
      let updated: Question[];
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = newQuestion;
      } else {
        updated = [newQuestion, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.ALL_QUESTIONS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Delete question
  const handleDeleteQuestion = (questionId: string) => {
    setQuestionsBank(prev => {
      const updated = prev.filter(q => q.id !== questionId);
      try {
        localStorage.setItem(STORAGE_KEYS.ALL_QUESTIONS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Create & register new package from Question Bank
  const handleCreatePackage = (newPkg: ExamPackage) => {
    setSmaPackages(prev => {
      const updated = [newPkg, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.SMA_PACKAGES, JSON.stringify(updated));
      } catch (e) {}
      // Sync to Firebase Cloud Database
      saveSystemSettingToFirebase('sma_packages', updated);
      return updated;
    });
  };

  // Delete exam package with cloud sync & schedule cleanup
  const handleDeletePackage = (packageId: string) => {
    setSmaPackages(prev => {
      const updated = prev.filter(p => p.id !== packageId);
      try {
        localStorage.setItem(STORAGE_KEYS.SMA_PACKAGES, JSON.stringify(updated));
      } catch (e) {}
      // Sync to Firebase Cloud Database
      saveSystemSettingToFirebase('sma_packages', updated);
      return updated;
    });

    // Clean up corresponding custom schedule items in localStorage & Firebase
    try {
      const savedSchedules = localStorage.getItem('cbt_custom_exam_schedules_v1');
      if (savedSchedules) {
        const parsed = JSON.parse(savedSchedules);
        if (Array.isArray(parsed)) {
          const updatedSchedules = parsed.filter((s: any) => s.packageId !== packageId);
          localStorage.setItem('cbt_custom_exam_schedules_v1', JSON.stringify(updatedSchedules));
          saveSystemSettingToFirebase('exam_schedules', updatedSchedules);
        }
      }
    } catch (e) {}

    if (activePackage && activePackage.id === packageId) {
      const remaining = smaPackages.filter(p => p.id !== packageId);
      if (remaining.length > 0) {
        setActivePackage(remaining[0]);
      } else if (EXAM_PACKAGES.length > 0) {
        setActivePackage(EXAM_PACKAGES[0]);
      }
    }
  };

  // Reset exam packages (Restore Default 12+ Official SMA Packages / Clear All / Clear Custom Only)
  const handleResetPackages = (mode: 'restore_default' | 'clear_all' | 'clear_custom_only') => {
    let updated: ExamPackage[] = [];
    if (mode === 'restore_default') {
      updated = INITIAL_SMA_EXAM_PACKAGES;
    } else if (mode === 'clear_all') {
      updated = [];
    } else if (mode === 'clear_custom_only') {
      const defaultIds = new Set(INITIAL_SMA_EXAM_PACKAGES.map(p => p.id));
      updated = smaPackages.filter(p => !p.isCustomCreated && defaultIds.has(p.id));
    }

    setSmaPackages(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SMA_PACKAGES, JSON.stringify(updated));
    } catch (e) {}
    // Sync to Firebase Cloud Database
    saveSystemSettingToFirebase('sma_packages', updated);

    if (updated.length > 0) {
      setActivePackage(updated[0]);
    }
  };

  // Reset exam history reports (Clear All / Restore Demo / Clear by Package)
  const handleResetExamHistory = (
    mode: 'clear_all' | 'restore_demo' | 'clear_by_package',
    targetPackageId?: string
  ) => {
    let updatedHistory: ExamResult[] = [];

    if (mode === 'clear_all') {
      updatedHistory = [];
      clearOfflineExamResultsQueue();
      unlockAllEverything();
      clearAllExamSubmissionsFromFirebase().catch(() => {});
    } else if (mode === 'restore_demo') {
      updatedHistory = INITIAL_MOCK_EXAM_HISTORY;
    } else if (mode === 'clear_by_package' && targetPackageId) {
      updatedHistory = examHistory.filter(h => h.packageId !== targetPackageId);
      unlockAllFinishedExamRecords(targetPackageId);
      deleteExamSubmissionsByPackageFromFirebase(targetPackageId).catch(() => {});
    }

    setExamHistory(updatedHistory);
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    } catch (e) {}
  };

  // Complete exam and evaluate automatically
  const handleFinishExam = (
    answers: Record<string, UserAnswerRecord>,
    startedAt: number,
    proctoringSummary?: ProctoringSummary
  ) => {
    const finishedAt = Date.now();
    const evaluation = evaluateExamSubmission(
      activePackage,
      answers,
      startedAt,
      finishedAt,
      selectedTargets,
      proctoringSummary
    );

    if (currentStudentProfile) {
      evaluation.studentProfile = currentStudentProfile;
      if (currentStudentProfile.nis) {
        try {
          localStorage.setItem(
            `cbt_exam_finished_${activePackage.id}_${currentStudentProfile.nis.trim()}`,
            JSON.stringify(evaluation)
          );
        } catch (e) {}
      }
    }

    setCurrentResult(evaluation);
    const updatedHistory = [evaluation, ...examHistory.filter(h => h.id !== evaluation.id)];
    setExamHistory(updatedHistory);
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    } catch (e) {}

    // Save exam submission to Firestore Cloud Database if online, otherwise queue locally
    if (isNetworkOnline()) {
      saveExamSubmissionToFirebase(evaluation);
    } else {
      queueOfflineExamResult(evaluation);
    }

    setCurrentView('result_analysis');
  };

  // View historical result
  const handleViewHistoryResult = (res: ExamResult) => {
    const allKnownPackages = [...EXAM_PACKAGES, ...smaPackages];
    const matchedPkg = allKnownPackages.find(p => p.id === res.packageId) || {
      id: res.packageId,
      title: res.packageTitle,
      badge: 'Riwayat Ujian',
      tagline: 'Sesi Ujian Terdahulu',
      category: 'FULL',
      durationMinutes: Math.round(res.timeLimitSeconds / 60),
      totalQuestions: res.totalQuestions,
      subtests: [],
      questions: [],
    } as any;

    setActivePackage(matchedPkg);
    setCurrentResult(res);
    setCurrentView('result_analysis');
  };

  // Exit application / exam link cleanly (navigates to exam_exit view with thank you message)
  const handleExitExam = () => {
    if (currentStudentProfile?.nis) {
      terminateActiveExamSession(currentStudentProfile.nis);
    }
    setCurrentView('exam_exit');
  };

  // General Application Logout Handler
  const handleAppLogout = () => {
    if (currentStudentProfile?.nis) {
      terminateActiveExamSession(currentStudentProfile.nis);
    }
    setCurrentStudentProfile(null);
    setCurrentResult(null);
    setIsSupervisorUnlocked(false);
    // Reset view to schedule list with student view
    setScheduleRole('student');
    setCurrentView('exam_schedule_list');
  };

  // Pages where Header & Menu are protected / hidden for students by default
  const isExamOrScheduleView =
    currentView === 'exam_schedule_list' ||
    currentView === 'exam_schedule_management' ||
    currentView === 'student_gate' ||
    currentView === 'exam_cbt' ||
    currentView === 'result_analysis' ||
    currentView === 'exam_exit' ||
    currentView === 'review_solutions';

  // CRITICAL: Header is NEVER shown in student mode.
  // In student mode, ONLY School Logo Kop, Link Access Status, and Exam Schedule are visible.
  // Header is ONLY shown in admin mode when on management pages OR if supervisor PIN is verified.
  const shouldShowHeader = scheduleRole !== 'student' && (!isExamOrScheduleView || isSupervisorUnlocked);

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Global Header Bar (Shown when in dashboard or when supervisor PIN is verified) */}
      {shouldShowHeader && (
        <>
          <Header
            currentView={currentView}
            onNavigate={(view) => {
              // If moving to management views, auto keep unlocked
              if (['dashboard', 'sma_hub', 'question_bank_input', 'google_drive_hub', 'locked_status', 'app_layout_editor', 'exam_schedule_management'].includes(view)) {
                setIsSupervisorUnlocked(true);
                setScheduleRole('admin');
              }
              setCurrentView(view);
            }}
            selectedTargets={selectedTargets}
            onOpenTargetModal={() => setIsTargetModalOpen(true)}
            onOpenAiDrillModal={() => setIsAiDrillModalOpen(true)}
            examHistory={examHistory}
            onOpenStudentNotifications={() => setIsStudentNotificationModalOpen(true)}
            onOpenNisSettings={() => setIsNisManagementModalOpen(true)}
            onOpenCentralSubjectClass={() => handleOpenCentralSubjectClass('subjects')}
            rosterStudents={rosterStudents}
            onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
            onOpenHelpModal={() => setIsHelpGuideOpen(true)}
            onOpenLayoutEditor={() => {
              setIsSupervisorUnlocked(true);
              setCurrentView('app_layout_editor');
            }}
            onLogout={handleAppLogout}
            schoolInfo={schoolInfo}
            onOpenEditKop={() => setIsEditSchoolKopModalOpen(true)}
            layoutSettings={appLayoutSettings}
            onUpdateLayoutSettings={handleSaveLayoutSettings}
          />

          {/* Supervisor header without blocking sticky banner on screen */}
          {/* Status and lock controls are cleanly accessible in floating Menu Guru */}
        </>
      )}

      {/* Main App Content Router */}
      <main className={currentView === 'exam_cbt' ? 'h-screen max-h-[100dvh] overflow-hidden flex flex-col' : 'flex-1 w-full max-w-full overflow-x-hidden'}>
        {currentView === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <DashboardView
              selectedTargets={selectedTargets}
              onSelectPackage={handleSelectPackage}
              examHistory={examHistory}
              onOpenTargetModal={() => setIsTargetModalOpen(true)}
              onOpenAiDrillModal={() => setIsAiDrillModalOpen(true)}
              onViewHistoryResult={handleViewHistoryResult}
              onNavigateToSma={() => setCurrentView('sma_hub')}
              onNavigateToQuestionBank={() => setCurrentView('question_bank_input')}
              onNavigateToGoogleDrive={() => setCurrentView('google_drive_hub')}
              onOpenStudentNotifications={() => setIsStudentNotificationModalOpen(true)}
              onDeletePackage={handleDeletePackage}
              onResetPackages={handleResetPackages}
              onResetHistory={handleResetExamHistory}
              smaPackages={smaPackages}
              displaySettings={displaySettings}
              onUpdateDisplaySettings={handleUpdateDisplaySettings}
              rosterStudents={rosterStudents}
              securitySettings={securitySettings}
              onOpenNisSettings={() => setIsNisManagementModalOpen(true)}
              onUpdateSecuritySettings={handleUpdateSecuritySettings}
              onNavigateToLockedStatus={() => setCurrentView('locked_status')}
              onNavigateToScheduleList={() => {
                setScheduleRole('student');
                setCurrentView('exam_schedule_list');
              }}
              onNavigateToScheduleManagement={() => {
                setScheduleRole('admin');
                setIsSupervisorUnlocked(true);
                setCurrentView('exam_schedule_management');
              }}
              isGlobalLockingDisabled={isGlobalLockingDisabledState}
              onToggleGlobalLocking={handleToggleGlobalLocking}
              onMasterUnlockAll={handleMasterUnlockAll}
              onOpenHelpModal={() => setIsHelpGuideOpen(true)}
              onNavigateToLayoutEditor={() => {
                setIsSupervisorUnlocked(true);
                setCurrentView('app_layout_editor');
              }}
              isSupervisorUnlocked={isSupervisorUnlocked}
              onToggleSupervisorUnlocked={(unlocked) => setIsSupervisorUnlocked(unlocked)}
              onOpenSupervisorPinModal={() => setIsSupervisorPinModalOpen(true)}
              onOpenSchoolKopModal={() => setIsEditSchoolKopModalOpen(true)}
              scheduleRole={scheduleRole}
              onRoleChange={(role) => setScheduleRole(role)}
              isSectionDCollapsed={dashboardSectionDCollapsed}
              onToggleSectionDCollapse={(collapsed) => setDashboardSectionDCollapsed(collapsed)}
              isSectionECollapsed={dashboardSectionECollapsed}
              onToggleSectionECollapse={(collapsed) => setDashboardSectionECollapsed(collapsed)}
              onOpenCentralSubjectClass={() => handleOpenCentralSubjectClass('subjects')}
            />

            {scheduleRole !== 'student' && (
              <DashboardBottomMenu
                collapsedSections={{
                  sectionA: false,
                  sectionD: dashboardSectionDCollapsed,
                  sectionE: dashboardSectionECollapsed,
                }}
                onNavigateToSection={(secKey) => {
                  if (secKey === 'sectionD') setDashboardSectionDCollapsed(false);
                  if (secKey === 'sectionE') setDashboardSectionECollapsed(false);
                  const el = document.getElementById(
                    secKey === 'sectionA' ? 'dashboard-section-a' :
                    secKey === 'sectionD' ? 'dashboard-section-d' : 'dashboard-section-e'
                  );
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onExpandAll={() => {
                  setDashboardSectionDCollapsed(false);
                  setDashboardSectionECollapsed(false);
                }}
                onCollapseAll={() => {
                  setDashboardSectionDCollapsed(true);
                  setDashboardSectionECollapsed(true);
                }}
                onNavigateToScheduleList={() => {
                  setScheduleRole('student');
                  setCurrentView('exam_schedule_list');
                }}
                onNavigateToScheduleManagement={() => {
                  setScheduleRole('admin');
                  setIsSupervisorUnlocked(true);
                  setCurrentView('exam_schedule_management');
                }}
                onNavigateToGoogleDrive={() => setCurrentView('google_drive_hub')}
                onNavigateToLockedStatus={() => setCurrentView('locked_status')}
                onOpenNisSettings={() => setIsNisManagementModalOpen(true)}
                onOpenCentralSubjectClass={() => handleOpenCentralSubjectClass('subjects')}
                onOpenHelpModal={() => setIsHelpGuideOpen(true)}
                onNavigateToLayoutEditor={() => {
                  setIsSupervisorUnlocked(true);
                  setCurrentView('app_layout_editor');
                }}
                position={appLayoutSettings.floatingMenuPosition}
              />
            )}
          </div>
        )}

        {(currentView === 'exam_schedule_management' || currentView === 'exam_schedule_list') && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <ExamScheduleManagementView
              availablePackages={[...EXAM_PACKAGES, ...smaPackages]}
              onStartExam={handleSelectPackage}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onNavigateToSmaHub={() => setCurrentView('sma_hub')}
              rosterStudents={rosterStudents}
              securitySettings={securitySettings}
              onUpdateSecuritySettings={handleUpdateSecuritySettings}
              initialRole={scheduleRole}
              onRoleChange={(role) => {
                setScheduleRole(role);
                if (role === 'admin') {
                  setIsSupervisorUnlocked(true);
                } else {
                  setIsSupervisorUnlocked(false);
                  setIsFloatingGuruMenuOpen(false);
                }
              }}
              areAllLinksDisabled={areAllLinksDisabled}
              onToggleDisableAllLinks={handleToggleDisableAllLinks}
              onRegenerateAllLinks={handleRegenerateAllLinks}
              isGlobalLockingDisabled={isGlobalLockingDisabledState}
              onToggleGlobalLocking={handleToggleGlobalLocking}
              onMasterUnlockAll={handleMasterUnlockAll}
              onOpenHelpModal={() => setIsHelpGuideOpen(true)}
            />
          </div>
        )}

        {currentView === 'locked_status' && (
          <LockedStatusManagementView
            rosterStudents={rosterStudents}
            availablePackages={[...EXAM_PACKAGES, ...smaPackages]}
            securitySettings={securitySettings}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onOpenRosterModal={() => setIsNisManagementModalOpen(true)}
            isGlobalLockingDisabled={isGlobalLockingDisabledState}
            onToggleGlobalLocking={handleToggleGlobalLocking}
            onMasterUnlockAll={handleMasterUnlockAll}
            onStartExamForStudent={(pkg, student) => {
              setActivePackage(pkg);
              setCurrentStudentProfile({
                fullName: student.fullName,
                nis: student.nis,
                studentClass: student.studentClass,
                schoolName: student.schoolName,
              });
              setCurrentView('student_gate');
            }}
          />
        )}

        {currentView === 'google_drive_hub' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <GoogleDriveExamSyncView
              examHistory={examHistory}
              rosterStudents={rosterStudents}
              onUpdateRoster={handleUpdateRoster}
              questionsBank={questionsBank}
              onAddQuestion={handleSaveQuestion}
              schoolInfo={schoolInfo}
              onBack={() => setCurrentView('dashboard')}
              onNavigateToDashboard={() => setCurrentView('dashboard')}
              onNavigateToSma={() => setCurrentView('sma_hub')}
              onViewExamResult={handleViewHistoryResult}
            />
          </div>
        )}

        {currentView === 'sma_hub' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <SmaExamHubView
              smaPackages={smaPackages}
              onStartExam={handleSelectPackage}
              onNavigateToDashboard={() => setCurrentView('dashboard')}
              onNavigateToQuestionBank={() => setCurrentView('question_bank_input')}
              onOpenAiDrillModal={() => setIsAiDrillModalOpen(true)}
              onDeletePackage={handleDeletePackage}
              onResetPackages={handleResetPackages}
              onSavePackage={handleCreatePackage}
              onOpenCentralSubjectClass={handleOpenCentralSubjectClass}
            />
          </div>
        )}

        {currentView === 'question_bank_input' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <QuestionBankInputView
              questionsList={questionsBank}
              onAddQuestion={handleSaveQuestion}
              onUpdateQuestion={handleSaveQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onCreateExamPackage={handleCreatePackage}
              onStartExam={handleSelectPackage}
              onNavigateToSmaHub={() => setCurrentView('sma_hub')}
              onNavigateToDashboard={() => setCurrentView('dashboard')}
              onOpenCentralSubjectClass={handleOpenCentralSubjectClass}
            />
          </div>
        )}

        {currentView === 'app_layout_editor' && (
          <AppLayoutEditorView
            onSaveSettings={handleSaveLayoutSettings}
            onNavigateToView={(view) => {
              if (['dashboard', 'sma_hub', 'question_bank_input', 'google_drive_hub', 'locked_status', 'exam_schedule_management'].includes(view)) {
                setIsSupervisorUnlocked(true);
                setScheduleRole('admin');
              }
              setCurrentView(view);
            }}
            onBackToDashboard={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'student_gate' && (
          <StudentExamGateView
            pkg={activePackage}
            onStartExamWithProfile={handleStartExamWithProfile}
            onBackToHub={() => setCurrentView(activePackage.grade ? 'sma_hub' : 'dashboard')}
            onNavigateToScheduleList={() => {
              setScheduleRole('student');
              setCurrentView('exam_schedule_list');
            }}
            onViewResult={(res) => {
              setCurrentResult(res);
              setCurrentView('result_analysis');
            }}
            rosterStudents={rosterStudents}
            securitySettings={securitySettings}
            onOpenNisSettings={() => setIsNisManagementModalOpen(true)}
            schoolInfo={schoolInfo}
            onOpenEditKop={() => setIsEditSchoolKopModalOpen(true)}
            areAllLinksDisabled={areAllLinksDisabled}
            onToggleDisableAllLinks={handleToggleDisableAllLinks}
            onRegenerateAllLinks={handleRegenerateAllLinks}
            isGlobalLockingDisabled={isGlobalLockingDisabledState}
            onToggleGlobalLocking={handleToggleGlobalLocking}
          />
        )}

        {currentView === 'exam_cbt' && (
          <CbtExamView
            pkg={activePackage}
            studentProfile={currentStudentProfile || undefined}
            displaySettings={displaySettings}
            onFinishExam={handleFinishExam}
            onQuitExam={() => {
              setScheduleRole('student');
              setCurrentView('exam_schedule_list');
            }}
            schoolInfo={schoolInfo}
          />
        )}

        {currentView === 'result_analysis' && currentResult && (
          <ResultAnalysisView
            result={currentResult}
            pkg={activePackage}
            selectedTargets={selectedTargets}
            isAdmin={isSupervisorUnlocked}
            securitySettings={securitySettings}
            displaySettings={displaySettings}
            onReviewSolutions={() => setCurrentView('review_solutions')}
            onRetakeExam={() => setCurrentView('student_gate')}
            onBackToDashboard={() => {
              setIsSupervisorUnlocked(true);
              setCurrentView(activePackage.grade ? 'sma_hub' : 'dashboard');
            }}
            onNavigateToScheduleList={() => {
              setScheduleRole('student');
              setCurrentView('exam_schedule_list');
            }}
            onExitExam={handleExitExam}
            onNavigateToDrive={() => setCurrentView('google_drive_hub')}
            schoolInfo={schoolInfo}
            onOpenEditKop={() => setIsEditSchoolKopModalOpen(true)}
          />
        )}

        {currentView === 'exam_exit' && (
          <ExamFinishedExitView
            pkg={activePackage}
            result={currentResult}
            studentProfile={currentStudentProfile}
            isAdmin={isSupervisorUnlocked}
            securitySettings={securitySettings}
            onNavigateToScheduleList={() => {
              setCurrentStudentProfile(null);
              setScheduleRole('student');
              setCurrentView('exam_schedule_list');
            }}
            onBackToDashboard={() => {
              setCurrentStudentProfile(null);
              setIsSupervisorUnlocked(true);
              setCurrentView(activePackage.grade ? 'sma_hub' : 'dashboard');
            }}
          />
        )}

        {currentView === 'review_solutions' && currentResult && (
          <ReviewSolutionsView
            pkg={activePackage}
            result={currentResult}
            displaySettings={displaySettings}
            isAdmin={isSupervisorUnlocked}
            onBackToResult={() => setCurrentView('result_analysis')}
          />
        )}
      </main>

      {/* Target PTN Modal */}
      <TargetPtnModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        selectedTargets={selectedTargets}
        onSaveTargets={handleSaveTargets}
      />

      {/* Custom AI Drill Modal */}
      <CustomDrillModal
        isOpen={isAiDrillModalOpen}
        onClose={() => setIsAiDrillModalOpen(false)}
        onStartCustomDrill={customPkg => {
          setActivePackage(customPkg);
          setCurrentView('student_gate');
        }}
      />

      {/* NIS Management & Live Session Monitor Modal */}
      <NisManagementModal
        isOpen={isNisManagementModalOpen}
        onClose={() => setIsNisManagementModalOpen(false)}
        rosterStudents={rosterStudents}
        onUpdateRoster={handleUpdateRoster}
        securitySettings={securitySettings}
        onUpdateSecuritySettings={handleUpdateSecuritySettings}
        onUpdateSettings={handleUpdateSecuritySettings}
        schoolInfo={schoolInfo}
        onOpenEditKop={() => setIsEditSchoolKopModalOpen(true)}
        onOpenCentralSubjectClass={() => {
          setIsNisManagementModalOpen(false);
          handleOpenCentralSubjectClass('classes');
        }}
      />

      {/* Student Exam Completion Notification & Roster Rekap Modal */}
      <StudentExamNotificationModal
        isOpen={isStudentNotificationModalOpen}
        onClose={() => setIsStudentNotificationModalOpen(false)}
        examHistory={examHistory}
        onViewResult={handleViewHistoryResult}
        onNavigateToDrive={() => setCurrentView('google_drive_hub')}
        onOpenNisSettings={() => setIsNisManagementModalOpen(true)}
        onResetHistory={handleResetExamHistory}
      />

      {/* Edit School Letterhead / Kop Modal */}
      <EditSchoolKopModal
        isOpen={isEditSchoolKopModalOpen}
        onClose={() => setIsEditSchoolKopModalOpen(false)}
        schoolInfo={schoolInfo}
        onSave={handleUpdateSchoolInfo}
      />

      {/* Central Subject & Class Master Synchronization Modal */}
      <CentralSubjectClassModal
        isOpen={isCentralSubjectClassModalOpen}
        onClose={() => setIsCentralSubjectClassModalOpen(false)}
        initialTab={centralSubjectClassInitialTab}
      />

      {/* Floating Menu Guru: Ditampilkan jika bukan di mode siswa dan bukan di dashboard (di dashboard sudah disejajarkan dengan icon kunci) */}
      {scheduleRole !== 'student' &&
        currentView !== 'dashboard' &&
        currentView !== 'exam_cbt' &&
        currentView !== 'student_gate' &&
        currentView !== 'exam_exit' && (
          <div ref={floatingGuruMenuRef} className="fixed bottom-4 right-4 z-40 print:hidden">
            {/* Popover Action Menu Guru (Saat mode pengawas sudah terbuka) */}
            {isFloatingGuruMenuOpen && isSupervisorUnlocked && (
              <div
                id="popover-floating-guru-menu"
                className="absolute bottom-full right-0 mb-2 w-60 sm:w-64 p-2 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl shadow-black/90 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-150 space-y-1 text-xs z-50 text-slate-200"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 px-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Menu Guru & Pengawas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[9px] border border-emerald-500/30">
                      Aktif 🔓
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFloatingGuruMenuOpen(false)}
                      className="p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Quick actions list */}
                <div className="space-y-0.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFloatingGuruMenuOpen(false);
                      setIsNisManagementModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Pengaturan NIS & Keamanan</span>
                  </button>

                  <button
                    type="button"
                    id="floating-menu-central-subject-class"
                    onClick={() => {
                      setIsFloatingGuruMenuOpen(false);
                      handleOpenCentralSubjectClass('subjects');
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Edit Mapel & Rombel Kelas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFloatingGuruMenuOpen(false);
                      setIsEditSchoolKopModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-indigo-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <School className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>Ubah Kop & Logo Sekolah</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFloatingGuruMenuOpen(false);
                      setIsStudentNotificationModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-emerald-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <Users className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Rekap & Notifikasi Siswa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFloatingGuruMenuOpen(false);
                      setIsHelpGuideOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-sky-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>Buku Panduan Guru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFloatingGuruMenuOpen(false);
                      setIsSupervisorUnlocked(true);
                      setCurrentView('app_layout_editor');
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-slate-300 hover:text-indigo-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <GitBranch className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>Editor Tata Letak & Flowchart</span>
                  </button>

                  <button
                    type="button"
                    id="btn-floating-menu-reset-packages"
                    onClick={() => {
                      setIsFloatingGuruMenuOpen(false);
                      setIsResetPackagesModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Reset Paket Mata Pelajaran</span>
                  </button>

                  <button
                    type="button"
                    id="btn-floating-menu-reset-history"
                    onClick={() => {
                      setIsFloatingGuruMenuOpen(false);
                      setIsResetHistoryModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>Reset Laporan Riwayat Ujian</span>
                  </button>

                  {/* Quick Toggle Proteksi PIN Mode Guru */}
                  <div className="px-2 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Proteksi PIN Guru</span>
                    </div>
                    <button
                      type="button"
                      id="btn-floating-menu-toggle-pin"
                      onClick={() => {
                        const nextState = !(securitySettings.enableSupervisorPin !== false);
                        const updated = {
                          ...securitySettings,
                          enableSupervisorPin: nextState,
                        };
                        handleUpdateSecuritySettings(updated);
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
                        setIsFloatingGuruMenuOpen(false);
                        setIsSupervisorUnlocked(false);
                        setScheduleRole('student');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-slate-300 hover:text-amber-300 bg-slate-800/80 hover:bg-slate-800 text-[10px] font-semibold border border-slate-700/80 transition-colors cursor-pointer"
                      title="Sembunyikan Menu dan beralih ke Mode Siswa"
                    >
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                      <span>Kunci (Mode Siswa)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFloatingGuruMenuOpen(false);
                        setIsSupervisorPinModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 text-[10px] font-semibold transition-colors cursor-pointer"
                      title="Ganti atau input PIN Pengawas"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>PIN</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Button Menu Guru */}
            <button
              id="btn-floating-supervisor-pin"
              type="button"
              onClick={() => {
                if (!isSupervisorUnlocked) {
                  if (securitySettings.enableSupervisorPin === false) {
                    setIsSupervisorUnlocked(true);
                    setScheduleRole('admin');
                  } else {
                    setIsSupervisorPinModalOpen(true);
                  }
                } else {
                  setIsFloatingGuruMenuOpen((prev) => !prev);
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-850 border shadow-2xl shadow-black/80 backdrop-blur-md text-xs font-bold transition-all active:scale-95 cursor-pointer group ${
                isSupervisorUnlocked
                  ? 'text-emerald-300 border-emerald-500/50 hover:border-emerald-400'
                  : 'text-slate-300 hover:text-amber-300 border-slate-700/80 hover:border-amber-500/50'
              }`}
              title={
                !isSupervisorUnlocked
                  ? securitySettings.enableSupervisorPin === false
                    ? 'Buka Header & Menu Pengawas (PIN Guru Dinonaktifkan)'
                    : 'Buka Header & Menu Pengawas dengan PIN'
                  : 'Buka Opsi Cepat Menu Guru & Pengawas'
              }
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-transform group-hover:scale-110 ${
                  isSupervisorUnlocked
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {isSupervisorUnlocked ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : securitySettings.enableSupervisorPin === false ? (
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="hidden sm:inline">
                {isSupervisorUnlocked
                  ? 'Menu Guru'
                  : securitySettings.enableSupervisorPin === false
                  ? 'Akses Menu Pengawas'
                  : 'Akses Menu Pengawas (PIN)'}
              </span>
              <span className="sm:hidden">Menu Guru</span>
              {isSupervisorUnlocked && (
                <ChevronUp
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    isFloatingGuruMenuOpen ? 'rotate-180 text-emerald-400' : ''
                  }`}
                />
              )}
            </button>
          </div>
        )}

      {/* Offline Practice & Cache Management Modal */}
      <OfflinePracticeModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        packages={[...EXAM_PACKAGES, ...smaPackages]}
        availablePackages={[...EXAM_PACKAGES, ...smaPackages]}
        onStartExam={(pkg) => {
          setIsOfflineModalOpen(false);
          handleSelectPackage(pkg);
        }}
        onSyncResults={(results) => {
          if (Array.isArray(results)) {
            results.forEach(res => saveExamSubmissionToFirebase(res));
          }
        }}
      />

      {/* Supervisor PIN Unlock Modal */}
      <SupervisorPinModal
        isOpen={isSupervisorPinModalOpen}
        onClose={() => setIsSupervisorPinModalOpen(false)}
        isEnabled={securitySettings.enableSupervisorPin !== false}
        onSuccess={() => {
          setIsSupervisorUnlocked(true);
          setScheduleRole('admin');
        }}
        targetPin={securitySettings.supervisorPin || '1234'}
        title="PIN Mode Guru"
        onToggleDisablePin={(disabled) => {
          const updated = {
            ...securitySettings,
            enableSupervisorPin: disabled,
          };
          handleUpdateSecuritySettings(updated);
        }}
      />

      {/* Interactive System Help Guide Modal */}
      <HelpGuideModal
        isOpen={isHelpGuideOpen}
        onClose={() => setIsHelpGuideOpen(false)}
      />

      {/* Reset Packages Modal */}
      <ResetPackagesModal
        isOpen={isResetPackagesModalOpen}
        onClose={() => setIsResetPackagesModalOpen(false)}
        onResetPackages={(mode) => {
          handleResetPackages(mode);
          setIsResetPackagesModalOpen(false);
        }}
        totalPackagesCount={smaPackages.length}
        customPackagesCount={
          smaPackages.filter(
            (p) =>
              p.isCustomCreated ||
              !INITIAL_SMA_EXAM_PACKAGES.some((def) => def.id === p.id)
          ).length
        }
      />

      {/* Reset Exam History Modal */}
      <ResetExamHistoryModal
        isOpen={isResetHistoryModalOpen}
        onClose={() => setIsResetHistoryModalOpen(false)}
        examHistory={examHistory}
        onResetHistory={(mode, pkgId) => {
          handleResetExamHistory(mode, pkgId);
          setIsResetHistoryModalOpen(false);
        }}
      />
    </div>
  );
}
