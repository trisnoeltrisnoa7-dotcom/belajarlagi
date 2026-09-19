import React, { useState, useMemo } from 'react';
import {
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Search,
  Filter,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { ExamScheduleItem } from '../types';

interface ManageStudentSubjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: ExamScheduleItem[];
  onSaveVisibility: (updatedSchedules: ExamScheduleItem[]) => void;
}

export const ManageStudentSubjectsModal: React.FC<ManageStudentSubjectsModalProps> = ({
  isOpen,
  onClose,
  schedules,
  onSaveVisibility,
}) => {
  // Local state map for visibility toggles: scheduleId -> boolean
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    schedules.forEach(item => {
      map[item.id] = item.isVisibleToStudents !== false; // default true if undefined
    });
    return map;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [dayFilter, setDayFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  // Filtered schedules list for view
  const filteredList = useMemo(() => {
    return schedules.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubj = item.subjectName.toLowerCase().includes(q);
        const matchClass = item.targetClass.toLowerCase().includes(q);
        const matchDay = item.dayName.toLowerCase().includes(q);
        if (!matchSubj && !matchClass && !matchDay) return false;
      }
      if (dayFilter !== 'ALL' && item.dayName !== dayFilter) {
        return false;
      }
      if (classFilter !== 'ALL') {
        if (!item.targetClass.includes(classFilter) && item.grade !== classFilter) {
          return false;
        }
      }
      return true;
    });
  }, [schedules, searchQuery, dayFilter, classFilter]);

  // Count active visible
  const visibleCount = useMemo(() => {
    return Object.values(visibilityMap).filter(Boolean).length;
  }, [visibilityMap]);

  const handleToggleSingle = (id: string) => {
    setVisibilityMap(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSetAll = (visible: boolean) => {
    const nextMap: Record<string, boolean> = { ...visibilityMap };
    // If filtering, only toggle filtered ones
    if (searchQuery.trim() || dayFilter !== 'ALL' || classFilter !== 'ALL') {
      filteredList.forEach(item => {
        nextMap[item.id] = visible;
      });
    } else {
      schedules.forEach(item => {
        nextMap[item.id] = visible;
      });
    }
    setVisibilityMap(nextMap);
  };

  const handleSetByDay = (dayName: string) => {
    const nextMap: Record<string, boolean> = { ...visibilityMap };
    schedules.forEach(item => {
      if (item.dayName === dayName) {
        nextMap[item.id] = true;
      } else {
        nextMap[item.id] = false;
      }
    });
    setVisibilityMap(nextMap);
  };

  // Reset student view: set all currently imported schedule items to visible (without touching catalog)
  const handleResetStudentView = () => {
    const nextMap: Record<string, boolean> = {};
    schedules.forEach(item => {
      nextMap[item.id] = true;
    });
    setVisibilityMap(nextMap);
  };

  const handleSave = () => {
    const updated = schedules.map(item => ({
      ...item,
      isVisibleToStudents: visibilityMap[item.id] !== false,
    }));
    onSaveVisibility(updated);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
              <Eye className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Atur Mapel yang Tampil di Halaman Ujian Siswa
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black">
                  {visibleCount} dari {schedules.length} Tampil
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pilih mata pelajaran yang dapat dilihat dan dikerjakan siswa. Hanya mengambil dari paket soal yang telah diimpor ke jadwal ujian.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action Presets & Filter Toolbar */}
        <div className="space-y-3 shrink-0">
          {/* Quick Presets Buttons */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ⚡ Aksi Cepat Visibilitas Siswa:
              </span>
              <span className="text-[10px] text-emerald-400/90 font-medium">
                Khusus paket terimpor ke jadwal ({schedules.length} mapel)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-reset-student-view-imported"
                onClick={handleResetStudentView}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-indigo-950/40 cursor-pointer"
                title="Reset tampilan siswa ke seluruh paket soal yang telah diimpor ke jadwal ujian"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Reset Tampilan Siswa ({schedules.length} Mapel Terimpor)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetAll(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Tampilkan Semua</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetAll(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Sembunyikan Semua</span>
              </button>

              <div className="h-4 w-px bg-slate-800 hidden sm:block" />

              {/* Quick Day Presets */}
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(dName => {
                const countForDay = schedules.filter(s => s.dayName === dName).length;
                if (countForDay === 0) return null;
                return (
                  <button
                    key={`btn-day-${dName}`}
                    type="button"
                    onClick={() => handleSetByDay(dName)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                    title={`Hanya tampilkan jadwal hari ${dName}`}
                  >
                    Hanya {dName} ({countForDay})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative sm:col-span-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari mapel / kelas..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <select
              value={dayFilter}
              onChange={e => setDayFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Hari Pelaksanaan</option>
              <option value="Senin">Hari Senin</option>
              <option value="Selasa">Hari Selasa</option>
              <option value="Rabu">Hari Rabu</option>
              <option value="Kamis">Hari Kamis</option>
              <option value="Jumat">Hari Jumat</option>
              <option value="Sabtu">Hari Sabtu</option>
            </select>

            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tingkat Kelas</option>
              <option value="X">Kelas X (10)</option>
              <option value="XI">Kelas XI (11)</option>
              <option value="XII">Kelas XII (12)</option>
            </select>
          </div>
        </div>

        {/* Schedule List with Checkboxes & Toggles */}
        <div className="space-y-2 overflow-y-auto pr-1 text-xs flex-1 max-h-72 divide-y divide-slate-850 rounded-2xl bg-slate-950/80 border border-slate-800 p-2">
          {filteredList.map((item, idx) => {
            const isVisible = visibilityMap[item.id] !== false;
            return (
              <div
                key={item.id}
                onClick={() => handleToggleSingle(item.id)}
                className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isVisible
                    ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20'
                    : 'bg-slate-900/40 hover:bg-slate-900/80 border border-transparent opacity-75'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                      isVisible
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 border border-slate-700 text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs truncate">
                        {item.subjectName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Sesi {item.sessionNumber}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        {item.targetClass}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1 text-amber-300/90">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        <span>{item.dayName}</span>
                      </span>
                      <span className="flex items-center gap-1 text-cyan-300/90">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{item.startTime} - {item.endTime} WIB</span>
                      </span>
                      <span>Token: <strong className="font-mono text-amber-300">{item.token || 'CBT'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right Status Badge */}
                <div className="shrink-0">
                  {isVisible ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Tampil</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-semibold">
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Tersembunyi</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredList.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-xs">
              Tidak ada mata pelajaran yang cocok dengan filter.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            <span className="text-emerald-400 font-bold">{visibleCount}</span> mata pelajaran aktif akan muncul di layar siswa.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Pengaturan Siswa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
