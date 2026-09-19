import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  MapPin,
  Image as ImageIcon,
  Calendar,
  UserCheck,
  Award,
  Phone,
  Globe,
  Mail,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Upload,
  AlertCircle,
  Eye,
  FileText,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { SchoolInfo, DEFAULT_SCHOOL_INFO } from '../types';
import { SchoolLogoBadge } from './SchoolLogoBadge';
import { SchoolKopHeader } from './SchoolKopHeader';

interface EditSchoolKopModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolInfo: SchoolInfo;
  onSave: (newSchoolInfo: SchoolInfo) => void;
}

export const EditSchoolKopModal: React.FC<EditSchoolKopModalProps> = ({
  isOpen,
  onClose,
  schoolInfo,
  onSave,
}) => {
  const [formData, setFormData] = useState<SchoolInfo>(schoolInfo);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [activeSection, setActiveSection] = useState<'all' | 'identity' | 'legal' | 'logo'>('all');
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  const modalBodyRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setFormData(schoolInfo);
      setShowSaveSuccess(false);
      setActiveTab('form');
      setActiveSection('all');
    }
  }, [isOpen, schoolInfo]);

  // Viewport tracking for mobile virtual keyboard and browser bars (visualViewport API)
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    handleResize();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // Lock body scroll while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSave(formData);
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
      onClose();
    }, 900);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan kop surat dan identitas sekolah ke standar bawaan aplikasi?')) {
      setFormData(DEFAULT_SCHOOL_INFO);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file logo terlalu besar. Maksimal 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData((prev) => ({ ...prev, schoolLogo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to ensure focused input is smoothly visible without being hidden under bars or keyboard
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  // Calculate dynamic container height based on available viewport
  const maxDynamicHeight = viewportHeight ? `${Math.min(viewportHeight - 16, 780)}px` : '92dvh';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      <div
        ref={containerRef}
        id="modal-edit-school-kop"
        style={{ maxHeight: maxDynamicHeight }}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col my-auto transition-all duration-150"
      >
        {/* ===================================================================== */}
        {/* 1. STICKY TOP HEADER - Always visible, never cut off                   */}
        {/* ===================================================================== */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800 bg-slate-900/98 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  Pengaturan Kop Surat & Identitas Sekolah
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase shrink-0">
                  Bawaan Aplikasi
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Menyesuaikan otomatis ke seluruh jadwal ujian, kartu peserta, dan dokumen cetak.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ===================================================================== */}
        {/* 2. SUB-BAR: Tab Toggle (Formulir vs Live Preview) & Reset             */}
        {/* ===================================================================== */}
        <div className="px-3.5 sm:px-5 py-2 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-2 shrink-0 z-10 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'form'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Formulir Kop</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-[11px] font-semibold text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-800/80"
            title="Kembalikan ke Nilai Bawaan Standar"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden xs:inline">Reset ke Bawaan</span>
            <span className="xs:hidden">Reset</span>
          </button>
        </div>

        {/* ===================================================================== */}
        {/* 3. QUICK FILTER SECTION BUTTONS (Identitas, Legalitas, Logo)           */}
        {/* ===================================================================== */}
        {activeTab === 'form' && (
          <div className="px-3.5 sm:px-5 py-1.5 bg-slate-950/30 border-b border-slate-800/50 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 text-[11px]">
            <span className="text-slate-500 font-semibold mr-1 shrink-0 hidden sm:inline">Bagian:</span>
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeSection === 'all'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('identity')}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeSection === 'identity'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              Identitas Sekolah
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('legal')}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeSection === 'legal'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              NPSN & Pejabat
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('logo')}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeSection === 'logo'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              Logo & Emblem
            </button>
          </div>
        )}

        {/* ===================================================================== */}
        {/* 4. MODAL SCROLLABLE BODY - Responsive and keyboard-safe               */}
        {/* ===================================================================== */}
        <div
          ref={modalBodyRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 md:p-6 space-y-4 text-xs"
        >
          {showSaveSuccess && (
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 flex items-center gap-3 animate-in fade-in shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold">Kop Surat Berhasil Disimpan & Diterapkan!</p>
                <p className="text-[11px] text-emerald-400/90 leading-tight">
                  Semua kartu ujian, jadwal, lembar pengerjaan, dan berkas cetak kini menggunakan identitas sekolah ini.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'preview' ? (
            /* =============================================================== */
            /* LIVE PREVIEW MODE                                               */
            /* =============================================================== */
            <div className="space-y-4">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <p className="text-xs text-slate-400 font-semibold mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pratinjau Kop Surat Resmi Terintegrasi:</span>
                </p>

                {/* Light Mode Preview Card (mirrors official letterhead) */}
                <div className="p-4 sm:p-6 rounded-2xl bg-white text-slate-900 shadow-xl border border-slate-200 mb-4">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Tampilan Dokumen Cetak / Rapor:</div>
                  <SchoolKopHeader schoolInfo={formData} variant="full" />
                </div>

                {/* Dark Mode CBT Portal Preview */}
                <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border-2 border-indigo-900/50 text-center space-y-3">
                  <div className="text-[10px] uppercase font-bold text-indigo-300 mb-1">Tampilan Pada Portal Layar CBT:</div>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 p-2 border-2 border-amber-400/50 flex items-center justify-center">
                      <SchoolLogoBadge logoUrl={formData.schoolLogo} className="w-full h-full object-contain" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                      {formData.schoolName || 'NAMA SEKOLAH BELUM DIISI'}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xl mx-auto mt-1 leading-relaxed">
                      {formData.schoolAddress || 'Alamat sekolah belum diisi'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-2 text-[11px] text-indigo-300 font-semibold mt-1">
                      {formData.schoolNpsn && <span>{formData.schoolNpsn}</span>}
                      {formData.schoolPhone && <span>• Telp: {formData.schoolPhone}</span>}
                      {formData.schoolWebsite && <span>• Web: {formData.schoolWebsite}</span>}
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>DAFTAR JADWAL UJIAN CBT & ASESMEN SUMATIF</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {formData.academicYear || 'Tahun Ajaran 2025/2026'}
                    </p>
                  </div>

                  {/* Garis Ganda Kop */}
                  <div className="w-full pt-2">
                    <div className="w-full h-1 bg-indigo-500 rounded-full" />
                    <div className="w-full h-0.5 bg-indigo-400/40 rounded-full mt-1" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* FORM INPUT MODE                                                 */
            /* =============================================================== */
            <form id="form-edit-school-kop" onSubmit={handleSubmit} className="space-y-4">
              {/* SECTION 1: Identitas Utama Sekolah */}
              {(activeSection === 'all' || activeSection === 'identity') && (
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs sm:text-sm">Identitas Utama Sekolah</span>
                  </div>

                  {/* 1. Nama Resmi Sekolah */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Nama Resmi Sekolah (Kop Utama) *</span>
                      <span className="text-[10px] text-slate-500">Huruf Kapital Dianjurkan</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.schoolName}
                      onFocus={handleInputFocus}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      placeholder="Contoh: SMA NEGERI 1 UNGGULAN NUSANTARA"
                      className="w-full px-3 py-2 sm:py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white text-xs sm:text-sm font-semibold outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>

                  {/* 2. Alamat Lengkap Sekolah & Kontak */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Alamat Lengkap, Kontak & Website *</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Baris ke-2 Kop</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={formData.schoolAddress}
                      onFocus={handleInputFocus}
                      onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                      placeholder="Contoh: Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan | Telp: (021) 789-0123 | info@sman1.sch.id"
                      className="w-full px-3 py-2 sm:py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white text-xs sm:text-sm outline-none transition-all placeholder:text-slate-600 leading-relaxed resize-none"
                    />
                  </div>

                  {/* 3. Tahun Ajaran */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tahun Ajaran / Semester</span>
                    </label>
                    <input
                      type="text"
                      value={formData.academicYear || ''}
                      onFocus={handleInputFocus}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      placeholder="Contoh: Tahun Ajaran 2025/2026"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-amber-400 text-white text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: Legalitas & Pejabat */}
              {(activeSection === 'all' || activeSection === 'legal') && (
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3.5">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-white text-xs sm:text-sm">Legalitas & Pejabat Sekolah</span>
                  </div>

                  {/* Grid: NPSN & Kontak Telepon */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        <span>NPSN / No. Akreditasi</span>
                      </label>
                      <input
                        type="text"
                        value={formData.schoolNpsn || ''}
                        onFocus={handleInputFocus}
                        onChange={(e) => setFormData({ ...formData, schoolNpsn: e.target.value })}
                        placeholder="Contoh: NPSN: 20101234 (Akreditasi A)"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-amber-400 text-white text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>Telepon / Kontak</span>
                      </label>
                      <input
                        type="text"
                        value={formData.schoolPhone || ''}
                        onFocus={handleInputFocus}
                        onChange={(e) => setFormData({ ...formData, schoolPhone: e.target.value })}
                        placeholder="Contoh: (021) 7890123"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-amber-400 text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Grid: Kepala Sekolah & NIP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Nama Kepala Sekolah</span>
                      </label>
                      <input
                        type="text"
                        value={formData.headmasterName || ''}
                        onFocus={handleInputFocus}
                        onChange={(e) => setFormData({ ...formData, headmasterName: e.target.value })}
                        placeholder="Contoh: Drs. H. Bambang Sujarwo, M.Pd."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-amber-400 text-white text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        <span>NIP Kepala Sekolah</span>
                      </label>
                      <input
                        type="text"
                        value={formData.headmasterNip || ''}
                        onFocus={handleInputFocus}
                        onChange={(e) => setFormData({ ...formData, headmasterNip: e.target.value })}
                        placeholder="Contoh: NIP. 19740512 199903 1 002"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-amber-400 text-white text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: Logo & Lambang Sekolah */}
              {(activeSection === 'all' || activeSection === 'logo') && (
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs sm:text-sm">Logo Resmi Sekolah (Kop)</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-amber-500/30 p-1.5 flex items-center justify-center shrink-0">
                      <SchoolLogoBadge logoUrl={formData.schoolLogo} className="w-full h-full object-contain" />
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <input
                        type="url"
                        value={formData.schoolLogo || ''}
                        onFocus={handleInputFocus}
                        onChange={(e) => setFormData({ ...formData, schoolLogo: e.target.value })}
                        placeholder="Masukkan URL Logo (https://...)"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-amber-400"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-semibold border border-slate-700 transition-colors">
                          <Upload className="w-3 h-3 text-amber-400" />
                          <span>Unggah File Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileUpload}
                            className="hidden"
                          />
                        </label>

                        {formData.schoolLogo && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, schoolLogo: '' })}
                            className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors px-2 py-1"
                          >
                            Hapus Custom Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* ===================================================================== */}
        {/* 5. STICKY FOOTER - Always visible, never obstructed by keyboard/bar   */}
        {/* ===================================================================== */}
        <div
          className="p-3 sm:p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/98 backdrop-blur-md gap-2 sm:gap-3 shrink-0 z-20"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'form' ? 'preview' : 'form')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer hidden xs:flex items-center gap-1.5"
            >
              {activeTab === 'form' ? <Eye className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{activeTab === 'form' ? 'Preview' : 'Form'}</span>
            </button>

            <button
              type="submit"
              form="form-edit-school-kop"
              onClick={() => handleSubmit()}
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-950/40 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>Simpan & Terapkan Kop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
