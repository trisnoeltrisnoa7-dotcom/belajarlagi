import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  Download,
  Upload,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Trash2,
  Sparkles,
  Layers,
  HelpCircle,
  Clock,
  Send,
  CloudUpload,
  FileCheck,
  Check,
  Smartphone,
  Laptop,
  ShieldCheck,
} from 'lucide-react';
import { ExamPackage, ExamResult, SchoolInfo } from '../types';
import {
  useOnlineStatus,
  getOfflineStorageStats,
  cacheAllExamPackagesLocally,
  getCachedExamPackages,
  getOfflineExamResultsQueue,
  removeOfflineExamResult,
  clearOfflineExamResultsQueue,
  exportOfflinePracticeBundle,
  parseOfflinePracticeBundle,
  OfflineStorageStats,
} from '../utils/offlineStorage';

interface OfflinePracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages?: ExamPackage[];
  availablePackages?: ExamPackage[];
  onStartExam: (pkg: ExamPackage) => void;
  onImportPackages?: (packages: ExamPackage[]) => void;
  onSyncResults?: (results: ExamResult[]) => void;
  schoolInfo?: SchoolInfo;
}

export const OfflinePracticeModal: React.FC<OfflinePracticeModalProps> = ({
  isOpen,
  onClose,
  packages,
  availablePackages,
  onStartExam,
  onImportPackages,
  onSyncResults,
  schoolInfo,
}) => {
  const isOnline = useOnlineStatus();
  const effectivePackages: ExamPackage[] = packages || availablePackages || [];
  const [stats, setStats] = useState<OfflineStorageStats>(() => getOfflineStorageStats());
  const [pendingResults, setPendingResults] = useState<ExamResult[]>(() => getOfflineExamResultsQueue());
  const [activeTab, setActiveTab] = useState<'packages' | 'sync' | 'guide'>('packages');
  const [isCachingLoading, setIsCachingLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh stats
  const refreshStats = () => {
    setStats(getOfflineStorageStats());
    setPendingResults(getOfflineExamResultsQueue());
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
    }
  }, [isOpen]);

  const showToast = (type: 'success' | 'info' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Cache all packages action
  const handleCacheAll = () => {
    setIsCachingLoading(true);
    setTimeout(() => {
      const res = cacheAllExamPackagesLocally(effectivePackages);
      setIsCachingLoading(false);
      refreshStats();
      if (res.success) {
        showToast(
          'success',
          `Berhasil menyimpan ${res.packagesCount} paket (${res.questionsCount} butir soal) ke memori offline perangkat!`
        );
      } else {
        showToast('error', 'Gagal menyimpan paket ke penyimpanan lokal.');
      }
    }, 400);
  };

  // Export bundle action
  const handleExport = () => {
    exportOfflinePracticeBundle(effectivePackages);
    showToast('success', 'File paket soal offline (.json) berhasil diunduh ke perangkat Anda.');
  };

  // Import bundle action
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const res = parseOfflinePracticeBundle(content);
      if (res.success && res.packages) {
        if (onImportPackages) {
          onImportPackages(res.packages);
        }
        cacheAllExamPackagesLocally([...effectivePackages, ...res.packages]);
        refreshStats();
        showToast('success', `Berhasil mengimpor ${res.packages.length} paket soal ke memori offline!`);
      } else {
        showToast('error', res.error || 'Format file paket offline tidak valid.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Sync queued results
  const handleSyncPendingResults = () => {
    if (pendingResults.length === 0) return;
    if (onSyncResults) {
      onSyncResults(pendingResults);
    }
    clearOfflineExamResultsQueue();
    refreshStats();
    showToast(
      'success',
      `Berhasil mensinkronkan ${pendingResults.length} hasil ujian offline ke server/cloud!`
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/10 shrink-0">
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Mode Latihan Soal Offline
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    isOnline
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {isOnline ? 'Internet Aktif' : 'Mode Offline (Tanpa Internet)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kerjakan simulasi ujian CBT & latihan soal secara mandiri tanpa khawatir gangguan sinyal atau kuota
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert Banner */}
        {toastMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 border-b animate-in fade-in ${
              toastMsg.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : toastMsg.type === 'error'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top Status & Storage Metrics */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Paket Offline</p>
            <p className="text-base font-extrabold text-indigo-300 font-mono mt-0.5">
              {stats.packagesCount} Paket
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Soal</p>
            <p className="text-base font-extrabold text-white font-mono mt-0.5">
              {stats.questionsCount} Butir
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ukuran Cache</p>
            <p className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
              ~{stats.estimatedSizeKb} KB
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Antrean Nilai</p>
            <p className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
              {pendingResults.length} Nilai
            </p>
          </div>
        </div>

        {/* Quick Action Bar (Cache All / Export / Import) */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCacheAll}
              disabled={isCachingLoading}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/60 transition-all cursor-pointer disabled:opacity-50"
              title="Simpan semua paket soal saat ini ke memori perangkat"
            >
              {isCachingLoading ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <HardDrive className="w-4 h-4" />
              )}
              <span>{isCachingLoading ? 'Menyimpan...' : 'Cache Semua Soal ke Offline'}</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              title="Unduh file paket soal untuk latihan tanpa internet"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ekspor File (.json)</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.cbtpkg"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              title="Unggah paket soal offline dari file lokal"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Impor File</span>
            </button>
          </div>

            {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('packages')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'packages'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Paket Soal ({effectivePackages.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sync')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sync'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Antrean Nilai</span>
              {pendingResults.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Petunjuk Offline
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Tab 1: Available Offline Packages */}
          {activeTab === 'packages' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Daftar Paket Siap Latihan Offline</h3>
                  <p className="text-xs text-slate-400">
                    Klik "Mulai Ujian Offline" untuk langsung mengerjakan simulasi secara mandiri
                  </p>
                </div>
                <span className="text-xs text-indigo-400 font-semibold">
                  {effectivePackages.length} Paket Tersedia
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {effectivePackages.map(pkg => (
                  <div
                    key={pkg.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/60 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase">
                          {pkg.category}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {pkg.durationMinutes || 60} Menit
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white mt-1.5 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                        {pkg.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {pkg.tagline || 'Paket soal simulasi ujian CBT mandiri.'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {pkg.questions?.length || 0} Butir Soal
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onStartExam(pkg);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/50 transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Mulai Latihan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Sync Pending Offline Results */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/40">
                  <CloudUpload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Sinkronisasi Nilai Pengerjaan Offline</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Ketika Anda mengerjakan soal dalam kondisi offline, nilai & hasil analisis tersimpan aman di perangkat Anda. Begitu terhubung kembali ke internet, klik tombol di bawah untuk menyinkronkan seluruh nilai ke server sekolah.
                  </p>
                </div>
              </div>

              {pendingResults.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Daftar Pengerjaan Offline ({pendingResults.length} Siswa/Hasil)
                    </span>
                    <button
                      type="button"
                      onClick={handleSyncPendingResults}
                      disabled={!isOnline}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {isOnline
                          ? `Sinkronkan Semua (${pendingResults.length})`
                          : 'Hubungkan Internet untuk Sinkron'}
                      </span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                    {pendingResults.map(res => (
                      <div key={res.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white">
                            {res.studentProfile?.fullName || 'Siswa Mandiri'} (NIS: {res.studentProfile?.nis || '-'})
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {res.packageName} • Skor: <strong className="text-emerald-400">{Math.round(res.totalScore)}</strong> • Selesai: {new Date(res.completedAt).toLocaleTimeString('id-ID')}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Tersimpan Lokal
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                  <FileCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">
                    Tidak ada antrean nilai yang tertunda.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Semua riwayat pengerjaan ujian sudah tersinkronisasi penuh dengan database.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Offline Usage Guide */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold font-mono">
                    1
                  </div>
                  <h4 className="font-bold text-white text-sm">Simpan Paket Soal</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Klik tombol <strong>"Cache Semua Soal ke Offline"</strong> selagi masih memiliki koneksi internet di sekolah atau di rumah.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold font-mono">
                    2
                  </div>
                  <h4 className="font-bold text-white text-sm">Nyalakan Mode Pesawat</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Matikan WiFi atau aktifkan Mode Pesawat di laptop/HP agar belajar fokus tanpa terganggu notifikasi chat atau media sosial.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold font-mono">
                    3
                  </div>
                  <h4 className="font-bold text-white text-sm">Kerjakan & Simpan Aman</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Seluruh jawaban, timer, dan kalkulasi nilai dihitung 100% lokal oleh mesin CBT tanpa membutuhkan koneksi server.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">Garansi Anti Kehilangan Data</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Sistem otomatis menyimpan progres pengerjaan setiap kali Anda memilih jawaban. Jika laptop mati mendadak atau browser tertutup, Anda dapat membuka kembali halaman dan melanjutkan ujian tepat di nomor soal terakhir.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            Terakhir Sinkron: {stats.lastSyncFormatted}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
