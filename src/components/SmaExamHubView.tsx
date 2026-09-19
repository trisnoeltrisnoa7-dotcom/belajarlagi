import React, { useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Clock,
  FileQuestion,
  Filter,
  Search,
  Award,
  Layers,
  Atom,
  Calculator,
  FlaskConical,
  Dna,
  TrendingUp,
  Users,
  Globe2,
  Landmark,
  Languages,
  Cpu,
  ShieldCheck,
  Briefcase,
  Play,
  Eye,
  Share2,
  Trash2,
  RotateCcw,
  PlusCircle,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Star,
  LayoutDashboard,
} from 'lucide-react';
import { SchoolLogoBadge } from './SchoolLogoBadge';
import { ExamPackage, SmaGrade } from '../types';

import { getMasterSubjects, subscribeMasterSubjectClass } from '../services/masterDataService';
import { SMA_SUBJECTS_LIST } from '../data/mockSmaData';
import { ShareExamModal } from './ShareExamModal';
import {
  getDefaultSubject,
  getDefaultClass,
  isDefaultSubject,
  subscribeDefaultSubjectClass,
} from '../utils/defaultSettingsHelper';

interface SmaExamHubViewProps {
  smaPackages: ExamPackage[];
  onStartExam: (pkg: ExamPackage) => void;
  onNavigateToDashboard?: () => void;
  onNavigateToQuestionBank?: () => void;
  onOpenAiDrillModal?: () => void;
  onDeletePackage?: (pkgId: string) => void;
  onResetPackages?: (mode: 'restore_default' | 'clear_all' | 'clear_custom_only') => void;
  onSavePackage?: (pkg: ExamPackage) => void;
  onOpenCentralSubjectClass?: (tab?: 'subjects' | 'classes' | 'sync') => void;
}

export const SmaExamHubView: React.FC<SmaExamHubViewProps> = ({
  smaPackages = [],
  onStartExam,
  onNavigateToDashboard,
  onNavigateToQuestionBank,
  onDeletePackage,
  onResetPackages,
  onOpenCentralSubjectClass,
}) => {
  const [masterSubjects, setMasterSubjects] = useState(() => getMasterSubjects());
  const SUBJECTS = masterSubjects.length ? masterSubjects : SMA_SUBJECTS_LIST;

  React.useEffect(() => {
    const unsub = subscribeMasterSubjectClass(() => {
      setMasterSubjects(getMasterSubjects());
    });
    return unsub;
  }, []);

  const [selectedGrade, setSelectedGrade] = useState<SmaGrade>('Semua Kelas');
  const [selectedMajor, setSelectedMajor] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewPackage, setPreviewPackage] = useState<ExamPackage | null>(null);
  const [sharingPackage, setSharingPackage] = useState<ExamPackage | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<ExamPackage | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetOption, setResetOption] = useState<'restore_default' | 'clear_all' | 'clear_custom_only'>('restore_default');
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null);

  const [currentDefaultSubject, setCurrentDefaultSubject] = useState(() => getDefaultSubject());
  const [currentDefaultClass, setCurrentDefaultClass] = useState(() => getDefaultClass());

  React.useEffect(() => {
    const unsub = subscribeDefaultSubjectClass(cfg => {
      setCurrentDefaultSubject(cfg.subject);
      setCurrentDefaultClass(cfg.studentClass);
    });
    return unsub;
  }, []);

  // Filter logic
  const filteredPackages = smaPackages.filter((pkg) => {
    // Grade filter
    if (selectedGrade !== 'Semua Kelas' && pkg.grade && pkg.grade !== selectedGrade) {
      return false;
    }
    // Major filter
    if (selectedMajor !== 'ALL' && pkg.major && pkg.major !== selectedMajor) {
      return false;
    }
    // Subject filter
    if (selectedSubject !== 'ALL' && pkg.subject && !pkg.subject.toLowerCase().includes(selectedSubject.toLowerCase())) {
      return false;
    }
    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = (pkg.title || '').toLowerCase().includes(q);
      const matchSubject = (pkg.subject || '').toLowerCase().includes(q);
      const matchTagline = (pkg.tagline || '').toLowerCase().includes(q);
      const matchExamType = (pkg.examType || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSubject && !matchTagline && !matchExamType) {
        return false;
      }
    }
    return true;
  });

  const getSubjectIcon = (subjectName?: string) => {
    if (!subjectName) return <BookOpen className="w-3.5 h-3.5" />;
    const s = subjectName.toLowerCase();
    if (s.includes('matematika')) return <Calculator className="w-3.5 h-3.5 text-emerald-400" />;
    if (s.includes('fisika')) return <Atom className="w-3.5 h-3.5 text-cyan-400" />;
    if (s.includes('kimia')) return <FlaskConical className="w-3.5 h-3.5 text-violet-400" />;
    if (s.includes('biologi')) return <Dna className="w-3.5 h-3.5 text-green-400" />;
    if (s.includes('ekonomi')) return <TrendingUp className="w-3.5 h-3.5 text-amber-400" />;
    if (s.includes('sosiologi')) return <Users className="w-3.5 h-3.5 text-rose-400" />;
    if (s.includes('geografi')) return <Globe2 className="w-3.5 h-3.5 text-blue-400" />;
    if (s.includes('sejarah')) return <Landmark className="w-3.5 h-3.5 text-orange-400" />;
    if (s.includes('inggris')) return <Languages className="w-3.5 h-3.5 text-sky-400" />;
    if (s.includes('indonesia')) return <BookOpen className="w-3.5 h-3.5 text-indigo-400" />;
    if (s.includes('informatika')) return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
    if (s.includes('pancasila') || s.includes('ppkn')) return <ShieldCheck className="w-3.5 h-3.5 text-red-400" />;
    if (s.includes('pkwu') || s.includes('prakarya') || s.includes('kewirausahaan')) return <Briefcase className="w-3.5 h-3.5 text-yellow-400" />;
    return <BookOpen className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-950 border border-indigo-500/20 p-6 sm:p-8 shadow-xl">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <GraduationCap className="w-4 h-4" />
                <span>Kurikulum Merdeka & K13 Revisi</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Ujian Mata Pelajaran SMA (Kelas 10, 11, 12)
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Pusat simulasi CBT ulangan harian, PTS/STS, PAS/SAS, dan Asesmen Sumatif Sekolah untuk rumpun MIPA, IPS, serta Bahasa & Umum dengan sistem penilaian KKM instan.
              </p>
            </div>

            {/* Hub Action Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {onNavigateToDashboard && (
                <button
                  type="button"
                  id="btn-goto-dashboard-from-hub"
                  onClick={onNavigateToDashboard}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold border border-slate-700/80 hover:border-slate-600 transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Kembali ke Dashboard Utama"
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  <span>Dashboard</span>
                </button>
              )}
              {onOpenCentralSubjectClass && (
                <button
                  type="button"
                  id="btn-open-central-from-hub"
                  onClick={() => onOpenCentralSubjectClass('subjects')}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950/40 active:scale-95 cursor-pointer"
                  title="Edit dan Sinkronisasi Mata Pelajaran serta Kelas Terpusat"
                >
                  <Layers className="w-4 h-4 text-cyan-200" />
                  <span>Edit Mapel & Kelas</span>
                </button>
              )}
              {onNavigateToQuestionBank && (
                <button
                  type="button"
                  id="btn-goto-bank-from-hub"
                  onClick={onNavigateToQuestionBank}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Input</span>
                </button>
              )}
              {onResetPackages && (
                <button
                  type="button"
                  id="btn-open-reset-packages-modal"
                  onClick={() => setIsResetModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 text-xs font-bold border border-amber-500/30 hover:border-amber-500/60 transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80">
              <p className="text-xs text-slate-400">Total Paket UTBK SMA</p>
              <p className="text-xl font-bold text-white mt-0.5">{smaPackages.length} Paket</p>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80">
              <p className="text-xs text-slate-400">Cakupan Rumpun Mapel</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">MIPA, IPS, Umum</p>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80">
              <p className="text-xs text-slate-400">Model Evaluasi</p>
              <p className="text-xl font-bold text-indigo-400 mt-0.5">Standar KKM 75 - 80</p>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80">
              <p className="text-xs text-slate-400">Fitur CBT Real-Time</p>
              <p className="text-xl font-bold text-amber-400 mt-0.5">Timer & Auto-Grade</p>
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="input-search-sma-exam"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul ujian, topik, mapel..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Grade Filters */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {(['Semua Kelas', '10', '11', '12'] as SmaGrade[]).map((grade) => (
                <button
                  key={grade}
                  id={`filter-grade-${grade}`}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedGrade === grade
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {grade === 'Semua Kelas' ? 'Semua' : `Kelas ${grade}`}
                </button>
              ))}
            </div>
          </div>

          {/* Major and Subject Chips */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80 items-center">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Jurusan:
            </span>

            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'MIPA', label: 'MIPA' },
              { id: 'IPS', label: 'IPS' },
              { id: 'Umum', label: 'Umum' },
            ].map((major) => (
              <button
                key={major.id}
                id={`filter-major-${major.id}`}
                onClick={() => {
                  setSelectedMajor(major.id);
                  setSelectedSubject('ALL');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedMajor === major.id
                    ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/40'
                }`}
              >
                {major.label}
              </button>
            ))}

            {/* Quick Default Subject Filter Chip */}
            {currentDefaultSubject && (
              <button
                type="button"
                id="btn-filter-default-subject"
                onClick={() => {
                  setSelectedSubject(currentDefaultSubject);
                  setSelectedMajor('ALL');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedSubject === currentDefaultSubject
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-amber-500/10 text-amber-300/80 hover:bg-amber-500/20 border border-amber-500/30'
                }`}
                title="Filter ke Mata Pelajaran Default saat ini"
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>Default: {currentDefaultSubject}</span>
              </button>
            )}

            {/* Subject Dropdown / Quick Select */}
            <div className="ml-auto w-full sm:w-auto mt-2 sm:mt-0">
              <select
                id="select-subject-filter"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full sm:w-48 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Mata Pelajaran</option>
                {SUBJECTS.filter((s) => selectedMajor === 'ALL' || s.major === selectedMajor).map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Exam Packages Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Daftar Paket UTBK SMA Tersedia</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {filteredPackages.length} paket
              </span>
            </h2>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <FileQuestion className="w-7 h-7" />
              </div>
              {smaPackages.length === 0 ? (
                <>
                  <h3 className="text-base font-bold text-white">Katalog Paket Soal Kosong</h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    Semua paket ujian telah dihapus atau dikosongkan. Anda dapat mengembalikan seluruh paket standar bawaan resmi (12+ mapel SMA) atau membuat paket baru di Bank Soal.
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
                    {onResetPackages && (
                      <button
                        type="button"
                        id="btn-restore-defaults-empty-state"
                        onClick={() => {
                          onResetPackages('restore_default');
                          setDeleteSuccessToast('Seluruh paket standar resmi SMA berhasil dipulihkan.');
                          setTimeout(() => setDeleteSuccessToast(null), 3500);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950/50 transition-all active:scale-95 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset / Pulihkan</span>
                      </button>
                    )}
                    {onNavigateToQuestionBank && (
                      <button
                        type="button"
                        id="btn-create-pkg-empty-state"
                        onClick={onNavigateToQuestionBank}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Buat</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-slate-300">Tidak ada paket ujian yang cocok</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Coba sesuaikan filter kelas, jurusan, atau kata kunci pencarian Anda.
                  </p>
                  <button
                    id="btn-reset-filters"
                    onClick={() => {
                      setSelectedGrade('Semua Kelas');
                      setSelectedMajor('ALL');
                      setSelectedSubject('ALL');
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredPackages.map((pkg) => {
                const subjectIcon = getSubjectIcon(pkg.subject);
                return (
                  <div
                    key={pkg.id}
                    id={`sma-pkg-card-${pkg.id}`}
                    className="group relative flex flex-col justify-between bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 sm:p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 min-w-0 overflow-hidden"
                  >
                    <div className="min-w-0 space-y-2.5">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 group-hover:bg-indigo-950/60 border border-slate-700/60 flex items-center justify-center shrink-0 transition-colors">
                            {subjectIcon}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <span className="text-xs font-bold text-indigo-300 truncate block">
                              {pkg.subject || 'Mata Pelajaran SMA'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                              <span>Kelas {pkg.grade || '11/12'}</span>
                              <span>•</span>
                              <span>{pkg.major || 'Umum'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isDefaultSubject(pkg.subject || pkg.title) && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0"
                              title="Mata pelajaran ini diset sebagai default"
                            >
                              <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                              <span>Default</span>
                            </span>
                          )}
                          {pkg.isCustomCreated ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                              Custom
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                              {pkg.badge || 'Resmi'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* School Emblem & Info if available */}
                      {(pkg.schoolName || pkg.badge === 'Paket Standar Semester Ganjil') && (
                        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center gap-2 text-[11px] min-w-0 overflow-hidden">
                          <SchoolLogoBadge className="w-4 h-4 shrink-0" logoUrl={pkg.schoolLogo} />
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="font-semibold text-white text-xs truncate">
                              {pkg.schoolName || 'SMA Negeri 1 Edukasi'}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {pkg.schoolAddress || 'Jl. Pendidikan Nasional No. 45, Jakarta'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Title & Tagline */}
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-200 transition-colors line-clamp-2 leading-snug break-words">
                          {pkg.title}
                        </h3>
                        {pkg.tagline && !pkg.tagline.toLowerCase().startsWith('cakupan') && (
                          <p className="mt-1 text-[11px] sm:text-xs text-slate-400 line-clamp-2 leading-relaxed break-words">
                            {pkg.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-3 min-w-0">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 gap-1 flex-wrap">
                        <div className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{pkg.durationMinutes} Menit</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <FileQuestion className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>{pkg.questions.length || pkg.totalQuestions} Soal</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Award className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>KKM: {pkg.kkmScore || 75}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-0.5 min-w-0 flex-wrap sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => setSharingPackage(pkg)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-emerald-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer shrink-0"
                          title="Bagikan Tautan Ujian"
                        >
                          <Share2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="hidden sm:inline">Link</span>
                        </button>

                        <button
                          id={`btn-preview-pkg-${pkg.id}`}
                          onClick={() => setPreviewPackage(pkg)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer shrink-0"
                          title="Lihat Kisi-kisi & Rincian Soal"
                        >
                          <Eye className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="hidden sm:inline">Kisi-kisi</span>
                        </button>

                        {onDeletePackage && (
                          <button
                            id={`btn-delete-pkg-${pkg.id}`}
                            type="button"
                            onClick={() => setDeletingPackage(pkg)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 border border-rose-800/50 hover:border-rose-600 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center shrink-0"
                            title="Hapus Paket Soal Ini"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />
                          </button>
                        )}

                        <button
                          id={`btn-start-sma-pkg-${pkg.id}`}
                          onClick={() => onStartExam(pkg)}
                          className="flex-1 min-w-[70px] flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-900/30 transition-transform active:scale-95 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current shrink-0" />
                          <span>Mulai</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Success Toast Banner */}
        {deleteSuccessToast && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-950/90 text-rose-200 border border-rose-500/40 shadow-xl shadow-rose-950/50 animate-in slide-in-from-top-4 duration-200 text-xs sm:text-sm font-medium">
            <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{deleteSuccessToast}</span>
          </div>
        )}

        {/* Share Exam Link & Preview Modal */}
        <ShareExamModal
          isOpen={sharingPackage !== null}
          onClose={() => setSharingPackage(null)}
          pkg={sharingPackage}
          onOpenStudentGate={onStartExam}
        />

        {/* Preview Modal */}
        {previewPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {previewPackage.subject || 'Mapel SMA'}
                    </span>
                    <span className="text-xs text-slate-400">Kelas {previewPackage.grade || '11'}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{previewPackage.title}</h3>
                </div>
                <button
                  id="btn-close-preview-modal"
                  onClick={() => setPreviewPackage(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <p className="text-xs text-slate-400">{previewPackage.tagline}</p>

                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block">Durasi Waktu:</span>
                    <strong className="text-white text-sm">{previewPackage.durationMinutes} Menit</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Jumlah Soal:</span>
                    <strong className="text-white text-sm">{previewPackage.questions.length} Soal</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Standar KKM:</span>
                    <strong className="text-emerald-400 text-sm">{previewPackage.kkmScore || 75} / 100</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Daftar Butir Soal Pada Paket Ini:
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {previewPackage.questions.map((q, idx) => (
                      <div key={q.id || idx} className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-indigo-300">Soal No. {idx + 1}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">
                            {q.difficulty} • {q.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 line-clamp-2">{q.questionText}</p>
                        <p className="text-[11px] text-slate-400">Topik: {q.topic || q.chapter || 'Umum'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800 flex-wrap">
                <div className="flex items-center gap-2">
                  {onDeletePackage && (
                    <button
                      id="btn-preview-delete-pkg"
                      type="button"
                      onClick={() => {
                        const target = previewPackage;
                        setPreviewPackage(null);
                        setDeletingPackage(target);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/60 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Hapus Paket</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewPackage(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    id="btn-modal-start-exam"
                    onClick={() => {
                      const p = previewPackage;
                      setPreviewPackage(null);
                      onStartExam(p);
                    }}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-900/30 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Mulai</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation Dialog */}
        {deletingPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30 shrink-0">
                  <Trash2 className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Hapus Paket Soal Ujian</h3>
                  <p className="text-xs text-rose-300 font-medium">Konfirmasi Penghapusan Paket</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[11px] uppercase tracking-wider font-semibold">Judul Paket Ujian:</span>
                  <strong className="text-white text-sm font-bold block">{deletingPackage.title}</strong>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                    {deletingPackage.subject || 'Mapel Umum'}
                  </span>
                  <span>•</span>
                  <span>Kelas {deletingPackage.grade || '11/12'}</span>
                  <span>•</span>
                  <span>{deletingPackage.questions?.length || deletingPackage.totalQuestions} Butir Soal</span>
                  <span>•</span>
                  <span>{deletingPackage.durationMinutes} Menit</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus paket soal ini? Seluruh konfigurasi dan daftar butir soal dalam paket ini akan dihapus dari katalog ujian.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  id="btn-cancel-delete-package"
                  onClick={() => setDeletingPackage(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-package"
                  onClick={() => {
                    const title = deletingPackage.title;
                    if (onDeletePackage) {
                      onDeletePackage(deletingPackage.id);
                    }
                    setDeletingPackage(null);
                    setDeleteSuccessToast(`Paket soal "${title}" berhasil dihapus.`);
                    setTimeout(() => setDeleteSuccessToast(null), 3500);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg shadow-rose-950/50 transition-all active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Reset / Kelola Paket Soal Dialog */}
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shrink-0">
                  <RotateCcw className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">Reset / Kelola Paket Soal Ujian</h3>
                  <p className="text-xs text-amber-300 font-medium">Pilih opsi pemulihan atau penghapusan massal paket</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Option 1: Restore Default */}
                <label
                  onClick={() => setResetOption('restore_default')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer block ${
                    resetOption === 'restore_default'
                      ? 'bg-indigo-950/50 border-indigo-500/60 ring-1 ring-indigo-500/40'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="resetOption"
                      checked={resetOption === 'restore_default'}
                      onChange={() => setResetOption('restore_default')}
                      className="mt-1 accent-indigo-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Reset ke Paket Standar Resmi (Default)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Rekomendasi
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Mengembalikan 12+ paket ujian resmi SMA lengkap (Matematika Wajib/Peminatan, Fisika, Kimia, Biologi, Ekonomi, Sosiologi, Geografi, Sejarah, Bahasa Indonesia, Bahasa Inggris, Informatika, PPKn, dll.) lengkap dengan kisi-kisi dan kunci jawaban.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option 2: Clear Custom Only */}
                <label
                  onClick={() => setResetOption('clear_custom_only')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer block ${
                    resetOption === 'clear_custom_only'
                      ? 'bg-amber-950/50 border-amber-500/60 ring-1 ring-amber-500/40'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="resetOption"
                      checked={resetOption === 'clear_custom_only'}
                      onChange={() => setResetOption('clear_custom_only')}
                      className="mt-1 accent-amber-500"
                    />
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-white">Hapus Hanya Paket Kustom</span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Menghapus semua paket ujian kustom buatan guru dari Bank Soal, namun tetap mempertahankan seluruh paket standar kurikulum resmi SMA.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option 3: Clear All */}
                <label
                  onClick={() => setResetOption('clear_all')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer block ${
                    resetOption === 'clear_all'
                      ? 'bg-rose-950/50 border-rose-500/60 ring-1 ring-rose-500/40'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="resetOption"
                      checked={resetOption === 'clear_all'}
                      onChange={() => setResetOption('clear_all')}
                      className="mt-1 accent-rose-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-rose-300">Kosongkan Seluruh Paket Ujian</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Hapus Semua
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Menghapus seluruh paket ujian dari katalog dan database sehingga Anda dapat menyusun paket ujian baru dari awal secara mandiri.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  id="btn-cancel-reset-packages"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  id="btn-confirm-reset-packages"
                  onClick={() => {
                    if (onResetPackages) {
                      onResetPackages(resetOption);
                    }
                    setIsResetModalOpen(false);
                    let toastMsg = 'Paket ujian berhasil di-reset ke paket standar resmi SMA.';
                    if (resetOption === 'clear_custom_only') toastMsg = 'Paket kustom berhasil dibersihkan.';
                    if (resetOption === 'clear_all') toastMsg = 'Seluruh paket ujian berhasil dikosongkan.';
                    setDeleteSuccessToast(toastMsg);
                    setTimeout(() => setDeleteSuccessToast(null), 3500);
                  }}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-lg transition-all active:scale-95 cursor-pointer ${
                    resetOption === 'clear_all'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                      : resetOption === 'clear_custom_only'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/50'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>
                    {resetOption === 'restore_default' && 'Reset & Pulihkan'}
                    {resetOption === 'clear_custom_only' && 'Reset & Bersihkan'}
                    {resetOption === 'clear_all' && 'Reset & Kosongkan'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {deleteSuccessToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-emerald-950/90 text-emerald-200 border border-emerald-500/50 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">{deleteSuccessToast}</span>
          </div>
        )}
      </div>
    </div>
  );
};
