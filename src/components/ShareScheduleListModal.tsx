import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  Send,
  Calendar,
  Eye,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  QrCode,
  School,
  Lock,
  EyeOff,
  Search,
  ExternalLink,
} from 'lucide-react';
import { SchoolInfo } from '../types';
import { isExamFreeModeActive } from '../utils/tokenSecurity';

interface ShareScheduleListModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolInfo: SchoolInfo;
  onSwitchToStudentPreview: () => void;
}

type TabType = 'student_link' | 'admin_link' | 'whatsapp_student';

export const ShareScheduleListModal: React.FC<ShareScheduleListModalProps> = ({
  isOpen,
  onClose,
  schoolInfo,
  onSwitchToStudentPreview,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('student_link');
  const [copiedStudentLink, setCopiedStudentLink] = useState(false);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);
  const [copiedWaMessage, setCopiedWaMessage] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.origin + window.location.pathname;
  };

  const baseUrl = getBaseUrl();
  const isFree = isExamFreeModeActive();
  const modeParam = isFree ? '&mode=bebas' : '&mode=normal';
  const studentShareUrl = `${baseUrl}?view=schedule&role=student${modeParam}`;
  const adminShareUrl = `${baseUrl}?view=schedule&role=admin${modeParam}`;

  const handleCopyStudentLink = () => {
    navigator.clipboard.writeText(studentShareUrl).then(() => {
      setCopiedStudentLink(true);
      setTimeout(() => setCopiedStudentLink(false), 2500);
    });
  };

  const handleCopyAdminLink = () => {
    navigator.clipboard.writeText(adminShareUrl).then(() => {
      setCopiedAdminLink(true);
      setTimeout(() => setCopiedAdminLink(false), 2500);
    });
  };

  const studentWaMessage = `📢 *JADWAL RESMI UJIAN CBT & ASESMEN SEKOLAH*\n` +
    `🏫 *${schoolInfo.schoolName}*\n` +
    `📍 ${schoolInfo.schoolAddress}\n` +
    `📅 ${schoolInfo.academicYear || 'Tahun Ajaran 2025/2026'}\n` +
    `🔐 *Status Akses:* ${isFree ? '🔓 Mode Bebas (Bebas Token & Jadwal Terbuka)' : '🔒 Mode Normal (Wajib Token & Sesuai Jadwal)'}\n\n` +
    `Halo seluruh siswa-siswi sekalian,\n` +
    `Berikut adalah tautan resmi daftar & jadwal pelaksanaan ujian CBT:\n\n` +
    `👉 *Link Jadwal Ujian Siswa:*\n` +
    `${studentShareUrl}\n\n` +
    `📌 *Petunjuk Siswa:*\n` +
    `1. Buka tautan di atas menggunakan browser di HP / Laptop.\n` +
    `2. Cek hari, jam pelajaran, dan mata pelajaran yang diujikan.\n` +
    `3. Pilih "Mulai Ujian" sesuai jadwal yang telah ditentukan.\n` +
    `4. Siapkan NIS untuk verifikasi identitas sebelum masuk ke lembar soal.\n\n` +
    `_Semoga sukses dan raih hasil terbaik!_\n` +
    `Panitia Ujian CBT ${schoolInfo.schoolName}`;

  const handleCopyWaMessage = () => {
    navigator.clipboard.writeText(studentWaMessage).then(() => {
      setCopiedWaMessage(true);
      setTimeout(() => setCopiedWaMessage(false), 2500);
    });
  };

  const handleOpenWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(studentWaMessage)}`, '_blank');
  };

  const studentQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(studentShareUrl)}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Bagikan Link Daftar Ujian
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Mode Ujian Siswa
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tautan resmi daftar ujian yang langsung menampilkan halaman Mode Ujian Siswa (bersih & aman)
              </p>
            </div>
          </div>

          <button
            id="btn-close-share-schedule-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800/80 shrink-0 overflow-x-auto">
          <button
            type="button"
            id="tab-btn-student-link"
            onClick={() => setActiveTab('student_link')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'student_link'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>1. Link Mode Ujian Siswa</span>
          </button>

          <button
            type="button"
            id="tab-btn-admin-link"
            onClick={() => setActiveTab('admin_link')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'admin_link'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>2. Link Guru / Pengawas</span>
          </button>

          <button
            type="button"
            id="tab-btn-whatsapp-student"
            onClick={() => setActiveTab('whatsapp_student')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'whatsapp_student'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>3. Format WhatsApp Siswa</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* ========================================================================= */}
          {/* TAB 1: LINK KHUSUS SISWA (CLEAN & SECURE VIEW) */}
          {/* ========================================================================= */}
          {activeTab === 'student_link' && (
            <div className="space-y-4">
              {/* Feature Highlights Alert */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Mode Ujian Siswa (Tampilan Bersih & Terproteksi)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tautan ini otomatis membuka halaman <strong>Mode Ujian Siswa</strong>. Seluruh fitur administrasi dan keamanan langsung diproteksi:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-slate-200">
                    <EyeOff className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong>Tanpa Tombol Edit</strong> (Kop & Jadwal aman)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-slate-200">
                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong>Tanpa Token</strong> (Disembunyikan dari siswa)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-slate-200">
                    <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong>Tanpa Tombol Share</strong> (Tampilan fokus ujian)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-slate-200">
                    <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong>Tanpa Kolom Cari</strong> (Tampilan rapi & simpel)</span>
                  </div>
                </div>
              </div>

              {/* URL Link Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Tautan Mode Ujian Siswa:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={studentShareUrl}
                    className="flex-1 bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300 font-mono focus:outline-none select-all shadow-inner"
                  />
                  <button
                    id="btn-copy-student-schedule-link"
                    type="button"
                    onClick={handleCopyStudentLink}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md ${
                      copiedStudentLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                    }`}
                  >
                    {copiedStudentLink ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons: Preview & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  id="btn-open-student-preview-from-modal"
                  onClick={() => {
                    onClose();
                    onSwitchToStudentPreview();
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950/40 cursor-pointer active:scale-95"
                >
                  <Eye className="w-4 h-4" />
                  <span>Mode Ujian Siswa</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim ke WA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span>{showQr ? 'Tutup QR' : 'Lihat QR Code'}</span>
                </button>
              </div>

              {/* QR Code */}
              {showQr && (
                <div className="p-5 rounded-2xl bg-white text-slate-900 flex flex-col items-center justify-center space-y-2 animate-in fade-in shadow-xl">
                  <img
                    src={studentQrUrl}
                    alt="QR Code Link Daftar Ujian Siswa"
                    className="w-44 h-44 object-contain rounded-lg shadow-sm"
                    loading="lazy"
                  />
                  <div className="text-center space-y-0.5">
                    <p className="text-xs font-bold text-slate-900">
                      Scan Barcode untuk Membuka Daftar Ujian Siswa
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono">
                      {schoolInfo.schoolName}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: LINK ADMIN / PENGAWAS (FULL ACCESS VIEW) */}
          {/* ========================================================================= */}
          {activeTab === 'admin_link' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Mode Admin & Pengawas (Akses Penuh)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tautan ini khusus untuk panitia asesmen, proktor, dan guru pengawas. Menampilkan kontrol lengkap:
                </p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  <li>Mengubah nama sekolah, logo, dan alamat kop</li>
                  <li>Mengedit hari, tanggal, jam, kelas sasaran, dan token ujian</li>
                  <li>Mengacak / memperbarui token ujian</li>
                  <li>Fitur pencarian mata pelajaran & kelas</li>
                  <li>Membagikan tautan dan mencetak roster resmi</li>
                </ul>
              </div>

              {/* URL Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Tautan Daftar Ujian untuk Pengawas / Admin:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={adminShareUrl}
                    className="flex-1 bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-indigo-300 font-mono focus:outline-none select-all shadow-inner"
                  />
                  <button
                    id="btn-copy-admin-schedule-link"
                    type="button"
                    onClick={handleCopyAdminLink}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md ${
                      copiedAdminLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                    }`}
                  >
                    {copiedAdminLink ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PESAN WHATSAPP SISWA */}
          {/* ========================================================================= */}
          {activeTab === 'whatsapp_student' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Format Pesan WhatsApp Siap Kirim ke Grup Kelas
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Format resmi & sopan tanpa menampilkan token (aman disebarkan)
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-copy-wa-student-message"
                  onClick={handleCopyWaMessage}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    copiedWaMessage
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {copiedWaMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Pesan WA</span>
                    </>
                  )}
                </button>
              </div>

              {/* Chat Bubble Box */}
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-200 space-y-2 whitespace-pre-line leading-relaxed font-mono">
                  {studentWaMessage}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Buka WhatsApp Sekarang</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            Link daftar ujian CBT otomatis tersinkronisasi dengan bank soal
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToStudentPreview();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/30 transition-all active:scale-95 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lihat Tampilan Siswa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
