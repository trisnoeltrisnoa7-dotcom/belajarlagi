import React, { useRef } from 'react';
import {
  GraduationCap,
  School,
  MapPin,
  Calendar,
  Clock,
  KeyRound,
  Printer,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Sparkles,
  Award,
  Hash,
  User,
  Layers,
  FileText,
  Lock,
  Check,
  BookOpen,
} from 'lucide-react';
import { SchoolInfo, DEFAULT_SCHOOL_INFO, ExamPackage, StudentProfile } from '../types';
import { SchoolLogoBadge } from './SchoolLogoBadge';
import { isGlobalLockingDisabled } from '../utils/sessionManager';
import { isGlobalTimeBypassActive } from '../utils/examScheduleTimer';

export interface StudentExamCardProps {
  student: {
    fullName: string;
    nis: string;
    studentClass: string;
    schoolName?: string;
    roomName?: string;
    sessionNumber?: number;
  };
  pkg?: ExamPackage | null;
  schoolInfo?: SchoolInfo;
  examToken?: string;
  scheduleDisplay?: {
    dayName?: string;
    dateDisplay?: string;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    subjectName?: string;
  };
  onPrint?: () => void;
  showPrintButton?: boolean;
  compact?: boolean;
}

export const StudentExamCard: React.FC<StudentExamCardProps> = ({
  student,
  pkg,
  schoolInfo = DEFAULT_SCHOOL_INFO,
  examToken,
  scheduleDisplay,
  onPrint,
  showPrintButton = true,
  compact = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const activeSchool = schoolInfo || DEFAULT_SCHOOL_INFO;
  const studentName = student.fullName.trim() || 'Peserta Didik';
  const studentNis = student.nis.trim() || '-';
  const studentClass = student.studentClass.trim() || '12 MIPA 1';
  const subjectTitle = scheduleDisplay?.subjectName || pkg?.subject || pkg?.title || 'Ujian Berbasis Komputer (CBT)';
  const displayToken = examToken || pkg?.token || 'CBT-001';
  const examDate = scheduleDisplay?.dateDisplay || scheduleDisplay?.dayName || 'Sesuai Jadwal';
  const examTime = scheduleDisplay?.startTime && scheduleDisplay?.endTime
    ? `${scheduleDisplay.startTime} - ${scheduleDisplay.endTime} WIB`
    : `${pkg?.durationMinutes || 90} Menit`;
  const isFreeMode = isGlobalLockingDisabled() || isGlobalTimeBypassActive();
  const roomName = student.roomName || 'Lab Komputer / CBT Center';
  const sessionNo = student.sessionNumber || 1;

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  // QR Code payload for student card verification
  const qrVerificationData = `CBT-${studentNis}-${studentClass}-${displayToken}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrVerificationData)}&margin=4`;

  return (
    <div className="space-y-3">
      {/* Printable Exam Card Box */}
      <div
        ref={cardRef}
        id="printable-student-exam-card"
        className={`relative overflow-hidden rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 text-slate-100 shadow-2xl transition-all ${
          compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6 md:p-7'
        }`}
      >
        {/* Decorative Watermark Stamp Background */}
        <div className="pointer-events-none absolute -right-8 -bottom-8 opacity-5 text-indigo-300">
          <GraduationCap className="w-64 h-64" />
        </div>

        {/* 1. Official Header / Kop Kartu Peserta Ujian */}
        <div className="border-b-2 border-indigo-500/40 pb-4 mb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-lg p-1.5">
              <SchoolLogoBadge
                className="w-full h-full object-contain"
                logoUrl={activeSchool.schoolLogo || DEFAULT_SCHOOL_INFO.schoolLogo}
              />
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>DINAS PENDIDIKAN & KEBUDAYAAN</span>
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-black uppercase text-white tracking-wide leading-tight">
                {activeSchool.schoolName}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-300 line-clamp-1 leading-snug">
                {activeSchool.schoolAddress}
              </p>
            </div>

            <div className="hidden md:flex flex-col items-end shrink-0 text-right">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Terverifikasi CBT</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1 font-mono">
                {activeSchool.academicYear || 'T.A. 2025/2026'}
              </span>
            </div>
          </div>

          {/* Title Ribbon */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 text-xs sm:text-sm font-bold uppercase tracking-wider">
              <FileText className="w-4 h-4 text-indigo-300" />
              <span>KARTU PESERTA UJIAN CBT RESMI</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-300">
              Semester Ganjil • {activeSchool.academicYear || '2025/2026'}
            </span>
          </div>
        </div>

        {/* 2. Main Content: Student Profile & Exam Schedule Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
          {/* Student Photo & QR Code Column */}
          <div className="md:col-span-4 flex flex-row md:flex-col items-center justify-around md:justify-center gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/20 shadow-inner">
            {/* Student Avatar Box */}
            <div className="relative">
              <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-gradient-to-tr from-indigo-900 via-slate-800 to-blue-900 border-2 border-indigo-400/60 flex flex-col items-center justify-center text-slate-300 shadow-md">
                <User className="w-10 h-10 text-indigo-300" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                  Pasfoto CBT
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-slate-950">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            {/* Verification QR Code */}
            <div className="text-center">
              <div className="p-1.5 bg-white rounded-lg inline-block shadow">
                <img
                  src={qrUrl}
                  alt="QR Verifikasi Peserta"
                  className="w-16 h-16 sm:w-18 sm:h-18 object-contain"
                  loading="lazy"
                />
              </div>
              <span className="block text-[9px] font-mono text-slate-400 mt-1 uppercase">
                QR Validasi: {studentNis}
              </span>
            </div>
          </div>

          {/* Student Details & Subject Schedule Column */}
          <div className="md:col-span-8 space-y-3">
            {/* Student Info Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Nomor Induk Siswa (NIS / NISN)
                </span>
                <span className="text-sm font-mono font-bold text-amber-300">
                  {studentNis}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Kelas / Rombongan Belajar
                </span>
                <span className="text-sm font-bold text-white">
                  {studentClass}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 sm:col-span-2">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Nama Lengkap Peserta
                </span>
                <span className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                  {studentName}
                </span>
              </div>
            </div>

            {/* Exam Subject & Timing Details */}
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Mata Pelajaran yang Diujikan:</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-200 font-semibold">
                  Ruang: {roomName} • Sesi {sessionNo}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-white">
                {subjectTitle}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-indigo-500/20 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{examDate}</span>
                </div>
                {!isFreeMode && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{examTime}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-amber-300 font-mono font-bold">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Token: {displayToken}{' '}
                    {isFreeMode ? (
                      <span className="text-[10px] text-emerald-400 font-sans font-semibold">(Mode Bebas: Bebas)</span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-sans font-semibold">(Mode Normal: Wajib)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Official Signatures / Footer */}
        <div className="mt-4 pt-3 border-t border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-slate-400 space-y-0.5 text-center sm:text-left">
            <p className="font-semibold text-slate-300">📌 Tata Tertib & Ketentuan:</p>
            <p>1. Kartu ini wajib ditunjukkan kepada pengawas ujian saat verifikasi.</p>
            <p>2. Login CBT hanya dapat dilakukan pada 1 perangkat aktif per NIS.</p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block">
              Bandung, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
            </span>
            <span className="text-[11px] font-bold text-white block mt-0.5">
              Kepala Sekolah / Panitia CBT
            </span>
            <span className="text-[10px] font-semibold text-indigo-300 block">
              {activeSchool.headmasterName || 'Drs. H. Bambang Sujarwo, M.Pd.'}
            </span>
            <span className="text-[9px] text-slate-400 font-mono block">
              {activeSchool.headmasterNip || 'NIP. 19740512 199903 1 002'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Print Exam Card */}
      {showPrintButton && (
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Kartu Ujian Resmi otomatis dibuat berdasarkan NIS & Nama Anda.</span>
          </span>

          <button
            id="btn-print-student-exam-card"
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Unduh Kartu Ujian (PDF)</span>
          </button>
        </div>
      )}
    </div>
  );
};
