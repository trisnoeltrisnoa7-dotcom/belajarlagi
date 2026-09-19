import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  Layers,
  BookOpen,
  Trash2,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { ExamPackage } from '../types';

interface ResetPackagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetPackages: (mode: 'restore_default' | 'clear_all' | 'clear_custom_only') => void;
  totalPackagesCount?: number;
  customPackagesCount?: number;
}

export const ResetPackagesModal: React.FC<ResetPackagesModalProps> = ({
  isOpen,
  onClose,
  onResetPackages,
  totalPackagesCount = 0,
  customPackagesCount = 0,
}) => {
  const [resetOption, setResetOption] = useState<'restore_default' | 'clear_all' | 'clear_custom_only'>('restore_default');
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onResetPackages(resetOption);
    setIsConfirming(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Reset Paket Mata Pelajaran
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Atur ulang katalog paket soal dan kurikulum ujian SMA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Total Paket Saat Ini:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{totalPackagesCount} Paket</span>
              {customPackagesCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-[10px] border border-amber-500/30">
                  {customPackagesCount} Kustom
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Option 1: Restore Default */}
            <label
              onClick={() => setResetOption('restore_default')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer block ${
                resetOption === 'restore_default'
                  ? 'bg-indigo-950/50 border-indigo-500/60 ring-1 ring-indigo-500/40'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="resetPackageOption"
                  checked={resetOption === 'restore_default'}
                  onChange={() => setResetOption('restore_default')}
                  className="mt-1 accent-indigo-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-white">Reset ke Paket Standar Resmi (Default)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Rekomendasi
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Memulihkan 12+ paket ujian resmi SMA lengkap (Matematika Wajib & Peminatan, Fisika, Kimia, Biologi, Ekonomi, Sosiologi, Geografi, Sejarah, Bahasa Indonesia, Bahasa Inggris, Informatika, PPKn) dengan butir soal dan kunci jawaban baku.
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
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="resetPackageOption"
                  checked={resetOption === 'clear_custom_only'}
                  onChange={() => setResetOption('clear_custom_only')}
                  className="mt-1 accent-amber-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-white">Hapus Hanya Paket Kustom Guru</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {customPackagesCount} Paket
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Menghapus seluruh paket ujian yang dibuat sendiri atau diimpor guru dari Bank Soal, namun tetap mempertahankan seluruh paket standar kurikulum resmi SMA.
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
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="resetPackageOption"
                  checked={resetOption === 'clear_all'}
                  onChange={() => setResetOption('clear_all')}
                  className="mt-1 accent-rose-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-rose-300">Kosongkan Seluruh Paket Ujian</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Hapus Semua
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Menghapus seluruh paket ujian dari katalog dan database aplikasi. Anda dapat mengimpor atau menyusun paket soal baru dari awal.
                  </p>
                </div>
              </div>
            </label>
          </div>

          {isConfirming && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-200 space-y-1">
                <p className="font-bold text-white">Konfirmasi Tindakan Reset</p>
                <p className="text-slate-300">
                  {resetOption === 'clear_all'
                    ? 'Apakah Anda yakin ingin mengosongkan SELURUH paket ujian? Tindakan ini akan menghapus semua paket dari memori dan cloud.'
                    : resetOption === 'clear_custom_only'
                    ? `Apakah Anda yakin ingin menghapus ${customPackagesCount} paket kustom buatan guru?`
                    : 'Paket akan dikembalikan ke 12+ paket resmi standar SMA kurikulum resmi.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            id="btn-cancel-reset-modal"
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
              id="btn-proceed-reset-packages"
              onClick={() => setIsConfirming(true)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer ${
                resetOption === 'clear_all'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                  : resetOption === 'clear_custom_only'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Lanjutkan Reset</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-execute-reset-packages"
              onClick={handleConfirm}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-lg transition-all active:scale-95 cursor-pointer ${
                resetOption === 'clear_all'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50 ring-2 ring-rose-400'
                  : resetOption === 'clear_custom_only'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50 ring-2 ring-amber-400'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/50 ring-2 ring-indigo-400'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Ya, Terapkan Reset Sekarang</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
