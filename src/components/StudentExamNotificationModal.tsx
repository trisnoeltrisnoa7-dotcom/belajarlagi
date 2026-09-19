import React, { useState, useMemo } from 'react';
import {
  X,
  Bell,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  GraduationCap,
  Award,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Download,
  FolderOpen,
  Eye,
  Sliders,
  Trash2,
} from 'lucide-react';
import { ExamResult } from '../types';
import { ResetExamHistoryModal } from './ResetExamHistoryModal';

interface StudentExamNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  examHistory?: ExamResult[];
  onViewResult?: (result: ExamResult) => void;
  onNavigateToDrive?: () => void;
  onOpenNisSettings?: () => void;
  onResetHistory?: (
    mode: 'clear_all' | 'restore_demo' | 'clear_by_package',
    targetPackageId?: string
  ) => void;
}

export const StudentExamNotificationModal: React.FC<StudentExamNotificationModalProps> = ({
  isOpen,
  onClose,
  examHistory = [],
  onViewResult,
  onNavigateToDrive,
  onOpenNisSettings,
  onResetHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedPackageFilter, setSelectedPackageFilter] = useState('ALL');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Calculate unique students count (based on NIS or Name)
  const uniqueStudentsMap = useMemo(() => {
    const map = new Map<string, { count: number; studentClass: string; name: string }>();
    examHistory.forEach(h => {
      const key = h.studentProfile?.nis || h.studentProfile?.fullName || h.id;
      const existing = map.get(key);
      const studentClass = h.studentProfile?.studentClass || 'Umum';
      const name = h.studentProfile?.fullName || 'Peserta Ujian';
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { count: 1, studentClass, name });
      }
    });
    return map;
  }, [examHistory]);

  const totalUniqueStudents = uniqueStudentsMap.size;
  const totalSubmissions = examHistory.length;

  // Average IRT Score
  const avgScore = useMemo(() => {
    if (examHistory.length === 0) return 0;
    const sum = examHistory.reduce((acc, h) => acc + h.totalIrtScore, 0);
    return Math.round(sum / examHistory.length);
  }, [examHistory]);

  // Highest IRT Score
  const bestScore = useMemo(() => {
    if (examHistory.length === 0) return 0;
    return Math.max(...examHistory.map(h => h.totalIrtScore));
  }, [examHistory]);

  // Group by Class
  const classBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    examHistory.forEach(h => {
      const cls = h.studentProfile?.studentClass || 'Lainnya';
      counts[cls] = (counts[cls] || 0) + 1;
    });
    return counts;
  }, [examHistory]);

  // Distinct classes list for filter
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    examHistory.forEach(h => {
      if (h.studentProfile?.studentClass) set.add(h.studentProfile.studentClass);
    });
    return Array.from(set).sort();
  }, [examHistory]);

  // Distinct packages list for filter
  const packageOptions = useMemo(() => {
    const set = new Set<string>();
    examHistory.forEach(h => {
      if (h.packageTitle) set.add(h.packageTitle);
    });
    return Array.from(set);
  }, [examHistory]);

  // Filtered submissions list
  const filteredSubmissions = useMemo(() => {
    return examHistory.filter(item => {
      const name = item.studentProfile?.fullName || 'Peserta Mandiri';
      const nis = item.studentProfile?.nis || '';
      const cls = item.studentProfile?.studentClass || '';
      const pkg = item.packageTitle || '';

      const matchesSearch =
        searchQuery.trim() === '' ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nis.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass = selectedClassFilter === 'ALL' || cls === selectedClassFilter;
      const matchesPackage = selectedPackageFilter === 'ALL' || pkg === selectedPackageFilter;

      return matchesSearch && matchesClass && matchesPackage;
    });
  }, [examHistory, searchQuery, selectedClassFilter, selectedPackageFilter]);

  // Format relative time helper
  const getRelativeTimeString = (dateIsoString: string) => {
    try {
      const diffMs = Date.now() - new Date(dateIsoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} hari lalu`;
    } catch (e) {
      return 'Beberapa saat lalu';
    }
  };

  // Export CSV of completed students
  const handleExportCsv = () => {
    if (examHistory.length === 0) return;
    const headers = [
      'No',
      'NIS',
      'Nama Siswa',
      'Kelas',
      'Sekolah',
      'Paket Ujian',
      'Skor IRT',
      'Akurasi (%)',
      'Jumlah Benar',
      'Jumlah Salah',
      'Waktu Submit',
      'Status Integritas',
    ];

    const rows = examHistory.map((item, idx) => [
      idx + 1,
      `"${item.studentProfile?.nis || '-'}"`,
      `"${item.studentProfile?.fullName || 'Peserta Mandiri'}"`,
      `"${item.studentProfile?.studentClass || '-'}"`,
      `"${item.studentProfile?.schoolName || '-'}"`,
      `"${item.packageTitle}"`,
      item.totalIrtScore,
      `${item.overallAccuracy}%`,
      item.totalCorrect,
      item.totalIncorrect,
      `"${new Date(item.submittedAt).toLocaleString('id-ID')}"`,
      `"${item.proctoringSummary?.integrityStatus || 'Tertib'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_siswa_selesai_ujian_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="relative w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-950/50">
              <Bell className="w-6 h-6 animate-bounce" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                  Laporan Riwayat Ujian
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {totalUniqueStudents} Siswa Telah Ujian
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Laporan riwayat ujian siswa secara real-time, skor IRT, dan rekap per kelas
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onResetHistory && (
              <button
                type="button"
                id="btn-reset-history-from-modal"
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/40 transition-all cursor-pointer shadow-md active:scale-95"
                title="Reset Laporan Riwayat Ujian"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Reset Laporan</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer shadow-md"
              title="Unduh Rekap CSV Siswa Selesai"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlight Statistics Strip */}
        <div className="p-3.5 sm:p-5 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0 max-w-full min-w-0 overflow-hidden">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center space-x-2.5 sm:space-x-3 min-w-0 overflow-hidden">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Siswa Mengerjakan</span>
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-white truncate block">
                {totalUniqueStudents} <span className="text-[10px] sm:text-xs font-normal text-indigo-300">Anak</span>
              </span>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center space-x-2.5 sm:space-x-3 min-w-0 overflow-hidden">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Total Sesi Selesai</span>
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-emerald-400 truncate block">
                {totalSubmissions} <span className="text-[10px] sm:text-xs font-normal text-emerald-300">Lembar</span>
              </span>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center space-x-2.5 sm:space-x-3 min-w-0 overflow-hidden">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Rata-rata Skor IRT</span>
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-cyan-400 truncate block">
                {avgScore > 0 ? avgScore : '-'} <span className="text-[10px] sm:text-xs font-normal text-cyan-300">/ 1000</span>
              </span>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center space-x-2.5 sm:space-x-3 min-w-0 overflow-hidden">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Skor Tertinggi</span>
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-amber-400 truncate block">
                {bestScore > 0 ? bestScore : '-'} <span className="text-[10px] sm:text-xs font-normal text-amber-300">IRT</span>
              </span>
            </div>
          </div>
        </div>

        {/* Class Distribution Pills */}
        {Object.keys(classBreakdown).length > 0 && (
          <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-900 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs shrink-0 max-w-full">
            <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rekap Kelas:</span>
            </span>
            {Object.entries(classBreakdown).map(([clsName, count]) => (
              <button
                key={clsName}
                type="button"
                onClick={() => setSelectedClassFilter(prev => (prev === clsName ? 'ALL' : clsName))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedClassFilter === clsName
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700/60'
                }`}
              >
                <span className="truncate max-w-[120px]">{clsName}</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-900/60 text-indigo-300 text-[10px] font-bold shrink-0">
                  {count} anak
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-center justify-between shrink-0 max-w-full min-w-0">
          <div className="relative w-full sm:w-72 min-w-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa, NIS, paket ujian..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap min-w-0">
            {classOptions.length > 0 && (
              <select
                value={selectedClassFilter}
                onChange={e => setSelectedClassFilter(e.target.value)}
                className="max-w-[140px] sm:max-w-[160px] px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer truncate"
              >
                <option value="ALL">Semua Kelas</option>
                {classOptions.map(cls => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            )}

            {packageOptions.length > 1 && (
              <select
                value={selectedPackageFilter}
                onChange={e => setSelectedPackageFilter(e.target.value)}
                className="max-w-[150px] sm:max-w-[200px] px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer truncate"
              >
                <option value="ALL">Semua Paket Ujian</option>
                {packageOptions.map(pkg => (
                  <option key={pkg} value={pkg}>
                    {pkg}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Submissions List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 min-h-[220px] max-w-full min-w-0 custom-scrollbar overscroll-contain">
          {filteredSubmissions.length > 0 ? (
            filteredSubmissions.map((res, index) => {
              const studentName = res.studentProfile?.fullName || 'Peserta Ujian';
              const studentNis = res.studentProfile?.nis || '-';
              const studentClass = res.studentProfile?.studentClass || 'Umum';
              const timeAgo = getRelativeTimeString(res.submittedAt);

              return (
                <div
                  key={res.id || index}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 group max-w-full min-w-0 overflow-hidden"
                >
                  <div className="flex items-start space-x-3 sm:space-x-3.5 min-w-0 flex-1 overflow-hidden">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center font-extrabold text-xs sm:text-sm shrink-0 shadow-md">
                      {studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-indigo-300 transition-colors truncate max-w-[220px] sm:max-w-md" title={studentName}>
                          {studentName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-indigo-300 border border-slate-700 shrink-0">
                          {studentClass}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono shrink-0">
                          NIS: {studentNis}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 truncate block max-w-full" title={res.packageTitle}>
                        <span className="font-medium">{res.packageTitle}</span>
                      </div>

                      <div className="flex items-center space-x-2 sm:space-x-3 text-[10px] sm:text-[11px] text-slate-400 flex-wrap min-w-0 overflow-hidden">
                        <span className="flex items-center gap-1 text-slate-400 shrink-0">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{timeAgo}</span>
                        </span>
                        <span className="shrink-0">•</span>
                        <span className="shrink-0">
                          Benar: <strong className="text-emerald-400">{res.totalCorrect}</strong> / {res.totalQuestions}
                        </span>
                        <span className="shrink-0">•</span>
                        <span className="shrink-0">Akurasi: {res.overallAccuracy}%</span>
                        {res.proctoringSummary && (
                          <>
                            <span className="shrink-0">•</span>
                            <span className="inline-flex items-center gap-1 text-emerald-400 shrink-0 truncate max-w-[120px]">
                              <ShieldCheck className="w-3 h-3" />
                              <span className="truncate">{res.proctoringSummary.integrityStatus}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score Badge & Action */}
                  <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-850">
                    <div className="text-right shrink-0">
                      <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                        Skor IRT
                      </span>
                      <span className="text-base sm:text-lg md:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                        {res.totalIrtScore}
                      </span>
                    </div>

                    {onViewResult && (
                      <button
                        type="button"
                        onClick={() => {
                          onViewResult(res);
                          onClose();
                        }}
                        className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 hover:border-indigo-500 transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shrink-0 whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka Detail</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Tidak Ada Data Siswa Ditemukan</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery || selectedClassFilter !== 'ALL' || selectedPackageFilter !== 'ALL'
                    ? 'Coba ubah kata kunci pencarian atau filter kelas yang dipilih.'
                    : 'Belum ada siswa yang menyelesaikan sesi ujian. Lembar ujian yang disubmit akan langsung tercatat di sini secara otomatis.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Sinkronisasi data otomatis dengan Google Drive & Database NIS Siswa
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {onNavigateToDrive && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToDrive();
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Buka Drive Jawaban</span>
              </button>
            )}

            {onOpenNisSettings && (
              <button
                type="button"
                onClick={() => {
                  onOpenNisSettings();
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Kelola NIS Siswa</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Reset Exam History Modal */}
      {onResetHistory && (
        <ResetExamHistoryModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          examHistory={examHistory}
          onResetHistory={(mode, pkgId) => {
            onResetHistory(mode, pkgId);
            setIsResetModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
