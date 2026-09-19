import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  BookOpen,
  Users,
  CheckCircle2,
  Sliders,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  HelpCircle,
  GraduationCap,
} from 'lucide-react';
import { ExamPackage, ExamScheduleItem, SmaGrade, SmaMajor } from '../types';
import { generateSubjectExamToken } from './ExamScheduleManagementView';

interface AutoImportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePackages: ExamPackage[];
  existingScheduleCount?: number;
  onImport?: (newSchedules: ExamScheduleItem[], mode: 'replace' | 'append') => void;
  onImportSchedules?: (newSchedules: ExamScheduleItem[], mode: 'replace' | 'append') => void;
}

export const DAYS_OF_WEEK = [
  { name: 'Senin', dateDisplay: 'Senin, 24 Agustus 2026', dateIso: '2026-08-24' },
  { name: 'Selasa', dateDisplay: 'Selasa, 25 Agustus 2026', dateIso: '2026-08-25' },
  { name: 'Rabu', dateDisplay: 'Rabu, 26 Agustus 2026', dateIso: '2026-08-26' },
  { name: 'Kamis', dateDisplay: 'Kamis, 27 Agustus 2026', dateIso: '2026-08-27' },
  { name: 'Jumat', dateDisplay: 'Jumat, 28 Agustus 2026', dateIso: '2026-08-28' },
  { name: 'Sabtu', dateDisplay: 'Sabtu, 29 Agustus 2026', dateIso: '2026-08-29' },
];

export const TIME_SLOTS = [
  { session: 1, start: '07:30', end: '09:00' },
  { session: 2, start: '09:30', end: '11:00' },
  { session: 3, start: '11:15', end: '12:45' },
  { session: 4, start: '13:15', end: '14:45' },
];

type DistributionMode =
  | 'smart_spread' // Merata ke Senin-Sabtu & Sesi 1-3
  | 'by_grade_level' // Terstruktur per Kelas (X, XI, XII)
  | 'multi_session_duplicate' // Buat 2 sesi/hari berbeda untuk setiap mapel (misal Sesi Pagi & Siang)
  | 'custom_fixed'; // Tetapkan ke 1 hari & jam spesifik

export const AutoImportScheduleModal: React.FC<AutoImportScheduleModalProps> = ({
  isOpen,
  onClose,
  availablePackages,
  existingScheduleCount = 0,
  onImport,
  onImportSchedules,
}) => {
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('smart_spread');
  const [importAction, setImportAction] = useState<'replace' | 'append'>('replace');
  const [visibilityDefault, setVisibilityDefault] = useState<boolean>(true);
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(() => {
    return new Set(availablePackages.map(p => p.id));
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Specific fixed day/session options for 'custom_fixed'
  const [fixedDay, setFixedDay] = useState('Senin');
  const [fixedSession, setFixedSession] = useState(1);

  // Multi-session custom settings
  const [multiSessionCount, setMultiSessionCount] = useState<2 | 3>(2);

  // Reset or update selections when packages change
  const filteredPackages = useMemo(() => {
    return availablePackages.filter(pkg => {
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchTitle = pkg.title.toLowerCase().includes(q);
        const matchSubject = (pkg.subject || '').toLowerCase().includes(q);
        const matchTag = (pkg.tagline || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchTag) return false;
      }
      if (categoryFilter !== 'ALL') {
        if (pkg.category !== categoryFilter && pkg.major !== categoryFilter) {
          return false;
        }
      }
      return true;
    });
  }, [availablePackages, searchFilter, categoryFilter]);

  const handleToggleSelectAll = () => {
    if (selectedPackageIds.size === availablePackages.length) {
      setSelectedPackageIds(new Set());
    } else {
      setSelectedPackageIds(new Set(availablePackages.map(p => p.id)));
    }
  };

  const handleTogglePackage = (pkgId: string) => {
    setSelectedPackageIds(prev => {
      const next = new Set(prev);
      if (next.has(pkgId)) {
        next.delete(pkgId);
      } else {
        next.add(pkgId);
      }
      return next;
    });
  };

  // Preview generated schedule items based on current settings
  const generatedPreviewItems = useMemo(() => {
    const pkgsToProcess = availablePackages.filter(p => selectedPackageIds.has(p.id));
    const items: ExamScheduleItem[] = [];

    pkgsToProcess.forEach((pkg, index) => {
      const subjectName = pkg.subject || pkg.title.split('-')[0].trim() || pkg.title;

      let targetClass = 'Semua Kelas (X, XI, XII)';
      if (pkg.grade && pkg.grade !== 'Semua Kelas') {
        targetClass = `Kelas ${pkg.grade} ${pkg.major ? pkg.major : ''}`.trim();
      } else if (pkg.category.includes('MIPA')) {
        targetClass = 'Kelas XII MIPA';
      } else if (pkg.category.includes('IPS')) {
        targetClass = 'Kelas XII IPS';
      } else if (pkg.category.includes('TPS')) {
        targetClass = 'Kelas XII & Alumni (UTBK)';
      }

      if (distributionMode === 'smart_spread') {
        // Distribute neatly across days and slots
        const dayIndex = index % DAYS_OF_WEEK.length;
        const slotIndex = Math.floor(index / DAYS_OF_WEEK.length) % TIME_SLOTS.length;
        const dayObj = DAYS_OF_WEEK[dayIndex];
        const slotObj = TIME_SLOTS[slotIndex];

        items.push({
          id: `sched-auto-${pkg.id}-${dayObj.name}-${slotObj.session}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          packageId: pkg.id,
          subjectName,
          dayName: dayObj.name,
          dateDisplay: dayObj.dateDisplay,
          dateIso: dayObj.dateIso,
          startTime: slotObj.start,
          endTime: slotObj.end,
          targetClass,
          grade: pkg.grade,
          major: pkg.major,
          durationMinutes: pkg.durationMinutes || 90,
          totalQuestions: pkg.totalQuestions || 10,
          kkmScore: pkg.kkmScore || 75,
          sessionNumber: slotObj.session,
          roomName: `Ruang Ujian CBT / Lab ${slotObj.session}`,
          supervisorName: 'Guru Pengawas Terjadwal',
          token: generateSubjectExamToken(subjectName),
          isVisibleToStudents: visibilityDefault,
        });
      } else if (distributionMode === 'by_grade_level') {
        // Group by grade: Grade 10 on Day 0-1, Grade 11 on Day 2-3, Grade 12 on Day 4-5
        let baseDayIndex = 0;
        if (pkg.grade === '11') baseDayIndex = 2;
        else if (pkg.grade === '12' || pkg.category.includes('TPS')) baseDayIndex = 4;

        const dayOffset = index % 2;
        const actualDayIndex = Math.min(DAYS_OF_WEEK.length - 1, baseDayIndex + dayOffset);
        const slotIndex = (Math.floor(index / 2) % TIME_SLOTS.length);
        const dayObj = DAYS_OF_WEEK[actualDayIndex];
        const slotObj = TIME_SLOTS[slotIndex];

        items.push({
          id: `sched-grade-${pkg.id}-${dayObj.name}-${slotObj.session}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          packageId: pkg.id,
          subjectName,
          dayName: dayObj.name,
          dateDisplay: dayObj.dateDisplay,
          dateIso: dayObj.dateIso,
          startTime: slotObj.start,
          endTime: slotObj.end,
          targetClass,
          grade: pkg.grade,
          major: pkg.major,
          durationMinutes: pkg.durationMinutes || 90,
          totalQuestions: pkg.totalQuestions || 10,
          kkmScore: pkg.kkmScore || 75,
          sessionNumber: slotObj.session,
          roomName: `Lab Komputer ${pkg.grade ? `Kelas ${pkg.grade}` : 'Umum'}`,
          supervisorName: 'Guru Pengawas Terjadwal',
          token: generateSubjectExamToken(subjectName),
          isVisibleToStudents: visibilityDefault,
        });
      } else if (distributionMode === 'multi_session_duplicate') {
        // Generate MULTIPLE sessions (Session 1 & Session 2) on different days/times for the SAME subject!
        for (let s = 1; s <= multiSessionCount; s++) {
          const dayIndex = (index + s - 1) % DAYS_OF_WEEK.length;
          const slotIndex = (s - 1) % TIME_SLOTS.length;
          const dayObj = DAYS_OF_WEEK[dayIndex];
          const slotObj = TIME_SLOTS[slotIndex];

          const sessionClassLabel =
            s === 1
              ? `${targetClass} (Kelompok A / Sesi 1)`
              : s === 2
              ? `${targetClass} (Kelompok B / Sesi 2)`
              : `${targetClass} (Kelompok C / Sesi 3)`;

          items.push({
            id: `sched-multi-${pkg.id}-s${s}-${dayObj.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            packageId: pkg.id,
            subjectName: `${subjectName} (Sesi ${s})`,
            dayName: dayObj.name,
            dateDisplay: dayObj.dateDisplay,
            dateIso: dayObj.dateIso,
            startTime: slotObj.start,
            endTime: slotObj.end,
            targetClass: sessionClassLabel,
            grade: pkg.grade,
            major: pkg.major,
            durationMinutes: pkg.durationMinutes || 90,
            totalQuestions: pkg.totalQuestions || 10,
            kkmScore: pkg.kkmScore || 75,
            sessionNumber: s,
            roomName: `Lab Komputer Sesi ${s}`,
            supervisorName: `Guru Pengawas Sesi ${s}`,
            token: generateSubjectExamToken(`${subjectName}-${s}`),
            isVisibleToStudents: visibilityDefault,
          });
        }
      } else if (distributionMode === 'custom_fixed') {
        // All to fixed day & session
        const dayObj = DAYS_OF_WEEK.find(d => d.name === fixedDay) || DAYS_OF_WEEK[0];
        const slotObj = TIME_SLOTS.find(s => s.session === fixedSession) || TIME_SLOTS[0];

        items.push({
          id: `sched-fixed-${pkg.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          packageId: pkg.id,
          subjectName,
          dayName: dayObj.name,
          dateDisplay: dayObj.dateDisplay,
          dateIso: dayObj.dateIso,
          startTime: slotObj.start,
          endTime: slotObj.end,
          targetClass,
          grade: pkg.grade,
          major: pkg.major,
          durationMinutes: pkg.durationMinutes || 90,
          totalQuestions: pkg.totalQuestions || 10,
          kkmScore: pkg.kkmScore || 75,
          sessionNumber: slotObj.session,
          roomName: `Ruang Ujian CBT / Lab ${slotObj.session}`,
          supervisorName: 'Guru Pengawas Terjadwal',
          token: generateSubjectExamToken(subjectName),
          isVisibleToStudents: visibilityDefault,
        });
      }
    });

    return items;
  }, [
    availablePackages,
    selectedPackageIds,
    distributionMode,
    fixedDay,
    fixedSession,
    multiSessionCount,
    visibilityDefault,
  ]);

  const handleExecuteImport = () => {
    if (generatedPreviewItems.length === 0) return;
    const importCallback = onImport || onImportSchedules;
    if (typeof importCallback === 'function') {
      importCallback(generatedPreviewItems, importAction);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-950/40 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Impor & Distribusi Otomatis Jadwal Ujian
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                  {availablePackages.length} Mapel Tersedia
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Konfigurasi jadwal serentak, multi-sesi, atau terdistribusi merata ke seluruh hari ujian
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

        {/* Scrollable Configuration Body */}
        <div className="space-y-4 overflow-y-auto pr-1 text-xs flex-1">
          {/* Strategy Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>1. Pilih Strategi Distribusi Jadwal:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Smart Spread */}
              <button
                type="button"
                id="strat-smart-spread"
                onClick={() => setDistributionMode('smart_spread')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  distributionMode === 'smart_spread'
                    ? 'bg-gradient-to-br from-indigo-950/80 via-slate-900 to-teal-950/70 border-indigo-500 text-white shadow-xl shadow-indigo-950/40 ring-1 ring-indigo-500'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  distributionMode === 'smart_spread' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 block text-xs sm:text-sm">
                      📅 Distribusi Merata (Senin - Sabtu)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                      Rekomendasi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Mata pelajaran otomatis dibagi seimbang sepanjang 6 hari ujian pada Sesi 1, 2, dan 3.
                  </p>
                </div>
              </button>

              {/* Option 2: By Grade Level */}
              <button
                type="button"
                id="strat-by-grade-level"
                onClick={() => setDistributionMode('by_grade_level')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  distributionMode === 'by_grade_level'
                    ? 'bg-gradient-to-br from-indigo-950/80 via-slate-900 to-teal-950/70 border-indigo-500 text-white shadow-xl shadow-indigo-950/40 ring-1 ring-indigo-500'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  distributionMode === 'by_grade_level' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-200 block text-xs sm:text-sm">
                    👥 Terstruktur per Tingkat Kelas
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Mapel Kelas 10 dialokasikan di awal pekan, Kelas 11 di tengah, dan Kelas 12 / UTBK di akhir pekan.
                  </p>
                </div>
              </button>

              {/* Option 3: Multi-Session Duplicate */}
              <button
                type="button"
                id="strat-multi-session"
                onClick={() => setDistributionMode('multi_session_duplicate')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  distributionMode === 'multi_session_duplicate'
                    ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-amber-950/40 border-amber-500 text-white shadow-xl shadow-amber-950/40 ring-1 ring-amber-500'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  distributionMode === 'multi_session_duplicate' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-amber-300 block text-xs sm:text-sm">
                    ⚡ Multi-Sesi (Hari & Jam Berbeda per Mapel)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Satu mata pelajaran otomatis dibuatkan 2 atau 3 sesi di hari/jam berbeda untuk giliran kelas siswa.
                  </p>
                </div>
              </button>

              {/* Option 4: Custom Fixed */}
              <button
                type="button"
                id="strat-custom-fixed"
                onClick={() => setDistributionMode('custom_fixed')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  distributionMode === 'custom_fixed'
                    ? 'bg-gradient-to-br from-indigo-950/80 via-slate-900 to-teal-950/70 border-indigo-500 text-white shadow-xl shadow-indigo-950/40 ring-1 ring-indigo-500'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  distributionMode === 'custom_fixed' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-200 block text-xs sm:text-sm">
                    🎯 Tetapkan ke Hari & Jam Serentak
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Semua paket soal yang dipilih akan dijadwalkan pada 1 hari & sesi jam yang sama persis.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Multi-Session Configuration */}
          {distributionMode === 'multi_session_duplicate' && (
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Jumlah Sesi per Mata Pelajaran:
                </span>
                <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-amber-500/30">
                  <button
                    type="button"
                    onClick={() => setMultiSessionCount(2)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                      multiSessionCount === 2 ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2 Sesi (Pagi & Siang)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMultiSessionCount(3)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                      multiSessionCount === 3 ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    3 Sesi (Pagi, Siang & Sore)
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Fitur ini akan menduplikasi setiap mapel dengan token unik dan jadwal berbeda, memungkinkan kelas berbeda menguji mapel yang sama tanpa bentrok jam/ruangan.
              </p>
            </div>
          )}

          {/* Conditional Fixed Day/Session Configuration */}
          {distributionMode === 'custom_fixed' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Pilih Hari:</label>
                <select
                  value={fixedDay}
                  onChange={e => setFixedDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold cursor-pointer"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.dateDisplay})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Pilih Jam Sesi:</label>
                <select
                  value={fixedSession}
                  onChange={e => setFixedSession(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-semibold cursor-pointer"
                >
                  {TIME_SLOTS.map(s => (
                    <option key={s.session} value={s.session}>
                      Sesi {s.session} ({s.start} - {s.end} WIB)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 2. Action Mode & Student Visibility Setting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800">
            {/* Action Mode: Replace vs Append */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-cyan-400" />
                <span>Mode Impor Jadwal:</span>
              </label>
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setImportAction('replace')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    importAction === 'replace'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Kosongkan jadwal lama dan ganti dengan yang baru"
                >
                  Ganti Seluruh Jadwal
                </button>
                <button
                  type="button"
                  onClick={() => setImportAction('append')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    importAction === 'append'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Tambahkan ke jadwal yang sudah ada tanpa menghapus yang lama"
                >
                  Tambahkan ke Jadwal
                </button>
              </div>
            </div>

            {/* Student Visibility: Published vs Hidden */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>Status Tampil di Halaman Siswa:</span>
              </label>
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setVisibilityDefault(true)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    visibilityDefault === true
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Langsung Tampil</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityDefault(false)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    visibilityDefault === false
                      ? 'bg-slate-750 text-amber-300 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Sembunyikan Dulu</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Package Selection List with Search & Bulk Select */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>2. Pilih Paket Soal yang Akan Diimpor ({selectedPackageIds.size} / {availablePackages.length}):</span>
              </label>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  {selectedPackageIds.size === availablePackages.length ? 'Batal Pilih Semua' : 'Pilih Semua Paket'}
                </button>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Cari mata pelajaran atau paket..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="MIPA">MIPA</option>
                <option value="IPS">IPS</option>
                <option value="TPS">TPS / UTBK</option>
                <option value="Bahasa">Bahasa</option>
                <option value="Umum">Umum</option>
              </select>
            </div>

            {/* Packages Checklist Container */}
            <div className="max-h-44 overflow-y-auto rounded-2xl bg-slate-950/80 border border-slate-800 p-2 divide-y divide-slate-850">
              {filteredPackages.map(pkg => {
                const isSelected = selectedPackageIds.has(pkg.id);
                return (
                  <label
                    key={pkg.id}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-950/30 hover:bg-indigo-950/50' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTogglePackage(pkg.id)}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate text-xs">
                          {pkg.subject || pkg.title}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {pkg.title} • {pkg.totalQuestions || 10} Soal • {pkg.durationMinutes || 90} mnt
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {pkg.major || pkg.category || 'MATA PELAJARAN'}
                      </span>
                    </div>
                  </label>
                );
              })}

              {filteredPackages.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-xs">
                  Tidak ada paket soal yang cocok dengan pencarian.
                </div>
              )}
            </div>
          </div>

          {/* 4. Generation Summary Preview */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/40 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs">
                  Total {generatedPreviewItems.length} Jadwal Ujian Siap Diimpor
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {importAction === 'replace'
                  ? `Mengganti jadwal lama (${existingScheduleCount} item) dengan ${generatedPreviewItems.length} jadwal baru.`
                  : `Menambahkan ${generatedPreviewItems.length} jadwal baru ke ${existingScheduleCount} item yang ada.`}
                {' • '}
                <strong className={visibilityDefault ? 'text-emerald-300' : 'text-amber-300'}>
                  {visibilityDefault ? 'Langsung tampil di siswa' : 'Disembunyikan sementara'}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={generatedPreviewItems.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Impor {generatedPreviewItems.length} Jadwal Sekarang</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500">
            Setiap jadwal mendapatkan Token Ujian otomatis yang dapat diacak kapan saja.
          </span>

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
              onClick={handleExecuteImport}
              disabled={generatedPreviewItems.length === 0}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-950/50 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Terapkan Jadwal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

