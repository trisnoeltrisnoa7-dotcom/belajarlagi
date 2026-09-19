import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ExamPackage,
  SchoolInfo,
  DEFAULT_SCHOOL_INFO,
  ExamScheduleItem,
  StudentRosterEntry,
  NisSecuritySettings,
} from '../types';
import { SchoolLogoBadge } from './SchoolLogoBadge';
import { ShareExamModal } from './ShareExamModal';
import { ShareScheduleListModal } from './ShareScheduleListModal';
import { SupervisorPinModal } from './SupervisorPinModal';
import { EditSchoolKopModal } from './EditSchoolKopModal';
import { StudentExamCard } from './StudentExamCard';
import { AutoImportScheduleModal } from './AutoImportScheduleModal';
import { ManageStudentSubjectsModal } from './ManageStudentSubjectsModal';
import { DuplicateSessionModal } from './DuplicateSessionModal';
import {
  getScheduleTimeInfo,
  formatCountdownSeconds,
  parseScheduleDates,
  ScheduleTimeInfo,
  isGlobalTimeBypassActive,
  setGlobalTimeBypassActive,
} from '../utils/examScheduleTimer';
import {
  isGlobalTokenRequired,
  setGlobalTokenRequired,
  isTokenMandatoryForSchedule,
  fetchExamTokenStatusFresh,
  TOKEN_EVENT_KEY,
} from '../utils/tokenSecurity';
import { isGlobalLockingDisabled as checkGlobalLockingDisabled } from '../utils/sessionManager';
import {
  saveSystemSettingToFirebase,
  loadSystemSettingFromFirebase,
  subscribeToSystemSetting,
} from '../firebase';
import { formatCleanExamDate } from '../utils/dateFormatHelper';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Search,
  Filter,
  Printer,
  Copy,
  Check,
  Play,
  Share2,
  Edit3,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Layers,
  ArrowLeft,
  School,
  GraduationCap,
  Building2,
  MapPin,
  FileSpreadsheet,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Info,
  X,
  ExternalLink,
  ChevronRight,
  KeyRound,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Lock,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Timer,
  Zap,
  FolderDown,
  PlusCircle,
  LayoutList,
  AlignLeft,
  CalendarDays,
  FileText,
  Palette,
  Sun,
  Moon,
  HelpCircle,
  Fingerprint,
} from 'lucide-react';

export type TableFormatType = 'standard' | 'compact' | 'roster_day' | 'supervisor';

export type StudentThemeType = 'dark' | 'white_clean' | 'white_blue' | 'white_emerald';

export interface StudentThemeConfig {
  id: StudentThemeType;
  name: string;
  badgeName: string;
  description: string;
  isLight: boolean;
  accentColor: string;
  previewBg: string;
  previewCard: string;
  previewDot: string;
}

export const STUDENT_THEMES: StudentThemeConfig[] = [
  {
    id: 'dark',
    name: 'Standar Gelap (Dark Cyber CBT)',
    badgeName: 'Gelap Cyber',
    description: 'Mode gelap resmi bernuansa slate/navy dengan kontras aksen neon.',
    isLight: false,
    accentColor: 'indigo',
    previewBg: 'bg-slate-950',
    previewCard: 'bg-slate-900 border-slate-700',
    previewDot: 'bg-indigo-500',
  },
  {
    id: 'white_clean',
    name: 'Putih Bersih Minimalis (Pure White)',
    badgeName: 'Putih Bersih',
    description: 'Dasar putih cerah minimalis, bingkai halus, kontras tulisan sangat tajam.',
    isLight: true,
    accentColor: 'slate',
    previewBg: 'bg-slate-100',
    previewCard: 'bg-white border-slate-300',
    previewDot: 'bg-slate-850',
  },
  {
    id: 'white_blue',
    name: 'Putih Biru Akademik (Academic Blue)',
    badgeName: 'Putih Biru',
    description: 'Dasar putih berpadu aksen biru safir resmi berstandar ujian dinas/kampus.',
    isLight: true,
    accentColor: 'blue',
    previewBg: 'bg-blue-50',
    previewCard: 'bg-white border-blue-200',
    previewDot: 'bg-blue-600',
  },
  {
    id: 'white_emerald',
    name: 'Putih Zamrud Edukasi (Eco Emerald)',
    badgeName: 'Putih Zamrud',
    description: 'Dasar putih berpadu hijau zamrud sejuk, nyaman di mata untuk membaca soal.',
    isLight: true,
    accentColor: 'emerald',
    previewBg: 'bg-emerald-50',
    previewCard: 'bg-white border-emerald-200',
    previewDot: 'bg-emerald-600',
  },
];

interface ExamScheduleManagementViewProps {
  availablePackages: ExamPackage[];
  onStartExam: (pkg: ExamPackage) => void;
  onBackToDashboard: () => void;
  onNavigateToSmaHub?: () => void;
  rosterStudents?: StudentRosterEntry[];
  securitySettings?: NisSecuritySettings;
  onUpdateSecuritySettings?: (settings: NisSecuritySettings) => void;
  initialRole?: 'admin' | 'student';
  onRoleChange?: (role: 'admin' | 'student') => void;
  areAllLinksDisabled?: boolean;
  onToggleDisableAllLinks?: (disabled: boolean) => void;
  onRegenerateAllLinks?: () => void;
  isGlobalLockingDisabled?: boolean;
  onToggleGlobalLocking?: (disabled: boolean) => void;
  onMasterUnlockAll?: () => { activeCount: number; finishedCount: number } | void;
  onOpenHelpModal?: () => void;
}

const STORAGE_KEYS = {
  SCHOOL_INFO: 'cbt_school_info_kop',
  SCHEDULE_ITEMS: 'cbt_custom_exam_schedules_v1',
  FILTER_SETTINGS: 'cbt_exam_schedule_filter_lock_settings',
  HIDE_ADMIN_NAV: 'cbt_hide_admin_nav_student_mode',
  STUDENT_THEME: 'cbt_student_theme',
  LOGO_TAP_COUNT: 'cbt_logo_tap_count_v1',
};

// Helper: Generate clean, memorable token for subject exam
export const generateSubjectExamToken = (subjectName?: string): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let prefix = 'CBT';
  if (subjectName) {
    const sLower = subjectName.toLowerCase();
    if (sLower.includes('matematika') || sLower.includes('mtk')) prefix = 'MAT';
    else if (sLower.includes('fisika')) prefix = 'FIS';
    else if (sLower.includes('kimia')) prefix = 'KIM';
    else if (sLower.includes('biologi')) prefix = 'BIO';
    else if (sLower.includes('ekonomi')) prefix = 'EKO';
    else if (sLower.includes('geografi')) prefix = 'GEO';
    else if (sLower.includes('sosiologi')) prefix = 'SOS';
    else if (sLower.includes('sejarah')) prefix = 'SEJ';
    else if (sLower.includes('indonesia')) prefix = 'BIN';
    else if (sLower.includes('inggris')) prefix = 'BIG';
    else if (sLower.includes('ppkn') || sLower.includes('pancasila')) prefix = 'PKN';
    else if (sLower.includes('agama') || sLower.includes('pai')) prefix = 'PAI';
    else if (sLower.includes('informatika')) prefix = 'INF';
    else if (sLower.includes('seni')) prefix = 'SBD';
    else if (sLower.includes('pjok') || sLower.includes('penjas')) prefix = 'PJK';
    else if (sLower.includes('tps') || sLower.includes('skolastik')) prefix = 'TPS';
    else if (sLower.includes('literasi')) prefix = 'LIT';
    else {
      const clean = subjectName.replace(/[^a-zA-Z]/g, '').toUpperCase();
      if (clean.length >= 3) prefix = clean.substring(0, 3);
    }
  }
  let randomPart = '';
  for (let i = 0; i < 3; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${randomPart}`;
};

// Days of standard Indonesian school exam week
const DAYS_OF_WEEK = [
  { name: 'Senin', dateDisplay: 'Senin, 24 Agustus 2026', dateIso: '2026-08-24' },
  { name: 'Selasa', dateDisplay: 'Selasa, 25 Agustus 2026', dateIso: '2026-08-25' },
  { name: 'Rabu', dateDisplay: 'Rabu, 26 Agustus 2026', dateIso: '2026-08-26' },
  { name: 'Kamis', dateDisplay: 'Kamis, 27 Agustus 2026', dateIso: '2026-08-27' },
  { name: 'Jumat', dateDisplay: 'Jumat, 28 Agustus 2026', dateIso: '2026-08-28' },
  { name: 'Sabtu', dateDisplay: 'Sabtu, 29 Agustus 2026', dateIso: '2026-08-29' },
];

const TIME_SLOTS = [
  { session: 1, start: '07:30', end: '09:00' },
  { session: 2, start: '09:30', end: '11:00' },
  { session: 3, start: '11:15', end: '12:45' },
];

export const ExamScheduleManagementView: React.FC<ExamScheduleManagementViewProps> = ({
  availablePackages,
  onStartExam,
  onBackToDashboard,
  onNavigateToSmaHub,
  rosterStudents = [],
  securitySettings,
  onUpdateSecuritySettings,
  initialRole = 'admin',
  onRoleChange,
  areAllLinksDisabled = false,
  onToggleDisableAllLinks,
  onRegenerateAllLinks,
  isGlobalLockingDisabled = false,
  onToggleGlobalLocking,
  onMasterUnlockAll,
  onOpenHelpModal,
}) => {
  // 0. Active Role / Preview Mode: 'admin' (Pengawas/Guru) vs 'student' (Siswa)
  const [viewRole, setViewRole] = useState<'admin' | 'student'>(initialRole);
  const [isPinModalOpenForRole, setIsPinModalOpenForRole] = useState(false);

  // Student Exam Card Modal state
  const [isStudentCardModalOpen, setIsStudentCardModalOpen] = useState(false);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<StudentRosterEntry | null>(() => {
    return rosterStudents.length > 0 ? rosterStudents[0] : null;
  });
  const [selectedPackageForCard, setSelectedPackageForCard] = useState<ExamPackage | null>(() => {
    return availablePackages.length > 0 ? availablePackages[0] : null;
  });

  // Sync initialRole if prop changes
  useEffect(() => {
    if (initialRole) {
      setViewRole(initialRole);
    }
  }, [initialRole]);

  const handleRoleSwitch = (newRole: 'admin' | 'student') => {
    if (newRole === 'admin' && viewRole === 'student') {
      const isPinEnabled = securitySettings?.enableSupervisorPin !== false;
      if (isPinEnabled) {
        setIsPinModalOpenForRole(true);
        return;
      }
    }
    setViewRole(newRole);
    if (onRoleChange) {
      onRoleChange(newRole);
    }
  };

  const handlePinSuccessForRole = () => {
    setViewRole('admin');
    if (onRoleChange) {
      onRoleChange('admin');
    }
  };

  // 1. School Kop Info State (Centered Header)
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

  const [isEditingSchoolInfo, setIsEditingSchoolInfo] = useState(false);
  const [tempSchoolInfo, setTempSchoolInfo] = useState<SchoolInfo>(schoolInfo);

  const handleSaveSchoolInfo = () => {
    setSchoolInfo(tempSchoolInfo);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHOOL_INFO, JSON.stringify(tempSchoolInfo));
    } catch (e) {}
    setIsEditingSchoolInfo(false);
  };

  // Helper: Generate default schedule items from available packages
  const generateDefaultSchedules = (packages: ExamPackage[]): ExamScheduleItem[] => {
    return packages.map((pkg, index) => {
      const dayIndex = index % DAYS_OF_WEEK.length;
      const slotIndex = Math.floor(index / DAYS_OF_WEEK.length) % TIME_SLOTS.length;
      const day = DAYS_OF_WEEK[dayIndex];
      const slot = TIME_SLOTS[slotIndex];
      const subjectName = pkg.subject || pkg.title.split('-')[0].trim() || pkg.title;

      let targetClass = 'Semua Kelas (X, XI, XII)';
      if (pkg.grade && pkg.grade !== 'Semua Kelas') {
        targetClass = `Kelas ${pkg.grade} ${pkg.major ? pkg.major : ''}`.trim();
      } else if (pkg.category.includes('MIPA')) {
        targetClass = 'Kelas XII MIPA';
      } else if (pkg.category.includes('IPS')) {
        targetClass = 'Kelas XII IPS';
      } else if (pkg.category.includes('TPS')) {
        targetClass = 'Kelas XII & Alumni (UTBK)';
      }

      return {
        id: `sched-${pkg.id}`,
        packageId: pkg.id,
        subjectName: subjectName,
        dayName: day.name,
        dateDisplay: day.dateDisplay,
        dateIso: day.dateIso,
        startTime: slot.start,
        endTime: slot.end,
        targetClass: targetClass,
        grade: pkg.grade,
        major: pkg.major,
        durationMinutes: pkg.durationMinutes || 90,
        totalQuestions: pkg.totalQuestions || (pkg.questions ? pkg.questions.length : 10),
        kkmScore: pkg.kkmScore || 75,
        sessionNumber: slot.session,
        roomName: `Ruang Ujian CBT / Lab Komputer ${slot.session}`,
        supervisorName: 'Guru Pengawas Terjadwal',
        token: generateSubjectExamToken(subjectName),
        isVisibleToStudents: true,
      } as ExamScheduleItem;
    });
  };

  // 2. Custom Schedule Items State
  const [customSchedules, setCustomSchedules] = useState<ExamScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE_ITEMS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: ExamScheduleItem) => ({
            ...item,
            token: item.token || generateSubjectExamToken(item.subjectName),
          }));
        }
      }
    } catch (e) {}
    const initial = generateDefaultSchedules(availablePackages);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(initial));
    } catch (e) {}
    return initial;
  });

  // Firestore remote sync & real-time subscriber for exam schedules
  useEffect(() => {
    loadSystemSettingFromFirebase<ExamScheduleItem[]>('exam_schedules').then(remoteSchedules => {
      if (Array.isArray(remoteSchedules)) {
        setCustomSchedules(remoteSchedules);
        try {
          localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(remoteSchedules));
        } catch (e) {}
      }
    });

    const unsubscribe = subscribeToSystemSetting<ExamScheduleItem[]>('exam_schedules', remoteSchedules => {
      if (Array.isArray(remoteSchedules)) {
        setCustomSchedules(remoteSchedules);
        try {
          localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(remoteSchedules));
        } catch (e) {}
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Modals for import & deletion
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ExamScheduleItem | null>(null);

  // Toggle Hide Admin & Teacher Mode Navigation in Student Mode
  const [isHideAdminNavActive, setIsHideAdminNavActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HIDE_ADMIN_NAV);
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  // Global Exam Token Requirement State (Aktifkan / Nonaktifkan Token Ujian)
  const [isGlobalTokenRequiredState, setIsGlobalTokenRequiredState] = useState<boolean>(() => isGlobalTokenRequired());

  // Consolidated Schedule Management Tools Menu State (Modal / Bottom Sheet)
  const [isScheduleToolsMenuOpen, setIsScheduleToolsMenuOpen] = useState(false);
  const scheduleToolsMenuRef = useRef<HTMLDivElement>(null);

  // Close tools menu on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (scheduleToolsMenuRef.current && !scheduleToolsMenuRef.current.contains(event.target as Node)) {
        setIsScheduleToolsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsScheduleToolsMenuOpen(false);
      }
    };
    if (isScheduleToolsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isScheduleToolsMenuOpen]);

  // Listen to remote hide_admin_nav_student_mode and token_requirement_active settings
  useEffect(() => {
    loadSystemSettingFromFirebase<boolean>('hide_admin_nav_student_mode').then(val => {
      if (typeof val === 'boolean') {
        setIsHideAdminNavActive(val);
        try {
          localStorage.setItem(STORAGE_KEYS.HIDE_ADMIN_NAV, JSON.stringify(val));
        } catch (e) {}
      }
    });

    // Fresh load bypassing mobile/Safari cache
    fetchExamTokenStatusFresh().then(fresh => {
      setIsGlobalTokenRequiredState(fresh.isTokenRequired);
    });

    loadSystemSettingFromFirebase<{ isTokenRequired: boolean }>('token_requirement_active', {
      forceServer: true,
      bypassCache: true,
    }).then(val => {
      if (val && typeof val.isTokenRequired === 'boolean') {
        setIsGlobalTokenRequiredState(val.isTokenRequired);
      }
    });

    const unsubHide = subscribeToSystemSetting<boolean>('hide_admin_nav_student_mode', val => {
      if (typeof val === 'boolean') {
        setIsHideAdminNavActive(val);
        try {
          localStorage.setItem(STORAGE_KEYS.HIDE_ADMIN_NAV, JSON.stringify(val));
        } catch (e) {}
      }
    });

    const unsubToken = subscribeToSystemSetting<{ isTokenRequired: boolean }>('token_requirement_active', val => {
      if (val && typeof val.isTokenRequired === 'boolean') {
        setIsGlobalTokenRequiredState(val.isTokenRequired);
      }
    });

    const handleLocalTokenChange = () => {
      setIsGlobalTokenRequiredState(isGlobalTokenRequired());
    };
    const handleReactivation = () => {
      fetchExamTokenStatusFresh().then(fresh => {
        setIsGlobalTokenRequiredState(fresh.isTokenRequired);
      });
    };

    window.addEventListener(TOKEN_EVENT_KEY, handleLocalTokenChange);
    window.addEventListener('storage', handleLocalTokenChange);
    window.addEventListener('focus', handleReactivation);
    document.addEventListener('visibilitychange', handleReactivation);

    return () => {
      unsubHide();
      unsubToken();
      window.removeEventListener(TOKEN_EVENT_KEY, handleLocalTokenChange);
      window.removeEventListener('storage', handleLocalTokenChange);
      window.removeEventListener('focus', handleReactivation);
      document.removeEventListener('visibilitychange', handleReactivation);
    };
  }, []);

  const handleToggleGlobalTokenRequired = () => {
    const nextState = !isGlobalTokenRequiredState;
    setIsGlobalTokenRequiredState(nextState);
    setGlobalTokenRequired(nextState, true);
    if (nextState) {
      setTokenActionToast('🔑 Token Ujian Berhasil Diaktifkan (Real-Time Tanpa Cache): Siswa wajib memasukkan token resmi untuk memulai ujian.');
    } else {
      setTokenActionToast('🔓 Token Ujian Berhasil Dinonaktifkan (Real-Time Tanpa Cache): Siswa dapat langsung masuk ujian tanpa perlu memasukkan token.');
    }
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  const handleToggleHideAdminNav = () => {
    const nextState = !isHideAdminNavActive;
    setIsHideAdminNavActive(nextState);
    try {
      localStorage.setItem(STORAGE_KEYS.HIDE_ADMIN_NAV, JSON.stringify(nextState));
    } catch (e) {}
    saveSystemSettingToFirebase('hide_admin_nav_student_mode', nextState);
    if (nextState) {
      setTokenActionToast('Mode Tersembunyi Aktif: Tombol "Mode Guru" dan "Kembali ke Mode Admin" disembunyikan saat masuk mode ujian siswa.');
    } else {
      setTokenActionToast('Mode Tersembunyi Nonaktif: Tombol "Mode Guru" dan "Kembali ke Mode Admin" kini ditampilkan pada mode siswa.');
    }
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  // New Modals for Catalog Auto-Import, Multi-Session Duplicate & Student Visibility
  const [isAutoImportModalOpen, setIsAutoImportModalOpen] = useState(false);
  const [isStudentVisibilityModalOpen, setIsStudentVisibilityModalOpen] = useState(false);
  const [sessionToDuplicate, setSessionToDuplicate] = useState<ExamScheduleItem | null>(null);

  // Active schedules are directly the customSchedules state
  const activeSchedules: ExamScheduleItem[] = customSchedules;

  // Toggle individual schedule item visibility for students
  const handleToggleStudentVisibility = (scheduleId: string) => {
    const updated = customSchedules.map(item => {
      if (item.id === scheduleId) {
        const nextVal = item.isVisibleToStudents === false ? true : false;
        return { ...item, isVisibleToStudents: nextVal };
      }
      return item;
    });
    setCustomSchedules(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updated));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', updated);
    const target = customSchedules.find(i => i.id === scheduleId);
    const nowVisible = target?.isVisibleToStudents === false;
    setTokenActionToast(
      nowVisible
        ? `"${target?.subjectName}" sekarang TAMPIL di halaman ujian siswa.`
        : `"${target?.subjectName}" sekarang DISEMBUNYIKAN dari siswa.`
    );
    setTimeout(() => setTokenActionToast(null), 3000);
  };

  // Bulk save student visibility
  const handleSaveBulkVisibility = (updatedList: ExamScheduleItem[]) => {
    setCustomSchedules(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updatedList));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', updatedList);
    const visibleCount = updatedList.filter(i => i.isVisibleToStudents !== false).length;
    setTokenActionToast(`Pengaturan visibilitas disimpan: ${visibleCount} dari ${updatedList.length} mapel tampil untuk siswa.`);
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  // Add duplicate session for the same subject on different day/time/class
  const handleAddDuplicateSession = (newSchedule: ExamScheduleItem) => {
    const updated = [...customSchedules, newSchedule];
    setCustomSchedules(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updated));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', updated);
    setTokenActionToast(`Sesi tambahan untuk "${newSchedule.subjectName}" (${newSchedule.dayName}, Sesi ${newSchedule.sessionNumber}) berhasil ditambahkan ke jadwal.`);
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  // Auto-import handler from Catalog
  const handleAutoImportSchedules = (newItems: ExamScheduleItem[], mode: 'replace' | 'append') => {
    let updatedList: ExamScheduleItem[] = [];
    if (mode === 'replace') {
      updatedList = newItems;
    } else {
      // Append mode: retain all existing schedules and add new sessions
      updatedList = [...customSchedules, ...newItems];
    }
    setCustomSchedules(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updatedList));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', updatedList);
    setTokenActionToast(
      mode === 'replace'
        ? `Berhasil memuat otomatis ${newItems.length} jadwal sesi mapel dari katalog.`
        : `Berhasil menambahkan ${newItems.length} jadwal sesi mapel ke jadwal ujian.`
    );
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  // Handle Importing Filtered / Selected Packages from Bank Soal
  const handleImportPackages = (selectedPackages: ExamPackage[], options: any) => {
    const newItems: ExamScheduleItem[] = selectedPackages.map((pkg, index) => {
      let dayName = 'Senin';
      let sessionNum = 1;
      let supervisorName = 'Guru Pengawas Terjadwal';
      let roomName = 'Ruang Ujian CBT / Lab Komputer';

      if (options.distributionStrategy === 'fixed_day') {
        dayName = options.fixedDay || 'Senin';
        sessionNum = options.fixedSession || 1;
        roomName = `Ruang Ujian CBT / Lab Komputer ${sessionNum}`;
      } else {
        if (options.customDayPerPackage?.[pkg.id]) {
          dayName = options.customDayPerPackage[pkg.id];
        } else {
          const dayIndex = index % DAYS_OF_WEEK.length;
          dayName = DAYS_OF_WEEK[dayIndex].name;
        }

        if (options.customSessionPerPackage?.[pkg.id]) {
          sessionNum = options.customSessionPerPackage[pkg.id];
        } else {
          sessionNum = (Math.floor(index / DAYS_OF_WEEK.length) % TIME_SLOTS.length) + 1;
        }
        roomName = `Ruang Ujian CBT / Lab Komputer ${sessionNum}`;
      }

      const dayObj = DAYS_OF_WEEK.find(d => d.name === dayName) || DAYS_OF_WEEK[0];
      const slotObj = TIME_SLOTS.find(s => s.session === sessionNum) || TIME_SLOTS[0];
      const subjectName = pkg.subject || pkg.title.split('-')[0].trim() || pkg.title;

      let targetClass = 'Semua Kelas (X, XI, XII)';
      if (pkg.grade && pkg.grade !== 'Semua Kelas') {
        targetClass = `Kelas ${pkg.grade} ${pkg.major ? pkg.major : ''}`.trim();
      } else if (pkg.category.includes('MIPA')) {
        targetClass = 'Kelas XII MIPA';
      } else if (pkg.category.includes('IPS')) {
        targetClass = 'Kelas XII IPS';
      } else if (pkg.category.includes('TPS')) {
        targetClass = 'Kelas XII & Alumni (UTBK)';
      }

      return {
        id: `sched-${pkg.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        packageId: pkg.id,
        subjectName: subjectName,
        dayName: dayObj.name,
        dateDisplay: dayObj.dateDisplay,
        dateIso: dayObj.dateIso,
        startTime: slotObj.start,
        endTime: slotObj.end,
        targetClass: targetClass,
        grade: pkg.grade,
        major: pkg.major,
        durationMinutes: pkg.durationMinutes || 90,
        totalQuestions: pkg.totalQuestions || 10,
        kkmScore: pkg.kkmScore || 75,
        sessionNumber: slotObj.session,
        roomName: roomName,
        supervisorName: supervisorName,
        token: generateSubjectExamToken(subjectName),
        isVisibleToStudents: true,
      } as ExamScheduleItem;
    });

    let updatedList: ExamScheduleItem[] = [];
    if (options.mode === 'replace') {
      updatedList = newItems;
    } else {
      // Append mode: allow multiple sessions by appending new items
      updatedList = [...customSchedules, ...newItems];
    }

    setCustomSchedules(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updatedList));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', updatedList);

    setTokenActionToast(
      options.mode === 'replace'
        ? `Jadwal berhasil diganti dengan ${selectedPackages.length} paket soal terpilih.`
        : `Berhasil menambahkan ${selectedPackages.length} paket soal ke jadwal ujian.`
    );
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  // Quick Preset Helper
  const handleLoadDefaultPreset = () => {
    // Generate standard selection
    const generated = availablePackages.map((pkg, index) => {
      const dayIndex = index % DAYS_OF_WEEK.length;
      const slotIndex = Math.floor(index / DAYS_OF_WEEK.length) % TIME_SLOTS.length;
      const day = DAYS_OF_WEEK[dayIndex];
      const slot = TIME_SLOTS[slotIndex];
      const subjectName = pkg.subject || pkg.title.split('-')[0].trim() || pkg.title;

      let targetClass = 'Semua Kelas (X, XI, XII)';
      if (pkg.grade && pkg.grade !== 'Semua Kelas') {
        targetClass = `Kelas ${pkg.grade} ${pkg.major ? pkg.major : ''}`.trim();
      } else if (pkg.category.includes('MIPA')) {
        targetClass = 'Kelas XII MIPA';
      } else if (pkg.category.includes('IPS')) {
        targetClass = 'Kelas XII IPS';
      } else if (pkg.category.includes('TPS')) {
        targetClass = 'Kelas XII & Alumni (UTBK)';
      }

      return {
        id: `sched-${pkg.id}`,
        packageId: pkg.id,
        subjectName: subjectName,
        dayName: day.name,
        dateDisplay: day.dateDisplay,
        dateIso: day.dateIso,
        startTime: slot.start,
        endTime: slot.end,
        targetClass: targetClass,
        grade: pkg.grade,
        major: pkg.major,
        durationMinutes: pkg.durationMinutes,
        totalQuestions: pkg.totalQuestions,
        kkmScore: pkg.kkmScore || 75,
        sessionNumber: slot.session,
        roomName: `Ruang Ujian CBT / Lab Komputer ${slot.session}`,
        supervisorName: 'Guru Pengawas Terjadwal',
        token: generateSubjectExamToken(subjectName),
      } as ExamScheduleItem;
    });

    setCustomSchedules(generated);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(generated));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', generated);
    setTokenActionToast('Seluruh paket dari bank soal telah dimuat ke jadwal.');
    setTimeout(() => setTokenActionToast(null), 3000);
  };

  // Delete Single Schedule Item
  const handleDeleteSingleSchedule = (scheduleId: string, subjectName: string) => {
    const updated = customSchedules.filter(item => item.id !== scheduleId);
    setCustomSchedules(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updated));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', updated);
    setScheduleToDelete(null);
    setTokenActionToast(`Mata pelajaran "${subjectName}" telah dihapus dari jadwal.`);
    setTimeout(() => setTokenActionToast(null), 3000);
  };

  // Clear All Schedules
  const handleClearAllSchedules = () => {
    setCustomSchedules([]);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify([]));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', []);
    setIsClearConfirmOpen(false);
    setTokenActionToast('Seluruh jadwal ujian berhasil dikosongkan.');
    setTimeout(() => setTokenActionToast(null), 3000);
  };

  // Reset Student View: Restore visibility of all currently imported schedules without pulling from full catalog
  const handleResetStudentViewVisibility = () => {
    const updated = activeSchedules.map(item => ({
      ...item,
      isVisibleToStudents: true,
    }));
    setCustomSchedules(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updated));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', updated);
    setIsClearConfirmOpen(false);
    setTokenActionToast(`Tampilan siswa berhasil direset: Menampilkan seluruh ${updated.length} paket soal yang telah diimpor ke jadwal.`);
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  // Restore Default Official Schedules
  const handleResetToDefaultSchedules = () => {
    const generated = generateDefaultSchedules(availablePackages);
    setCustomSchedules(generated);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(generated));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', generated);
    setIsClearConfirmOpen(false);
    setTokenActionToast(`Jadwal ujian berhasil direset ke standar resmi (${generated.length} mapel SMA).`);
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  const handleUpdateSingleSchedule = (updatedItem: ExamScheduleItem) => {
    const updated = activeSchedules.map(item => (item.id === updatedItem.id ? updatedItem : item));
    setCustomSchedules(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updated));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', updated);
    setEditingScheduleItem(null);
    setTokenActionToast(`Jadwal mata pelajaran "${updatedItem.subjectName}" berhasil disimpan.`);
    setTimeout(() => setTokenActionToast(null), 3000);
  };

  // Real-time ticking system clock
  const [systemNow, setSystemNow] = useState<Date>(new Date());
  const [timeStatusFilter, setTimeStatusFilter] = useState<'all' | 'open' | 'locked' | 'closed'>('all');
  const isEffectiveLockingDisabled = isGlobalLockingDisabled || checkGlobalLockingDisabled();
  const [isSupervisorTimeBypass, setIsSupervisorTimeBypass] = useState<boolean>(() => isGlobalTimeBypassActive() || isEffectiveLockingDisabled);

  const isFreeMode = isSupervisorTimeBypass || isEffectiveLockingDisabled || isGlobalTimeBypassActive();

  // Listen to time bypass events from other components / tabs
  useEffect(() => {
    const handleBypassChange = () => {
      setIsSupervisorTimeBypass(isGlobalTimeBypassActive() || isGlobalLockingDisabled || checkGlobalLockingDisabled());
    };
    window.addEventListener('cbt-time-bypass-changed', handleBypassChange);
    window.addEventListener('cbt-global-locking-changed', handleBypassChange);
    window.addEventListener('storage', handleBypassChange);
    return () => {
      window.removeEventListener('cbt-time-bypass-changed', handleBypassChange);
      window.removeEventListener('cbt-global-locking-changed', handleBypassChange);
      window.removeEventListener('storage', handleBypassChange);
    };
  }, [isGlobalLockingDisabled]);

  const handleToggleSupervisorTimeBypass = (targetVal?: boolean) => {
    const nextVal = typeof targetVal === 'boolean' ? targetVal : !isSupervisorTimeBypass;
    setIsSupervisorTimeBypass(nextVal);
    setGlobalTimeBypassActive(nextVal);
    if (!nextVal && onToggleGlobalLocking) {
      onToggleGlobalLocking(false);
    }
    saveSystemSettingToFirebase('time_bypass', { active: nextVal });

    // Sinkronisasi otomatis status Token sesuai Mode:
    // - Mode Bebas (nextVal === true): Token TIDAK WAJIB diisi (bebas)
    // - Mode Normal (nextVal === false): Token WAJIB diisi
    const tokenRequiredInThisMode = !nextVal;
    setIsGlobalTokenRequiredState(tokenRequiredInThisMode);
    setGlobalTokenRequired(tokenRequiredInThisMode, true);

    setTokenActionToast(
      nextVal
        ? '⚡ Mode Bebas DIAKTIFKAN: Semua jadwal terbuka instan & Token TIDAK WAJIB diisi (Bebas Masuk)!'
        : '⏱️ Mode Normal DIAKTIFKAN: Waktu ujian aktif & Token WAJIB diisi siswa.'
    );
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. UI View & Filter Controls: Pencarian, Hari/Senin, Kelas, Jurusan, Format Kartu/Tabel
  // Disatukan dalam satu kotak dengan tombol KUNCI/BUKA untuk fokus siswa
  const [isFilterLocked, setIsFilterLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTER_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.isFilterLocked === 'boolean') return parsed.isFilterLocked;
      }
    } catch (e) {}
    return true; // Default terkunci agar siswa langsung melihat jadwal ujian yang telah ditetapkan
  });

  const [selectedDayFilter, setSelectedDayFilter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTER_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedDayFilter) return parsed.selectedDayFilter;
      }
    } catch (e) {}
    return 'Senin';
  });

  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTER_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedGradeFilter) return parsed.selectedGradeFilter;
      }
    } catch (e) {}
    return '10';
  });

  const [selectedMajorFilter, setSelectedMajorFilter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTER_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedMajorFilter) return parsed.selectedMajorFilter;
      }
    } catch (e) {}
    return 'MIPA';
  });

  const [viewMode, setViewMode] = useState<'both' | 'cards' | 'table'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTER_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.viewMode) return parsed.viewMode;
      }
    } catch (e) {}
    return 'cards';
  });

  const [tableFormat, setTableFormat] = useState<TableFormatType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTER_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tableFormat) return parsed.tableFormat;
      }
    } catch (e) {}
    return 'standard';
  });

  // Student View Color Theme Selection State (dark + 3 white themes)
  const [studentTheme, setStudentTheme] = useState<StudentThemeType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENT_THEME);
      if (saved && (saved === 'dark' || saved === 'white_clean' || saved === 'white_blue' || saved === 'white_emerald')) {
        return saved as StudentThemeType;
      }
    } catch (e) {}
    return 'dark';
  });

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Close theme dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeMenuOpen]);

  const activeThemeConfig = useMemo(() => {
    return STUDENT_THEMES.find(t => t.id === studentTheme) || STUDENT_THEMES[0];
  }, [studentTheme]);

  const handleSelectTheme = (themeId: StudentThemeType) => {
    setStudentTheme(themeId);
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENT_THEME, themeId);
    } catch (e) {}
    setIsThemeMenuOpen(false);
    const cfg = STUDENT_THEMES.find(t => t.id === themeId);
    setTokenActionToast(`🎨 Tema tampilan siswa berhasil diubah ke: ${cfg?.name || themeId}`);
    setTimeout(() => setTokenActionToast(null), 3000);
  };

  const [searchQuery, setSearchQuery] = useState('');

  // Persist filter lock settings
  const persistFilterState = (
    locked: boolean,
    day: string = selectedDayFilter,
    grade: string = selectedGradeFilter,
    major: string = selectedMajorFilter,
    mode: 'both' | 'cards' | 'table' = viewMode,
    format: TableFormatType = tableFormat
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.FILTER_SETTINGS,
        JSON.stringify({
          isFilterLocked: locked,
          selectedDayFilter: day,
          selectedGradeFilter: grade,
          selectedMajorFilter: major,
          viewMode: mode,
          tableFormat: format,
        })
      );
    } catch (e) {}
  };

  const handleToggleFilterLock = (locked: boolean) => {
    setIsFilterLocked(locked);
    persistFilterState(locked);
    if (locked) {
      setTokenActionToast('🔒 Filter jadwal dikunci! Siswa hanya melihat daftar ujian yang ditetapkan.');
    } else {
      setTokenActionToast('🔓 Filter dibuka: Anda dapat menyesuaikan hari, kelas, jurusan, pencarian, dan format.');
    }
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  const handleApplyPreset = (
    day: string,
    grade: string,
    major: string,
    mode: 'both' | 'cards' | 'table' = 'cards'
  ) => {
    setSelectedDayFilter(day);
    setSelectedGradeFilter(grade);
    setSelectedMajorFilter(major);
    setViewMode(mode);
    persistFilterState(isFilterLocked, day, grade, major, mode);
    setTokenActionToast(`Preset diterapkan: ${day} • Kelas ${grade} • ${major}`);
    setTimeout(() => setTokenActionToast(null), 2500);
  };

  const handleResetFilters = () => {
    setSelectedDayFilter('all');
    setSelectedGradeFilter('all');
    setSelectedMajorFilter('all');
    setViewMode('both');
    setSearchQuery('');
    persistFilterState(isFilterLocked, 'all', 'all', 'all', 'both');
    setTokenActionToast('Filter telah direset ke semua daftar.');
    setTimeout(() => setTokenActionToast(null), 2500);
  };

  // Modals & Feedback
  const [sharingPackage, setSharingPackage] = useState<ExamPackage | null>(null);
  const [isShareScheduleModalOpen, setIsShareScheduleModalOpen] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ExamScheduleItem | null>(null);
  const [isCopiedBroadcast, setIsCopiedBroadcast] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [tokenActionToast, setTokenActionToast] = useState<string | null>(null);

  // Token Interactive Handlers
  const handleCopyToken = (tokenStr: string, scheduleId: string, subjectName: string) => {
    navigator.clipboard.writeText(tokenStr);
    setCopiedTokenId(scheduleId);
    setTokenActionToast(`Token "${tokenStr}" (${subjectName}) berhasil disalin ke clipboard!`);
    setTimeout(() => setCopiedTokenId(null), 2500);
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  const handleRegenerateSingleToken = (scheduleId: string, subjectName: string) => {
    const newToken = generateSubjectExamToken(subjectName);
    const updated = activeSchedules.map(item => {
      if (item.id === scheduleId) {
        return { ...item, token: newToken, isCustomized: true };
      }
      return item;
    });
    setCustomSchedules(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updated));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', updated);
    setTokenActionToast(`Token untuk ${subjectName} berhasil diacak menjadi: ${newToken}`);
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  const handleRegenerateAllTokens = () => {
    const updated = activeSchedules.map(item => ({
      ...item,
      token: generateSubjectExamToken(item.subjectName),
      isCustomized: true,
    }));
    setCustomSchedules(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updated));
    } catch (e) {}
    saveSystemSettingToFirebase('exam_schedules', updated);
    setTokenActionToast(`Semua token untuk ${updated.length} mata pelajaran berhasil diacak dan diperbarui!`);
    setTimeout(() => setTokenActionToast(null), 4000);
  };

  // Time-gated status counts across all active schedules
  const timeStats = useMemo(() => {
    let open = 0;
    let locked = 0;
    let closed = 0;
    activeSchedules.forEach(item => {
      const info = getScheduleTimeInfo(item, systemNow, isSupervisorTimeBypass);
      if (info.status === 'open_active') open++;
      else if (info.status === 'locked_upcoming') locked++;
      else if (info.status === 'closed_expired') closed++;
    });
    return { open, locked, closed, total: activeSchedules.length };
  }, [activeSchedules, systemNow, isSupervisorTimeBypass]);

  // Filtered schedule list (Note: In student mode, searchQuery is not used)
  const filteredSchedules = useMemo(() => {
    return activeSchedules.filter(item => {
      // Search query (ONLY applied in Admin mode when search box is active)
      if (viewRole === 'admin' && searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pkg = availablePackages.find(p => p.id === item.packageId);
        const pkgTitle = pkg ? pkg.title.toLowerCase() : '';
        const matchSubject = item.subjectName.toLowerCase().includes(q);
        const matchClass = item.targetClass.toLowerCase().includes(q);
        const matchDay = item.dayName.toLowerCase().includes(q);
        const matchPkg = pkgTitle.includes(q);
        const matchToken = item.token ? item.token.toLowerCase().includes(q) : false;
        if (!matchSubject && !matchClass && !matchDay && !matchPkg && !matchToken) {
          return false;
        }
      }

      // Day filter
      if (selectedDayFilter !== 'all' && item.dayName !== selectedDayFilter) {
        return false;
      }

      // Grade filter
      if (selectedGradeFilter !== 'all') {
        if (!item.targetClass.includes(selectedGradeFilter) && item.grade !== selectedGradeFilter) {
          return false;
        }
      }

      // Major filter
      if (selectedMajorFilter !== 'all') {
        if (!item.targetClass.toLowerCase().includes(selectedMajorFilter.toLowerCase()) && item.major !== selectedMajorFilter) {
          return false;
        }
      }

      // Visibility filter for student role
      if (viewRole === 'student' && item.isVisibleToStudents === false) {
        return false;
      }

      // Time Status filter (Semua / Terbuka / Terkunci / Selesai)
      if (timeStatusFilter !== 'all') {
        const info = getScheduleTimeInfo(item, systemNow, isSupervisorTimeBypass);
        if (timeStatusFilter === 'open' && info.status !== 'open_active') return false;
        if (timeStatusFilter === 'locked' && info.status !== 'locked_upcoming') return false;
        if (timeStatusFilter === 'closed' && info.status !== 'closed_expired') return false;
      }

      return true;
    });
  }, [activeSchedules, searchQuery, selectedDayFilter, selectedGradeFilter, selectedMajorFilter, timeStatusFilter, availablePackages, viewRole, systemNow, isSupervisorTimeBypass]);

  // Group schedules by day for "Format Roster Per Hari"
  const schedulesByDay = useMemo(() => {
    const grouped: Record<string, ExamScheduleItem[]> = {};
    filteredSchedules.forEach(item => {
      const key = item.dayName || 'Lainnya';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    const orderedDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const result: { dayName: string; dateDisplay: string; items: ExamScheduleItem[] }[] = [];

    orderedDays.forEach(day => {
      if (grouped[day] && grouped[day].length > 0) {
        const sorted = [...grouped[day]].sort((a, b) => {
          if (a.sessionNumber !== b.sessionNumber) return a.sessionNumber - b.sessionNumber;
          return a.startTime.localeCompare(b.startTime);
        });
        result.push({
          dayName: day,
          dateDisplay: sorted[0]?.dateDisplay || day,
          items: sorted,
        });
      }
    });

    Object.keys(grouped).forEach(day => {
      if (!orderedDays.includes(day) && grouped[day].length > 0) {
        result.push({
          dayName: day,
          dateDisplay: grouped[day][0]?.dateDisplay || day,
          items: grouped[day],
        });
      }
    });

    return result;
  }, [filteredSchedules]);

  // Copy Broadcast WhatsApp text (Admin only)
  const handleCopyWhatsAppSchedule = () => {
    let text = `📢 *JADWAL PELAKSANAAN UJIAN CBT & ASESMEN SUMATIF*\n`;
    text += `🏫 *${schoolInfo.schoolName}*\n`;
    text += `📍 ${schoolInfo.schoolAddress}\n`;
    text += `📅 ${schoolInfo.academicYear || 'Tahun Ajaran 2025/2026'}\n`;
    text += `═══════════════════════════════\n\n`;

    // Group by day
    const grouped: Record<string, ExamScheduleItem[]> = {};
    filteredSchedules.forEach(item => {
      if (!grouped[item.dateDisplay]) {
        grouped[item.dateDisplay] = [];
      }
      grouped[item.dateDisplay].push(item);
    });

    Object.entries(grouped).forEach(([dateStr, items]) => {
      text += `🗓️ *${dateStr.toUpperCase()}*\n`;
      items.forEach((it, idx) => {
        text += `   ${idx + 1}. *${it.subjectName}*\n`;
        text += `      🔑 Token Ujian: *${it.token || 'CBT-001'}*\n`;
        text += `      ⏰ Pukul: ${it.startTime} - ${it.endTime} WIB (${it.durationMinutes} Menit)\n`;
        text += `      👥 Sasaran: ${it.targetClass}\n`;
        text += `      📝 Butir Soal: ${it.totalQuestions} Soal | KKM: ${it.kkmScore}\n\n`;
      });
    });

    text += `📌 *Petunjuk Siswa:*\n`;
    text += `1. Buka portal ujian UJIANKU melalui link resmi SMAN 19 Bandung.\n`;
    text += `2. Masukkan NIS & Token Ujian sesuai mata pelajaran.\n`;
    text += `3. Dilarang meninggalkan aplikasi saat ujian berlangsung.\n`;
    text += `═══════════════════════════════\n`;
    text += `Panitia Asesmen CBT ${schoolInfo.schoolName}`;

    navigator.clipboard.writeText(text);
    setIsCopiedBroadcast(true);
    setTimeout(() => setIsCopiedBroadcast(false), 3000);
  };

  const handlePrintSchedule = () => {
    window.print();
  };

  // Find linked ExamPackage helper
  const getPackage = (packageId: string, scheduleItem?: ExamScheduleItem): ExamPackage | undefined => {
    let found = availablePackages.find(p => p.id === packageId);
    if (found) return found;

    if (scheduleItem?.subjectName) {
      const cleanSub = scheduleItem.subjectName.trim().toLowerCase();
      found = availablePackages.find(
        p => p.subject?.trim().toLowerCase() === cleanSub ||
             p.title.trim().toLowerCase().includes(cleanSub)
      );
      if (found) return found;
    }

    if (availablePackages.length > 0) {
      return availablePackages[0];
    }

    return undefined;
  };

  const isStudent = viewRole === 'student';

  // When in student mode, ensure all search/filters are clean so all scheduled exams are directly visible
  useEffect(() => {
    if (isStudent) {
      setSearchQuery('');
      setSelectedDayFilter('all');
      setSelectedGradeFilter('all');
      setSelectedMajorFilter('all');
      setTimeStatusFilter('all');
    }
  }, [isStudent]);

  // Logo Tap Count State for Switching from Student to Admin/Supervisor (Default: 3 ketukan)
  const [logoTapCount, setLogoTapCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGO_TAP_COUNT);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) return parsed;
      }
      if (securitySettings?.logoTapCount && securitySettings.logoTapCount >= 1) {
        return securitySettings.logoTapCount;
      }
    } catch (e) {}
    return 3;
  });

  const tapResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapCountRef = useRef<number>(0);
  const [activeTapCount, setActiveTapCount] = useState<number>(0);

  // Sync logoTapCount with Firebase
  useEffect(() => {
    loadSystemSettingFromFirebase<{ count: number }>('logo_tap_count').then(val => {
      if (val && typeof val.count === 'number' && val.count >= 1) {
        setLogoTapCount(val.count);
        try {
          localStorage.setItem(STORAGE_KEYS.LOGO_TAP_COUNT, String(val.count));
        } catch (e) {}
      }
    });

    const unsubTap = subscribeToSystemSetting<{ count: number }>('logo_tap_count', val => {
      if (val && typeof val.count === 'number' && val.count >= 1) {
        setLogoTapCount(val.count);
        try {
          localStorage.setItem(STORAGE_KEYS.LOGO_TAP_COUNT, String(val.count));
        } catch (e) {}
      }
    });

    return () => {
      unsubTap();
      if (tapResetTimerRef.current) {
        clearTimeout(tapResetTimerRef.current);
      }
    };
  }, []);

  const handleAdjustLogoTapCount = (delta: number) => {
    const nextCount = Math.max(1, Math.min(15, logoTapCount + delta));
    setLogoTapCount(nextCount);
    try {
      localStorage.setItem(STORAGE_KEYS.LOGO_TAP_COUNT, String(nextCount));
    } catch (e) {}
    saveSystemSettingToFirebase('logo_tap_count', { count: nextCount });
    if (securitySettings && onUpdateSecuritySettings) {
      onUpdateSecuritySettings({
        ...securitySettings,
        logoTapCount: nextCount,
      });
    }
    if (delta > 0) {
      setTokenActionToast(`🎯 Ketukan Logo Ditambah: Kini dibutuhkan ${nextCount} kali ketukan pada logo sekolah untuk beralih kembali dari Mode Ujian Siswa.`);
    } else {
      setTokenActionToast(`🎯 Ketukan Logo Diatur: Kini dibutuhkan ${nextCount} kali ketukan pada logo sekolah.`);
    }
    setTimeout(() => setTokenActionToast(null), 3500);
  };

  const handleResetLogoTapCount = () => {
    setLogoTapCount(3);
    try {
      localStorage.setItem(STORAGE_KEYS.LOGO_TAP_COUNT, '3');
    } catch (e) {}
    saveSystemSettingToFirebase('logo_tap_count', { count: 3 });
    if (securitySettings && onUpdateSecuritySettings) {
      onUpdateSecuritySettings({
        ...securitySettings,
        logoTapCount: 3,
      });
    }
    setTokenActionToast('🔄 Ketukan Logo Direset: Kembali ke bawaan 3 kali ketukan.');
    setTimeout(() => setTokenActionToast(null), 3000);
  };

  const handleLogoTap = () => {
    if (isStudent) {
      if (tapResetTimerRef.current) {
        clearTimeout(tapResetTimerRef.current);
      }
      const nextCount = tapCountRef.current + 1;
      tapCountRef.current = nextCount;
      setActiveTapCount(nextCount);

      if (nextCount >= logoTapCount) {
        tapCountRef.current = 0;
        setActiveTapCount(0);
        setTokenActionToast('🔓 Membuka akses guru/pengawas...');
        setTimeout(() => setTokenActionToast(null), 2500);
        handleRoleSwitch('admin');
      } else {
        // Reset after 2.2 seconds of inactivity
        tapResetTimerRef.current = setTimeout(() => {
          tapCountRef.current = 0;
          setActiveTapCount(0);
        }, 2200);
      }
    }
  };

  const themeClasses = useMemo(() => {
    if (!isStudent || studentTheme === 'dark') {
      return {
        isLight: false,
        wrapper: 'space-y-6 pb-16 animate-in fade-in duration-200 print:p-0 print:m-0 print:space-y-4',
        kopBg: 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-indigo-900/40 shadow-xl text-white',
        kopTitle: 'text-white',
        kopAddress: 'text-slate-300',
        kopNpsn: 'text-indigo-300',
        kopBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        kopSubtitle: 'text-slate-400',
        kopLine1: 'bg-indigo-500/80',
        kopLine2: 'bg-indigo-400/40',
        toolbarBg: 'bg-slate-900/90 border border-slate-800 text-slate-200',
        toolbarText: 'text-white',
        filterBg: 'bg-slate-900 border border-slate-800',
        filterTitle: 'text-white',
        cardBg: 'bg-slate-900',
        cardBorderOpen: 'border-emerald-500/50 hover:border-emerald-400 shadow-emerald-950/20',
        cardBorderLocked: 'border-amber-500/40 hover:border-amber-400 shadow-amber-950/10',
        cardBorderClosed: 'border-slate-800 hover:border-slate-700',
        cardText: 'text-white',
        cardSubText: 'text-slate-400',
        cardBox: 'bg-slate-950/80 border border-slate-800/80 text-slate-300',
        tableContainer: 'bg-slate-900 border border-slate-800 shadow-xl',
        tableThead: 'bg-slate-950 border-b border-slate-800 text-slate-300',
        tableRowEven: 'bg-slate-900',
        tableRowOdd: 'bg-slate-900/40',
        tableRowHover: 'hover:bg-slate-850/60',
        tableBorder: 'border-slate-800',
        tableTextMain: 'text-white',
        tableTextSub: 'text-slate-400',
        tableRosterHeaderBg: 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30',
        tableRosterHeaderText: 'text-white',
        tableSupervisorBg: 'bg-slate-900 border border-slate-800',
        tableSupervisorFooter: 'bg-slate-950 border border-slate-800 text-slate-300',
      };
    }

    if (studentTheme === 'white_clean') {
      return {
        isLight: true,
        wrapper: 'space-y-6 pb-16 animate-in fade-in duration-200 print:p-0 print:m-0 print:space-y-4 p-3 sm:p-5 rounded-3xl bg-slate-100/80 border border-slate-200 shadow-sm',
        kopBg: 'bg-white border-2 border-slate-300 shadow-sm text-slate-900',
        kopTitle: 'text-slate-900',
        kopAddress: 'text-slate-600',
        kopNpsn: 'text-slate-600 font-bold',
        kopBadge: 'bg-slate-100 text-slate-800 border-slate-300',
        kopSubtitle: 'text-slate-500',
        kopLine1: 'bg-slate-800',
        kopLine2: 'bg-slate-400',
        toolbarBg: 'bg-white border border-slate-200 text-slate-800 shadow-sm',
        toolbarText: 'text-slate-900',
        filterBg: 'bg-white border border-slate-200 shadow-sm',
        filterTitle: 'text-slate-900',
        cardBg: 'bg-white shadow-sm',
        cardBorderOpen: 'border-emerald-300 hover:border-emerald-500 shadow-emerald-100/50',
        cardBorderLocked: 'border-amber-300 hover:border-amber-500 shadow-amber-100/50',
        cardBorderClosed: 'border-slate-200 hover:border-slate-300',
        cardText: 'text-slate-900',
        cardSubText: 'text-slate-600',
        cardBox: 'bg-slate-50 border border-slate-200 text-slate-700',
        tableContainer: 'bg-white border border-slate-200 shadow-sm',
        tableThead: 'bg-slate-100 border-b border-slate-200 text-slate-800',
        tableRowEven: 'bg-white',
        tableRowOdd: 'bg-slate-50/70',
        tableRowHover: 'hover:bg-slate-100/80',
        tableBorder: 'border-slate-200',
        tableTextMain: 'text-slate-900',
        tableTextSub: 'text-slate-600',
        tableRosterHeaderBg: 'bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border border-slate-200 text-slate-900 shadow-sm',
        tableRosterHeaderText: 'text-slate-900',
        tableSupervisorBg: 'bg-white border border-slate-200 shadow-sm',
        tableSupervisorFooter: 'bg-slate-50 border border-slate-200 text-slate-700',
      };
    }

    if (studentTheme === 'white_blue') {
      return {
        isLight: true,
        wrapper: 'space-y-6 pb-16 animate-in fade-in duration-200 print:p-0 print:m-0 print:space-y-4 p-3 sm:p-5 rounded-3xl bg-blue-50/50 border border-blue-200 shadow-sm',
        kopBg: 'bg-gradient-to-b from-white via-white to-blue-50/60 border-2 border-blue-300 shadow-sm text-slate-900',
        kopTitle: 'text-blue-950',
        kopAddress: 'text-slate-600',
        kopNpsn: 'text-blue-600 font-bold',
        kopBadge: 'bg-blue-100 text-blue-900 border-blue-300',
        kopSubtitle: 'text-slate-500',
        kopLine1: 'bg-blue-600',
        kopLine2: 'bg-blue-300',
        toolbarBg: 'bg-white border border-blue-200 text-slate-800 shadow-sm',
        toolbarText: 'text-blue-950',
        filterBg: 'bg-white border border-blue-200 shadow-sm',
        filterTitle: 'text-blue-950',
        cardBg: 'bg-white shadow-sm',
        cardBorderOpen: 'border-emerald-300 hover:border-emerald-500 shadow-emerald-100/50',
        cardBorderLocked: 'border-amber-300 hover:border-amber-500 shadow-amber-100/50',
        cardBorderClosed: 'border-blue-100 hover:border-blue-200',
        cardText: 'text-slate-900',
        cardSubText: 'text-slate-600',
        cardBox: 'bg-blue-50/60 border border-blue-100 text-slate-700',
        tableContainer: 'bg-white border border-blue-200 shadow-sm',
        tableThead: 'bg-blue-100/80 border-b border-blue-200 text-blue-950',
        tableRowEven: 'bg-white',
        tableRowOdd: 'bg-blue-50/40',
        tableRowHover: 'hover:bg-blue-50',
        tableBorder: 'border-blue-100',
        tableTextMain: 'text-slate-900',
        tableTextSub: 'text-slate-600',
        tableRosterHeaderBg: 'bg-gradient-to-r from-blue-100/80 via-blue-50 to-blue-100/80 border border-blue-200 text-blue-950 shadow-sm',
        tableRosterHeaderText: 'text-blue-950',
        tableSupervisorBg: 'bg-white border border-blue-200 shadow-sm',
        tableSupervisorFooter: 'bg-blue-50/70 border border-blue-100 text-slate-700',
      };
    }

    // white_emerald
    return {
      isLight: true,
      wrapper: 'space-y-6 pb-16 animate-in fade-in duration-200 print:p-0 print:m-0 print:space-y-4 p-3 sm:p-5 rounded-3xl bg-emerald-50/40 border border-emerald-200 shadow-sm',
      kopBg: 'bg-gradient-to-b from-white via-white to-emerald-50/60 border-2 border-emerald-300 shadow-sm text-slate-900',
      kopTitle: 'text-emerald-950',
      kopAddress: 'text-slate-600',
      kopNpsn: 'text-emerald-600 font-bold',
      kopBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      kopSubtitle: 'text-slate-500',
      kopLine1: 'bg-emerald-600',
      kopLine2: 'bg-emerald-300',
      toolbarBg: 'bg-white border border-emerald-200 text-slate-800 shadow-sm',
      toolbarText: 'text-emerald-950',
      filterBg: 'bg-white border border-emerald-200 shadow-sm',
      filterTitle: 'text-emerald-950',
      cardBg: 'bg-white shadow-sm',
      cardBorderOpen: 'border-emerald-300 hover:border-emerald-500 shadow-emerald-100/50',
      cardBorderLocked: 'border-amber-300 hover:border-amber-500 shadow-amber-100/50',
      cardBorderClosed: 'border-emerald-100 hover:border-emerald-200',
      cardText: 'text-slate-900',
      cardSubText: 'text-slate-600',
      cardBox: 'bg-emerald-50/60 border border-emerald-100 text-slate-700',
      tableContainer: 'bg-white border border-emerald-200 shadow-sm',
      tableThead: 'bg-emerald-100/80 border-b border-emerald-200 text-emerald-950',
      tableRowEven: 'bg-white',
      tableRowOdd: 'bg-emerald-50/40',
      tableRowHover: 'hover:bg-emerald-50',
      tableBorder: 'border-emerald-100',
      tableTextMain: 'text-slate-900',
      tableTextSub: 'text-slate-600',
      tableRosterHeaderBg: 'bg-gradient-to-r from-emerald-100/80 via-emerald-50 to-emerald-100/80 border border-emerald-200 text-emerald-950 shadow-sm',
      tableRosterHeaderText: 'text-emerald-950',
      tableSupervisorBg: 'bg-white border border-emerald-200 shadow-sm',
      tableSupervisorFooter: 'bg-emerald-50/70 border border-emerald-100 text-slate-700',
    };
  }, [isStudent, studentTheme]);

  return (
    <div id="exam-schedule-list-view" className={themeClasses.wrapper}>
      {/* Floating Notification Toast */}
      {tokenActionToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900/95 border border-amber-500/50 text-white text-xs sm:text-sm font-semibold shadow-2xl shadow-amber-950/40 backdrop-blur-md animate-in slide-in-from-top-4 duration-200 print:hidden">
          <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{tokenActionToast}</span>
          <button
            type="button"
            onClick={() => setTokenActionToast(null)}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 0. UNIFIED TOP BAR: KEMBALI, MENU ALAT, ICON AKTIF SEJAJAR DENGAN BAGIKAN LINK */}
      {/* ========================================================================= */}
      {!isStudent && (
        <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-2 print:hidden relative z-20">
          {/* Left Group: Tombol Kembali, Menu Alat, Icon Aktif, dan Pratinjau Layar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* 1. Tombol Kembali */}
            <button
              type="button"
              id="btn-back-dashboard-from-schedule"
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all shadow-sm cursor-pointer group shrink-0"
              title="Kembali ke Dashboard Utama"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>KEMBALI</span>
            </button>

            {/* 2. Menu Alat (Terpadu dengan Popover Ringkas) */}
            <div className="relative" ref={scheduleToolsMenuRef}>
              <button
                type="button"
                id="btn-schedule-tools-unified-menu"
                onClick={() => setIsScheduleToolsMenuOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                  isScheduleToolsMenuOpen
                    ? 'bg-indigo-600 text-white border-indigo-400 ring-1 ring-indigo-500/40'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700 hover:border-indigo-500/40'
                }`}
                title="Menu Lengkap Alat & Pengaturan Jadwal Ujian"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Menu Alat</span>

                {/* Status Indicator Badges */}
                <div className="flex items-center gap-1 ml-0.5">
                  {isGlobalTokenRequiredState ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Token Wajib" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Bebas Masuk Tanpa Token" />
                  )}
                  {isFreeMode && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Mode Bebas Aktif" />
                  )}
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isScheduleToolsMenuOpen ? 'rotate-180 text-white' : ''}`} />
                </div>
              </button>

              {/* Dropdown Menu Ringkas & Ramping */}
              {isScheduleToolsMenuOpen && (
                <div
                  id="popover-schedule-tools-menu"
                  className="fixed inset-x-3 bottom-3 sm:bottom-auto sm:inset-x-auto sm:absolute sm:left-0 sm:top-full sm:mt-1.5 w-[calc(100vw-1.5rem)] max-w-[330px] sm:w-[330px] max-h-[65vh] sm:max-h-[460px] flex flex-col rounded-xl bg-slate-900/95 border border-slate-750 shadow-xl shadow-black/90 backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-1.5 duration-150 overflow-hidden text-xs"
                >
                  {/* Header Panel */}
                  <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                        <SlidersHorizontal className="w-3 h-3" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Menu Alat Jadwal</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsScheduleToolsMenuOpen(false)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Tutup Menu"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Body List Scrollable */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 divide-y divide-slate-800/60">
                    {/* Section 1: Navigasi & Bantuan */}
                    <div className="space-y-1 pt-0.5">
                      <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider px-1">
                        Navigasi & Bantuan
                      </p>

                      {/* Kembali ke Dashboard */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsScheduleToolsMenuOpen(false);
                          onBackToDashboard();
                        }}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-indigo-500/40 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                            <ArrowLeft className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 group-hover:text-white text-xs">Kembali ke Dashboard</p>
                            <p className="text-[9px] text-slate-400 truncate">Menuju beranda utama</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 shrink-0 ml-1" />
                      </button>

                      {/* Buku Panduan */}
                      {onOpenHelpModal && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsScheduleToolsMenuOpen(false);
                            onOpenHelpModal();
                          }}
                          className="w-full flex items-center justify-between p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-amber-500/40 transition-all text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                              <HelpCircle className="w-3 h-3" />
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-slate-200 group-hover:text-white text-xs">Buku Panduan</p>
                              <p className="text-[9px] text-slate-400 truncate">Petunjuk tombol & aturan ujian</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-amber-400 shrink-0 ml-1" />
                        </button>
                      )}
                    </div>

                    {/* Section 2: Keamanan Token & Akses Guru */}
                    <div className="space-y-1 pt-1.5">
                      <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider px-1">
                        Token & Akses
                      </p>

                      {/* Status Token Ujian (Wajib / Bebas) */}
                      <div className="p-1.5 rounded-lg bg-slate-850 border border-slate-750 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                            <KeyRound className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 text-xs">Status Token</p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {isGlobalTokenRequiredState ? 'Wajib diisi siswa' : 'Bebas tanpa token'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          id="btn-menu-toggle-token"
                          onClick={handleToggleGlobalTokenRequired}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer shrink-0 active:scale-95 border ${
                            isGlobalTokenRequiredState
                              ? 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {isGlobalTokenRequiredState ? 'Wajib' : 'Bebas'}
                        </button>
                      </div>

                      {/* Acak Semua Token */}
                      <div className="p-1.5 rounded-lg bg-slate-850 border border-slate-750 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0">
                            <RefreshCw className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 text-xs">Acak Semua Token</p>
                            <p className="text-[9px] text-slate-400 truncate">Generate token baru semua mapel</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          id="btn-menu-randomize-tokens"
                          onClick={handleRegenerateAllTokens}
                          className="px-2 py-0.5 rounded bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95 shrink-0"
                        >
                          Acak
                        </button>
                      </div>

                      {/* Sembunyikan Mode Guru */}
                      <div className="p-1.5 rounded-lg bg-slate-850 border border-slate-750 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                            isHideAdminNavActive
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-slate-700/40 text-slate-300 border-slate-600/40'
                          }`}>
                            <EyeOff className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 text-xs">Akses Guru</p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {isHideAdminNavActive ? 'Disembunyikan dari siswa' : 'Tampil di layar siswa'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          id="btn-menu-toggle-hide-admin"
                          onClick={handleToggleHideAdminNav}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer shrink-0 active:scale-95 border ${
                            isHideAdminNavActive
                              ? 'bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border-rose-500/40'
                              : 'bg-slate-700/50 hover:bg-slate-750 text-slate-300 border-slate-600'
                          }`}
                        >
                          {isHideAdminNavActive ? 'Sembunyi' : 'Tampil'}
                        </button>
                      </div>

                      {/* Proteksi PIN Mode Guru */}
                      <div className="p-1.5 rounded-lg bg-slate-850 border border-slate-750 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                            securitySettings?.enableSupervisorPin !== false
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                          }`}>
                            <Lock className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 text-xs">PIN Mode Guru</p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {securitySettings?.enableSupervisorPin !== false
                                ? `Aktif (${securitySettings?.supervisorPin || '1234'})`
                                : 'Nonaktif (Bebas Akses)'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          id="btn-menu-toggle-supervisor-pin"
                          onClick={() => {
                            const isCurrentlyActive = securitySettings?.enableSupervisorPin !== false;
                            const nextVal = !isCurrentlyActive;
                            const updated = {
                              ...(securitySettings || {
                                validationMode: 'open',
                                enforceSingleSession: true,
                                sessionTimeoutMinutes: 60,
                                allowSupervisorUnlock: true,
                                supervisorPin: '1234',
                                autoFillClassAndName: true,
                              }),
                              enableSupervisorPin: nextVal,
                            };
                            if (onUpdateSecuritySettings) {
                              onUpdateSecuritySettings(updated);
                            }
                            setTokenActionToast(
                              nextVal
                                ? '🔒 PIN Mode Guru DIAKTIFKAN: Masuk Mode Guru kini meminta PIN.'
                                : '🔓 PIN Mode Guru DINONAKTIFKAN: Mode Guru bebas diakses tanpa PIN.'
                            );
                            setTimeout(() => setTokenActionToast(null), 3000);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer shrink-0 active:scale-95 border ${
                            securitySettings?.enableSupervisorPin !== false
                              ? 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border-amber-500/40'
                              : 'bg-slate-700/50 hover:bg-slate-750 text-slate-300 border-slate-600'
                          }`}
                        >
                          {securitySettings?.enableSupervisorPin !== false ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </div>

                      {/* Ketukan Logo Pengawas */}
                      <div className="p-1.5 rounded-lg bg-slate-850 border border-slate-750 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                            <Fingerprint className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 text-xs">Ketukan Logo</p>
                            <p className="text-[9px] text-slate-400 truncate">{logoTapCount}x ketuk untuk admin</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAdjustLogoTapCount(-1)}
                            disabled={logoTapCount <= 1}
                            className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-[10px] font-bold cursor-pointer flex items-center justify-center transition-colors"
                            title="Kurangi 1 ketukan"
                          >
                            -
                          </button>
                          <span className="w-4 text-center font-bold text-white text-[11px]">{logoTapCount}</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustLogoTapCount(1)}
                            className="w-5 h-5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer flex items-center justify-center transition-colors"
                            title="Tambah 1 ketukan"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Pengaturan Jadwal & Tampilan */}
                    <div className="space-y-1 pt-1.5">
                      <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider px-1">
                        Mode Ujian & Pengaturan
                      </p>

                      {/* Mode Ujian (Normal vs Bebas) */}
                      <div className="p-1.5 rounded-lg bg-slate-850 border border-slate-750 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                            !isFreeMode
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {!isFreeMode ? <Clock className="w-3 h-3" /> : <Zap className="w-3 h-3 animate-pulse" />}
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 text-xs">
                              {!isFreeMode ? 'Mode Normal' : 'Mode Bebas'}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {!isFreeMode ? 'Jadwal & timer aktif' : 'Bypass seluruh kunci'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          id="btn-menu-toggle-exam-mode"
                          onClick={() => handleToggleSupervisorTimeBypass()}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer shrink-0 active:scale-95 border ${
                            !isFreeMode
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {!isFreeMode ? 'Bebas' : 'Normal'}
                        </button>
                      </div>

                      {/* Atur Tampilan Siswa */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsScheduleToolsMenuOpen(false);
                          setIsStudentVisibilityModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-indigo-500/40 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                            <Eye className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 group-hover:text-white text-xs">Tampilan Siswa</p>
                            <p className="text-[9px] text-slate-400 truncate">Pilih mapel tampil / sembunyi</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 shrink-0 ml-1" />
                      </button>

                      {/* Impor Otomatis Mapel */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsScheduleToolsMenuOpen(false);
                          setIsAutoImportModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-emerald-500/40 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <Sparkles className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 group-hover:text-white text-xs">Impor Otomatis Mapel</p>
                            <p className="text-[9px] text-slate-400 truncate">Muat paket dari bank mapel</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 shrink-0 ml-1" />
                      </button>

                      {/* Ubah Kop Sekolah & Logo */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsScheduleToolsMenuOpen(false);
                          setTempSchoolInfo(schoolInfo);
                          setIsEditingSchoolInfo(true);
                        }}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-indigo-500/40 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                            <Building2 className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 group-hover:text-white text-xs">Ubah Kop & Logo</p>
                            <p className="text-[9px] text-slate-400 truncate">Nama sekolah, alamat & logo</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 shrink-0 ml-1" />
                      </button>
                    </div>

                    {/* Section 4: Cetak & Distribusi */}
                    <div className="space-y-1 pt-1.5">
                      <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider px-1">
                        Cetak & Distribusi
                      </p>

                      {/* Cetak Jadwal Resmi */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsScheduleToolsMenuOpen(false);
                          handlePrintSchedule();
                        }}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-blue-500/40 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <Printer className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 group-hover:text-white text-xs">Cetak Jadwal / PDF</p>
                            <p className="text-[9px] text-slate-400 truncate">Dokumen resmi pengawas</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 shrink-0 ml-1" />
                      </button>

                      {/* Salin Teks ke WhatsApp */}
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyWhatsAppSchedule();
                        }}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-emerald-500/40 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            {isCopiedBroadcast ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 group-hover:text-white text-xs">
                              {isCopiedBroadcast ? 'Tersalin!' : 'Salin ke WhatsApp'}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">Format teks siap kirim grup WA</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 shrink-0">
                          {isCopiedBroadcast ? '✓ Berhasil' : 'Salin'}
                        </span>
                      </button>

                      {/* Reset Jadwal */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsScheduleToolsMenuOpen(false);
                          setIsClearConfirmOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
                            <RefreshCw className="w-3 h-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-rose-200 group-hover:text-rose-100 text-xs">Reset Jadwal</p>
                            <p className="text-[9px] text-rose-300/80 truncate">Kembalikan ke standar / kosongkan</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-rose-400 shrink-0 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Icon Aktif (Mode Ujian: Normal Aktif vs Bebas Bypass - Cukup Icon Saja) */}
            <button
              type="button"
              id="btn-quick-exam-mode-toggle"
              onClick={() => handleToggleSupervisorTimeBypass()}
              className={`w-7.5 h-7.5 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border text-xs font-semibold transition-all active:scale-95 cursor-pointer touch-manipulation shrink-0 ${
                !isFreeMode
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border-emerald-500/40 shadow-sm'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border-amber-500/50 shadow-sm'
              }`}
              title={
                !isFreeMode
                  ? 'Mode Normal: Waktu jadwal & timer aktif, NIS bebas dapat login. Klik untuk beralih ke Mode Bebas.'
                  : 'Mode Bebas: Seluruh jadwal terbuka instan. Klik untuk kembali ke Mode Normal (Waktu Aktif, NIS Bebas).'
              }
              aria-label={!isFreeMode ? 'Mode Normal' : 'Mode Bebas'}
            >
              {!isFreeMode ? (
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              )}
            </button>

            {/* 4. Icon Bagikan Link Daftar Ujian (Cukup Icon Saja, Sejajar dengan Icon Aktif) */}
            <button
              type="button"
              id="btn-share-schedule-list"
              onClick={() => setIsShareScheduleModalOpen(true)}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer touch-manipulation shrink-0"
              title="Bagikan Link Daftar Ujian"
              aria-label="Bagikan Link Daftar Ujian"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Pratinjau Layar: Mode Guru / Mode Siswa Switcher Tabs */}
            <div className="flex items-center p-0.5 sm:p-1 rounded-lg bg-slate-950 border border-slate-800 shadow-inner shrink-0">
              <button
                type="button"
                id="role-switch-admin"
                onClick={() => handleRoleSwitch('admin')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewRole === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                <span className="hidden lg:inline">1. Mode Guru / Pengawas</span>
                <span className="lg:hidden">Mode Guru</span>
              </button>

              <button
                type="button"
                id="role-switch-student"
                onClick={() => handleRoleSwitch('student')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  (viewRole as string) === 'student'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="hidden lg:inline">2. Mode Ujian Siswa</span>
                <span className="lg:hidden">Mode Siswa</span>
              </button>
            </div>
          </div>

          {/* Right Group: Shortcuts Aksi */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Shortcut Impor Otomatis (Desktop) */}
            <button
              type="button"
              id="btn-auto-import-schedule-catalog"
              onClick={() => setIsAutoImportModalOpen(true)}
              className="hidden md:flex w-7.5 h-7.5 sm:w-8 sm:h-8 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer touch-manipulation shrink-0"
              title="Impor Otomatis Mapel"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </button>

            {/* Shortcut Salin WA (Desktop) */}
            <button
              type="button"
              id="btn-copy-wa-schedule"
              onClick={handleCopyWhatsAppSchedule}
              className="hidden lg:flex items-center gap-1.5 px-2.5 h-7.5 sm:h-8 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer"
              title="Salin Jadwal Teks Lengkap dengan Token ke WhatsApp"
            >
              {isCopiedBroadcast ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden xl:inline">{isCopiedBroadcast ? 'Tersalin' : 'Salin WA'}</span>
            </button>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* KOP RESMI CETAK (HANYA MUNCUL KETIKA CETAK JADWAL RESMI) */}
      {/* ========================================================================= */}
      <div id="school-kop-header-print" className="hidden print:block text-center pt-2 pb-4">
        <div className="flex flex-col items-center justify-center space-y-2">
          <SchoolLogoBadge logoUrl={schoolInfo.schoolLogo} className="w-16 h-16 object-contain" />
          <h1 className="text-xl font-extrabold uppercase text-black">{schoolInfo.schoolName}</h1>
          <p className="text-xs text-gray-800 max-w-2xl mx-auto">{schoolInfo.schoolAddress}</p>
          {schoolInfo.schoolNpsn && <p className="text-[11px] font-semibold text-gray-700">{schoolInfo.schoolNpsn}</p>}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black text-xs font-bold uppercase mt-1 text-black">
            DAFTAR JADWAL UJIAN BERBASIS KOMPUTER (CBT) & ASESMEN SUMATIF
          </div>
          <p className="text-xs font-semibold text-gray-700">{schoolInfo.academicYear || 'Tahun Ajaran 2025/2026'}</p>
          <div className="w-full pt-2">
            <div className="w-full h-1 bg-black rounded-full" />
            <div className="w-2/3 h-0.5 bg-black rounded-full mt-1 mx-auto" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERINGATAN KETIKA SELURUH LINK DINONAKTIFKAN (MODE SISWA) */}
      {/* ========================================================================= */}
      {isStudent && areAllLinksDisabled && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/80 border-2 border-rose-500/80 text-rose-200 shadow-xl space-y-2 animate-pulse print:hidden">
          <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base text-rose-300">
            <Lock className="w-5 h-5 text-rose-400 shrink-0" />
            <span>AKSES LINK UJIAN SISWA SEDANG DINONAKTIFKAN OLEH PANITIA</span>
          </div>
          <p className="text-xs sm:text-sm text-rose-300/90 leading-relaxed">
            Pengawas atau Panitia Ujian saat ini sedang menonaktifkan seluruh akses link pengerjaan ujian. Anda belum dapat memulai pengerjaan soal sampai tautan diaktifkan kembali.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE SISWA: HEADER IDENTITAS SEKOLAH RINGKAS (MINIMALIS & LANGSUNG KE JADWAL) */}
      {/* Status Link, Filter Jadwal, dan Waktu Sistem CBT disembunyikan agar jadwal langsung terlihat */}
      {/* ========================================================================= */}
      {isStudent ? (
        <div
          id="student-school-header-compact"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg print:hidden"
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              id="btn-school-logo-supervisor-unlock"
              onClick={handleLogoTap}
              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 border border-amber-400/40 p-1 shadow-sm flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Logo Resmi Sekolah (Ketuk untuk verifikasi pengawas)"
            >
              <SchoolLogoBadge logoUrl={schoolInfo.schoolLogo} className="w-full h-full object-contain" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xs sm:text-sm font-extrabold text-white tracking-tight uppercase truncate">
                  {schoolInfo.schoolName || 'SMAN 19'}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {schoolInfo.academicYear || 'TA 2025/2026'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Daftar Jadwal Ujian Berbasis Komputer (CBT) & Asesmen Sumatif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end shrink-0">
            {/* Pengalih Format Tampilan Kartu / Tabel Langsung di Header */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs ${
                  viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilan Format Kartu"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kartu</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer text-xs ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilan Format Tabel"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{filteredSchedules.length} Mapel</span>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SATU BARIS KOTAK TERHUBUNG: KOLOM LOGO, STATUS AKSES, FILTER JADWAL, WAKTU */
        /* HANYA UNTUK MODE ADMIN / PENGAWAS */
        /* ========================================================================= */
        <div
          id="unified-schedule-control-bar"
          className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden transition-all print:hidden"
        >
          {/* Strip Aksen Dekoratif Atas */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-amber-500 opacity-90" />

          {/* Baris Kotak Terhubung yang Menghubungkan 4 Kolom Utama */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
            
            {/* 1. KOLOM LOGO & IDENTITAS SEKOLAH */}
            <div id="col-school-logo" className="p-4 sm:p-5 flex flex-col justify-between space-y-3 bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <School className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. Identitas Sekolah</span>
                  </div>
                  {schoolInfo.schoolNpsn && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {schoolInfo.schoolNpsn}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    id="btn-school-logo-supervisor-unlock"
                    onClick={handleLogoTap}
                    className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-950/90 border-2 border-amber-400/40 p-1.5 shadow-lg flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                    title="Logo Resmi Sekolah (Ketuk untuk verifikasi pengawas)"
                  >
                    <SchoolLogoBadge logoUrl={schoolInfo.schoolLogo} className="w-full h-full object-contain" />
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight uppercase leading-snug line-clamp-1">
                      {schoolInfo.schoolName || 'SMAN 19'}
                    </h1>
                    <p className="text-[11px] text-slate-400 line-clamp-1 leading-tight">
                      {schoolInfo.schoolAddress || 'CBT & Asesmen Sumatif'}
                    </p>
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      <span>{schoolInfo.academicYear || 'TA 2025/2026'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate">Sistem CBT Terpadu</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Aktif
                </span>
              </div>
            </div>

            {/* 2. KOLOM STATUS AKSES */}
            <div id="col-access-status" className="p-4 sm:p-5 flex flex-col justify-between space-y-3 bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. Status Akses Link</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    areAllLinksDisabled
                      ? 'bg-rose-950/90 text-rose-300 border-rose-500/60'
                      : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                  }`}>
                    {areAllLinksDisabled ? '🔴 Dinonaktifkan' : '🟢 Link Aktif'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                      areAllLinksDisabled
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    }`}>
                      {areAllLinksDisabled ? <Lock className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {areAllLinksDisabled ? 'Akses Siswa Tertutup' : 'Akses Siswa Terbuka'}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {areAllLinksDisabled
                          ? 'Siswa tidak dapat masuk link pengerjaan'
                          : 'Siswa dapat membuka tautan & ujian'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Action Buttons in Column 2 */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center gap-1.5 flex-wrap">
                {onToggleDisableAllLinks && (
                  <button
                    type="button"
                    id="btn-toggle-disable-all-links"
                    onClick={() => {
                      onToggleDisableAllLinks(!areAllLinksDisabled);
                      setTokenActionToast(
                        !areAllLinksDisabled
                          ? '🔒 Seluruh link ujian siswa berhasil DINONAKTIFKAN.'
                          : '🟢 Seluruh link ujian siswa berhasil DIAKTIFKAN KEMBALI.'
                      );
                      setTimeout(() => setTokenActionToast(null), 3500);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
                      areAllLinksDisabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                    title={areAllLinksDisabled ? 'Aktifkan kembali seluruh link' : 'Nonaktifkan seluruh link ujian siswa'}
                  >
                    {areAllLinksDisabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{areAllLinksDisabled ? 'Aktifkan' : 'Kunci'}</span>
                  </button>
                )}

                {onRegenerateAllLinks && (
                  <button
                    type="button"
                    id="btn-regenerate-all-links"
                    onClick={() => {
                      onRegenerateAllLinks();
                      setTokenActionToast('🔄 Seluruh link dan token ujian baru berhasil diperbarui.');
                      setTimeout(() => setTokenActionToast(null), 3500);
                    }}
                    className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    title="Acak token & perbarui link"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  id="btn-open-student-cards-modal"
                  onClick={() => setIsStudentCardModalOpen(true)}
                  className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  title="Cetak Kartu Peserta Ujian"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. KOLOM FILTER JADWAL */}
            <div id="col-schedule-filter" className="p-4 sm:p-5 flex flex-col justify-between space-y-3 bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Filter Jadwal</span>
                  </div>
                  <button
                    type="button"
                    id={isFilterLocked ? 'btn-toggle-unlock-filter' : 'btn-toggle-lock-filter'}
                    onClick={() => handleToggleFilterLock(!isFilterLocked)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      isFilterLocked
                        ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border-emerald-400/50'
                    }`}
                    title={isFilterLocked ? 'Buka pengaturan filter' : 'Kunci kriteria filter'}
                  >
                    {isFilterLocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                    <span>{isFilterLocked ? 'Buka' : 'Kunci'}</span>
                  </button>
                </div>

                {/* Active Filter Criteria Chips */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 flex-wrap text-[10px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800 font-bold">
                      <Calendar className="w-2.5 h-2.5 text-amber-400" />
                      {selectedDayFilter === 'all' ? 'Semua Hari' : selectedDayFilter}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800 font-bold">
                      <Users className="w-2.5 h-2.5 text-indigo-400" />
                      {selectedGradeFilter === 'all' ? 'Semua Kls' : `Kls ${selectedGradeFilter}`}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800 font-bold">
                      <BookOpen className="w-2.5 h-2.5 text-cyan-400" />
                      {selectedMajorFilter === 'all' ? 'Semua Jur' : selectedMajorFilter}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800 font-bold">
                      {viewMode === 'table' ? <TableIcon className="w-2.5 h-2.5 text-cyan-400" /> : <LayoutGrid className="w-2.5 h-2.5 text-purple-400" />}
                      {viewMode === 'cards' ? 'Kartu' : viewMode === 'table' ? 'Tabel' : 'Semua'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-0.5">
                    Tersedia <strong className="text-white">{filteredSchedules.length}</strong> jadwal mapel
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => handleToggleFilterLock(false)}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Filter className="w-3 h-3" />
                  <span>{isFilterLocked ? 'Atur Kriteria...' : 'Pengaturan Terbuka'}</span>
                </button>
                <span className="text-slate-400 text-[10px]">
                  {isFilterLocked ? '🔒 Terkunci' : '🔓 Fleksibel'}
                </span>
              </div>
            </div>

            {/* 4. KOLOM WAKTU */}
            <div id="col-system-time" className="p-4 sm:p-5 flex flex-col justify-between space-y-3 bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">4. Waktu Sistem CBT</span>
                  </div>
                  <button
                    type="button"
                    id="btn-toggle-supervisor-bypass"
                    onClick={() => handleToggleSupervisorTimeBypass()}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      isSupervisorTimeBypass
                        ? 'bg-amber-600/30 text-amber-200 border-amber-500/50'
                        : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                    }`}
                    title={isSupervisorTimeBypass ? 'Mode Bebas Aktif' : 'Mode Normal Aktif'}
                  >
                    {isSupervisorTimeBypass ? (
                      <>
                        <Zap className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                        <span>Bebas</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Normal</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Real-time Clock */}
                <div className="space-y-1">
                  <div className="text-base sm:text-lg font-black text-amber-300 font-mono tracking-wide flex items-center gap-1.5">
                    <span>
                      {systemNow.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">WIB</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {systemNow.toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Time status filter chips */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTimeStatusFilter('all')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      timeStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Semua ({timeStats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeStatusFilter('open')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      timeStatusFilter === 'open' ? 'bg-emerald-600 text-white' : 'text-emerald-400'
                    }`}
                  >
                    Buka ({timeStats.open})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeStatusFilter('locked')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      timeStatusFilter === 'locked' ? 'bg-amber-600 text-white' : 'text-amber-400'
                    }`}
                  >
                    Kunci ({timeStats.locked})
                  </button>
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">WIB Online</span>
              </div>
            </div>

          </div>

          {/* Expandable Detailed Filter Drawer when isFilterLocked is false */}
          {!isFilterLocked && (
            <div className="p-4 sm:p-5 border-t border-slate-800/90 bg-slate-950/70 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Row 1: Search Bar & Clear */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Pencarian: Cari mata pelajaran, token, pengawas, ruang ujian..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeSchedules.length > 0 && (
                    <button
                      type="button"
                      id="btn-clear-all-schedules"
                      onClick={() => setIsClearConfirmOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition-all cursor-pointer"
                      title="Kosongkan seluruh jadwal ujian saat ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Kosongkan</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Filter Selectors (Hari, Kelas, Jurusan, Format) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Pilih Hari */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pilih Hari Ujian</span>
                  </label>
                  <select
                    id="select-day-filter"
                    value={selectedDayFilter}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedDayFilter(val);
                      persistFilterState(isFilterLocked, val, selectedGradeFilter, selectedMajorFilter, viewMode, tableFormat);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="all">📅 Semua Hari</option>
                    <option value="Senin">Senin (Hari Pertama)</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                  </select>
                </div>

                {/* 2. Pilih Kelas */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Pilih Tingkat Kelas</span>
                  </label>
                  <select
                    id="select-grade-filter"
                    value={selectedGradeFilter}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedGradeFilter(val);
                      persistFilterState(isFilterLocked, selectedDayFilter, val, selectedMajorFilter, viewMode, tableFormat);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="all">👥 Semua Tingkat Kelas</option>
                    <option value="10">Kelas 10 (Fase E)</option>
                    <option value="11">Kelas 11 (Fase F)</option>
                    <option value="12">Kelas 12 (Fase F Akhir)</option>
                  </select>
                </div>

                {/* 3. Pilih Jurusan */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Pilih Jurusan / Peminatan</span>
                  </label>
                  <select
                    id="select-major-filter"
                    value={selectedMajorFilter}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedMajorFilter(val);
                      persistFilterState(isFilterLocked, selectedDayFilter, selectedGradeFilter, val, viewMode, tableFormat);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="all">🔬 Semua Jurusan</option>
                    <option value="MIPA">MIPA / Sains</option>
                    <option value="IPS">IPS / Sosial</option>
                    <option value="Bahasa">Bahasa & Budaya</option>
                    <option value="Umum">Umum / Wajib</option>
                  </select>
                </div>

                {/* 4. Format Tampilan */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                    <span>Format Tampilan</span>
                  </label>
                  <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-700">
                    <button
                      type="button"
                      id="btn-mode-cards"
                      onClick={() => {
                        setViewMode('cards');
                        persistFilterState(isFilterLocked, selectedDayFilter, selectedGradeFilter, selectedMajorFilter, 'cards', tableFormat);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'cards'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3 h-3" />
                      <span>Kartu</span>
                    </button>
                    <button
                      type="button"
                      id="btn-mode-table"
                      onClick={() => {
                        setViewMode('table');
                        persistFilterState(isFilterLocked, selectedDayFilter, selectedGradeFilter, selectedMajorFilter, 'table', tableFormat);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <TableIcon className="w-3 h-3" />
                      <span>Tabel</span>
                    </button>
                    <button
                      type="button"
                      id="btn-mode-both"
                      onClick={() => {
                        setViewMode('both');
                        persistFilterState(isFilterLocked, selectedDayFilter, selectedGradeFilter, selectedMajorFilter, 'both', tableFormat);
                      }}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'both'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub Row: Opsi Format Tabel */}
              {(viewMode === 'table' || viewMode === 'both') && (
                <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-200">
                        Pilihan Format Tabel Ujian:
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        id="btn-opt-table-standard"
                        onClick={() => {
                          setTableFormat('standard');
                          persistFilterState(isFilterLocked, selectedDayFilter, selectedGradeFilter, selectedMajorFilter, viewMode, 'standard');
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          tableFormat === 'standard'
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border-slate-700'
                        }`}
                      >
                        <LayoutList className="w-3 h-3" />
                        <span>Standar</span>
                      </button>
                      <button
                        type="button"
                        id="btn-opt-table-compact"
                        onClick={() => {
                          setTableFormat('compact');
                          persistFilterState(isFilterLocked, selectedDayFilter, selectedGradeFilter, selectedMajorFilter, viewMode, 'compact');
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          tableFormat === 'compact'
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border-slate-700'
                        }`}
                      >
                        <AlignLeft className="w-3 h-3" />
                        <span>Ringkas</span>
                      </button>
                      <button
                        type="button"
                        id="btn-opt-table-roster-day"
                        onClick={() => {
                          setTableFormat('roster_day');
                          persistFilterState(isFilterLocked, selectedDayFilter, selectedGradeFilter, selectedMajorFilter, viewMode, 'roster_day');
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          tableFormat === 'roster_day'
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border-slate-700'
                        }`}
                      >
                        <CalendarDays className="w-3 h-3" />
                        <span>Roster Per Hari</span>
                      </button>
                      <button
                        type="button"
                        id="btn-opt-table-supervisor"
                        onClick={() => {
                          setTableFormat('supervisor');
                          persistFilterState(isFilterLocked, selectedDayFilter, selectedGradeFilter, selectedMajorFilter, viewMode, 'supervisor');
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          tableFormat === 'supervisor'
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border-slate-700'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Pengawas</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Row 3: Presets & Lock Button */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400">Preset:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Senin', '10', 'MIPA', 'cards')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                  >
                    ⚡ X-MIPA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Senin', '11', 'MIPA', 'cards')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                  >
                    ⚡ XI-MIPA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Senin', '12', 'MIPA', 'cards')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                  >
                    ⚡ XII-MIPA
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    🔄 Reset
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleFilterLock(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer ml-auto"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Selesai & Kunci Filter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PEMISAH JELAS ANTARA PANEL KONTROL HEADER DAN DAFTAR JADWAL UJIAN (MODE GURU/ADMIN) */}
      {/* Memberi kesan terpisah secara visual antara header/kontrol dan jadwal */}
      {/* ========================================================================= */}
      {!isStudent && (
        <div id="schedule-section-separator" className="pt-2 pb-1 print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight uppercase">
                    Daftar Jadwal Ujian Resmi CBT
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black">
                    {filteredSchedules.length} Mapel
                  </span>
                  {timeStatusFilter !== 'all' && (
                    <span className="text-xs text-amber-400 font-semibold">
                      • Filter Waktu: {timeStatusFilter === 'open' ? 'Terbuka' : timeStatusFilter === 'locked' ? 'Terkunci' : 'Selesai'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedDayFilter !== 'all' ? `Hari: ${selectedDayFilter} • ` : ''}
                  {selectedGradeFilter !== 'all' ? `Kelas ${selectedGradeFilter} • ` : ''}
                  {selectedMajorFilter !== 'all' ? `Jurusan ${selectedMajorFilter} • ` : ''}
                  Tampilan {viewMode === 'table' ? 'Tabel' : viewMode === 'cards' ? 'Kartu' : 'Kartu & Tabel'}
                </p>
              </div>
            </div>

            {/* Switcher Tampilan Cepat & Status Indikator Sistem */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
              <div className="flex items-center p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Tampilan Format Kartu"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kartu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Tampilan Format Tabel"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tabel</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-semibold text-[11px]">Sistem Online</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State: No Schedules Configured Yet */}
      {activeSchedules.length === 0 && (
        <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-dashed border-cyan-500/30 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl space-y-6 my-6">
          <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-lg shadow-cyan-950/50">
            <FolderDown className="w-10 h-10 text-cyan-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Daftar Jadwal Ujian Belum Ditetapkan
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Pilih dan impor jadwal ujian secara otomatis dari katalog mapel, atur distribusi hari dan sesi, atau pilih paket soal yang ingin ditampilkan untuk siswa.
            </p>
          </div>

          {!isStudent ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                id="btn-empty-auto-import-catalog"
                onClick={() => setIsAutoImportModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Impor</span>
              </button>

              <button
                type="button"
                onClick={handleLoadDefaultPreset}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Preset</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
              Jadwal ujian saat ini belum dipublikasikan oleh Panitia / Guru.
            </div>
          )}
        </div>
      )}

      {/* Filter Mismatch Empty State */}
      {activeSchedules.length > 0 && filteredSchedules.length === 0 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-3 my-4">
          <Filter className="w-8 h-8 text-slate-500 mx-auto" />
          <h4 className="text-base font-bold text-white">Tidak ada jadwal yang sesuai filter pencarian</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Tidak ditemukan jadwal ujian dengan kriteria hari, kelas, jurusan, atau status waktu yang dipilih.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedDayFilter('all');
              setSelectedGradeFilter('all');
              setSelectedMajorFilter('all');
              setTimeStatusFilter('all');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAMPILAN KARTU (CARD VIEW) DENGAN KUNCI WAKTU OTOMATIS */}
      {/* ========================================================================= */}
      {filteredSchedules.length > 0 && (viewMode === 'cards' || viewMode === 'both') && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm sm:text-base font-bold text-white print:text-black">
                Daftar Ujian dalam Bentuk Kartu
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                ({filteredSchedules.length} Kartu Ujian)
              </span>
            </div>

            {/* Admin Reset All Cards Button */}
            {!isStudent && activeSchedules.length > 0 && (
              <button
                type="button"
                id="btn-reset-cards-schedules"
                onClick={() => setIsClearConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm print:hidden"
                title="Hapus / Reset semua mapel yang ada dalam daftar kartu ujian"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchedules.map((schedule, idx) => {
              const pkg = getPackage(schedule.packageId, schedule) || ({
                id: schedule.packageId || `sched-pkg-${schedule.id}`,
                title: schedule.subjectName,
                badge: 'UJIAN SMA',
                tagline: 'Simulasi Ujian Sekolah SMAN 19 Bandung',
                subtests: [],
                subject: schedule.subjectName,
                durationMinutes: schedule.durationMinutes || 90,
                totalQuestions: schedule.totalQuestions || 20,
                questions: [],
                category: ((schedule.major as any) || 'SMA_UMUM') as any,
                kkmScore: schedule.kkmScore || 75,
              } as ExamPackage);
              const timeInfo = getScheduleTimeInfo(schedule, systemNow, isSupervisorTimeBypass);
              const isLocked = timeInfo.status === 'locked_upcoming';
              const isOpen = timeInfo.status === 'open_active';
              const isClosed = timeInfo.status === 'closed_expired';

              return (
                <div
                  key={`card-${schedule.id}`}
                  className={`group relative rounded-2xl border p-4 sm:p-5 flex flex-col justify-between space-y-3.5 min-w-0 overflow-hidden transition-all duration-200 hover:shadow-xl print:bg-white print:border-black print:text-black print:shadow-none ${
                    isOpen
                      ? 'bg-slate-900 border-emerald-500/50 shadow-emerald-950/20 hover:border-emerald-400'
                      : isLocked
                      ? 'bg-slate-900/95 border-amber-500/40 shadow-amber-950/10 hover:border-amber-400'
                      : 'bg-slate-900/80 border-slate-800 opacity-90 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header: Live Status Banner & Countdown */}
                  <div className="space-y-2.5 min-w-0">
                    {/* Time-Gated Status Ribbon */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 print:border-gray-300 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 print:text-black truncate">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center text-[10px] font-black shrink-0 print:border-black print:text-black">
                          {idx + 1}
                        </span>
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="truncate">{schedule.dateDisplay}</span>
                      </div>
                      
                      {/* Dynamic Status Badge with Countdown - ONLY FOR ADMIN */}
                      {!isStudent && !isFreeMode && (
                        <>
                          {isLocked && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold animate-pulse print:bg-transparent print:border-black print:text-black shrink-0">
                              <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              <span>Buka dlm {formatCountdownSeconds(timeInfo.secondsUntilOpen)}</span>
                            </div>
                          )}

                          {isOpen && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold shadow-sm shadow-emerald-950/30 print:bg-transparent print:border-black print:text-black shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>Terbuka (Sisa {formatCountdownSeconds(timeInfo.secondsUntilClose)})</span>
                            </div>
                          )}

                          {isClosed && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold print:bg-transparent print:border-black print:text-black shrink-0">
                              <X className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                              <span>Sesi Ditutup</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Mata Pelajaran Title */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 print:bg-transparent print:border-black print:text-black">
                          {schedule.major || pkg?.category || 'MATA PELAJARAN'}
                        </span>
                        {schedule.kkmScore && (
                          <span className="text-[10px] font-bold text-emerald-400 print:text-black">
                            KKM: {schedule.kkmScore}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 ml-auto print:border-black print:text-black">
                          Sesi {schedule.sessionNumber}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 break-words print:text-black">
                        {schedule.subjectName}
                      </h3>
                      {pkg && (
                        <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1 break-words print:text-gray-700">
                          {pkg.title}
                        </p>
                      )}
                    </div>

                    {/* Detail Grid: Kelas, Waktu Ujian */}
                    <div className={`grid ${isFreeMode ? 'grid-cols-1' : 'grid-cols-2'} gap-2 pt-0.5 text-xs`}>
                      {/* Kelas */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-0.5 min-w-0 print:bg-gray-100 print:border-gray-300">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 print:text-gray-700">
                          <Users className="w-3 h-3 text-indigo-400 shrink-0 print:text-black" />
                          Kelas
                        </span>
                        <p className="font-bold text-slate-200 truncate print:text-black text-[11px] sm:text-xs">
                          {schedule.targetClass}
                        </p>
                      </div>

                      {/* Waktu Ujian */}
                      {!isFreeMode && (
                        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-0.5 min-w-0 print:bg-gray-100 print:border-gray-300">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 print:text-gray-700">
                            <Clock className="w-3 h-3 text-cyan-400 shrink-0 print:text-black" />
                            Waktu
                          </span>
                          <p className="font-bold text-cyan-300 truncate print:text-black text-[11px] sm:text-xs">
                            {schedule.startTime} - {schedule.endTime}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status Notice Box - ONLY FOR ADMIN */}
                    {!isStudent && !isFreeMode && (
                      <div className={`p-1.5 sm:p-2 rounded-xl text-[10px] sm:text-[11px] font-semibold border min-w-0 overflow-hidden ${
                        isOpen
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                          : isLocked
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      }`}>
                        <div className="flex items-center gap-1.5 truncate">
                          {isOpen ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : isLocked ? (
                            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                          )}
                          <span className="truncate">{timeInfo.statusDescription}</span>
                        </div>
                      </div>
                    )}

                    {/* Token Ujian Card Badge: ONLY DISPLAYED FOR ADMIN (HIDDEN FOR STUDENTS) */}
                    {!isStudent && (
                      <div className="p-2 sm:p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-2 min-w-0 print:bg-gray-100 print:border-gray-400">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 print:text-black">
                            <KeyRound className="w-3 h-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block print:text-gray-800">
                              Token Ujian
                            </span>
                            <span className="font-mono font-black text-amber-300 text-xs sm:text-sm tracking-wider select-all truncate block print:text-black">
                              {schedule.token || 'CBT-001'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleCopyToken(schedule.token || 'CBT-001', schedule.id, schedule.subjectName)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                            title="Salin Token"
                          >
                            {copiedTokenId === schedule.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateSingleToken(schedule.id, schedule.subjectName)}
                            className="h-7 sm:h-8 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0 text-xs font-bold"
                            title="Reset / Acak Token Baru untuk Mata Pelajaran Ini"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span className="text-[10px]">Reset</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Additional Sub-Info: Durasi & Jumlah Soal */}
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 px-1 pt-0.5 print:text-gray-700">
                      <span>Durasi: <strong className="text-slate-200 print:text-black">{schedule.durationMinutes} Menit</strong></span>
                      <span>Total: <strong className="text-slate-200 print:text-black">{schedule.totalQuestions || pkg?.totalQuestions || 10} Soal</strong></span>
                    </div>
                  </div>

                  {/* Card Actions (Hidden in Print) */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap min-w-0 print:hidden">
                    {/* Admin Actions: Duplicate Session, Visibility Toggle, Edit, Delete & Share */}
                    {!isStudent && (
                      <>
                        {/* Add / Duplicate Another Session for this Subject */}
                        <button
                          type="button"
                          onClick={() => setSessionToDuplicate(schedule)}
                          className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                          title="Tambah sesi atau jadwal hari lain untuk mata pelajaran ini"
                        >
                          <PlusCircle className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>+ Sesi</span>
                        </button>

                        {/* Visibility for Students Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleStudentVisibility(schedule.id)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                            schedule.isVisibleToStudents !== false
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-400 border-slate-700'
                          }`}
                          title={
                            schedule.isVisibleToStudents !== false
                              ? 'Tampil untuk siswa. Klik untuk sembunyikan.'
                              : 'Disembunyikan dari siswa. Klik untuk tampilkan.'
                          }
                        >
                          {schedule.isVisibleToStudents !== false ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingScheduleItem(schedule)}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                          title="Edit Hari, Tanggal, Jam, Kelas, atau Token"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setScheduleToDelete(schedule)}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                          title="Hapus Mata Pelajaran Ini dari Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {pkg && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPackageForCard(pkg);
                                setIsStudentCardModalOpen(true);
                              }}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                              title="Lihat / Cetak Kartu Peserta Ujian"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSharingPackage(pkg)}
                              className="h-8 sm:h-9 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-emerald-400 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0"
                              title="Bagikan Tautan Ujian untuk Siswa"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="hidden sm:inline">Link</span>
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {/* Dynamic Action Button based on Locked / Open / Closed state */}
                    {pkg && (
                      <>
                        {areAllLinksDisabled ? (
                          <div className="flex-1 h-8 sm:h-9 min-w-[75px] px-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center justify-center gap-1 shadow-inner shrink-0">
                            <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>Nonaktif</span>
                          </div>
                        ) : isStudent ? (
                          <button
                            type="button"
                            onClick={() => onStartExam(pkg)}
                            className="flex-1 h-8 sm:h-9 min-w-[75px] flex items-center justify-center gap-1 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            <Play className="w-3 h-3 fill-white shrink-0" />
                            <span>Mulai</span>
                          </button>
                        ) : isOpen ? (
                          <button
                            type="button"
                            onClick={() => onStartExam(pkg)}
                            className="flex-1 h-8 sm:h-9 min-w-[75px] flex items-center justify-center gap-1 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            <Play className="w-3 h-3 fill-white shrink-0" />
                            <span>Mulai</span>
                          </button>
                        ) : null}

                        {!isStudent && isLocked && (
                          <button
                            type="button"
                            onClick={() => {
                              // Student can open gate waiting room with live countdown
                              onStartExam(pkg);
                            }}
                            className="flex-1 h-8 sm:h-9 min-w-[75px] flex items-center justify-center gap-1 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold shadow-md shadow-amber-950/20 transition-all cursor-pointer shrink-0"
                            title="Ujian terkunci hingga masuk waktu pengerjaan. Klik untuk masuk ruang tunggu."
                          >
                            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Terkunci</span>
                          </button>
                        )}

                        {!isStudent && isClosed && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isStudent) {
                                onStartExam(pkg);
                              }
                            }}
                            disabled={isStudent}
                            className={`flex-1 h-8 sm:h-9 min-w-[75px] flex items-center justify-center gap-1 px-3 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold shrink-0 ${
                              isStudent ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title={isStudent ? 'Waktu ujian telah berakhir' : 'Akses Pengawas'}
                          >
                            <X className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>{isStudent ? 'Ditutup' : 'Selesai'}</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. TAMPILAN TABEL (TABLE VIEW) DENGAN KUNCI WAKTU OTOMATIS */}
      {/* ========================================================================= */}
      {filteredSchedules.length > 0 && (viewMode === 'table' || viewMode === 'both') && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm sm:text-base font-bold text-white print:text-black">
                Daftar Ujian dalam Bentuk Tabel Resmi
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Format Rekapitulasi Roster Ujian SMAN 19
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-xl print:bg-white print:border-black print:shadow-none">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              {/* Table Header */}
              <thead>
                {isStudent ? (
                  /* 4-Column Student Table Header: 1. No, 2. Info Ujian (Hari, Tanggal, Mapel, Kelas, Jml Soal), 3. Waktu Sesi, 4. Aksi (Mulai) */
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold uppercase text-[11px] tracking-wider print:bg-gray-200 print:text-black print:border-black">
                    <th className="py-3.5 px-3 text-center w-12 border-r border-slate-800 print:border-black">No</th>
                    <th className="py-3.5 px-4 sm:px-5 border-r border-slate-800 print:border-black">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400 print:text-black" />
                        <span>Mata Pelajaran & Informasi Jadwal</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 border-r border-slate-800 print:border-black w-48 sm:w-64">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 print:text-black" />
                        <span>Waktu Sesi</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center print:hidden w-40 sm:w-52">
                      <div className="flex items-center justify-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-emerald-400 print:text-black fill-emerald-400" />
                        <span>Aksi (Mulai)</span>
                      </div>
                    </th>
                  </tr>
                ) : (
                  /* 8-Column Admin Table Header */
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold uppercase text-[11px] tracking-wider print:bg-gray-200 print:text-black print:border-black">
                    <th className="py-3.5 px-3 text-center w-12 border-r border-slate-800 print:border-black">No</th>
                    <th className="py-3.5 px-4 border-r border-slate-800 print:border-black">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 print:text-black" />
                        <span>Hari & Tanggal</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 border-r border-slate-800 print:border-black">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 print:text-black" />
                        <span>Waktu & Sesi</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 border-r border-slate-800 print:border-black">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400 print:text-black" />
                        <span>Mata Pelajaran (Paket Soal)</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 border-r border-slate-800 print:border-black">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-400 print:text-black" />
                        <span>Kelas / Sasaran</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 border-r border-slate-800 print:border-black text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                        <span>Status Waktu</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 border-r border-slate-800 print:border-black">
                      <div className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400 print:text-black" />
                        <span>Token Ujian</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-center border-r border-slate-800 print:border-black">Soal / KKM</th>
                    <th className="py-3.5 px-4 text-center print:hidden">Aksi</th>
                  </tr>
                )}
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-800 print:divide-black">
                {filteredSchedules.map((schedule, idx) => {
                  const pkg = getPackage(schedule.packageId, schedule) || ({
                    id: schedule.packageId || `sched-pkg-${schedule.id}`,
                    title: schedule.subjectName,
                    badge: 'UJIAN SMA',
                    tagline: 'Simulasi Ujian Sekolah SMAN 19 Bandung',
                    subtests: [],
                    subject: schedule.subjectName,
                    durationMinutes: schedule.durationMinutes || 90,
                    totalQuestions: schedule.totalQuestions || 20,
                    questions: [],
                    category: ((schedule.major as any) || 'SMA_UMUM') as any,
                    kkmScore: schedule.kkmScore || 75,
                  } as ExamPackage);
                  const isEven = idx % 2 === 0;
                  const timeInfo = getScheduleTimeInfo(schedule, systemNow, isSupervisorTimeBypass);
                  const isLocked = timeInfo.status === 'locked_upcoming';
                  const isOpen = timeInfo.status === 'open_active';
                  const isClosed = timeInfo.status === 'closed_expired';

                  if (isStudent) {
                    /* ========================================================================= */
                    /* FORMAT TABEL KHUSUS SISWA (4 KOLOM TERPADU):                             */
                    /* Kolom 1: No                                                               */
                    /* Kolom 2: Hari, Tanggal, Mata Pelajaran, Kelas, Status Waktu, Jumlah Soal   */
                    /* Kolom 3: Waktu Sesi                                                      */
                    /* Kolom 4: Aksi (Mulai)                                                    */
                    /* ========================================================================= */
                    return (
                      <tr
                        key={`table-student-${schedule.id}`}
                        className={`hover:bg-slate-850/60 transition-colors ${
                          isEven ? 'bg-slate-900' : 'bg-slate-900/40'
                        } print:bg-white print:text-black`}
                      >
                        {/* Kolom 1: Nomor Urut */}
                        <td className="py-3.5 px-3 text-center w-12 border-r border-slate-800 font-bold text-slate-300 text-xs sm:text-sm print:text-black print:border-black">
                          {idx + 1}
                        </td>

                        {/* Kolom 2: Hari, Tanggal, Mata Pelajaran, Kelas */}
                        <td className="py-3.5 px-4 sm:px-5 border-r border-slate-800 print:border-black">
                          {/* Hari & Tanggal */}
                          <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs sm:text-sm print:text-black">
                            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0 print:text-black" />
                            <span>{formatCleanExamDate(schedule.dayName, schedule.dateDisplay)}</span>
                          </div>

                          {/* Mata Pelajaran & Judul Paket */}
                          <div className="mt-1 font-extrabold text-white text-sm sm:text-base print:text-black">
                            {schedule.subjectName}
                          </div>
                          {pkg && (
                            <div className="text-[11px] text-slate-400 line-clamp-1 print:text-gray-700">
                              {pkg.title}
                            </div>
                          )}
                        </td>

                        {/* Kolom 2: Waktu Sesi (Waktu jam disembunyikan jika Mode Bebas) */}
                        <td className="py-3.5 px-4 border-r border-slate-800 print:border-black">
                          {!isFreeMode && (
                            <div className="font-bold text-sm sm:text-base text-cyan-300 print:text-black flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-cyan-400 shrink-0 print:text-black" />
                              <span>{schedule.startTime} - {schedule.endTime} WIB</span>
                            </div>
                          )}
                          <div className={`${!isFreeMode ? 'mt-1.5' : ''} text-xs text-slate-300 print:text-gray-700 flex flex-wrap items-center gap-1.5`}>
                            <span className="px-2 py-0.5 rounded-md bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 font-bold text-[11px] print:bg-transparent print:border-black print:text-black">
                              Sesi {schedule.sessionNumber}
                            </span>
                            {!isFreeMode && (
                              <span className="text-slate-400 print:text-gray-700 font-medium">
                                • Durasi: {schedule.durationMinutes} Menit
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Kolom 3: Aksi (Mulai) */}
                        <td className="py-3.5 px-4 text-center print:hidden">
                          <div className="flex items-center justify-center gap-2">
                            {pkg && (
                              <>
                                {areAllLinksDisabled ? (
                                  <span className="w-full sm:w-auto px-3 py-2 rounded-xl bg-rose-950/80 text-rose-300 text-xs font-bold border border-rose-500/40 flex items-center justify-center">
                                    Dinonaktifkan
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onStartExam(pkg)}
                                    className="w-full sm:w-auto min-w-[110px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation"
                                  >
                                    <Play className="w-4 h-4 fill-white shrink-0" />
                                    <span>Mulai</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  /* ========================================================================= */
                  /* FORMAT TABEL LENGKAP UNTUK GURU / ADMIN (8 KOLOM)                         */
                  /* ========================================================================= */
                  return (
                    <tr
                      key={`table-${schedule.id}`}
                      className={`hover:bg-slate-850/60 transition-colors ${
                        isEven ? 'bg-slate-900' : 'bg-slate-900/40'
                      } print:bg-white print:text-black`}
                    >
                      {/* No */}
                      <td className="py-3 px-3 text-center font-bold text-slate-400 border-r border-slate-800 print:border-black print:text-black">
                        {idx + 1}
                      </td>

                      {/* Hari Tanggal */}
                      <td className="py-3 px-4 border-r border-slate-800 print:border-black">
                        <div className="font-bold text-amber-300 print:text-black">
                          {schedule.dayName}
                        </div>
                        <div className="text-[11px] text-slate-400 print:text-gray-700">
                          {schedule.dateDisplay}
                        </div>
                      </td>

                      {/* Waktu Ujian */}
                      <td className="py-3 px-4 border-r border-slate-800 print:border-black">
                        {isFreeMode ? (
                          <div className="font-bold text-emerald-300 print:text-black">
                            Mode Bebas
                          </div>
                        ) : (
                          <>
                            <div className="font-bold text-cyan-300 print:text-black">
                              {schedule.startTime} - {schedule.endTime} WIB
                            </div>
                            <div className="text-[11px] text-slate-400 print:text-gray-700">
                              Durasi: {schedule.durationMinutes} Menit (Sesi {schedule.sessionNumber})
                            </div>
                          </>
                        )}
                      </td>

                      {/* Mata Pelajaran */}
                      <td className="py-3 px-4 border-r border-slate-800 print:border-black">
                        <div className="font-bold text-white print:text-black">
                          {schedule.subjectName}
                        </div>
                        {pkg && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 print:text-gray-700">
                            {pkg.title}
                          </div>
                        )}
                      </td>

                      {/* Kelas */}
                      <td className="py-3 px-4 border-r border-slate-800 print:border-black">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 print:bg-transparent print:border-black print:text-black">
                          {schedule.targetClass}
                        </span>
                      </td>

                      {/* Status Waktu Column */}
                      <td className="py-3 px-4 border-r border-slate-800 print:border-black text-center">
                        {isFreeMode ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Terbuka (Bebas)</span>
                          </span>
                        ) : (
                          <>
                            {isOpen && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>Terbuka (Sisa {formatCountdownSeconds(timeInfo.secondsUntilClose)})</span>
                              </span>
                            )}
                            {isLocked && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold animate-pulse">
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>Terkunci ({formatCountdownSeconds(timeInfo.secondsUntilOpen)})</span>
                              </span>
                            )}
                            {isClosed && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                                <X className="w-3 h-3 text-rose-400" />
                                <span>Sesi Ditutup</span>
                              </span>
                            )}
                          </>
                        )}
                      </td>

                      {/* Token Ujian Kolom - ONLY FOR ADMIN */}
                      {!isStudent && (
                        <td className="py-3 px-4 border-r border-slate-800 print:border-black">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-amber-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs sm:text-sm tracking-wider shadow-inner select-all print:bg-transparent print:border-black print:text-black">
                              {schedule.token || 'CBT-001'}
                            </span>
                            <div className="flex items-center gap-0.5 print:hidden">
                              <button
                                type="button"
                                onClick={() => handleCopyToken(schedule.token || 'CBT-001', schedule.id, schedule.subjectName)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                                title="Salin Token Ini"
                              >
                                {copiedTokenId === schedule.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegenerateSingleToken(schedule.id, schedule.subjectName)}
                                className="p-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold"
                                title="Reset / Acak Token Mapel Ini"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reset</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Soal / KKM */}
                      <td className="py-3 px-3 text-center border-r border-slate-800 print:border-black">
                        <div className="font-bold text-slate-200 print:text-black">
                          {schedule.totalQuestions || pkg?.totalQuestions || 10} Butir
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold print:text-black">
                          KKM: {schedule.kkmScore}
                        </div>
                      </td>

                      {/* Action buttons (Hidden in Print) */}
                      <td className="py-3 px-4 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Admin: Duplicate Session, Visibility Toggle, Edit, Delete & Share */}
                          {!isStudent && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSessionToDuplicate(schedule)}
                                className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                title="Tambah sesi/hari lain untuk mapel ini"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStudentVisibility(schedule.id)}
                                className={`w-8 h-8 rounded-lg border transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                                  schedule.isVisibleToStudents !== false
                                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                                    : 'bg-slate-800 hover:bg-slate-750 text-slate-400 border-slate-700'
                                }`}
                                title={
                                  schedule.isVisibleToStudents !== false
                                    ? 'Tampil untuk siswa. Klik untuk sembunyikan.'
                                    : 'Disembunyikan dari siswa. Klik untuk tampilkan.'
                                }
                              >
                                {schedule.isVisibleToStudents !== false ? (
                                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingScheduleItem(schedule)}
                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                title="Edit Jadwal & Token Ini"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setScheduleToDelete(schedule)}
                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                title="Hapus Mata Pelajaran Ini dari Jadwal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {pkg && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPackageForCard(pkg);
                                      setIsStudentCardModalOpen(true);
                                    }}
                                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                    title="Lihat / Cetak Kartu Ujian"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSharingPackage(pkg)}
                                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                    title="Bagikan Tautan"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {/* Dynamic start button for admin */}
                          {pkg && (
                            <>
                              {areAllLinksDisabled ? (
                                <span className="h-8 px-2.5 rounded-lg bg-rose-950/80 text-rose-300 text-[11px] font-bold border border-rose-500/40 flex items-center justify-center">
                                  Dinonaktifkan
                                </span>
                              ) : isOpen ? (
                                <button
                                  type="button"
                                  onClick={() => onStartExam(pkg)}
                                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Play className="w-3 h-3 fill-white" />
                                  <span>Mulai</span>
                                </button>
                              ) : null}

                              {isLocked && (
                                <button
                                  type="button"
                                  onClick={() => onStartExam(pkg)}
                                  className="h-8 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                                  title="Ujian masih terkunci"
                                >
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span>Terkunci</span>
                                </button>
                              )}

                              {isClosed && (
                                <button
                                  type="button"
                                  onClick={() => onStartExam(pkg)}
                                  className="h-8 px-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3 h-3 text-rose-400" />
                                  <span>Ditutup</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Official Signature Footer for Print Layout */}
      <div className="hidden print:block pt-8 text-black text-xs">
        <div className="flex justify-between items-start">
          <div className="text-center w-64">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah</p>
            <div className="h-20" />
            <p className="font-bold underline">{schoolInfo.headmasterName || 'Drs. H. Bambang Sujarwo, M.Pd.'}</p>
            <p>{schoolInfo.headmasterNip || 'NIP. 19740512 199903 1 002'}</p>
          </div>

          <div className="text-center w-64">
            <p>Jakarta, 24 Agustus 2026</p>
            <p className="font-bold">Ketua Panitia Asesmen CBT</p>
            <div className="h-20" />
            <p className="font-bold underline">Dra. Hj. Siti Aminah, M.Pd.</p>
            <p>NIP. 19800817 200501 2 004</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL UBAH KOP & INFO SEKOLAH (ADMIN ONLY) */}
      {/* ========================================================================= */}
      <EditSchoolKopModal
        isOpen={isEditingSchoolInfo && !isStudent}
        onClose={() => setIsEditingSchoolInfo(false)}
        schoolInfo={schoolInfo}
        onSave={(newInfo) => {
          setSchoolInfo(newInfo);
          try {
            localStorage.setItem(STORAGE_KEYS.SCHOOL_INFO, JSON.stringify(newInfo));
          } catch (e) {}
          setIsEditingSchoolInfo(false);
        }}
      />

      {/* ========================================================================= */}
      {/* 6. MODAL EDIT JADWAL MAPEL SPESIFIK (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {editingScheduleItem && !isStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">
                  Sesuaikan Jadwal Ujian
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingScheduleItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400">Mata Pelajaran</span>
                  <p className="text-sm font-bold text-white">{editingScheduleItem.subjectName}</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Sesi {editingScheduleItem.sessionNumber}
                </span>
              </div>

              {/* Status Preview under current edited values */}
              {(() => {
                const previewInfo = getScheduleTimeInfo(editingScheduleItem, systemNow, false);
                return (
                  <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    previewInfo.status === 'open_active'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : previewInfo.status === 'locked_upcoming'
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  }`}>
                    {previewInfo.status === 'open_active' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : previewInfo.status === 'locked_upcoming' ? (
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold">
                        Status Waktu Saat Ini: {previewInfo.statusLabel}
                      </div>
                      <div className="text-[11px] opacity-90">
                        {previewInfo.statusDescription}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Simulation Presets for Teacher Testing */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  ⚡ Tombol Cepat Pengujian Waktu (Simulasi Langsung):
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  {/* Preset 1: Open Now */}
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      const dateIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                      const startH = pad(Math.max(0, now.getHours() - 1));
                      const endH = pad(Math.min(23, now.getHours() + 2));
                      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                      const dayName = days[now.getDay()];
                      setEditingScheduleItem({
                        ...editingScheduleItem,
                        dayName,
                        dateIso,
                        dateDisplay: `${dayName}, ${now.getDate()} ${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}`,
                        startTime: `${startH}:00`,
                        endTime: `${endH}:00`,
                      });
                    }}
                    className="p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-center font-bold transition-colors cursor-pointer"
                  >
                    🟢 Buka Sekarang
                  </button>

                  {/* Preset 2: Lock 5 mins from now */}
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const later = new Date(now.getTime() + 5 * 60 * 1000);
                      const finish = new Date(now.getTime() + 95 * 60 * 1000);
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      const dateIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                      const dayName = days[now.getDay()];
                      setEditingScheduleItem({
                        ...editingScheduleItem,
                        dayName,
                        dateIso,
                        dateDisplay: `${dayName}, ${now.getDate()} ${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}`,
                        startTime: `${pad(later.getHours())}:${pad(later.getMinutes())}`,
                        endTime: `${pad(finish.getHours())}:${pad(finish.getMinutes())}`,
                      });
                    }}
                    className="p-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 text-center font-bold transition-colors cursor-pointer"
                  >
                    🔒 Buka 5 Mnt Lagi
                  </button>

                  {/* Preset 3: Expired / Closed */}
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      const dateIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                      const startH = pad(Math.max(0, now.getHours() - 3));
                      const endH = pad(Math.max(1, now.getHours() - 1));
                      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                      const dayName = days[now.getDay()];
                      setEditingScheduleItem({
                        ...editingScheduleItem,
                        dayName,
                        dateIso,
                        dateDisplay: `${dayName}, ${now.getDate()} ${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}`,
                        startTime: `${startH}:00`,
                        endTime: `${endH}:00`,
                      });
                    }}
                    className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-center font-bold transition-colors cursor-pointer"
                  >
                    ⛔ Set Ditutup
                  </button>
                </div>
              </div>

              {/* Tanggal Kalender (dateIso) & Hari */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Tanggal Ujian (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={editingScheduleItem.dateIso || '2026-08-24'}
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) return;
                      const parsed = new Date(`${val}T12:00:00`);
                      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                      const dayName = days[parsed.getDay()] || editingScheduleItem.dayName;
                      const dateDisplay = `${dayName}, ${parsed.getDate()} ${parsed.toLocaleString('id-ID', { month: 'long' })} ${parsed.getFullYear()}`;
                      setEditingScheduleItem({
                        ...editingScheduleItem,
                        dateIso: val,
                        dayName,
                        dateDisplay,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Hari Pelaksanaan</label>
                  <select
                    value={editingScheduleItem.dayName}
                    onChange={e => {
                      const dName = e.target.value;
                      setEditingScheduleItem({
                        ...editingScheduleItem,
                        dayName: dName,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                    <option value="Minggu">Minggu</option>
                  </select>
                </div>
              </div>

              {/* Jam Mulai & Jam Selesai */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>Waktu Mulai Ujian (Buka)</span>
                  </label>
                  <input
                    type="time"
                    value={editingScheduleItem.startTime}
                    onChange={e => setEditingScheduleItem({ ...editingScheduleItem, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-400" />
                    <span>Waktu Selesai (Tutup)</span>
                  </label>
                  <input
                    type="time"
                    value={editingScheduleItem.endTime}
                    onChange={e => setEditingScheduleItem({ ...editingScheduleItem, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-rose-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Sesi & Kelas */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Nomor Sesi</label>
                  <select
                    value={editingScheduleItem.sessionNumber}
                    onChange={e => {
                      const sNum = parseInt(e.target.value, 10);
                      setEditingScheduleItem({
                        ...editingScheduleItem,
                        sessionNumber: sNum,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>Sesi 1</option>
                    <option value={2}>Sesi 2</option>
                    <option value={3}>Sesi 3</option>
                    <option value={4}>Sesi 4</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Kelas / Sasaran Ujian</label>
                  <input
                    type="text"
                    value={editingScheduleItem.targetClass}
                    onChange={e => setEditingScheduleItem({ ...editingScheduleItem, targetClass: e.target.value })}
                    placeholder="Contoh: Kelas XII MIPA 1-4"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Token Ujian Field & Status Toggle */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5 text-xs sm:text-sm">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Token Ujian Mata Pelajaran</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      isSupervisorTimeBypass
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {isSupervisorTimeBypass ? 'Mode Bebas: Bebas Token' : 'Mode Normal: Wajib Token'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">Kode Token Ujian:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newToken = generateSubjectExamToken(editingScheduleItem.subjectName);
                      setEditingScheduleItem({ ...editingScheduleItem, token: newToken });
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Acak Kode</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editingScheduleItem.token || ''}
                  onChange={e => setEditingScheduleItem({ ...editingScheduleItem, token: e.target.value.toUpperCase() })}
                  placeholder="Contoh: MAT-884, CBT-PAS, dll"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase text-sm"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isSupervisorTimeBypass ? (
                    <span className="text-emerald-300/90 font-medium">
                      ⚡ <strong>Mode Bebas Aktif:</strong> Siswa dapat langsung masuk dan mulai mengerjakan ujian secara bebas tanpa harus mengisi token.
                    </span>
                  ) : (
                    <span className="text-amber-300/90 font-medium">
                      🔒 <strong>Mode Normal Aktif:</strong> Siswa WAJIB memasukkan kode token di atas sebelum dapat membuka lembar ujian.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingScheduleItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSingleSchedule(editingScheduleItem)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Single Package Modal */}
      {sharingPackage && (
        <ShareExamModal
          isOpen={true}
          pkg={sharingPackage}
          onClose={() => setSharingPackage(null)}
          onOpenStudentGate={onStartExam}
        />
      )}

      {/* Share Schedule List Links Modal (Student vs Admin Links) */}
      <ShareScheduleListModal
        isOpen={isShareScheduleModalOpen}
        onClose={() => setIsShareScheduleModalOpen(false)}
        schoolInfo={schoolInfo}
        onSwitchToStudentPreview={() => handleRoleSwitch('student')}
      />

      {/* Supervisor PIN Modal to Switch from Student to Admin Mode */}
      <SupervisorPinModal
        isOpen={isPinModalOpenForRole}
        onClose={() => setIsPinModalOpenForRole(false)}
        isEnabled={securitySettings?.enableSupervisorPin !== false}
        onSuccess={handlePinSuccessForRole}
        targetPin={securitySettings?.supervisorPin || '1234'}
        title="Otorisasi Akses Pengawas / Guru"
        description="Masukkan 4 digit PIN Pengawas untuk beralih ke Mode Pengawas/Admin (Akses Penuh)."
      />

      {/* Official Student Exam Card (Kartu Peserta Ujian) Modal */}
      {isStudentCardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Kartu Peserta Ujian Resmi (CBT)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pratinjau & Cetak Kartu Peserta Ujian Siswa dengan Token & QR Validasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStudentCardModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selectors for Student & Package */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
              {/* Select Student */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pilih Siswa:</span>
                </label>
                <select
                  value={selectedStudentForCard?.nis || ''}
                  onChange={e => {
                    const match = rosterStudents.find(s => s.nis === e.target.value);
                    if (match) setSelectedStudentForCard(match);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {rosterStudents.map(st => (
                    <option key={st.nis} value={st.nis}>
                      {st.nis} - {st.fullName} ({st.studentClass})
                    </option>
                  ))}
                  {rosterStudents.length === 0 && (
                    <option value="">Peserta Ujian Standar</option>
                  )}
                </select>
              </div>

              {/* Select Exam Package */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pilih Mata Pelajaran:</span>
                </label>
                <select
                  value={selectedPackageForCard?.id || ''}
                  onChange={e => {
                    const match = availablePackages.find(p => p.id === e.target.value);
                    if (match) setSelectedPackageForCard(match);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {availablePackages.map(pkgItem => (
                    <option key={pkgItem.id} value={pkgItem.id}>
                      {pkgItem.subject || pkgItem.title} ({pkgItem.durationMinutes} mnt)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Exam Card Component */}
            <div className="flex justify-center">
              <StudentExamCard
                student={{
                  fullName: selectedStudentForCard?.fullName || 'Peserta Ujian',
                  nis: selectedStudentForCard?.nis || '19001',
                  studentClass: selectedStudentForCard?.studentClass || '12 MIPA 1',
                  schoolName: selectedStudentForCard?.schoolName || schoolInfo.schoolName,
                }}
                pkg={selectedPackageForCard || availablePackages[0]}
                schoolInfo={schoolInfo}
                examToken={selectedPackageForCard?.token}
                showPrintButton={true}
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsStudentCardModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL KONFIRMASI HAPUS SATU JADWAL */}
      {/* ========================================================================= */}
      {scheduleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus dari Jadwal Ujian?</h3>
                <p className="text-xs text-slate-400">Paket soal di Bank Soal tidak akan terhapus</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Mata Pelajaran:</span>
                <span className="font-bold text-white">{scheduleToDelete.subjectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kelas & Hari:</span>
                <span className="font-semibold text-slate-300">{scheduleToDelete.targetClass} ({scheduleToDelete.dayName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jam:</span>
                <span className="font-mono text-cyan-300">{scheduleToDelete.startTime} - {scheduleToDelete.endTime} WIB</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setScheduleToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSingleSchedule(scheduleToDelete.id, scheduleToDelete.subjectName)}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-all active:scale-95 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL KONFIRMASI KOSONGKAN / RESET JADWAL UJIAN */}
      {/* ========================================================================= */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset / Kelola Jadwal Ujian</h3>
                  <p className="text-xs text-slate-400">Pilih opsi reset data jadwal di bawah ini</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 0: Reset Tampilan Siswa (Only Imported Packages) */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 hover:border-emerald-400/60 transition-all space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Reset Tampilan Siswa (Paket Terimpor ke Jadwal)</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Menampilkan seluruh <strong>{activeSchedules.length} mata pelajaran</strong> yang telah diimpor ke jadwal ujian untuk siswa, tanpa mengambil dari katalog lengkap bank soal.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-confirm-reset-student-view"
                  onClick={handleResetStudentViewVisibility}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Reset Tampilan Siswa ({activeSchedules.length} Mapel Terjadwal)</span>
                </button>
              </div>

              {/* Option 1: Restore Default Official Schedules */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500/50 transition-all space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-indigo-400" />
                      <span>Kembalikan Jadwal Standar Resmi (Katalog Lengkap)</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Memuat ulang seluruh mata pelajaran resmi SMA (MIPA, IPS, Bahasa, TPS) dari katalog lengkap dengan sesi, jam, dan token terstruktur.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-confirm-restore-default-schedules"
                  onClick={handleResetToDefaultSchedules}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset & Pulihkan Seluruh Katalog</span>
                </button>
              </div>

              {/* Option 2: Clear All Schedules */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2.5">
                <div>
                  <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Kosongkan Seluruh Jadwal (Hapus Semua)</span>
                  </h4>
                  <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
                    Menghapus seluruh {activeSchedules.length} mata pelajaran dari jadwal ujian sehingga daftar kosong bersih (0 mapel). Paket di Bank Soal tetap aman.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-confirm-clear-all-schedules"
                  onClick={handleClearAllSchedules}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL IMPOR OTOMATIS KATALOG LENGKAP MAPEL (MULTI SESI & HARI) */}
      {/* ========================================================================= */}
      <AutoImportScheduleModal
        isOpen={isAutoImportModalOpen}
        onClose={() => setIsAutoImportModalOpen(false)}
        availablePackages={availablePackages}
        existingScheduleCount={activeSchedules.length}
        onImport={handleAutoImportSchedules}
        onImportSchedules={handleAutoImportSchedules}
      />

      {/* ========================================================================= */}
      {/* 10. MODAL ATUR TAMPILAN MAPEL PADA HALAMAN UJIAN SISWA */}
      {/* ========================================================================= */}
      <ManageStudentSubjectsModal
        isOpen={isStudentVisibilityModalOpen}
        onClose={() => setIsStudentVisibilityModalOpen(false)}
        schedules={activeSchedules}
        onSaveVisibility={handleSaveBulkVisibility}
      />

      {/* ========================================================================= */}
      {/* 11. MODAL TAMBAH / DUPLIKAT SESI LAIN UNTUK MATA PELAJARAN INI */}
      {/* ========================================================================= */}
      {sessionToDuplicate && (
        <DuplicateSessionModal
          isOpen={true}
          onClose={() => setSessionToDuplicate(null)}
          sourceSchedule={sessionToDuplicate}
          pkg={getPackage(sessionToDuplicate.packageId)}
          onAddSession={handleAddDuplicateSession}
        />
      )}

      {/* ========================================================================= */}
      {/* 12. MODAL VERIFIKASI PIN AKSES MODE GURU */}
      {/* ========================================================================= */}
      <SupervisorPinModal
        isOpen={isPinModalOpenForRole}
        onClose={() => setIsPinModalOpenForRole(false)}
        isEnabled={securitySettings?.enableSupervisorPin !== false}
        targetPin={securitySettings?.supervisorPin || '1234'}
        onSuccess={handlePinSuccessForRole}
        title="PIN Mode Guru"
        onToggleDisablePin={(disabled) => {
          if (securitySettings && onUpdateSecuritySettings) {
            onUpdateSecuritySettings({
              ...securitySettings,
              enableSupervisorPin: disabled,
            });
          }
        }}
      />
    </div>
  );
};
