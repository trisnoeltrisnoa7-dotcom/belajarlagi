import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  User,
  GraduationCap,
  Hash,
  School,
  KeyRound,
  Clock,
  HelpCircle,
  ShieldCheck,
  Play,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Info,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Send,
  AlertCircle,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  X,
  Radio,
  Layers,
  Calendar,
  Award,
  FileCheck,
  MapPin,
  ArrowRight,
  Eye,
  Star,
} from 'lucide-react';
import {
  getDefaultSubject,
  getDefaultClass,
  setDefaultSubject,
  setDefaultClass,
  isDefaultSubject,
  isDefaultClass,
  subscribeDefaultSubjectClass,
} from '../utils/defaultSettingsHelper';
import { getMasterClasses, subscribeMasterSubjectClass } from '../services/masterDataService';
import { SchoolLogoBadge } from './SchoolLogoBadge';
import { StudentExamCard } from './StudentExamCard';
import {
  ExamPackage,
  StudentProfile,
  StudentRosterEntry,
  NisSecuritySettings,
  ActiveExamSession,
  DEFAULT_NIS_SECURITY_SETTINGS,
  ExamResult,
  SeparatedSubjectScore,
  SchoolInfo,
  DEFAULT_SCHOOL_INFO,
} from '../types';
import { INITIAL_STUDENT_ROSTER } from '../data/mockStudentRoster';
import {
  getOrCreateDeviceId,
  checkActiveSessionConflict,
  registerActiveExamSession,
  forceResetSessionByNis,
  getAllFinishedExamLocks,
  isGlobalLockingDisabled as checkGlobalLockingDisabled,
} from '../utils/sessionManager';
import {
  getScheduleTimeInfo,
  formatCountdownSeconds,
  parseScheduleDates,
  ScheduleTimeInfo,
  isGlobalTimeBypassActive,
  setGlobalTimeBypassActive,
} from '../utils/examScheduleTimer';
import {
  saveSystemSettingToFirebase,
  saveStudentToFirebase,
  registerActiveSession,
  loadSystemSettingFromFirebase,
  subscribeToSystemSetting,
} from '../firebase';
import {
  isGlobalTokenRequired,
  isTokenMandatoryForSchedule,
  validateExamTokenInput,
  fetchExamTokenStatusFresh,
  verifyExamTokenWithServer,
  isExamFreeModeActive,
  TOKEN_EVENT_KEY,
} from '../utils/tokenSecurity';

interface StudentExamGateViewProps {
  pkg: ExamPackage;
  onStartExamWithProfile: (profile: StudentProfile) => void;
  onBackToHub: () => void;
  onNavigateToScheduleList?: () => void;
  onViewResult?: (result: ExamResult) => void;
  rosterStudents?: StudentRosterEntry[];
  securitySettings?: NisSecuritySettings;
  onOpenNisSettings?: () => void;
  schoolInfo?: SchoolInfo;
  onOpenEditKop?: () => void;
  areAllLinksDisabled?: boolean;
  onToggleDisableAllLinks?: (disabled: boolean) => void;
  onRegenerateAllLinks?: () => void;
  isGlobalLockingDisabled?: boolean;
  onToggleGlobalLocking?: (disabled: boolean) => void;
}

export const StudentExamGateView: React.FC<StudentExamGateViewProps> = ({
  pkg,
  onStartExamWithProfile,
  onBackToHub,
  onNavigateToScheduleList,
  onViewResult,
  rosterStudents = INITIAL_STUDENT_ROSTER,
  securitySettings = DEFAULT_NIS_SECURITY_SETTINGS,
  onOpenNisSettings,
  schoolInfo,
  areAllLinksDisabled = false,
  onToggleDisableAllLinks,
  onRegenerateAllLinks,
  isGlobalLockingDisabled = false,
}) => {
  // Left Column Tab Switcher ('card' | 'details')
  const [leftTab, setLeftTab] = useState<'card' | 'details'>('card');

  // Saved profile cache from localStorage if available
  const [fullName, setFullName] = useState(() => {
    return localStorage.getItem('cbt_student_name') || '';
  });
  const [currentDefaultSubject, setCurrentDefaultSubject] = useState(() => securitySettings?.defaultSubject || getDefaultSubject());
  const [currentDefaultClass, setCurrentDefaultClass] = useState(() => securitySettings?.defaultClass || getDefaultClass());
  const [defaultToast, setDefaultToast] = useState<string | null>(null);

  const showDefaultToast = (msg: string) => {
    setDefaultToast(msg);
    setTimeout(() => setDefaultToast(null), 3000);
  };

  const [studentClass, setStudentClass] = useState(() => {
    return localStorage.getItem('cbt_student_class') || securitySettings?.defaultClass || getDefaultClass() || '11 MIPA 1';
  });
  const [nis, setNis] = useState(() => {
    return localStorage.getItem('cbt_student_nis') || '';
  });
  const [schoolName, setSchoolName] = useState(() => {
    return localStorage.getItem('cbt_student_school') || (schoolInfo?.schoolName || DEFAULT_SCHOOL_INFO.schoolName);
  });
  const [examToken, setExamToken] = useState('');
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customClassMode, setCustomClassMode] = useState(false);
  const [formError, setFormError] = useState('');

  // Subscribe to default subject & class changes
  useEffect(() => {
    const unsub = subscribeDefaultSubjectClass(cfg => {
      setCurrentDefaultSubject(cfg.subject);
      setCurrentDefaultClass(cfg.studentClass);
    });
    return unsub;
  }, []);

  const [masterClassesList, setMasterClassesList] = useState(() => getMasterClasses());

  useEffect(() => {
    const unsub = subscribeMasterSubjectClass(() => {
      setMasterClassesList(getMasterClasses());
    });
    return unsub;
  }, []);

  // Compute all available classes (merging roster, standard, and default)
  const allAvailableClasses = useMemo(() => {
    const fromRoster = rosterStudents.map(s => s.studentClass).filter(Boolean);
    const masterClasses = masterClassesList.map(c => c.name);
    const set = new Set([...fromRoster, ...masterClasses, currentDefaultClass]);
    return Array.from(set).sort();
  }, [rosterStudents, masterClassesList, currentDefaultClass]);

  // Time-gated exam schedule state ("tidak bisa dibuka kecuali sudah waktunya dan tertutup saat selesai")
  const isEffectiveLockingDisabled = isGlobalLockingDisabled || checkGlobalLockingDisabled();
  const [isSupervisorTimeBypassed, setIsSupervisorTimeBypassed] = useState(() => isGlobalTimeBypassActive() || isEffectiveLockingDisabled);
  const [isGlobalTokenRequiredState, setIsGlobalTokenRequiredState] = useState(() => isGlobalTokenRequired());
  const [systemNow, setSystemNow] = useState<Date>(new Date());
  const [isCheckingTokenLive, setIsCheckingTokenLive] = useState(false);
  const [tokenSyncMessage, setTokenSyncMessage] = useState<string | null>(null);

  // Dedicated real-time function to fetch token requirement with anti-cache headers & ?t= timestamp
  const handleSyncTokenStatusFresh = useCallback(async (showFeedback: boolean = false) => {
    setIsCheckingTokenLive(true);
    try {
      const fresh = await fetchExamTokenStatusFresh({
        packageId: pkg.id,
        subjectName: pkg.title,
      });
      setIsGlobalTokenRequiredState(fresh.isTokenRequired);
      if (showFeedback) {
        setTokenSyncMessage(
          fresh.isTokenRequired
            ? 'Status Token: WAJIB DIISI (Tersinkronisasi Real-Time)'
            : 'Status Token: NONAKTIF / BEBAS (Tersinkronisasi Real-Time)'
        );
        setTimeout(() => setTokenSyncMessage(null), 3500);
      }
    } catch (e) {
      if (showFeedback) {
        setTokenSyncMessage('Gagal menyinkronkan token secara real-time.');
        setTimeout(() => setTokenSyncMessage(null), 3000);
      }
    } finally {
      setIsCheckingTokenLive(false);
    }
  }, [pkg.id, pkg.title]);

  // Listen for time bypass and token requirement change events with cache-busting on focus/visibility
  useEffect(() => {
    const handleBypassChange = () => {
      setIsSupervisorTimeBypassed(isGlobalTimeBypassActive() || isGlobalLockingDisabled || checkGlobalLockingDisabled());
    };
    const handleTokenReqChange = () => {
      setIsGlobalTokenRequiredState(isGlobalTokenRequired());
    };

    // Re-verify token status on window focus or tab visibility (critical for mobile Safari when user switches apps)
    const handleTabReactivation = () => {
      handleSyncTokenStatusFresh(false);
    };

    window.addEventListener('cbt-time-bypass-changed', handleBypassChange);
    window.addEventListener('cbt-global-locking-changed', handleBypassChange);
    window.addEventListener(TOKEN_EVENT_KEY, handleTokenReqChange);
    window.addEventListener('storage', handleBypassChange);
    window.addEventListener('storage', handleTokenReqChange);
    window.addEventListener('focus', handleTabReactivation);
    document.addEventListener('visibilitychange', handleTabReactivation);

    // Initial fresh fetch bypassing local Safari/mobile cache
    handleSyncTokenStatusFresh(false);

    // Sync remote Firebase token setting using server-direct read
    loadSystemSettingFromFirebase<{ isTokenRequired: boolean }>('token_requirement_active', {
      forceServer: true,
      bypassCache: true,
    }).then(val => {
      if (val && typeof val.isTokenRequired === 'boolean') {
        setIsGlobalTokenRequiredState(val.isTokenRequired);
      }
    });

    const unsubTokenSetting = subscribeToSystemSetting<{ isTokenRequired: boolean }>('token_requirement_active', val => {
      if (val && typeof val.isTokenRequired === 'boolean') {
        setIsGlobalTokenRequiredState(val.isTokenRequired);
      }
    });

    const unsubTimeBypass = subscribeToSystemSetting<{ active: boolean }>('time_bypass', val => {
      if (val && typeof val.active === 'boolean') {
        setIsSupervisorTimeBypassed(val.active || isGlobalLockingDisabled || checkGlobalLockingDisabled());
        setGlobalTimeBypassActive(val.active);
        // Mode Bebas: Token nonaktif otomatis
        setIsGlobalTokenRequiredState(!val.active);
      }
    });

    const unsubGlobalLock = subscribeToSystemSetting<{ disabled: boolean }>('global_locking', val => {
      if (val && typeof val.disabled === 'boolean') {
        setIsSupervisorTimeBypassed(isGlobalTimeBypassActive() || val.disabled || checkGlobalLockingDisabled());
      }
    });

    // Background interval check every 15 seconds to keep mobile Safari in sync
    const tokenInterval = setInterval(() => {
      handleSyncTokenStatusFresh(false);
    }, 15000);

    return () => {
      window.removeEventListener('cbt-time-bypass-changed', handleBypassChange);
      window.removeEventListener('cbt-global-locking-changed', handleBypassChange);
      window.removeEventListener(TOKEN_EVENT_KEY, handleTokenReqChange);
      window.removeEventListener('storage', handleBypassChange);
      window.removeEventListener('storage', handleTokenReqChange);
      window.removeEventListener('focus', handleTabReactivation);
      document.removeEventListener('visibilitychange', handleTabReactivation);
      clearInterval(tokenInterval);
      unsubTokenSetting();
      unsubTimeBypass();
      unsubGlobalLock();
    };
  }, [handleSyncTokenStatusFresh]);

  const handleToggleBypass = (active: boolean) => {
    setIsSupervisorTimeBypassed(active);
    setGlobalTimeBypassActive(active);
    saveSystemSettingToFirebase('time_bypass', { active });
  };

  // Live timer tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Look up schedule item associated with this package
  const matchedScheduleItem = useMemo(() => {
    try {
      const stored = localStorage.getItem('cbt_custom_exam_schedules_v1');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find(
          (s: any) =>
            s.packageId === pkg.id ||
            (pkg.subject && s.subjectName?.trim().toLowerCase() === pkg.subject?.trim().toLowerCase())
        );
        if (found) return found;
      }
    } catch (e) {}

    // Fallback if package itself has scheduledStartTime
    if (pkg.scheduledStartTime) {
      const dateObj = new Date(pkg.scheduledStartTime);
      const endObj = new Date(dateObj.getTime() + (pkg.durationMinutes || 90) * 60000);
      return {
        id: `sched-${pkg.id}`,
        packageId: pkg.id,
        subjectName: pkg.subject || pkg.title,
        dayName: 'Hari Ujian',
        dateDisplay: dateObj.toLocaleDateString('id-ID', { dateStyle: 'full' }),
        dateIso: dateObj.toISOString().split('T')[0],
        startTime: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':'),
        endTime: endObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':'),
        durationMinutes: pkg.durationMinutes || 90,
        targetClass: 'Semua Kelas',
        token: pkg.token || 'CBT-001',
        kkmScore: pkg.kkmScore || 75,
        sessionNumber: 1,
      };
    }
    return null;
  }, [pkg]);

  // Compute live schedule window info (Locked / Open / Expired)
  const isEffectiveBypass = isSupervisorTimeBypassed || isGlobalTimeBypassActive() || isEffectiveLockingDisabled;

  const scheduleTimeInfo = useMemo(() => {
    if (!matchedScheduleItem) {
      return null;
    }
    return getScheduleTimeInfo(matchedScheduleItem, systemNow, isEffectiveBypass);
  }, [matchedScheduleItem, systemNow, isEffectiveBypass]);

  // Check if this student already finished & locked this exam
  const [completedRecord, setCompletedRecord] = useState<ExamResult | null>(null);

  // Is exam currently locked waiting for start time?
  const isTimeLocked = Boolean(
    scheduleTimeInfo &&
    scheduleTimeInfo.status === 'locked_upcoming' &&
    !isEffectiveBypass
  );

  // Is exam session already closed/expired?
  const isTimeExpired = Boolean(
    scheduleTimeInfo &&
    scheduleTimeInfo.status === 'closed_expired' &&
    !isEffectiveBypass
  );

  const secondsUntilOpen = scheduleTimeInfo ? scheduleTimeInfo.secondsUntilOpen : 0;
  const secondsUntilClose = scheduleTimeInfo ? scheduleTimeInfo.secondsUntilClose : 0;

  // Check for finished and locked status when NIS changes
  useEffect(() => {
    const cleanNis = nis.trim();
    if (!cleanNis || isEffectiveBypass) {
      setCompletedRecord(null);
      return;
    }

    try {
      const stored = localStorage.getItem(`cbt_exam_finished_${pkg.id}_${cleanNis}`);
      if (stored) {
        setCompletedRecord(JSON.parse(stored));
      } else {
        const locks = getAllFinishedExamLocks();
        const found = locks.find(
          l => l.packageId === pkg.id && l.nis.trim().toLowerCase() === cleanNis.toLowerCase()
        );
        if (found) {
          setCompletedRecord(found as any);
        } else {
          setCompletedRecord(null);
        }
      }
    } catch (e) {
      setCompletedRecord(null);
    }
  }, [nis, pkg.id, isEffectiveBypass]);

  // Conflict state for single-session lock
  const [conflictSession, setConflictSession] = useState<ActiveExamSession | null>(null);
  const [isSupervisorUnlockModalOpen, setIsSupervisorUnlockModalOpen] = useState(false);
  const [enteredSupervisorPin, setEnteredSupervisorPin] = useState('');
  const [supervisorPinError, setSupervisorPinError] = useState('');
  const [unlockSuccessMsg, setUnlockSuccessMsg] = useState('');

  // Live lookup matching student from roster
  const matchedStudent = useMemo(() => {
    const clean = nis.trim().toLowerCase();
    if (!clean) return null;
    return rosterStudents.find(s => s.nis.trim().toLowerCase() === clean) || null;
  }, [nis, rosterStudents]);

  // Live lookup active schedule token & custom token requirement for this exam package
  const activeScheduleItem = useMemo(() => {
    try {
      const stored = localStorage.getItem('cbt_custom_exam_schedules_v1');
      if (stored) {
        const schedules = JSON.parse(stored);
        return schedules.find((s: any) => s.packageId === pkg.id) || null;
      }
    } catch (e) {}
    return null;
  }, [pkg.id]);

  const activeScheduleToken = useMemo(() => {
    if (activeScheduleItem && activeScheduleItem.token) return activeScheduleItem.token;
    return pkg.token || 'CBT-001';
  }, [activeScheduleItem, pkg.token]);

  // Is token mandatory for this exam?
  // - Mode Normal: WAJIB DIISI
  // - Mode Bebas: TIDAK WAJIB (Bebas tanpa token)
  const isTokenMandatory = useMemo(() => {
    return isTokenMandatoryForSchedule(activeScheduleItem, isGlobalTokenRequiredState, isEffectiveBypass);
  }, [activeScheduleItem, isGlobalTokenRequiredState, isEffectiveBypass]);

  // Auto-fill student details when NIS is found in roster
  useEffect(() => {
    if (matchedStudent && securitySettings.autoFillClassAndName) {
      setFullName(matchedStudent.fullName);
      setStudentClass(matchedStudent.studentClass);
      if (matchedStudent.schoolName) {
        setSchoolName(matchedStudent.schoolName);
      }
    }
  }, [matchedStudent, securitySettings.autoFillClassAndName]);

  // Format seconds into HH:MM:SS
  const formatCountdown = (totalSecs: number) => {
    return formatCountdownSeconds(totalSecs);
  };

  // Generate shareable link
  const getShareableUrl = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin + window.location.pathname;
    const isFree = isEffectiveBypass || isExamFreeModeActive();
    const modeParam = isFree ? '&mode=bebas' : '&mode=normal';
    return `${baseUrl}?exam=${encodeURIComponent(pkg.id)}${modeParam}`;
  };

  const handleCopyLink = () => {
    const url = getShareableUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleShareWhatsApp = () => {
    const url = getShareableUrl();
    const isFree = isEffectiveBypass || isExamFreeModeActive();
    const modeText = isFree ? '🔓 Mode Bebas (Tanpa Token)' : '🔒 Mode Normal (Wajib Token)';
    const message = `Halo teman-teman / murid! Silakan ikuti Simulasi Ujian CBT Online:\n📝 *${pkg.title}*\n⏱ Durasi: ${pkg.durationMinutes} Menit | 📚 Soal: ${pkg.questions?.length || pkg.totalQuestions} Butir\n🔑 Status: ${modeText}\n\n👉 Klik link berikut untuk mengisi data diri (Nama, Kelas, NIS) dan mulai ujian:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const proceedStartExam = (profile: StudentProfile) => {
    const deviceId = getOrCreateDeviceId();
    const activeSession = registerActiveExamSession(profile, pkg, deviceId);

    // Save profile to local storage for convenience
    try {
      localStorage.setItem('cbt_student_name', profile.fullName);
      localStorage.setItem('cbt_student_class', profile.studentClass);
      localStorage.setItem('cbt_student_nis', profile.nis);
      localStorage.setItem('cbt_student_school', profile.schoolName || 'SMA Edukasi');
    } catch (err) {}

    // Real-time Firestore sync: Save/Update student identity in centralized database
    const safeStudentId = matchedStudent?.id || ('roster_' + profile.nis.trim().toLowerCase().replace(/[^a-zA-Z0-9_\-\.]/g, '_'));
    saveStudentToFirebase({
      id: safeStudentId,
      nis: profile.nis.trim(),
      fullName: profile.fullName.trim(),
      studentClass: profile.studentClass.trim(),
      schoolName: profile.schoolName?.trim() || schoolInfo?.schoolName || DEFAULT_SCHOOL_INFO.schoolName,
      isActive: true,
      notes: matchedStudent?.notes || 'Input via Ponsel / Web Siswa',
      createdAt: matchedStudent?.createdAt || new Date().toISOString(),
    });

    // Register active session to Firestore for supervisor real-time monitoring & anti dual-login
    registerActiveSession({
      nis: profile.nis.trim(),
      studentName: profile.fullName.trim(),
      className: profile.studentClass.trim(),
      packageId: pkg.id,
      sessionId: activeSession.sessionId,
      deviceInfo: activeSession.deviceInfo,
      loginTimestamp: activeSession.startedAt,
      lastHeartbeat: activeSession.lastHeartbeat,
    });

    onStartExamWithProfile(profile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setConflictSession(null);

    const cleanName = fullName.trim();
    const cleanClass = studentClass.trim();
    const cleanNis = nis.trim();

    if (!cleanNis) {
      setFormError('Silakan isi Nomor Induk Siswa (NIS / NISN).');
      return;
    }

    // Check Registered NIS Mode validation
    if (securitySettings.validationMode === 'registered_only') {
      if (!matchedStudent) {
        setFormError(
          `Nomor NIS "${cleanNis}" tidak ditemukan dalam daftar siswa terdaftar. Silakan hubungi guru/pengawas untuk didaftarkan.`
        );
        return;
      }
      if (!matchedStudent.isActive) {
        setFormError(
          `Akun siswa "${matchedStudent.fullName}" (NIS: ${cleanNis}) sedang dinonaktifkan oleh guru pengawas.`
        );
        return;
      }
    }

    if (!cleanName) {
      setFormError('Silakan masukkan Nama Lengkap Anda.');
      return;
    }
    if (!cleanClass) {
      setFormError('Silakan tentukan atau ketik Kelas Anda.');
      return;
    }

    // Real-Time Token Verification with Cache-Buster (?t=) & Cache-Control: no-cache
    // Guarantees zero stale cache on mobile Safari / HP before letting student through
    setIsCheckingTokenLive(true);
    let liveRequired = isGlobalTokenRequiredState;
    try {
      const freshStatus = await fetchExamTokenStatusFresh({
        packageId: pkg.id,
        subjectName: pkg.title,
      });
      liveRequired = freshStatus.isTokenRequired;
      setIsGlobalTokenRequiredState(liveRequired);
    } catch (e) {}
    setIsCheckingTokenLive(false);

    const liveMandatory = isTokenMandatoryForSchedule(matchedScheduleItem, liveRequired, isEffectiveBypass);

    // Verify token with Server API (Cache-Control: no-cache, timestamp ?t=)
    // HANYA jika status adalah Mode Normal (liveMandatory === true)
    if (liveMandatory) {
      const tokenValidation = await verifyExamTokenWithServer(examToken, activeScheduleToken, true, isEffectiveBypass, pkg.id);
      if (!tokenValidation.isValid) {
        setFormError(tokenValidation.errorMessage || 'Token Ujian wajib diisi untuk memulai ujian pada Mode Normal.');
        return;
      }
    }

    if (!agreedToRules) {
      setFormError('Harap centang persetujuan pakta integritas ujian sebelum memulai.');
      return;
    }

    const deviceId = getOrCreateDeviceId();

    // 1. Single Session Lock Check (Anti Dual-Login) - Bypassed in Mode Bebas
    if (securitySettings.enforceSingleSession && !isEffectiveBypass) {
      const check = checkActiveSessionConflict(cleanNis, deviceId, securitySettings);
      if (check.hasConflict && check.activeSession) {
        setConflictSession(check.activeSession);
        return;
      }
    }

    const profile: StudentProfile = {
      fullName: cleanName,
      studentClass: cleanClass,
      nis: cleanNis,
      schoolName: schoolName.trim() || 'SMA Edukasi',
      examToken: examToken.trim(),
    };

    proceedStartExam(profile);
  };

  // Direct Preview for Supervisor/Teacher (No form roadblock, bypasses time locks)
  const handleDirectSupervisorPreview = () => {
    handleToggleBypass(true);

    const previewProfile: StudentProfile = {
      fullName: fullName.trim() || 'Pengawas / Guru (Pratinjau CBT)',
      studentClass: studentClass.trim() || 'Tim Pengawas CBT',
      nis: nis.trim() || '999999',
      schoolName: schoolName.trim() || (schoolInfo?.schoolName || DEFAULT_SCHOOL_INFO.schoolName),
      examToken: activeScheduleToken || pkg.token || 'CBT-001',
    };

    try {
      localStorage.setItem('cbt_student_name', previewProfile.fullName);
      localStorage.setItem('cbt_student_class', previewProfile.studentClass);
      localStorage.setItem('cbt_student_nis', previewProfile.nis);
    } catch (e) {}

    proceedStartExam(previewProfile);
  };

  // Force Unlock / Reset Sesi via Supervisor PIN
  const handleSupervisorUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSupervisorPinError('');

    const isPinEnabled = securitySettings.enableSupervisorPin !== false;
    if (isPinEnabled) {
      const cleanPin = enteredSupervisorPin.trim();
      const targetPin = securitySettings.supervisorPin || '1234';

      if (cleanPin !== targetPin) {
        setSupervisorPinError('PIN Pengawas salah! Silakan tanyakan PIN yang benar kepada guru/pengawas.');
        return;
      }
    }

    handleToggleBypass(true);

    if (conflictSession) {
      forceResetSessionByNis(conflictSession.nis);
    }

    setUnlockSuccessMsg('Sesi berhasil dibuka kuncinya! Mengalihkan ke lembar ujian...');

    const profile: StudentProfile = {
      fullName: fullName.trim(),
      studentClass: studentClass.trim(),
      nis: nis.trim(),
      schoolName: schoolName.trim() || 'SMA Edukasi',
      examToken: examToken.trim(),
    };

    setTimeout(() => {
      setIsSupervisorUnlockModalOpen(false);
      setConflictSession(null);
      proceedStartExam(profile);
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      {/* Top Status Bar: Kembali ke Daftar Ujian & Server Ujian Siap */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {onNavigateToScheduleList && (
            <button
              id="btn-gate-back-to-schedule"
              type="button"
              onClick={onNavigateToScheduleList}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Kembali ke Daftar Ujian</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Server Ujian Siap (Online)</span>
          </span>
        </div>
      </div>

      {/* 1. TIME-GATED WAITING ROOM BANNER ("Tidak bisa dibuka kecuali sudah waktunya") */}
      {isTimeLocked && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500/60 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-inner">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Ruang Tunggu Terjadwal (Pintu Masuk Terkunci)
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Mata Pelajaran Terkunci Hingga Waktu Pengerjaan Tiba
                </h3>
              </div>
            </div>

            {/* Live Countdown Display */}
            <div className="bg-slate-950 px-4 py-2 rounded-xl border border-amber-500/40 text-center">
              <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Hitung Mundur Buka</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-amber-300 tracking-wider">
                {formatCountdown(secondsUntilOpen)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/30 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Jadwal Buka Sistem: <strong className="text-amber-200">{matchedScheduleItem?.dateDisplay || matchedScheduleItem?.dayName || 'Hari Ini'} pukul {matchedScheduleItem?.startTime || '07:30'} - {matchedScheduleItem?.endTime || '09:00'} WIB</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {onNavigateToScheduleList && (
                <button
                  type="button"
                  onClick={onNavigateToScheduleList}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-500/40 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Kembali ke Daftar Ujian</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleToggleBypass(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer transition-colors"
                title="Bypass pembatasan waktu untuk simulasi / guru pengawas"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Mode Pengawas: Buka Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TIME EXPIRED / SESSION CLOSED BANNER ("Tertutup lagi setelah waktu itu selesai") */}
      {isTimeExpired && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border-2 border-rose-500/60 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 shadow-inner">
                <X className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-rose-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  SESI UJIAN TELAH BERAKHIR (TERKUNCI / TERTUTUP)
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Waktu Pengerjaan Sesi Ini Telah Berakhir & Ditutup Sistem
                </h3>
              </div>
            </div>

            <div className="bg-slate-950 px-4 py-2 rounded-xl border border-rose-500/40 text-center">
              <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Status Akses</span>
              <span className="text-sm font-bold text-rose-400">Telah Berakhir</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-500/30 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Jadwal sesi ini berakhir pada pukul <strong>{matchedScheduleItem?.endTime || '09:00'} WIB</strong>. Siswa tidak dapat lagi mengerjakan sesi ini.
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {onNavigateToScheduleList && (
                <button
                  type="button"
                  onClick={onNavigateToScheduleList}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-500/40 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Lihat Jadwal Lain</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleToggleBypass(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer transition-colors"
                title="Bypass pembatasan waktu untuk simulasi / guru pengawas"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Mode Pengawas: Buka Akses Khusus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED & LOCKED FINISHED STATE ("Jika sudah dikunci dengan tanda selesai") */}
      {completedRecord && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border-2 border-emerald-500/60 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-inner">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  STATUS: SUDAH DIKUNCI (TANDA SELESAI)
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Siswa Ini Telah Menyelesaikan & Mengunci Ujian
                </h3>
              </div>
            </div>

            <div className="bg-slate-950 px-4 py-2 rounded-xl border border-emerald-500/40 text-center">
              <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Nilai Total Akhir</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {completedRecord.score} / 100
              </span>
            </div>
          </div>

          {/* Raport Nilai Mapel (Hanya Satu Kolom Nilai) */}
          {completedRecord.separatedSubjectScores && Object.keys(completedRecord.separatedSubjectScores).length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Raport Nilai Mapel (Terkunci Selesai):</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Selesai: {new Date(completedRecord.submittedAt).toLocaleTimeString('id-ID')} WIB
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-3">Mata Pelajaran</th>
                      <th className="py-2 px-3 text-center w-24">KKM</th>
                      <th className="py-2 px-3 text-center w-28 bg-indigo-950/40 text-indigo-300">Nilai</th>
                      <th className="py-2 px-3 text-center w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/50">
                    {(Object.values(completedRecord.separatedSubjectScores) as SeparatedSubjectScore[]).map((subScore, sIdx) => {
                      const isPassed = subScore.isPassedKkm ?? (subScore.score100 >= (subScore.kkmScore || 75));
                      return (
                        <tr key={subScore.subtestId || sIdx} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-semibold text-white">
                            {subScore.subjectName}
                            <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                              ({subScore.correct}/{subScore.totalQuestions} Benar)
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">
                            {subScore.kkmScore || 75}
                          </td>
                          {/* HANYA SATU KOLOM NILAI */}
                          <td className="py-2 px-3 text-center bg-indigo-950/20 font-mono font-black text-sm text-emerald-400">
                            {subScore.score100}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {isPassed ? 'Tuntas' : 'Belum Tuntas'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-emerald-300/90 font-medium">
              🔒 Sesi ujian ini sudah berstatus <strong>SELESAI (TERKUNCI)</strong>. Lembar jawaban telah tersimpan permanen di server dan tidak dapat diubah lagi.
            </p>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {onNavigateToScheduleList && (
                <button
                  type="button"
                  onClick={onNavigateToScheduleList}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Kembali ke Daftar Ujian</span>
                </button>
              )}
              {onViewResult && completedRecord && (
                <button
                  type="button"
                  onClick={() => onViewResult(completedRecord)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Lihat Lembar Nilai</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Single Centered Card: Form Identitas Siswa */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        
        {/* Header Mapel & Identitas */}
        <div className="border-b border-slate-800 pb-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                {pkg.subject || pkg.badge || 'Ujian CBT'}
              </span>

              {/* Default Subject indicator / action */}
              {isDefaultSubject(pkg.subject || pkg.title) ? (
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1"
                  title="Mata pelajaran ini diset sebagai default sistem CBT"
                >
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                  <span>Mapel Default Aktif</span>
                </span>
              ) : (
                <button
                  type="button"
                  id="btn-set-current-subject-default"
                  onClick={() => {
                    const targetSubj = pkg.subject || pkg.title;
                    setDefaultSubject(targetSubj);
                    setCurrentDefaultSubject(targetSubj);
                    showDefaultToast(`Mata Pelajaran "${targetSubj}" berhasil diset sebagai default!`);
                  }}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/80 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-700/80 hover:border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Jadikan mata pelajaran ini sebagai default bawaan ujian"
                >
                  <Star className="w-3 h-3" />
                  <span>Jadikan Mapel Default</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              {!isEffectiveBypass && (
                <>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <strong className="text-white">{pkg.durationMinutes} Menit</strong>
                  </span>
                  <span>•</span>
                </>
              )}
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <strong className="text-white">{pkg.questions?.length || pkg.totalQuestions} Soal</strong>
              </span>
            </div>
          </div>

          {/* Default Notification Toast Banner */}
          {defaultToast && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" />
              <span>{defaultToast}</span>
            </div>
          )}

          <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
            {pkg.title}
          </h1>

          <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
            <User className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">Identitas Peserta Didik</span>
            <span>—</span>
            <span>Silakan lengkapi data diri Anda untuk memulai ujian.</span>
          </div>
        </div>

        {/* Link Deactivated Alert Banner */}
        {areAllLinksDisabled && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500/80 text-rose-200 shadow-xl space-y-2 animate-pulse">
            <div className="flex items-center gap-2.5 font-bold text-sm text-rose-300">
              <Lock className="w-5 h-5 text-rose-400 shrink-0" />
              <span>AKSES LINK UJIAN SISWA SEDANG DINONAKTIFKAN</span>
            </div>
            <p className="text-xs text-rose-300/90 leading-relaxed">
              Panitia atau Pengawas Ujian saat ini sedang menonaktifkan seluruh akses link ujian. Pengerjaan soal sementara waktu tidak dapat diakses sampai link diaktifkan kembali oleh pengawas.
            </p>
          </div>
        )}

        {/* Error Message */}
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Dual Session Conflict Warning Box */}
        {conflictSession && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/60 text-xs space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-300">
                  Sesi Ujian Sedang Aktif di Perangkat Lain! (Anti-Dual Login)
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Nomor NIS <strong className="text-white font-mono">{conflictSession.nis}</strong> ({conflictSession.fullName}) saat ini <strong>sedang aktif mengerjakan ujian</strong> pada paket <em>"{conflictSession.packageTitle}"</em> di perangkat/browser lain.
                </p>
                <p className="text-[11px] text-rose-300/90 font-medium">
                  Sistem mencegah pengerjaan secara bersamaan dengan NIS yang sama.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between text-[11px] text-slate-300">
              <span>Mulai: {new Date(conflictSession.startedAt).toLocaleTimeString('id-ID')}</span>
              <span>Perangkat: {conflictSession.deviceInfo || 'Browser Lain'}</span>
              <span className="text-emerald-400 font-semibold">Status: Berjalan</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConflictSession(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (securitySettings.enableSupervisorPin === false) {
                    handleSupervisorUnlock();
                  } else {
                    setIsSupervisorUnlockModalOpen(true);
                    setEnteredSupervisorPin('');
                    setSupervisorPinError('');
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
                title={securitySettings.enableSupervisorPin === false ? "Reset sesi siswa langsung (PIN Dinonaktifkan)" : "Buka kunci dengan PIN Pengawas"}
              >
                {securitySettings.enableSupervisorPin === false ? (
                  <Unlock className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5" />
                )}
                <span>
                  {securitySettings.enableSupervisorPin === false
                    ? 'Buka Kunci Sesi (Langsung)'
                    : 'Buka Kunci Sesi (PIN Pengawas)'}
                </span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Field 1: NIS (Primary Key) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Nomor Induk Siswa (NIS) <span className="text-rose-400">*</span>
              </label>
              {securitySettings.validationMode === 'registered_only' && (
                <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Validasi Roster Otomatis
                </span>
              )}
            </div>

            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-student-nis"
                type="text"
                required
                placeholder="Masukkan NIS Anda (Contoh: 12001, 12002)"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono focus:outline-none transition-colors ${
                  matchedStudent
                    ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                    : nis.trim().length >= 3 && securitySettings.validationMode === 'registered_only'
                    ? 'border-rose-500/80 focus:border-rose-500'
                    : 'border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            </div>

            {/* NIS Match Feedback */}
            {securitySettings.validationMode === 'registered_only' ? (
              <div>
                {matchedStudent ? (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>Terdaftar:</strong> {matchedStudent.fullName} ({matchedStudent.studentClass})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      {matchedStudent.isActive ? 'Siap Ujian' : 'Dinonaktifkan'}
                    </span>
                  </div>
                ) : nis.trim().length >= 3 ? (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    NIS belum terdaftar dalam roster siswa. Masukkan NIS terdaftar atau hubungi guru.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Ketik NIS Anda untuk memverifikasi data dan mengisi nama otomatis.
                  </p>
                )}
              </div>
            ) : (
              <div>
                {matchedStudent ? (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>NIS Terdaftar:</strong> {matchedStudent.fullName} ({matchedStudent.studentClass})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      Otomatis Terisi
                    </span>
                  </div>
                ) : nis.trim().length >= 3 ? (
                  <p className="text-[11px] text-indigo-300/90 flex items-center gap-1">
                    <span>🔓 Mode Terbuka: NIS siap digunakan. Masukkan nama & kelas di bawah.</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Mode Terbuka Aktif: NIS di database akan otomatis terisi namanya, atau ketik identitas Anda secara bebas.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Field 2: Nama Lengkap */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              Nama Lengkap Siswa <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-student-fullname"
                type="text"
                required
                placeholder="Contoh: Muhammad Rizky Pratama"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                readOnly={securitySettings.validationMode === 'registered_only' && !!matchedStudent}
                className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors ${
                  securitySettings.validationMode === 'registered_only' && !!matchedStudent
                    ? 'border-emerald-500/40 bg-slate-900/80 cursor-not-allowed text-emerald-100 font-semibold'
                    : 'border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Nama ini akan tercetak pada lembar hasil dan analisis nilai ujian.
            </p>
          </div>

          {/* Field 3 & 4: Kelas & Asal Sekolah */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kelas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-1.5">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Kelas / Rombel <span className="text-rose-400">*</span>
                  </label>
                  {studentClass.trim() === currentDefaultClass.trim() ? (
                    <span
                      className="p-1 rounded text-amber-300 bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"
                      title="Kelas ini adalah kelas default sistem"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-300" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      id="btn-set-current-class-default"
                      onClick={() => {
                        const targetCls = studentClass.trim();
                        if (targetCls) {
                          setDefaultClass(targetCls);
                          setCurrentDefaultClass(targetCls);
                          showDefaultToast(`Kelas "${targetCls}" berhasil diset sebagai default!`);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
                      title="Jadikan kelas ini sebagai kelas default bawaan login"
                      aria-label="Set Default Kelas"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-400 hover:fill-amber-400" />
                    </button>
                  )}
                </div>

                {securitySettings.validationMode !== 'registered_only' && (
                  <button
                    type="button"
                    onClick={() => setCustomClassMode(!customClassMode)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    {customClassMode ? 'Pilih dari List' : 'Ketik Manual'}
                  </button>
                )}
              </div>

              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                {securitySettings.validationMode === 'registered_only' && matchedStudent ? (
                  <input
                    type="text"
                    readOnly
                    value={studentClass}
                    className="w-full bg-slate-900/80 border border-emerald-500/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-emerald-100 font-semibold cursor-not-allowed"
                  />
                ) : customClassMode ? (
                  <input
                    id="input-student-class-manual"
                    type="text"
                    required
                    placeholder="Contoh: 12 MIPA 4 / X-A"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                ) : (
                  <select
                    id="select-student-class"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  >
                    {allAvailableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls} {cls === currentDefaultClass ? '★ (Default)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Asal Sekolah */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Asal Sekolah
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-student-school"
                  type="text"
                  placeholder="Contoh: SMAN 1 Edukasi"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Token Ujian: Mode Normal (Wajib) vs Mode Bebas (Tidak Wajib) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className={`w-3.5 h-3.5 ${isTokenMandatory ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span>Token Ujian</span>
                {isTokenMandatory ? (
                  <span className="text-amber-400 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/30">
                    MODE NORMAL: WAJIB DIISI
                  </span>
                ) : (
                  <span className="text-emerald-400 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/30">
                    MODE BEBAS
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-sync-token-status"
                  onClick={() => handleSyncTokenStatusFresh(true)}
                  disabled={isCheckingTokenLive}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
                  title="Periksa status token langsung ke database (bebas cache Safari & HP)"
                >
                  <RefreshCw className={`w-3 h-3 text-cyan-400 ${isCheckingTokenLive ? 'animate-spin' : ''}`} />
                  <span>Sinkronkan Token</span>
                </button>
                {isTokenMandatory && (
                  <span className="text-[10px] text-slate-400">
                    Wajib memasukkan token resmi
                  </span>
                )}
              </div>
            </div>

            <div className="relative">
              <KeyRound className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isTokenMandatory ? 'text-amber-400' : 'text-emerald-500/60'}`} />
              <input
                id="input-student-token"
                type="text"
                placeholder={
                  isTokenMandatory
                    ? "Masukkan Token Ujian Resmi (Contoh: " + (activeScheduleToken || "MAT-01") + ")"
                    : "Mode Bebas: Token tidak wajib diisi (Bebas langsung masuk ujian)"
                }
                value={examToken}
                onChange={(e) => setExamToken(e.target.value.toUpperCase())}
                className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest transition-colors uppercase ${
                  isTokenMandatory
                    ? 'border-amber-500/60 text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                    : 'border-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600'
                }`}
              />
            </div>

            {tokenSyncMessage && (
              <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
                <span>{tokenSyncMessage}</span>
              </div>
            )}

            {isTokenMandatory ? (
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                <span>Mode Normal Aktif: Anda wajib memasukkan token resmi dari guru/pengawas sebelum menekan Mulai Ujian.</span>
              </p>
            ) : (
              <p className="text-[11px] text-emerald-400/90 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>Mode Bebas Aktif: Token tidak wajib diisi. Anda dapat mengosongkan kolom token dan langsung memulai ujian.</span>
              </p>
            )}
          </div>

          {/* Pakta Integritas Checkbox */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
            <input
              id="checkbox-integrity-pact"
              type="checkbox"
              checked={agreedToRules}
              onChange={(e) => setAgreedToRules(e.target.checked)}
              className="w-4 h-4 rounded mt-0.5 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="checkbox-integrity-pact" className="text-xs text-slate-300 leading-relaxed cursor-pointer select-none">
              <strong className="text-white">Pakta Integritas Ujian:</strong> Saya menyatakan bahwa data identitas di atas adalah benar milik saya dan saya bersedia mengerjakan ujian ini secara mandiri dan jujur tanpa kecurangan.
            </label>
          </div>

          {/* Submit / Start Button and Back Button */}
          <div className="pt-2 space-y-2.5">
            {isTimeLocked ? (
              <div className="space-y-2">
                <button
                  id="btn-confirm-and-start-exam"
                  type="button"
                  disabled
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 cursor-not-allowed"
                >
                  <Lock className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span>Ujian Terkunci (Buka Otomatis dalam {formatCountdown(secondsUntilOpen)})</span>
                </button>
                {onNavigateToScheduleList && (
                  <button
                    id="btn-back-to-schedule-when-time-locked"
                    type="button"
                    onClick={onNavigateToScheduleList}
                    className="w-full py-3 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Kembali ke Jadwal Ujianku</span>
                  </button>
                )}
              </div>
            ) : isTimeExpired ? (
              <div className="space-y-2">
                <button
                  id="btn-confirm-and-start-exam"
                  type="button"
                  disabled
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 cursor-not-allowed"
                >
                  <X className="w-5 h-5 text-rose-400" />
                  <span>Sesi Ujian Ditutup (Waktu Pelaksanaan Telah Berakhir)</span>
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {onNavigateToScheduleList && (
                    <button
                      id="btn-back-to-schedule-when-expired"
                      type="button"
                      onClick={onNavigateToScheduleList}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-indigo-300" />
                      <span>Kembali ke Jadwal</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleBypass(true)}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Mode Pengawas: Buka Izin</span>
                  </button>
                </div>
              </div>
            ) : completedRecord ? (
              <div className="space-y-2">
                <button
                  id="btn-confirm-and-start-exam"
                  type="button"
                  disabled
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 cursor-not-allowed"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Ujian Sudah Selesai & Terkunci Permanen</span>
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {onNavigateToScheduleList && (
                    <button
                      id="btn-back-to-schedule-when-completed"
                      type="button"
                      onClick={onNavigateToScheduleList}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-indigo-200" />
                      <span>Kembali ke Daftar Ujian</span>
                    </button>
                  )}
                  {onViewResult && (
                    <button
                      id="btn-view-result-when-completed"
                      type="button"
                      onClick={() => onViewResult(completedRecord)}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-emerald-200" />
                      <span>Lihat Nilai & Analisis</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <button
                  id="btn-confirm-and-start-exam"
                  type="submit"
                  disabled={
                    areAllLinksDisabled ||
                    !agreedToRules ||
                    !fullName.trim() ||
                    !nis.trim() ||
                    (securitySettings.validationMode === 'registered_only' && !matchedStudent)
                  }
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
                    !areAllLinksDisabled &&
                    agreedToRules &&
                    fullName.trim() &&
                    nis.trim() &&
                    (securitySettings.validationMode !== 'registered_only' || !!matchedStudent)
                      ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white shadow-indigo-600/30 active:scale-[0.99]'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-70'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    {areAllLinksDisabled
                      ? 'Akses Ujian Ditutup oleh Panitia'
                      : 'Mulai Ujian Sekarang (Masuk CBT)'}
                  </span>
                </button>
              </div>
            )}
            <p className="text-[11px] text-center text-slate-400 mt-2">
              {isTimeLocked
                ? 'Tombol mulai akan aktif secara otomatis saat hitung mundur mencapai 00:00:00.'
                : completedRecord
                ? 'Hasil jawaban Anda telah terkirim dan tersimpan di database.'
                : isEffectiveBypass
                ? 'Mode bebas aktif (tanpa batasan waktu).'
                : `Timer hitung mundur ${pkg.durationMinutes} menit akan langsung dimulai setelah tombol ditekan.`}
            </p>
          </div>
        </form>
      </div>

      {/* SUPERVISOR UNLOCK MODAL (Bypass Single-Session Lock) */}
      {isSupervisorUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Buka Kunci Sesi Pengawas</h3>
              </div>
              <button
                onClick={() => setIsSupervisorUnlockModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {securitySettings.enableSupervisorPin !== false ? (
              <p className="text-xs text-slate-300">
                Masukkan <strong>PIN Pengawas / Guru</strong> untuk mereset sesi aktif siswa <strong>{nis}</strong> ({fullName}) dan memindahkan ujian ke perangkat ini:
              </p>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Unlock className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>Proteksi PIN Dinonaktifkan:</strong> Anda dapat langsung mereset sesi aktif siswa <strong>{nis}</strong> ({fullName}) tanpa memasukkan PIN.
                </span>
              </div>
            )}

            {supervisorPinError && (
              <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{supervisorPinError}</span>
              </div>
            )}

            {unlockSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{unlockSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSupervisorUnlock} className="space-y-4">
              {securitySettings.enableSupervisorPin !== false && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    PIN Pengawas (Default: 1234)
                  </label>
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Ketik PIN Pengawas"
                    value={enteredSupervisorPin}
                    onChange={e => setEnteredSupervisorPin(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupervisorUnlockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Reset Sesi & Masuk Ujian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
