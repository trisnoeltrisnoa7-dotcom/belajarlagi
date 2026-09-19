import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  Search,
  Filter,
  RefreshCw,
  Users,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Smartphone,
  RotateCcw,
  ArrowLeft,
  Share2,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  Info,
  Check,
  Play,
  FileCheck2,
} from 'lucide-react';
import {
  StudentRosterEntry,
  ActiveExamSession,
  ExamPackage,
  ExamResult,
  NisSecuritySettings,
} from '../types';
import {
  getAllActiveSessions,
  forceResetSessionByNis,
  forceResetAllActiveSessions,
  getAllFinishedExamLocks,
  unlockFinishedExamRecord,
  unlockAllFinishedExamsForNis,
  unlockEverythingForParticipant,
  unlockAllFinishedExamRecords,
  unlockAllEverything,
  isGlobalLockingDisabled as checkGlobalDisabled,
  setGlobalLockingDisabled as updateGlobalDisabled,
  FinishedExamLockRecord,
} from '../utils/sessionManager';
import { EXAM_PACKAGES } from '../data/mockPackages';
import { INITIAL_SMA_EXAM_PACKAGES } from '../data/mockSmaData';

interface LockedStatusManagementViewProps {
  rosterStudents: StudentRosterEntry[];
  availablePackages?: ExamPackage[];
  securitySettings: NisSecuritySettings;
  onBackToDashboard: () => void;
  onOpenRosterModal?: () => void;
  onStartExamForStudent?: (pkg: ExamPackage, student: StudentRosterEntry) => void;
  isGlobalLockingDisabled?: boolean;
  onToggleGlobalLocking?: (disabled: boolean) => void;
  onMasterUnlockAll?: () => { activeCount: number; finishedCount: number } | void;
}

export const LockedStatusManagementView: React.FC<LockedStatusManagementViewProps> = ({
  rosterStudents = [],
  availablePackages = [...EXAM_PACKAGES, ...INITIAL_SMA_EXAM_PACKAGES],
  securitySettings,
  onBackToDashboard,
  onOpenRosterModal,
  onStartExamForStudent,
  isGlobalLockingDisabled: propIsGlobalLockingDisabled,
  onToggleGlobalLocking,
  onMasterUnlockAll,
}) => {
  // Live states
  const [activeSessions, setActiveSessions] = useState<ActiveExamSession[]>([]);
  const [finishedLocks, setFinishedLocks] = useState<FinishedExamLockRecord[]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localGlobalLockingDisabled, setLocalGlobalLockingDisabled] = useState<boolean>(() => {
    if (typeof propIsGlobalLockingDisabled === 'boolean') return propIsGlobalLockingDisabled;
    return checkGlobalDisabled();
  });

  const isGlobalLockingOff = typeof propIsGlobalLockingDisabled === 'boolean' 
    ? propIsGlobalLockingDisabled 
    : localGlobalLockingDisabled;

  // Search and filter states (metode pencarian nama peserta)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedPackageFilter, setSelectedPackageFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ACTIVE_LOCKED' | 'FINISHED_LOCKED' | 'ANY_LOCKED' | 'UNLOCKED'>('ANY_LOCKED');

  // Confirmation Modals
  const [confirmUnlockAllActiveModal, setConfirmUnlockAllActiveModal] = useState(false);
  const [confirmUnlockAllFinishedModal, setConfirmUnlockAllFinishedModal] = useState(false);
  const [confirmUnlockAllEverythingModal, setConfirmUnlockAllEverythingModal] = useState(false);
  const [confirmParticipantUnlock, setConfirmParticipantUnlock] = useState<{
    nis: string;
    fullName: string;
    packageId?: string;
    type: 'active' | 'finished' | 'all';
  } | null>(null);

  // Show Toast Helper
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Reload all lock states from storage
  const refreshAllLocks = () => {
    setIsRefreshing(true);
    try {
      const currentActive = getAllActiveSessions(securitySettings.sessionTimeoutMinutes || 60);
      const currentFinished = getAllFinishedExamLocks();
      setActiveSessions(currentActive);
      setFinishedLocks(currentFinished);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  // Auto-refresh periodically and on mount
  useEffect(() => {
    refreshAllLocks();
    const interval = setInterval(refreshAllLocks, 3000);
    return () => clearInterval(interval);
  }, [securitySettings.sessionTimeoutMinutes]);

  // Extract distinct class list for filtering
  const classOptions = useMemo(() => {
    const classes = new Set<string>();
    rosterStudents.forEach(s => {
      if (s.studentClass) classes.add(s.studentClass);
    });
    activeSessions.forEach(s => {
      if (s.studentClass) classes.add(s.studentClass);
    });
    finishedLocks.forEach(f => {
      if (f.studentClass) classes.add(f.studentClass);
    });
    return Array.from(classes).sort();
  }, [rosterStudents, activeSessions, finishedLocks]);

  // Aggregate unified participant rows
  // Combines roster students + active sessions + finished locks
  const unifiedParticipants = useMemo(() => {
    const map = new Map<string, {
      nis: string;
      fullName: string;
      studentClass: string;
      schoolName?: string;
      activeSession?: ActiveExamSession;
      finishedLocks: FinishedExamLockRecord[];
      isRoster: boolean;
    }>();

    // 1. Add all roster students
    rosterStudents.forEach(s => {
      const cleanNis = s.nis.trim().toLowerCase();
      map.set(cleanNis, {
        nis: s.nis.trim(),
        fullName: s.fullName,
        studentClass: s.studentClass || 'Umum',
        schoolName: s.schoolName,
        finishedLocks: [],
        isRoster: true,
      });
    });

    // 2. Attach or add active sessions
    activeSessions.forEach(sess => {
      const cleanNis = sess.nis.trim().toLowerCase();
      const existing = map.get(cleanNis);
      if (existing) {
        existing.activeSession = sess;
        if (!existing.fullName || existing.fullName === 'Peserta CBT') {
          existing.fullName = sess.fullName;
        }
      } else {
        map.set(cleanNis, {
          nis: sess.nis.trim(),
          fullName: sess.fullName,
          studentClass: sess.studentClass || 'Umum',
          activeSession: sess,
          finishedLocks: [],
          isRoster: false,
        });
      }
    });

    // 3. Attach or add finished locks
    finishedLocks.forEach(fl => {
      const cleanNis = fl.nis.trim().toLowerCase();
      const existing = map.get(cleanNis);
      if (existing) {
        existing.finishedLocks.push(fl);
        if (!existing.fullName || existing.fullName === 'Peserta CBT') {
          existing.fullName = fl.fullName;
        }
      } else {
        map.set(cleanNis, {
          nis: fl.nis.trim(),
          fullName: fl.fullName,
          studentClass: fl.studentClass || 'Umum',
          finishedLocks: [fl],
          isRoster: false,
        });
      }
    });

    return Array.from(map.values());
  }, [rosterStudents, activeSessions, finishedLocks]);

  // Filtered participants by search term, class, package, and lock status
  const filteredParticipants = useMemo(() => {
    const cleanSearch = searchQuery.trim().toLowerCase();

    return unifiedParticipants.filter(p => {
      // 1. Search Query filter (Nama Peserta / NIS)
      if (cleanSearch) {
        const matchesName = p.fullName.toLowerCase().includes(cleanSearch);
        const matchesNis = p.nis.toLowerCase().includes(cleanSearch);
        const matchesClass = p.studentClass.toLowerCase().includes(cleanSearch);
        const matchesPackage =
          p.activeSession?.packageTitle?.toLowerCase().includes(cleanSearch) ||
          p.finishedLocks.some(f => f.packageTitle.toLowerCase().includes(cleanSearch));

        if (!matchesName && !matchesNis && !matchesClass && !matchesPackage) {
          return false;
        }
      }

      // 2. Class Filter
      if (selectedClassFilter !== 'ALL') {
        if (p.studentClass !== selectedClassFilter) {
          return false;
        }
      }

      // 3. Package Filter
      if (selectedPackageFilter !== 'ALL') {
        const hasActiveInPkg = p.activeSession?.packageId === selectedPackageFilter;
        const hasFinishedInPkg = p.finishedLocks.some(f => f.packageId === selectedPackageFilter);
        if (!hasActiveInPkg && !hasFinishedInPkg) {
          return false;
        }
      }

      // 4. Status Lock Filter
      const hasActiveLock = !!p.activeSession;
      const hasFinishedLock = p.finishedLocks.length > 0;
      const isAnyLocked = hasActiveLock || hasFinishedLock;

      if (selectedStatusFilter === 'ANY_LOCKED' && !isAnyLocked) return false;
      if (selectedStatusFilter === 'ACTIVE_LOCKED' && !hasActiveLock) return false;
      if (selectedStatusFilter === 'FINISHED_LOCKED' && !hasFinishedLock) return false;
      if (selectedStatusFilter === 'UNLOCKED' && isAnyLocked) return false;

      return true;
    });
  }, [unifiedParticipants, searchQuery, selectedClassFilter, selectedPackageFilter, selectedStatusFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalActiveLocked = activeSessions.length;
    const totalFinishedLocked = finishedLocks.length;
    const totalRoster = rosterStudents.length;
    const lockedNisSet = new Set<string>();
    activeSessions.forEach(s => lockedNisSet.add(s.nis.toLowerCase()));
    finishedLocks.forEach(f => lockedNisSet.add(f.nis.toLowerCase()));

    return {
      activeLockedCount: totalActiveLocked,
      finishedLockedCount: totalFinishedLocked,
      totalLockedStudents: lockedNisSet.size,
      totalRoster: totalRoster,
    };
  }, [activeSessions, finishedLocks, rosterStudents]);

  // Actions
  const handleUnlockSingleActive = (nis: string, name: string) => {
    const success = forceResetSessionByNis(nis);
    if (success) {
      showToast(`Kunci sesi aktif untuk ${name} (NIS: ${nis}) berhasil dibuka!`, 'success');
      refreshAllLocks();
    } else {
      showToast(`Gagal membuka kunci sesi untuk ${name}`, 'error');
    }
  };

  const handleUnlockSingleFinished = (packageId: string, nis: string, name: string, pkgTitle: string) => {
    const success = unlockFinishedExamRecord(packageId, nis);
    if (success) {
      showToast(`Kunci selesai ujian "${pkgTitle}" untuk ${name} (NIS: ${nis}) telah dibuka! Siswa diizinkan ujian ulang.`, 'success');
      refreshAllLocks();
    } else {
      showToast(`Gagal membuka kunci selesai ujian untuk ${name}`, 'error');
    }
  };

  const handleUnlockEverything = (nis: string, name: string) => {
    const success = unlockEverythingForParticipant(nis);
    if (success) {
      showToast(`Semua status terkunci untuk ${name} (NIS: ${nis}) berhasil dibuka sepenuhnya!`, 'success');
      refreshAllLocks();
    } else {
      showToast(`Gagal membuka status terkunci untuk ${name}`, 'error');
    }
  };

  const handleUnlockAllActiveSessions = () => {
    forceResetAllActiveSessions();
    setConfirmUnlockAllActiveModal(false);
    showToast('Seluruh sesi ujian aktif siswa telah direset dan dibuka kuncinya!', 'success');
    refreshAllLocks();
  };

  const handleUnlockAllFinishedRecords = () => {
    const count = unlockAllFinishedExamRecords();
    setConfirmUnlockAllFinishedModal(false);
    showToast(`${count} lembar ujian selesai telah dibuka kuncinya (izin ujian ulang masal)!`, 'success');
    refreshAllLocks();
  };

  const handleToggleGlobalLockingLocal = (disabled: boolean) => {
    setLocalGlobalLockingDisabled(disabled);
    updateGlobalDisabled(disabled);
    if (onToggleGlobalLocking) {
      onToggleGlobalLocking(disabled);
    }
    if (disabled) {
      showToast('🔓 Seluruh Penguncian Dinonaktifkan (Mode Bebas): Siswa dapat login & mengulang ujian tanpa batasan gembok.', 'info');
    } else {
      showToast('🔒 Sistem Penguncian Keamanan Normal Diaktifkan Kembali.', 'success');
    }
    refreshAllLocks();
  };

  const handleMasterUnlockAllExecution = () => {
    let result: { activeCount: number; finishedCount: number } = { activeCount: 0, finishedCount: 0 };
    if (onMasterUnlockAll) {
      const res = onMasterUnlockAll();
      if (res && typeof res.activeCount === 'number') {
        result = res;
      } else {
        result = unlockAllEverything();
      }
    } else {
      result = unlockAllEverything();
    }
    setConfirmUnlockAllEverythingModal(false);
    showToast(`⚡ MASTER UNLOCK BERHASIL: Mereset ${result.activeCount} sesi aktif & membuka ${result.finishedCount} lembar selesai ujian!`, 'success');
    refreshAllLocks();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Top Header Bar & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center space-x-3.5">
            <button
              id="btn-back-from-lock-manager"
              type="button"
              onClick={onBackToDashboard}
              className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Kembali ke Dashboard Utama"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-rose-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-950/40 shrink-0">
              <KeyRound className="w-6 h-6 text-amber-400" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Status Terkunci & Buka Kunci Peserta
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  CBT Live Unlock Hub
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Cari nama peserta untuk membuka gembok sesi ujian aktif (kunci perangkat) dan izin ujian ulang (remedi).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-refresh-locks"
              type="button"
              onClick={refreshAllLocks}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Perbarui data status gembok sekarang"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>

            {onOpenRosterModal && (
              <button
                id="btn-open-roster-from-lock-tab"
                type="button"
                onClick={onOpenRosterModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer active:scale-95"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Database Siswa ({stats.totalRoster})</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating Toast Message */}
        {toastMessage && (
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : toastMessage.type === 'error' ? (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-indigo-400 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 shadow-lg">
            <div className="flex items-center justify-between text-xs text-rose-300 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-rose-400" />
                <span>Sesi Aktif Terkunci</span>
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-400">
                {stats.activeLockedCount}
              </span>
              <span className="text-xs text-slate-400">Perangkat</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Siswa sedang aktif atau keluar tanpa submit. Terkunci di 1 perangkat.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 shadow-lg">
            <div className="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-amber-400" />
                <span>Ujian Selesai (Terkunci)</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">
                {stats.finishedLockedCount}
              </span>
              <span className="text-xs text-slate-400">Lembar Selesai</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Sudah ada nilai. Buka kunci jika siswa diberikan izin ujian ulang / remedi.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-lg">
            <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Total Siswa Terkunci</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-indigo-400">
                {stats.totalLockedStudents}
              </span>
              <span className="text-xs text-slate-400">Peserta</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Jumlah siswa unik yang memiliki gembok sesi aktif atau gembok selesai.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Keamanan Sesi</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  {securitySettings.enforceSingleSession ? '1 Device ON' : 'Multi Device'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Timeout Sesi: <strong className="text-white">{securitySettings.sessionTimeoutMinutes || 60} Menit</strong>
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400">
                Mode Validasi: <strong className="text-emerald-300">{securitySettings.validationMode === 'registered_only' ? 'Wajib Terdaftar' : 'Bebas Masuk'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Global Master Unlock & Deactivate All Locking Panel */}
        <div className={`p-5 sm:p-6 rounded-3xl border transition-all duration-300 shadow-2xl space-y-4 ${
          isGlobalLockingOff
            ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-amber-900/40 border-amber-500/60 shadow-amber-950/40'
            : 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-slate-800 shadow-xl'
        }`}>
          {/* Top Banner Row: Status & Master Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner shrink-0 ${
                isGlobalLockingOff
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}>
                {isGlobalLockingOff ? (
                  <Unlock className="w-6 h-6 text-amber-400" />
                ) : (
                  <Lock className="w-6 h-6 text-indigo-400" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Pusat Kendali Penguncian Ujian (Master Unlock)</span>
                  </h3>
                  {isGlobalLockingOff ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      <span>SEMUA PENGUNCIAN DINONAKTIFKAN (MODE BEBAS)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Penguncian Keamanan Aktif</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">
                  {isGlobalLockingOff
                    ? 'Siswa bebas login dari perangkat apa pun & dapat mengulang pengerjaan ujian tanpa terkunci gembok sesi maupun gembok selesai ujian.'
                    : 'Mereset atau menonaktifkan seluruh gembok sesi aktif (perangkat lain) dan gembok selesai ujian (remedial/ujian ulang) untuk semua peserta.'}
                </p>
              </div>
            </div>

            {/* Right: Master Toggle & Master Unlock Button */}
            <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap shrink-0">
              {/* Toggle Disable All Locking */}
              <button
                id="btn-toggle-global-locking"
                type="button"
                onClick={() => handleToggleGlobalLockingLocal(!isGlobalLockingOff)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 border ${
                  isGlobalLockingOff
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-500/20 font-black'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700 hover:border-slate-600'
                }`}
                title={isGlobalLockingOff ? 'Klik untuk mengaktifkan kembali penguncian' : 'Klik untuk menonaktifkan seluruh penguncian sistem'}
              >
                {isGlobalLockingOff ? (
                  <>
                    <Unlock className="w-4 h-4 text-slate-950" />
                    <span>Matikan Mode Bebas (Aktifkan Kunci)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-amber-400" />
                    <span>Nonaktifkan Semua Penguncian</span>
                  </>
                )}
              </button>

              {/* Master Unlock All Button (Executes forceResetAll + unlockAllFinished) */}
              <button
                id="btn-master-unlock-all-everything"
                type="button"
                onClick={() => setConfirmUnlockAllEverythingModal(true)}
                disabled={stats.activeLockedCount === 0 && stats.finishedLockedCount === 0}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xl border active:scale-95 ${
                  stats.activeLockedCount > 0 || stats.finishedLockedCount > 0
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white border-amber-400/50 shadow-orange-950/50 hover:shadow-orange-900/60'
                    : 'bg-slate-800/60 text-slate-500 border-slate-800 cursor-not-allowed shadow-none'
                }`}
                title="Buka SEMUA sesi aktif + SEMUA gembok selesai ujian sekaligus dalam 1 klik"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Buka Semua Penguncian ({stats.activeLockedCount + stats.finishedLockedCount})</span>
              </button>
            </div>
          </div>

          {/* Sub-actions toolbar */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold">Aksi Parsial:</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                id="btn-unlock-all-active-sessions"
                type="button"
                onClick={() => setConfirmUnlockAllActiveModal(true)}
                disabled={stats.activeLockedCount === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  stats.activeLockedCount > 0
                    ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-600/50 hover:border-rose-400 active:scale-95'
                    : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Buka Sesi Aktif ({stats.activeLockedCount})</span>
              </button>

              <button
                id="btn-unlock-all-finished-records"
                type="button"
                onClick={() => setConfirmUnlockAllFinishedModal(true)}
                disabled={stats.finishedLockedCount === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  stats.finishedLockedCount > 0
                    ? 'bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-600/50 hover:border-amber-400 active:scale-95'
                    : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Buka Selesai Ujian / Remedial ({stats.finishedLockedCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Comprehensive Participant Search & Filter Panel (Metode Pencarian Nama Peserta) */}
        <div className="p-4 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Live Search Input by Name or NIS */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-search-locked-participant-name"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan nama peserta, NIS, atau kelas..."
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-400 text-sm font-medium transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Class Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-slate-400">Kelas:</span>
                <select
                  id="select-filter-class"
                  value={selectedClassFilter}
                  onChange={e => setSelectedClassFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-white">Semua Kelas ({classOptions.length})</option>
                  {classOptions.map(cls => (
                    <option key={cls} value={cls} className="bg-slate-900 text-white">
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Package Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-slate-400">Paket:</span>
                <select
                  id="select-filter-package"
                  value={selectedPackageFilter}
                  onChange={e => setSelectedPackageFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[160px] truncate"
                >
                  <option value="ALL" className="bg-slate-900 text-white">Semua Paket Ujian</option>
                  {availablePackages.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('ANY_LOCKED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === 'ANY_LOCKED'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Terkunci Saja ({stats.totalLockedStudents})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('ACTIVE_LOCKED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === 'ACTIVE_LOCKED'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sesi Aktif ({stats.activeLockedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('FINISHED_LOCKED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === 'FINISHED_LOCKED'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Selesai ({stats.finishedLockedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === 'ALL'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({unifiedParticipants.length})
                </button>
              </div>
            </div>
          </div>

          {/* Quick Active Search Result Count */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>
              Menampilkan <strong>{filteredParticipants.length}</strong> peserta dari total <strong>{unifiedParticipants.length}</strong> data.
            </span>
            {searchQuery && (
              <span className="text-amber-400 font-semibold">
                Kata Kunci Pencarian: &ldquo;{searchQuery}&rdquo;
              </span>
            )}
          </div>
        </div>

        {/* Participant Cards / Table List */}
        <div className="space-y-3">
          {filteredParticipants.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Tidak Ada Peserta yang Sesuai</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {searchQuery
                  ? `Tidak ditemukan peserta dengan kata kunci "${searchQuery}". Silakan periksa ejaan nama peserta atau NIS.`
                  : 'Saat ini tidak ada peserta dengan filter status yang dipilih.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Hapus Kata Kunci Pencarian
                </button>
              )}
            </div>
          ) : (
            filteredParticipants.map(participant => {
              const hasActive = !!participant.activeSession;
              const hasFinished = participant.finishedLocks.length > 0;
              const isLocked = hasActive || hasFinished;

              return (
                <div
                  key={participant.nis}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-md ${
                    hasActive
                      ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                      : hasFinished
                      ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Participant Info */}
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-extrabold shrink-0 border ${
                          hasActive
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : hasFinished
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {participant.fullName.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-white truncate">
                            {participant.fullName}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                            NIS: {participant.nis}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {participant.studentClass}
                          </span>
                          {participant.schoolName && (
                            <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                              • {participant.schoolName}
                            </span>
                          )}
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                          {hasActive && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              <Lock className="w-3 h-3 text-rose-400" />
                              <span>Sesi Ujian Aktif di Perangkat</span>
                            </span>
                          )}

                          {hasFinished && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <FileCheck2 className="w-3 h-3 text-amber-400" />
                              <span>{participant.finishedLocks.length} Ujian Selesai (Terkunci)</span>
                            </span>
                          )}

                          {!isLocked && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Status Terbuka / Siap Mengerjakan Ujian</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions for this participant */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {/* Unlock Active Session Button */}
                      {hasActive && (
                        <button
                          type="button"
                          onClick={() => handleUnlockSingleActive(participant.nis, participant.fullName)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/50 flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Buka gembok sesi aktif pada perangkat ini"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Buka Kunci Sesi</span>
                        </button>
                      )}

                      {/* Unlock All Everything for this Student */}
                      {isLocked && (
                        <button
                          type="button"
                          onClick={() => handleUnlockEverything(participant.nis, participant.fullName)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Buka semua kunci (sesi aktif & izin ujian ulang seluruh paket)"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Buka Semua Kunci</span>
                        </button>
                      )}

                      {/* Quick Gate Launch for this student if callback available */}
                      {onStartExamForStudent && availablePackages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetStudent: StudentRosterEntry = {
                              id: 's_' + participant.nis,
                              nis: participant.nis,
                              fullName: participant.fullName,
                              studentClass: participant.studentClass,
                              schoolName: participant.schoolName,
                              isActive: true,
                            };
                            onStartExamForStudent(availablePackages[0], targetStudent);
                          }}
                          className="px-3 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Masuk ke Gerbang Ujian dengan Profil Siswa Ini"
                        >
                          <Play className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Gerbang Ujian</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nested Details: Active Session Details if any */}
                  {participant.activeSession && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-rose-500/20 text-xs space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-300">
                        <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5" />
                          Paket: {participant.activeSession.packageTitle}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Mulai: {new Date(participant.activeSession.startedAt).toLocaleTimeString('id-ID')} WIB
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2 pt-1 border-t border-slate-800/80">
                        <span>Perangkat / Browser: <strong className="text-slate-200">{participant.activeSession.deviceInfo || 'Browser Web'}</strong></span>
                        <span className="font-mono text-slate-400">ID Sesi: {participant.activeSession.sessionId.substring(0, 14)}...</span>
                      </div>
                    </div>
                  )}

                  {/* Nested Details: Finished Exam Locks if any */}
                  {participant.finishedLocks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
                        Daftar Ujian Selesai & Terkunci ({participant.finishedLocks.length} Paket):
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {participant.finishedLocks.map(flock => (
                          <div
                            key={flock.key}
                            className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/20 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{flock.packageTitle}</p>
                              <p className="text-[11px] text-slate-400">
                                Skor Nilai: <strong className="text-emerald-400">{flock.score} / 100</strong>
                                {flock.totalIrtScore ? ` (${flock.totalIrtScore} IRT)` : ''} • Selesai: {new Date(flock.submittedAt).toLocaleTimeString('id-ID')} WIB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUnlockSingleFinished(flock.packageId, flock.nis, flock.fullName, flock.packageTitle)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                              title="Buka gembok agar siswa ini bisa remedi / ujian ulang paket ini"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Izinkan Ulang</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Modal: Unlock All Active Sessions */}
      {confirmUnlockAllActiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Buka Kunci Seluruh Sesi Aktif?</h3>
                <p className="text-xs text-slate-400">Mereset semua gembok sesi ujian siswa di semua perangkat</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                Tindakan ini akan menghapus <strong>{stats.activeLockedCount} sesi aktif</strong>. Semua siswa yang sebelumnya terkunci karena kendala perangkat atau browser tertutup dapat login kembali tanpa halangan.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUnlockAllActiveModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-confirm-unlock-all-active"
                type="button"
                onClick={handleUnlockAllActiveSessions}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                Ya, Buka Semua Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Unlock All Finished Records */}
      {confirmUnlockAllFinishedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Buka Kunci Selesai Ujian Masal?</h3>
                <p className="text-xs text-slate-400">Memberikan izin ujian ulang (remedi) untuk seluruh peserta</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                Tindakan ini akan menghapus <strong>{stats.finishedLockedCount} gembok selesai ujian</strong> di browser. Seluruh siswa akan dapat mengerjakan ulang paket ujian dari awal.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUnlockAllFinishedModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-confirm-unlock-all-finished"
                type="button"
                onClick={handleUnlockAllFinishedRecords}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-950/50 cursor-pointer"
              >
                Ya, Buka Kunci Ujian Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: MASTER UNLOCK ALL EVERYTHING */}
      {confirmUnlockAllEverythingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl shadow-amber-950/40 space-y-5">
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-lg text-white">Buka SEMUA Penguncian Sistem?</h3>
                <p className="text-xs text-amber-300 font-semibold">Master Reset & Unlock All Exam Locks</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-3">
              <p className="font-semibold text-slate-200">
                Aksi ini akan membuka dan menghapus seluruh penguncian berikut secara serentak:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/60 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400">Sesi Aktif</span>
                    <strong className="text-rose-300">{stats.activeLockedCount} Sesi Direset</strong>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-900/60 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400">Gembok Selesai</span>
                    <strong className="text-amber-300">{stats.finishedLockedCount} Lembar Dibuka</strong>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Seluruh siswa di semua rombel/kelas akan dapat masuk dan mengerjakan ulang ujian dari perangkat mana pun tanpa kendala kunci sesi aktif ataupun tanda selesai ujian.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUnlockAllEverythingModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                id="btn-confirm-master-unlock-all"
                type="button"
                onClick={handleMasterUnlockAllExecution}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-black shadow-xl shadow-orange-950/60 cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ya, Buka Semua Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
