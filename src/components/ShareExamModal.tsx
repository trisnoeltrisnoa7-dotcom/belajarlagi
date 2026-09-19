import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  ExternalLink,
  Send,
  BookOpen,
  Clock,
  HelpCircle,
  QrCode,
  Sparkles,
  Smartphone,
  Monitor,
  Eye,
  ShieldCheck,
  User,
  GraduationCap,
  Hash,
  School,
  KeyRound,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { ExamPackage } from '../types';
import { isExamFreeModeActive } from '../utils/tokenSecurity';

interface ShareExamModalProps {
  isOpen?: boolean;
  onClose: () => void;
  pkg: ExamPackage | null;
  onOpenStudentGate?: (pkg: ExamPackage) => void;
}

type TabType = 'share_link' | 'student_preview' | 'whatsapp_preview';

export const ShareExamModal: React.FC<ShareExamModalProps> = ({
  isOpen = true,
  onClose,
  pkg,
  onOpenStudentGate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('student_preview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Preview form mock state
  const [mockStudentName, setMockStudentName] = useState('Ahmad Rizky Pratama');
  const [mockStudentClass, setMockStudentClass] = useState('12 MIPA 1');
  const [mockStudentNis, setMockStudentNis] = useState('202410887');
  const [mockAgreed, setMockAgreed] = useState(true);

  if (isOpen === false || !pkg) return null;

  const getShareableUrl = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin + window.location.pathname;
    const isFree = isExamFreeModeActive();
    const modeParam = isFree ? '&mode=bebas' : '&mode=normal';
    return `${baseUrl}?exam=${encodeURIComponent(pkg.id)}${modeParam}`;
  };

  const shareUrl = getShareableUrl();
  const totalQuestionsCount = pkg.questions?.length || pkg.totalQuestions || 20;
  const isFreeCurrent = isExamFreeModeActive();
  const modeStatusText = isFreeCurrent ? '🔓 Bebas (Langsung Masuk Tanpa Token)' : '🔒 Normal (Wajib Token Resmi Pengawas)';

  const fallbackCopy = (text: string, onSuccess: () => void) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      onSuccess();
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2500);
        })
        .catch(() => {
          fallbackCopy(shareUrl, () => {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2500);
          });
        });
    } else {
      fallbackCopy(shareUrl, () => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const whatsappMessageText = `📢 *PENGUMUMAN SIMULASI UJIAN CBT EDU (UTBK SMA)*\n\nHalo teman-teman / siswa-siswi sekalian, berikut tautan simulasi ujian online:\n\n📝 *Paket Ujian:* ${pkg.title}\n📚 *Mata Pelajaran/Subtes:* ${pkg.subject || 'TPS & Literasi UTBK'}\n⏱ *Alokasi Waktu:* ${pkg.durationMinutes} Menit\n🔢 *Jumlah Soal:* ${totalQuestionsCount} Butir\n🔐 *Status Akses Token:* ${modeStatusText}\n\n👉 *Klik link berikut untuk verifikasi Nama, Kelas, NIS & mulai ujian:*\n${shareUrl}\n\n_Pastikan koneksi internet stabil dan selesaikan sebelum batas waktu berakhir. Semangat berjuang!_ 💪`;

  const handleCopyWhatsappMessage = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(whatsappMessageText)
        .then(() => {
          setCopiedMessage(true);
          setTimeout(() => setCopiedMessage(false), 2500);
        })
        .catch(() => {
          fallbackCopy(whatsappMessageText, () => {
            setCopiedMessage(true);
            setTimeout(() => setCopiedMessage(false), 2500);
          });
        });
    } else {
      fallbackCopy(whatsappMessageText, () => {
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2500);
      });
    }
  };

  const handleOpenWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessageText)}`, '_blank');
  };

  const handleTestDriveExam = () => {
    onClose();
    if (onOpenStudentGate) {
      onOpenStudentGate(pkg);
    }
  };

  // QR Code URL using fast free public API
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Bagikan & Pratinjau Link Ujian Siswa
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Portal Siswa
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tinjau tampilan yang akan dilihat murid saat membuka tautan ujian ini
              </p>
            </div>
          </div>

          <button
            id="btn-close-share-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800/80 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('student_preview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'student_preview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Pratinjau Layar Siswa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('share_link')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'share_link'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>Tautan & QR Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp_preview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'whatsapp_preview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Format Pesan WhatsApp</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* ========================================================================= */}
          {/* TAB 1: PRATINJAU LAYAR SISWA (LIVE STUDENT GATE SIMULATION) */}
          {/* ========================================================================= */}
          {activeTab === 'student_preview' && (
            <div className="space-y-4">
              {/* Header Bar of Preview with Device Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-semibold text-white">Simulasi Portal Siswa Terbuka:</span>
                  <span className="text-slate-400 text-[11px] font-mono truncate max-w-[200px] sm:max-w-xs">
                    ?exam={pkg.id}&mode={isFreeCurrent ? 'bebas' : 'normal'}
                  </span>
                </div>

                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <span className="text-[11px] text-slate-400 mr-1.5 hidden sm:inline">Bingkai:</span>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      previewDevice === 'mobile'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>HP / Ponsel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      previewDevice === 'desktop'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Laptop / Komputer</span>
                  </button>
                </div>
              </div>

              {/* Realistic Mockup Container */}
              <div
                className={`mx-auto transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'max-w-md' : 'w-full'
                }`}
              >
                <div className="rounded-2xl bg-slate-950 border-2 border-indigo-500/40 shadow-2xl overflow-hidden">
                  {/* Mock Browser URL Bar */}
                  <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                    </div>
                    <div className="flex-1 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-emerald-400">cbtedu.id</span>
                        <span className="text-slate-500">/exam?id={pkg.id}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">SSL AKTIF</span>
                    </div>
                  </div>

                  {/* Mock Student Page Content */}
                  <div className="p-4 sm:p-5 space-y-4 text-left">
                    {/* Header in Student Portal */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 p-0.5 flex items-center justify-center">
                          <img src="/logo-sman19.svg" alt="SMAN 19" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block leading-tight">UJIANKU</span>
                          <span className="text-[10px] text-slate-400">Portal CBT SMAN 19 Bandung</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                        Online Real-Time
                      </span>
                    </div>

                    {/* Exam Identity Card for Student */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {pkg.badge || 'SIMULASI CBT'}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-300">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            <span>{pkg.durationMinutes} Menit</span>
                          </span>
                          <span>&bull;</span>
                          <span>{totalQuestionsCount} Soal</span>
                        </div>
                      </div>

                      <h4 className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                        {pkg.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {pkg.tagline || 'Ujian evaluasi belajar terstandar dengan sistem penilaian KKM dan analisis butir soal interaktif.'}
                      </p>
                    </div>

                    {/* Student Verification Input Form (Mock View) */}
                    <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                        <User className="w-3.5 h-3.5" />
                        <span>Verifikasi Identitas Peserta Ujian</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                            Nama Lengkap Siswa:
                          </label>
                          <input
                            type="text"
                            value={mockStudentName}
                            onChange={(e) => setMockStudentName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            placeholder="Contoh: Ahmad Rizky"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                              Kelas / Rumpun:
                            </label>
                            <input
                              type="text"
                              value={mockStudentClass}
                              onChange={(e) => setMockStudentClass(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                              NIS / NISN:
                            </label>
                            <input
                              type="text"
                              value={mockStudentNis}
                              onChange={(e) => setMockStudentNis(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Agreement Checkbox */}
                        <label className="flex items-start gap-2 pt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mockAgreed}
                            onChange={(e) => setMockAgreed(e.target.checked)}
                            className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span className="text-[10px] text-slate-400 leading-tight">
                            Saya menyetujui pakta integritas kejujuran ujian dan siap mengerjakan hingga selesai.
                          </span>
                        </label>
                      </div>

                      {/* Mock Start Button */}
                      <button
                        type="button"
                        onClick={handleTestDriveExam}
                        className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-900/40 transition-all cursor-pointer active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Mulai Mengerjakan Ujian</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Server CBT: v2.6.4</span>
                      <span>Enkripsi Jawaban Otomatis</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Test Drive CTA */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Ingin Menguji Tautan Siswa Sekarang?</span>
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Buka simulasi alur masuk sebagai siswa secara langsung tanpa meninggalkan aplikasi.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-test-drive-student-portal"
                  onClick={handleTestDriveExam}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950/40 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  Buka Portal Siswa (Uji Coba)
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TAUTAN & QR CODE */}
          {/* ========================================================================= */}
          {activeTab === 'share_link' && (
            <div className="space-y-5">
              {/* Package Summary Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {pkg.badge || 'CBT UTBK SMA'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {pkg.durationMinutes} Menit &bull; {totalQuestionsCount} Butir Soal
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">{pkg.title}</h4>
                {pkg.subject && (
                  <p className="text-xs text-slate-400">
                    Mata Pelajaran: <strong className="text-slate-300">{pkg.subject}</strong> (Kelas {pkg.grade || 'SMA'})
                  </p>
                )}
              </div>

              {/* Shareable Link Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Link Tautan Ujian Siswa (Web Browser):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300 font-mono focus:outline-none select-all"
                  />
                  <button
                    id="btn-modal-copy-link"
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {copiedLink ? (
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
                <p className="text-[11px] text-slate-400">
                  Siswa yang membuka link ini akan otomatis diarahkan ke portal verifikasi data diri sebelum timer CBT dimulai.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim ke WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span>{showQr ? 'Tutup Barcode QR' : 'Tampilkan QR Code'}</span>
                </button>
              </div>

              {/* QR Code Viewer */}
              {showQr && (
                <div className="p-5 rounded-2xl bg-white text-slate-900 flex flex-col items-center justify-center space-y-2 animate-fade-in shadow-xl">
                  <img
                    src={qrApiUrl}
                    alt="QR Code Link Ujian"
                    className="w-44 h-44 object-contain rounded-lg shadow-sm"
                    loading="lazy"
                  />
                  <div className="text-center space-y-0.5">
                    <p className="text-xs font-bold text-slate-900">
                      Scan dengan Kamera Smartphone / Barcode Scanner Siswa
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono">
                      {pkg.title}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PRATINJAU PESAN WHATSAPP */}
          {/* ========================================================================= */}
          {activeTab === 'whatsapp_preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Format Pesan WhatsApp Siap Kirim
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Format teks tersusun rapi untuk grup kelas, wali murid, atau instruktur
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyWhatsappMessage}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    copiedMessage
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Teks Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Format WA</span>
                    </>
                  )}
                </button>
              </div>

              {/* Chat Bubble Style Container */}
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3 font-sans">
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-200 space-y-2 whitespace-pre-line leading-relaxed font-mono">
                  {whatsappMessageText}
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

        {/* Modal Bottom Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            Sistem UJIANKU CBT SMAN 19 Bandung terintegrasi pelacakan waktu & anti-kecurangan
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
              onClick={handleTestDriveExam}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-900/30 transition-all active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Portal Siswa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
