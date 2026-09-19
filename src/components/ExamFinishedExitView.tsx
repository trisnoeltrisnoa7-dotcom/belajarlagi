import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  LogOut,
  School,
  User,
  ShieldCheck,
  GraduationCap,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Sparkles,
  Home,
  KeyRound,
  Unlock,
} from 'lucide-react';
import { ExamPackage, ExamResult, StudentProfile, NisSecuritySettings } from '../types';
import { SchoolLogoBadge } from './SchoolLogoBadge';
import { SupervisorPinModal } from './SupervisorPinModal';

interface ExamFinishedExitViewProps {
  pkg?: ExamPackage;
  result?: ExamResult | null;
  studentProfile?: StudentProfile | null;
  isAdmin?: boolean;
  securitySettings?: NisSecuritySettings;
  onBackToDashboard?: () => void;
  onNavigateToScheduleList?: () => void;
  onOpenNewExam?: () => void;
}

export const ExamFinishedExitView: React.FC<ExamFinishedExitViewProps> = ({
  pkg,
  result,
  studentProfile,
  isAdmin = false,
  securitySettings,
  onBackToDashboard,
  onNavigateToScheduleList,
  onOpenNewExam,
}) => {
  const [closeAttempted, setCloseAttempted] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const handleOpenNewTab = () => {
    try {
      window.open('about:blank', '_blank');
    } catch (e) {}
  };

  const handleCloseWindow = () => {
    setCloseAttempted(true);
    try {
      window.close();
    } catch (e) {}

    // For popup windows or webviews
    setTimeout(() => {
      try {
        window.open('', '_self', '');
        window.close();
      } catch (e) {}
    }, 150);
  };

  const handleBlankRedirect = () => {
    try {
      window.location.href = 'about:blank';
    } catch (e) {}
  };

  const studentName = studentProfile?.fullName || result?.studentProfile?.fullName || 'Peserta Ujian';
  const studentNis = studentProfile?.nis || result?.studentProfile?.nis || '-';
  const studentClass = studentProfile?.studentClass || result?.studentProfile?.studentClass || '-';
  const schoolName = pkg?.schoolName || studentProfile?.schoolName || 'SMA / MADRASAH ALIYAH';
  const examTitle = pkg?.title || result?.packageTitle || 'Ujian CBT';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-rose-500 selection:text-white">
      {/* Background radial highlight */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950 to-slate-950 pointer-events-none -z-10" />

      <div className="w-full max-w-xl space-y-6">
        {/* Top School Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs shadow-sm">
            <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-amber-500/40 flex items-center justify-center shrink-0">
              <SchoolLogoBadge className="w-4 h-4" logoUrl={pkg?.schoolLogo || studentProfile?.schoolLogo} />
            </div>
            <span className="font-bold text-white uppercase tracking-wider">{schoolName}</span>
          </div>
        </div>

        {/* Main Exit Card */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 text-center backdrop-blur-sm relative overflow-hidden">
          {/* Top colored accent bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500" />

          {/* Success / Locked Icon */}
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner text-emerald-400">
            <ShieldCheck className="w-10 h-10 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sesi Ujian Selesai & Berhasil Keluar</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Terima Kasih Telah Mengerjakan Ujian
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Seluruh lembar jawaban Anda telah tersimpan secara permanen dan sesi aktif telah dikunci. Anda dapat kembali ke daftar ujian untuk melihat mata pelajaran lainnya atau menutup halaman ini.
            </p>
          </div>

          {/* Student & Exam Summary Badge */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Paket Ujian:</span>
              <strong className="text-indigo-300 font-semibold text-right truncate max-w-[240px]">
                {examTitle}
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
              <div>
                <span className="text-[11px] text-slate-500 block">Nama Peserta:</span>
                <span className="font-bold text-white truncate block">{studentName}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">NIS & Kelas:</span>
                <span className="font-mono text-slate-300">{studentNis} • {studentClass}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-emerald-400 font-medium">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Status: Jawaban Terkunci di Database Sekolah (Sesi Nonaktif)</span>
            </div>
          </div>

          {/* Navigation & Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Admin Only Action: Kembali ke Dashboard Utama */}
            {isAdmin && onBackToDashboard && (
              <button
                id="btn-exit-to-dashboard-admin"
                type="button"
                onClick={onBackToDashboard}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 border border-amber-400/40"
              >
                <Home className="w-4 h-4" />
                <span>Kembali ke Dashboard Utama (Khusus Admin / Guru)</span>
              </button>
            )}

            {/* Primary Action: Kembali ke Daftar Ujian */}
            {onNavigateToScheduleList && (
              <button
                id="btn-exit-to-schedule-list"
                type="button"
                onClick={onNavigateToScheduleList}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-black shadow-lg shadow-indigo-950/60 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 border border-indigo-400/30"
              >
                <Calendar className="w-4 h-4 text-indigo-200" />
                <span>Kembali ke Daftar Ujian</span>
              </button>
            )}

            {/* Secondary Action: Buka Tab Baru di Browser */}
            <button
              id="btn-open-new-tab"
              type="button"
              onClick={handleOpenNewTab}
              className="w-full py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white text-xs sm:text-sm font-bold border border-slate-700 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Tab Baru di Browser</span>
            </button>

            {/* Tertiary Action: Tutup Halaman / Tab */}
            <button
              id="btn-close-exam-tab"
              type="button"
              onClick={handleCloseWindow}
              className="w-full py-3 rounded-2xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs sm:text-sm font-bold border border-rose-500/50 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Tutup Halaman / Tab Ujian Ini</span>
            </button>

            <div className="pt-1 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleBlankRedirect}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5 p-1 cursor-pointer"
              >
                <span>Tinggalkan Halaman ke Blank Page (about:blank)</span>
              </button>

              {/* Proctor / Teacher PIN Unlock Option to return to Dashboard */}
              {!isAdmin && onBackToDashboard && (
                <button
                  type="button"
                  id="btn-proctor-unlock-dashboard-exit"
                  onClick={() => {
                    if (securitySettings?.enableSupervisorPin === false) {
                      onBackToDashboard();
                    } else {
                      setIsPinModalOpen(true);
                    }
                  }}
                  className="mt-2 text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-950/30 hover:bg-amber-950/60 border border-amber-500/30 cursor-pointer"
                  title={securitySettings?.enableSupervisorPin === false ? "Kembali ke Dashboard (PIN Dinonaktifkan)" : "Otorisasi Pengawas untuk kembali ke Dashboard"}
                >
                  {securitySettings?.enableSupervisorPin === false ? (
                    <Unlock className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <KeyRound className="w-3 h-3" />
                  )}
                  <span>
                    {securitySettings?.enableSupervisorPin === false
                      ? 'Akses Pengawas: Masuk Dashboard'
                      : 'Akses Pengawas: Masuk Dashboard (PIN 4 Digit)'}
                  </span>
                </button>
              )}
            </div>

            {closeAttempted && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-2 animate-fadeIn">
                <p>
                  💡 <strong>Catatan:</strong> Kebijakan keamanan browser Anda mungkin membatasi penutupan tab secara otomatis. Silakan pilih <strong>Kembali ke Daftar Ujian</strong> atau tutup tab melalui tanda silang di atas browser.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Supervisor PIN Modal */}
      <SupervisorPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        isEnabled={securitySettings?.enableSupervisorPin !== false}
        onSuccess={() => {
          if (onBackToDashboard) {
            onBackToDashboard();
          }
        }}
        targetPin={securitySettings?.supervisorPin || '1234'}
        title="Otorisasi Dashboard Pengawas"
        description="Masukkan 4 digit PIN Pengawas/Guru untuk kembali ke Dashboard Utama."
      />
    </div>
  );
};
