import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Users,
  CheckCircle2,
  FileCheck2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ExamResult } from '../types';

interface ResetExamHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  examHistory: ExamResult[];
  onResetHistory: (
    mode: 'clear_all' | 'restore_demo' | 'clear_by_package',
    targetPackageId?: string
  ) => void;
}

export const ResetExamHistoryModal: React.FC<ResetExamHistoryModalProps> = ({
  isOpen,
  onClose,
  examHistory = [],
  onResetHistory,
}) => {
  const [resetMode, setResetMode] = useState<'clear_all' | 'restore_demo' | 'clear_by_package'>('clear_all');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Group submissions by package
  const packageGroups = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    examHistory.forEach((h) => {
      const pid = h.packageId || 'unknown';
      const ptitle = h.packageTitle || 'Paket Ujian';
      const existing = map.get(pid);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(pid, { id: pid, title: ptitle, count: 1 });
      }
    });
    return Array.from(map.values());
  }, [examHistory]);

  // If selectedPackageId is not set or not valid, default to the first package if available
  const activeSelectedPackageId = useMemo(() => {
    if (selectedPackageId && packageGroups.some((p) => p.id === selectedPackageId)) {
      return selectedPackageId;
    }
    return packageGroups.length > 0 ? packageGroups[0].id : '';
  }, [selectedPackageId, packageGroups]);

  const uniqueStudentsCount = useMemo(() => {
    const set = new Set<string>();
    examHistory.forEach((h) => {
      set.add(h.studentProfile?.nis || h.studentProfile?.fullName || h.id);
    });
    return set.size;
  }, [examHistory]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onResetHistory(resetMode, resetMode === 'clear_by_package' ? activeSelectedPackageId : undefined);
    setIsConfirming(false);
    onClose();
  };

  const selectedPackageDetails = packageGroups.find((p) => p.id === activeSelectedPackageId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-lg">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                Reset Laporan Riwayat Ujian
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Bersihkan hasil ujian siswa, lembar jawaban & rekapan nilai
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Summary Metric Strip */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Total Riwayat:</span>
              <span className="font-extrabold text-white">{examHistory.length} Lembar Hasil</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Siswa Unik:</span>
              <span className="font-extrabold text-emerald-400">{uniqueStudentsCount} Siswa</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Mode 1: Kosongkan Seluruh Riwayat Ujian (Clear All) */}
            <label
              onClick={() => {
                setResetMode('clear_all');
                setIsConfirming(false);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer block ${
                resetMode === 'clear_all'
                  ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500/40'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="resetHistoryMode"
                  checked={resetMode === 'clear_all'}
                  onChange={() => {
                    setResetMode('clear_all');
                    setIsConfirming(false);
                  }}
                  className="mt-1 accent-rose-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-rose-300">
                      Kosongkan Seluruh Riwayat Ujian (Bersih Total)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Ujian Baru
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Menghapus seluruh <strong className="text-white">{examHistory.length} lembar hasil ujian</strong> siswa di memori lokal dan Firestore. Otomatis membuka status kunci pengerjaan sehingga semua siswa dapat mengikuti ujian berikutnya tanpa terblokir.
                  </p>
                </div>
              </div>
            </label>

            {/* Mode 2: Hapus Riwayat Berdasarkan Paket Mapel Tertentu */}
            <label
              onClick={() => {
                setResetMode('clear_by_package');
                setIsConfirming(false);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer block ${
                resetMode === 'clear_by_package'
                  ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/40'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="resetHistoryMode"
                  checked={resetMode === 'clear_by_package'}
                  onChange={() => {
                    setResetMode('clear_by_package');
                    setIsConfirming(false);
                  }}
                  className="mt-1 accent-amber-500"
                />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-amber-300">
                      Hapus Riwayat Per Paket Mata Pelajaran
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Selektif
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Hanya menghapus riwayat pengerjaan siswa pada paket mata pelajaran tertentu, sementara hasil ujian mata pelajaran lainnya tetap utuh.
                  </p>

                  {/* Dropdown paket ujian */}
                  {resetMode === 'clear_by_package' && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                        Pilih Paket Mapel yang Ingin Direset:
                      </label>
                      {packageGroups.length > 0 ? (
                        <select
                          value={activeSelectedPackageId}
                          onChange={(e) => {
                            setSelectedPackageId(e.target.value);
                            setIsConfirming(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {packageGroups.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.title} ({pkg.count} lembar jawaban)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          Tidak ada paket dengan riwayat pengerjaan saat ini.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </label>

            {/* Mode 3: Restore Default Demo Data */}
            <label
              onClick={() => {
                setResetMode('restore_demo');
                setIsConfirming(false);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer block ${
                resetMode === 'restore_demo'
                  ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="resetHistoryMode"
                  checked={resetMode === 'restore_demo'}
                  onChange={() => {
                    setResetMode('restore_demo');
                    setIsConfirming(false);
                  }}
                  className="mt-1 accent-emerald-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      Kembalikan Data Simulasi / Contoh Awal (Demo)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Simulasi
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Memulihkan riwayat contoh simulasi (rekap 6+ siswa dengan statistik nilai IRT dan akurasi per kelas) untuk keperluan presentasi, uji coba fitur laporan, dan ekspor CSV.
                  </p>
                </div>
              </div>
            </label>
          </div>

          {/* Confirmation Warning Box */}
          {isConfirming && (
            <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/50 flex items-start gap-3 animate-in fade-in duration-150">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-200 space-y-1">
                <p className="font-bold text-white">Konfirmasi Tindakan Reset Riwayat</p>
                <p className="text-slate-300 leading-relaxed">
                  {resetMode === 'clear_all' &&
                    `Apakah Anda yakin ingin menghapus SELURUH ${examHistory.length} lembar laporan riwayat ujian? Tindakan ini tidak dapat dibatalkan.`}
                  {resetMode === 'clear_by_package' &&
                    `Apakah Anda yakin ingin menghapus ${selectedPackageDetails?.count || 0} lembar riwayat ujian untuk paket "${selectedPackageDetails?.title || 'ini'}"?`}
                  {resetMode === 'restore_demo' &&
                    'Laporan riwayat akan diganti dengan data contoh simulasi awal.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            id="btn-cancel-reset-history-modal"
            onClick={() => {
              setIsConfirming(false);
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            Batal
          </button>

          {!isConfirming ? (
            <button
              type="button"
              id="btn-proceed-reset-history"
              disabled={resetMode === 'clear_by_package' && (!activeSelectedPackageId || packageGroups.length === 0)}
              onClick={() => setIsConfirming(true)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                resetMode === 'clear_all'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                  : resetMode === 'clear_by_package'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Lanjutkan Reset</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-execute-reset-history"
              onClick={handleConfirm}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-lg transition-all active:scale-95 cursor-pointer ring-2 ${
                resetMode === 'clear_all'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50 ring-rose-400'
                  : resetMode === 'clear_by_package'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50 ring-amber-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50 ring-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Ya, Reset Riwayat Sekarang</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
