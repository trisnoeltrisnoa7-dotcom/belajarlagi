import React, { useState, useMemo, useEffect } from 'react';
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
import {
  getScheduleTimeInfo,
  formatCountdownSeconds,
  parseScheduleDates,
  ScheduleTimeInfo,
  isGlobalTimeBypassActive,
  setGlobalTimeBypassActive,
} from '../utils/examScheduleTimer';
import { isGlobalLockingDisabled as checkGlobalLockingDisabled } from '../utils/sessionManager';
import {
  saveSystemSettingToFirebase,
  loadSystemSettingFromFirebase,
  subscribeToSystemSetting,
} from '../firebase';
import { formatCleanExamDate } from '../utils/dateFormatHelper';
import { setGlobalTokenRequired } from '../utils/tokenSecurity';
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
} from 'lucide-react';

interface ExamScheduleListViewProps {
  availablePackages: ExamPackage[];
  onStartExam: (pkg: ExamPackage) => void;
  onBackToDashboard: () => void;
  onNavigateToSmaHub?: () => void;
  rosterStudents?: StudentRosterEntry[];
  securitySettings?: NisSecuritySettings;
  initialRole?: 'admin' | 'student';
  onRoleChange?: (role: 'admin' | 'student') => void;
  areAllLinksDisabled?: boolean;
  onToggleDisableAllLinks?: (disabled: boolean) => void;
  onRegenerateAllLinks?: () => void;
  isGlobalLockingDisabled?: boolean;
  onToggleGlobalLocking?: (disabled: boolean) => void;
  onMasterUnlockAll?: () => { activeCount: number; finishedCount: number } | void;
}

const STORAGE_KEYS = {
  SCHOOL_INFO: 'cbt_school_info_kop',
  SCHEDULE_ITEMS: 'cbt_custom_exam_schedules_v1',
  FILTER_SETTINGS: 'cbt_exam_schedule_filter_lock_settings',
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

export const ExamScheduleListView: React.FC<ExamScheduleListViewProps> = ({
  availablePackages,
  onStartExam,
  onBackToDashboard,
  onNavigateToSmaHub,
  rosterStudents = [],
  securitySettings,
  initialRole = 'admin',
  onRoleChange,
  areAllLinksDisabled = false,
  onToggleDisableAllLinks,
  onRegenerateAllLinks,
  isGlobalLockingDisabled = false,
  onToggleGlobalLocking,
  onMasterUnlockAll,
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
      const isPinEnabled = Boolean(securitySettings?.enableSupervisorPin);
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

  // Helper: Generate default schedule items from available packages so packages are always visible
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

  // Active schedules are directly the customSchedules state
  const activeSchedules: ExamScheduleItem[] = customSchedules;

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
        id: `sched-${pkg.id}`,
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
      } as ExamScheduleItem;
    });

    let updatedList: ExamScheduleItem[] = [];
    if (options.mode === 'replace') {
      updatedList = newItems;
    } else {
      // Append mode: merge without duplicate packageId
      const existingMap = new Map<string, ExamScheduleItem>();
      customSchedules.forEach(item => {
        existingMap.set(item.packageId || item.id, item);
      });
      newItems.forEach(item => {
        existingMap.set(item.packageId || item.id, item);
      });
      updatedList = Array.from(existingMap.values());
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

    // Sinkronisasi otomatis token sesuai mode
    const tokenRequiredInThisMode = !nextVal;
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

  const [searchQuery, setSearchQuery] = useState('');

  // Persist filter lock settings
  const persistFilterState = (
    locked: boolean,
    day: string = selectedDayFilter,
    grade: string = selectedGradeFilter,
    major: string = selectedMajorFilter,
    mode: 'both' | 'cards' | 'table' = viewMode
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

      // Visibility check: If in student mode, only show items enabled by teacher
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

  return (
    <div id="exam-schedule-list-view" className="space-y-6 pb-16 animate-in fade-in duration-200 print:p-0 print:m-0 print:space-y-4">
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
      {/* 1. KOP SEKOLAH RESMI DITENGAH-TENGAH (CENTERED LOGO, NAMA SEKOLAH, ALAMAT) */}
      {/* ========================================================================= */}
      <div
        id="school-kop-header"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-indigo-900/40 shadow-xl p-6 sm:p-8 text-center transition-all print:bg-white print:text-black print:border-black print:p-4 print:shadow-none"
      >
        {/* Subtle Decorative Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-indigo-600/10 blur-3xl pointer-events-none print:hidden" />

        <div className="relative max-w-4xl mx-auto flex flex-col items-center justify-center space-y-3">
          {/* Logo Sekolah Ditengah-tengah */}
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800/80 p-2 border-2 border-amber-400/40 shadow-lg shadow-indigo-950/60 flex items-center justify-center transform hover:scale-105 transition-transform print:bg-transparent print:border-black print:w-16 print:h-16">
              <SchoolLogoBadge logoUrl={schoolInfo.schoolLogo} className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Nama Sekolah Ditengah-tengah */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white uppercase print:text-black">
              {schoolInfo.schoolName}
            </h1>
            
            {/* Alamat Sekolah Ditengah-tengah */}
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed print:text-gray-800">
              {schoolInfo.schoolAddress}
            </p>

            {schoolInfo.schoolNpsn && (
              <p className="text-[11px] sm:text-xs text-indigo-300 font-semibold print:text-gray-700">
                {schoolInfo.schoolNpsn}
              </p>
            )}
          </div>

          {/* Sub Judul Dokumen Resmi Ujian Ditengah */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs sm:text-sm font-bold uppercase tracking-wider print:bg-transparent print:border-black print:text-black">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 print:hidden" />
              <span>DAFTAR JADWAL UJIAN BERBASIS KOMPUTER (CBT) & ASESMEN SUMATIF</span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-1 print:text-gray-700">
              {schoolInfo.academicYear || 'Tahun Ajaran 2025/2026'} • Terintegrasi Bank Soal & Paket Ujian
            </p>
          </div>

          {/* Garis Ganda Pemisah Kop Resmi Sekolah (Double Line Standard) */}
          <div className="w-full pt-3">
            <div className="w-full h-1 bg-indigo-500/80 rounded-full print:bg-black" />
            <div className="w-full h-0.5 bg-indigo-400/40 rounded-full mt-1 print:bg-black" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.5 PROMINENT NOTICE WHEN TIME BYPASS IS ACTIVE (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {!isStudent && isSupervisorTimeBypass && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/50 text-emerald-200 shadow-xl flex items-center justify-between flex-wrap gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
            <div>
              <span className="font-bold text-white text-xs sm:text-sm block">
                ⚡ Mode Akses Bebas Terbuka (Bypass Pengawas Aktif)
              </span>
              <span className="text-[11px] sm:text-xs text-emerald-300">
                Seluruh jadwal ujian dibuka oleh Pengawas dan dapat langsung dikerjakan sekarang tanpa menunggu jam jadwal.
              </span>
            </div>
          </div>
          <div className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shrink-0">
            Terbuka Penuh
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MASTER LINK & KARTU UJIAN CONTROL PANEL */}
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
            {viewRole === 'admin' && activeSchedules.length > 0 && (
              <button
                type="button"
                id="btn-reset-cards-schedules-list"
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
                      
                      {/* Dynamic Status Badge with Countdown - ONLY FOR ADMIN (Disembunyikan jika Mode Bebas / Kunci Nonaktif) */}
                      {!isStudent && !isFreeMode && (
                        <>
                          {isLocked && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold animate-pulse print:bg-transparent print:border-black print:text-black shrink-0">
                              <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              <span>Buka dlm {formatCountdownSeconds(timeInfo.secondsUntilOpen)}</span>
                            </div>
                          )}

                          {isOpen && timeInfo.secondsUntilClose > 0 && (
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold shadow-sm shadow-emerald-950/30 print:bg-transparent print:border-black print:text-black shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>Terbuka (Sisa {formatCountdownSeconds(timeInfo.secondsUntilClose)})</span>
                            </div>
                          )}

                          {isClosed && (
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold print:bg-transparent print:border-black print:text-black shrink-0">
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

                    {/* Detail Grid: Kelas, Waktu Ujian (Waktu disembunyikan saat Mode Bebas / Kunci Nonaktif) */}
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

                      {/* Waktu Ujian (Disembunyikan pada Mode Bebas) */}
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

                    {/* Status Notice Box - ONLY FOR ADMIN (Disembunyikan saat Mode Bebas / Kunci Nonaktif) */}
                    {!isStudent && !isFreeMode && timeInfo.statusDescription && (
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
                    {/* Admin Actions: Edit, Delete & Share */}
                    {!isStudent && (
                      <>
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

                    {/* Student Mode: Kartu Ujian Button */}
                    {isStudent && pkg && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPackageForCard(pkg);
                          setIsStudentCardModalOpen(true);
                        }}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="Lihat / Cetak Kartu Peserta Ujian Anda"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
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
            <table className={`w-full text-left border-collapse text-xs sm:text-sm ${isStudent ? 'min-w-[540px]' : 'min-w-[860px]'}`}>
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
                    /* Kolom 2: Hari, Tanggal, Mata Pelajaran, Kelas, Jumlah Soal                */
                    /* Kolom 3: Waktu Sesi & Status Waktu                                        */
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
                          {/* Admin: Edit, Delete & Share */}
                          {!isStudent && (
                            <>
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

                          {/* Student Mode: Card button */}
                          {isStudent && pkg && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPackageForCard(pkg);
                                setIsStudentCardModalOpen(true);
                              }}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                              title="Lihat / Cetak Kartu Peserta Ujian"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Dynamic start button */}
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
                                  onClick={() => {
                                    if (!isStudent) onStartExam(pkg);
                                  }}
                                  disabled={isStudent}
                                  className={`h-8 px-2.5 rounded-lg bg-slate-800 text-slate-500 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1 ${
                                    isStudent ? 'cursor-not-allowed' : 'hover:bg-slate-750 text-slate-300 cursor-pointer'
                                  }`}
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

      {/* Empty State Fallback if no schedules match current filters */}
      {filteredSchedules.length === 0 && (
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Tidak Ada Paket Ujian yang Sesuai Filter
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery || selectedDayFilter !== 'all' || selectedGradeFilter !== 'all' || selectedMajorFilter !== 'all' || timeStatusFilter !== 'all'
                ? 'Kriteria filter atau pencarian Anda tidak menemukan paket soal. Silakan reset filter untuk melihat semua daftar ujian.'
                : 'Belum ada paket ujian yang dimuat. Klik tombol di bawah untuk memuat paket soal standar.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tampilkan Semua Paket Soal</span>
            </button>
            {!isStudent && (
              <button
                type="button"
                onClick={handleLoadDefaultPreset}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                Muat Paket Bank Soal
              </button>
            )}
          </div>
        </div>
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

              {/* Token Ujian Field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Token Ujian (Bisa Diubah / Diacak)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newToken = generateSubjectExamToken(editingScheduleItem.subjectName);
                      setEditingScheduleItem({ ...editingScheduleItem, token: newToken });
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Acak Token Baru</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editingScheduleItem.token || ''}
                  onChange={e => setEditingScheduleItem({ ...editingScheduleItem, token: e.target.value.toUpperCase() })}
                  placeholder="Contoh: MAT-884, CBT-PAS, dll"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                />
                <p className="text-[11px] text-slate-500">
                  Token ini digunakan siswa untuk verifikasi akses sebelum mengerjakan ujian.
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
                Simpan Jadwal & Waktu
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
                  id="btn-confirm-reset-student-view-list"
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
                  id="btn-confirm-restore-default-schedules-list"
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
                  id="btn-confirm-clear-all-schedules-list"
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
    </div>
  );
};
