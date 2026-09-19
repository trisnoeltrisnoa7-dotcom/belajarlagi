import React, { useState, useRef, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Clock,
  Target,
  PlusCircle,
  LayoutDashboard,
  Folder,
  FileSpreadsheet,
  Bell,
  Users,
  Layers,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  ArrowRight,
  KeyRound,
  Unlock,
  Calendar,
  LogOut,
  Power,
  School,
  Wifi,
  WifiOff,
  HardDrive,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { PtnTarget, ExamViewMode, ExamResult, StudentRosterEntry, SchoolInfo, AppLayoutSettings } from '../types';
import { SchoolLogoBadge } from './SchoolLogoBadge';
import { AppLogoBadge } from './AppLogoBadge';
import { useOnlineStatus } from '../utils/offlineStorage';

interface HeaderProps {
  currentView: ExamViewMode;
  onNavigate: (view: ExamViewMode) => void;
  selectedTargets: PtnTarget[];
  onOpenTargetModal: () => void;
  onOpenAiDrillModal?: () => void;
  examHistory?: ExamResult[];
  onOpenStudentNotifications?: () => void;
  onOpenNisSettings?: () => void;
  onOpenOfflineModal?: () => void;
  onOpenHelpModal?: () => void;
  rosterStudents?: StudentRosterEntry[];
  onLogout?: () => void;
  schoolInfo?: SchoolInfo;
  onOpenEditKop?: () => void;
  onOpenCentralSubjectClass?: () => void;
  onOpenLayoutEditor?: () => void;
  layoutSettings?: AppLayoutSettings;
  onUpdateLayoutSettings?: (newSettings: AppLayoutSettings) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  selectedTargets,
  onOpenTargetModal,
  onOpenAiDrillModal,
  examHistory = [],
  onOpenStudentNotifications,
  onOpenNisSettings,
  onOpenOfflineModal,
  onOpenHelpModal,
  rosterStudents = [],
  onLogout,
  schoolInfo,
  onOpenEditKop,
  onOpenCentralSubjectClass,
  onOpenLayoutEditor,
  layoutSettings,
  onUpdateLayoutSettings,
}) => {
  const isOnline = useOnlineStatus();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Standar dimensi konsisten tombol dan ikon header
  const buttonClass = 'w-9 h-9 sm:w-10 sm:h-10';
  const iconClass = 'w-4 h-4 sm:w-4.5 sm:h-4.5';
  const logoClass = 'w-9 h-9 sm:w-10 sm:h-10';

  // Calculate unique student count
  const uniqueStudentsCount = React.useMemo(() => {
    const studentKeys = new Set<string>();
    examHistory.forEach(h => {
      const key = h.studentProfile?.nis || h.studentProfile?.fullName || h.id;
      studentKeys.add(key);
    });
    return studentKeys.size;
  }, [examHistory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu on navigation
  const handleNav = (view: ExamViewMode) => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  const currentTargetName = selectedTargets[0]?.majorName
    ? `${selectedTargets[0].majorName} (${selectedTargets[0].universityName})`
    : 'Pilih Target PTN';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800/90 text-white shadow-lg backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <button
          id="brand-logo-btn"
          type="button"
          onClick={() => handleNav('dashboard')}
          className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group p-1 -m-1 rounded-2xl hover:bg-slate-800/60 transition-all text-left shrink-0"
          title="Kembali ke Dashboard Utama UJIANKU"
        >
          <AppLogoBadge className={`${logoClass} group-hover:scale-105 transition-transform`} />
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                UJIANKU
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-normal hidden sm:block truncate max-w-[220px]">
              {schoolInfo?.schoolName ? `CBT Resmi ${schoolInfo.schoolName}` : 'CBT & Asesmen Ujian SMA'}
            </p>
          </div>
        </button>

        {/* Single Unified Menu Button in Header */}
        {currentView !== 'exam_cbt' ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Dashboard Icon Button in Header */}
            <button
              type="button"
              id="btn-header-dashboard"
              onClick={() => handleNav('dashboard')}
              className={`${buttonClass} flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-sm ${
                currentView === 'dashboard'
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700/80 hover:border-slate-600'
              }`}
              title="Dashboard Utama"
              aria-label="Dashboard Utama"
            >
              <LayoutDashboard className={`${iconClass} text-indigo-400 shrink-0`} />
            </button>

            {/* Quick Offline Button in Header */}
            {onOpenOfflineModal && (
              <button
                type="button"
                id="btn-header-offline-mode"
                onClick={onOpenOfflineModal}
                className={`${buttonClass} flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-sm ${
                  !isOnline
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700/80 hover:border-slate-600'
                }`}
                title="Buka Menu Latihan Soal Offline Tanpa Internet"
                aria-label="Latihan Soal Offline"
              >
                {!isOnline ? (
                  <WifiOff className={`${iconClass} text-amber-400 shrink-0`} />
                ) : (
                  <HardDrive className={`${iconClass} text-indigo-400 shrink-0`} />
                )}
              </button>
            )}

            {/* Quick Help Guide Button in Header */}
            {onOpenHelpModal && (
              <button
                type="button"
                id="btn-header-help-guide"
                onClick={onOpenHelpModal}
                className={`${buttonClass} flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-sm bg-indigo-600/20 hover:bg-indigo-600/30 text-amber-300 hover:text-amber-200 border-amber-500/40 hover:border-amber-400 active:scale-95`}
                title="Buku Panduan & Keterangan Singkat Setiap Tombol"
                aria-label="Buku Panduan CBT"
              >
                <HelpCircle className={`${iconClass} text-amber-400 shrink-0`} />
              </button>
            )}

            <div className="relative" ref={menuRef}>
              <button
                id="btn-main-header-menu"
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`${buttonClass} flex items-center justify-center rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md select-none border ${
                  isMenuOpen
                    ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/40 shadow-indigo-950/60'
                    : 'bg-slate-800/90 hover:bg-slate-750 text-slate-100 hover:text-white border-slate-700/80 hover:border-slate-600 active:scale-95'
                }`}
                title="Buka Menu & Navigasi Utama"
                aria-label="Menu & Navigasi Utama"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                <div className="relative flex items-center justify-center">
                  {isMenuOpen ? (
                    <X className={`${iconClass} text-white`} />
                  ) : (
                    <Menu className={`${iconClass} text-indigo-400`} />
                  )}
                  {/* Notification indicator dot if students completed exam */}
                  {uniqueStudentsCount > 0 && !isMenuOpen && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
                  )}
                </div>
              </button>

            {/* Consolidated Dropdown Menu - Compact & Scaled Down */}
            {isMenuOpen && (
              <div
                id="dropdown-main-header-menu"
                className="absolute right-0 mt-2 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-4.5rem)] overflow-y-auto overscroll-contain rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl shadow-slate-950/90 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* Header Summary Cards / Quick Status */}
                <div className="p-2 bg-slate-850/90 border-b border-slate-800 space-y-1.5">
                  {/* Student Exam Notification Button inside Menu */}
                  {onOpenStudentNotifications && (
                    <button
                      type="button"
                      id="menu-btn-student-notif"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenStudentNotifications();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <Bell className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-emerald-300 truncate leading-tight">
                            {uniqueStudentsCount > 0
                              ? `${uniqueStudentsCount} Siswa Telah Ujian`
                              : 'Status Siswa Ujian'}
                          </p>
                          <p className="text-[9.5px] text-slate-400 truncate leading-tight">
                            {uniqueStudentsCount > 0
                              ? 'Lihat daftar & nilai'
                              : 'Belum ada pengerjaan baru'}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  )}

                  {/* Target PTN Selector inside Menu */}
                  <button
                    type="button"
                    id="menu-btn-target-ptn"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenTargetModal();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                        <Target className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none">
                          Target PTN
                        </p>
                        <p className="text-[11px] font-semibold text-white truncate max-w-[150px] leading-tight">
                          {currentTargetName}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9.5px] text-rose-400 font-semibold group-hover:underline shrink-0">
                      Ubah
                    </span>
                  </button>
                </div>

                {/* Main Navigation Links */}
                <div className="p-1.5 space-y-0.5">
                  <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Navigasi Halaman
                  </p>

                  <button
                    type="button"
                    id="menu-nav-dashboard"
                    onClick={() => handleNav('dashboard')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      currentView === 'dashboard'
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Dashboard Utama</span>
                    </div>
                    {currentView === 'dashboard' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </button>

                  <button
                    type="button"
                    id="menu-nav-exam-schedule"
                    onClick={() => handleNav('exam_schedule_management')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      currentView === 'exam_schedule_management' || currentView === 'exam_schedule_list'
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                    title="Buka Manajemen Jadwal Ujian (Mode Guru & Pengawas)"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Manajemen Jadwal Ujian</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Mode Guru
                    </span>
                  </button>

                  <button
                    type="button"
                    id="menu-nav-locked-status"
                    onClick={() => handleNav('locked_status')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      currentView === 'locked_status'
                        ? 'bg-amber-600 text-white shadow-sm font-semibold'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Status Terkunci & Buka Kunci</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Buka Kunci
                    </span>
                  </button>

                  <button
                    type="button"
                    id="menu-nav-sma-hub"
                    onClick={() => handleNav('sma_hub')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      currentView === 'sma_hub'
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Mapel</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="menu-nav-question-bank"
                    onClick={() => handleNav('question_bank_input')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      currentView === 'question_bank_input'
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Input Bank Soal</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="menu-nav-google-drive"
                    onClick={() => handleNav('google_drive_hub')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      currentView === 'google_drive_hub'
                        ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Google Sheets & Drive</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Sheets
                    </span>
                  </button>

                  {onOpenNisSettings && (
                    <button
                      type="button"
                      id="menu-nav-nis-roster"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenNisSettings();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Database Siswa & NIS</span>
                      </div>
                      {rosterStudents.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {rosterStudents.length}
                        </span>
                      )}
                    </button>
                  )}

                  {onOpenCentralSubjectClass && (
                    <button
                      type="button"
                      id="menu-nav-central-subject-class"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCentralSubjectClass();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Pusat Mapel & Rombel Kelas</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Master
                      </span>
                    </button>
                  )}

                  {onOpenAiDrillModal && (
                    <button
                      type="button"
                      id="menu-nav-ai-drill"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenAiDrillModal();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>AI Drill & Latihan Soal</span>
                      </div>
                    </button>
                  )}

                  {onOpenEditKop && (
                    <button
                      type="button"
                      id="menu-nav-edit-kop"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenEditKop();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-amber-200 hover:bg-amber-950/40 hover:text-amber-100 border border-amber-500/20 transition-all cursor-pointer"
                      title="Pengaturan Kop Surat & Identitas Resmi Sekolah"
                    >
                      <div className="flex items-center gap-2">
                        <School className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Identitas & Kop Surat</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Bawaan
                      </span>
                    </button>
                  )}

                  {onOpenLayoutEditor && (
                    <button
                      type="button"
                      id="menu-nav-layout-editor"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenLayoutEditor();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-indigo-200 hover:bg-indigo-950/40 hover:text-indigo-100 border border-indigo-500/20 transition-all cursor-pointer"
                      title="Kustomisasi Tata Letak, Posisi Menu & Diagram Node Flowchart"
                    >
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Tata Letak & Flowchart</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Editor
                      </span>
                    </button>
                  )}

                  {onOpenOfflineModal && (
                    <button
                      type="button"
                      id="menu-nav-offline-mode"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenOfflineModal();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-emerald-300 hover:text-white bg-emerald-950/25 hover:bg-emerald-900/50 border border-emerald-500/25 transition-all cursor-pointer"
                      title="Simpan & Kerjakan Soal Tanpa Koneksi Internet"
                    >
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Mode Latihan Offline</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        PWA / Standalone
                      </span>
                    </button>
                  )}

                  {onOpenHelpModal && (
                    <button
                      type="button"
                      id="menu-nav-help-guide"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenHelpModal();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-amber-200 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 hover:border-amber-500/50 transition-all cursor-pointer shadow-sm"
                      title="Buka Buku Panduan Singkat Tombol & Fitur"
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Panduan Tombol & Bantuan</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Bantuan
                      </span>
                    </button>
                  )}

                  {/* Logout / Keluar Aplikasi Button in Menu */}
                  <div className="pt-1.5 mt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      id="menu-nav-logout"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-300 hover:text-white bg-rose-950/30 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500/60 transition-all cursor-pointer group shadow-sm"
                      title="Keluar / Logout dari Aplikasi UJIANKU"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 group-hover:text-white flex items-center justify-center transition-colors">
                          <LogOut className="w-3 h-3" />
                        </div>
                        <span>Keluar dari Aplikasi (Logout)</span>
                      </div>
                      <Power className="w-3 h-3 text-rose-400 group-hover:text-rose-200 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        ) : (
          /* In-Exam Header Indicator */
          <div className="flex items-center space-x-3 text-xs sm:text-sm">
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">Sesi Ujian Sedang Berlangsung</span>
            </span>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-slate-950 text-slate-100 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Konfirmasi Keluar Aplikasi
                </h3>
                <p className="text-xs text-slate-400">
                  Sesi login dan akses Anda akan diakhiri
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <p className="font-medium">
                Apakah Anda yakin ingin <strong>Logout / Keluar</strong> dari aplikasi UJIANKU?
              </p>
              <p className="text-[11px] text-slate-400">
                Seluruh data bank soal, jadwal, dan nilai ujian tetap tersimpan secara aman di penyimpanan sistem.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-logout"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs sm:text-sm font-bold border border-slate-700 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-logout"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (onLogout) {
                    onLogout();
                  } else {
                    window.location.reload();
                  }
                }}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-rose-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-rose-400/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
