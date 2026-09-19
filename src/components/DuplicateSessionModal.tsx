import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Calendar,
  Clock,
  BookOpen,
  Users,
  KeyRound,
  RefreshCw,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ExamScheduleItem, ExamPackage } from '../types';
import { generateSubjectExamToken } from './ExamScheduleManagementView';

interface DuplicateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceSchedule: ExamScheduleItem;
  pkg?: ExamPackage;
  onAddSession: (newSchedule: ExamScheduleItem) => void;
}

const DAYS_OF_WEEK = [
  { name: 'Senin', dateDisplay: 'Senin, 24 Agustus 2026', dateIso: '2026-08-24' },
  { name: 'Selasa', dateDisplay: 'Selasa, 25 Agustus 2026', dateIso: '2026-08-25' },
  { name: 'Rabu', dateDisplay: 'Rabu, 26 Agustus 2026', dateIso: '2026-08-26' },
  { name: 'Kamis', dateDisplay: 'Kamis, 27 Agustus 2026', dateIso: '2026-08-27' },
  { name: 'Jumat', dateDisplay: 'Jumat, 28 Agustus 2026', dateIso: '2026-08-28' },
  { name: 'Sabtu', dateDisplay: 'Sabtu, 29 Agustus 2026', dateIso: '2026-08-29' },
];

export const DuplicateSessionModal: React.FC<DuplicateSessionModalProps> = ({
  isOpen,
  onClose,
  sourceSchedule,
  pkg,
  onAddSession,
}) => {
  const [dayName, setDayName] = useState(sourceSchedule.dayName || 'Senin');
  const [dateIso, setDateIso] = useState(sourceSchedule.dateIso || '2026-08-24');
  const [dateDisplay, setDateDisplay] = useState(sourceSchedule.dateDisplay || 'Senin, 24 Agustus 2026');
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('11:00');
  const [sessionNumber, setSessionNumber] = useState(
    sourceSchedule.sessionNumber === 1 ? 2 : sourceSchedule.sessionNumber + 1
  );
  const [targetClass, setTargetClass] = useState(
    `${sourceSchedule.targetClass || 'Kelas XII'} (Sesi ${sourceSchedule.sessionNumber === 1 ? 2 : sourceSchedule.sessionNumber + 1})`
  );
  const [token, setToken] = useState(() =>
    generateSubjectExamToken(`${sourceSchedule.subjectName}-S2`)
  );
  const [isVisibleToStudents, setIsVisibleToStudents] = useState(true);

  if (!isOpen) return null;

  const handleSave = () => {
    const newSchedule: ExamScheduleItem = {
      ...sourceSchedule,
      id: `sched-${sourceSchedule.packageId || sourceSchedule.id}-s${sessionNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      dayName,
      dateIso,
      dateDisplay,
      startTime,
      endTime,
      sessionNumber,
      targetClass,
      token,
      isVisibleToStudents,
      roomName: `Ruang Ujian CBT / Lab ${sessionNumber}`,
      supervisorName: 'Guru Pengawas Terjadwal',
    };

    onAddSession(newSchedule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-950/40">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Tambah Sesi / Jadwal Lain Mapel Ini
              </h3>
              <p className="text-xs text-slate-400">
                Ujikan mata pelajaran yang sama pada hari, jam, atau kelas yang berbeda
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

        {/* Form Body */}
        <div className="space-y-3.5 text-xs">
          {/* Source Subject Badge */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] uppercase font-bold text-amber-400">Mata Pelajaran yang Diujikan</span>
              <p className="text-sm font-bold text-white truncate">{sourceSchedule.subjectName}</p>
              <p className="text-[11px] text-slate-400">
                Durasi: {sourceSchedule.durationMinutes} Menit • {sourceSchedule.totalQuestions || 10} Soal
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
              Paket Asli: {pkg?.title || sourceSchedule.packageId}
            </span>
          </div>

          {/* Tanggal & Hari */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-slate-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>Hari Pelaksanaan:</span>
              </label>
              <select
                value={dayName}
                onChange={e => {
                  const dName = e.target.value;
                  const dayObj = DAYS_OF_WEEK.find(d => d.name === dName);
                  setDayName(dName);
                  if (dayObj) {
                    setDateIso(dayObj.dateIso);
                    setDateDisplay(dayObj.dateDisplay);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold cursor-pointer"
              >
                {DAYS_OF_WEEK.map(d => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Tanggal (YYYY-MM-DD):</label>
              <input
                type="date"
                value={dateIso}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) return;
                  const parsed = new Date(`${val}T12:00:00`);
                  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                  const dName = days[parsed.getDay()] || dayName;
                  const dDisplay = `${dName}, ${parsed.getDate()} ${parsed.toLocaleString('id-ID', { month: 'long' })} ${parsed.getFullYear()}`;
                  setDateIso(val);
                  setDayName(dName);
                  setDateDisplay(dDisplay);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold"
              />
            </div>
          </div>

          {/* Jam Mulai & Selesai */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Jam Mulai Ujian:</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-400" />
                <span>Jam Selesai Ujian:</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-rose-300 font-mono font-bold"
              />
            </div>
          </div>

          {/* Sesi & Target Kelas */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Nomor Sesi:</label>
              <select
                value={sessionNumber}
                onChange={e => setSessionNumber(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold cursor-pointer"
              >
                <option value={1}>Sesi 1 (Pagi)</option>
                <option value={2}>Sesi 2 (Siang)</option>
                <option value={3}>Sesi 3 (Sore)</option>
                <option value={4}>Sesi 4 (Susulan)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Kelas / Sasaran Peserta:</label>
              <input
                type="text"
                value={targetClass}
                onChange={e => setTargetClass(e.target.value)}
                placeholder="Contoh: Kelas XI MIPA 2"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold"
              />
            </div>
          </div>

          {/* Token Khusus Sesi Ini */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Token Ujian Khusus Sesi Ini:</span>
              </label>
              <button
                type="button"
                onClick={() => setToken(generateSubjectExamToken(`${sourceSchedule.subjectName}-${sessionNumber}`))}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Acak Token Baru</span>
              </button>
            </div>
            <input
              type="text"
              value={token}
              onChange={e => setToken(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold tracking-wider uppercase"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
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
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-950/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Simpan Sesi Tambahan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
