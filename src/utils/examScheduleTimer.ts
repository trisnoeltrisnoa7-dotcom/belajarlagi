import { ExamScheduleItem } from '../types';
import { isGlobalLockingDisabled } from './sessionManager';

export type ScheduleTimeStatus = 'locked_upcoming' | 'open_active' | 'closed_expired' | 'no_schedule';

export interface ScheduleTimeInfo {
  status: ScheduleTimeStatus;
  startDateTime: Date | null;
  endDateTime: Date | null;
  secondsUntilOpen: number;
  secondsUntilClose: number;
  isCurrentlyOpen: boolean;
  isUpcoming: boolean;
  isExpired: boolean;
  statusLabel: string;
  statusDescription: string;
  badge: {
    bg: string;
    border: string;
    text: string;
    dotColor: string;
  };
}

/**
 * Parses schedule item dateIso, startTime, and endTime into precise Date objects.
 */
export const parseScheduleDates = (
  schedule: ExamScheduleItem | null | undefined
): { startDateTime: Date | null; endDateTime: Date | null } => {
  if (!schedule) return { startDateTime: null, endDateTime: null };

  try {
    let dateStr = schedule.dateIso;
    // Fallback if dateIso is missing or incomplete
    if (!dateStr || !dateStr.includes('-')) {
      const today = new Date();
      dateStr = today.toISOString().split('T')[0];
    }

    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);

    const startTime = schedule.startTime || '07:30';
    const endTime = schedule.endTime || '09:00';

    const [startH, startM] = startTime.split(':').map(n => parseInt(n, 10) || 0);
    const [endH, endM] = endTime.split(':').map(n => parseInt(n, 10) || 0);

    const startDateTime = new Date(year, month, day, startH, startM, 0, 0);
    const endDateTime = new Date(year, month, day, endH, endM, 0, 0);

    return { startDateTime, endDateTime };
  } catch (e) {
    return { startDateTime: null, endDateTime: null };
  }
};

export const isGlobalTimeBypassActive = (): boolean => {
  try {
    // 1. URL Query Parameter: Langsung sinkron ke semua browser (Safari iOS, Chrome, dll)
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const modeParam = (params.get('mode') || params.get('exam_mode') || '').toLowerCase();
      const freeParam = (params.get('free') || params.get('bebas') || params.get('bypass') || '').toLowerCase();
      if (modeParam === 'bebas' || modeParam === 'free' || freeParam === '1' || freeParam === 'true') {
        return true;
      }
      if (modeParam === 'normal' || freeParam === '0' || freeParam === 'false') {
        return false;
      }
    }
    const saved = localStorage.getItem('cbt_exam_time_bypass_active');
    if (saved !== null) {
      if (JSON.parse(saved) === true) return true;
    }
    if (isGlobalLockingDisabled()) {
      return true;
    }
  } catch (e) {}
  return false;
};

export const setGlobalTimeBypassActive = (active: boolean): void => {
  try {
    localStorage.setItem('cbt_exam_time_bypass_active', JSON.stringify(active));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cbt-time-bypass-changed'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {}
};

/**
 * Calculates current schedule window status (Terkunci / Terbuka / Tertutup)
 */
export const getScheduleTimeInfo = (
  schedule: ExamScheduleItem | null | undefined,
  currentTime: Date = new Date(),
  bypassScheduleLock: boolean = false
): ScheduleTimeInfo => {
  const isBypassed = bypassScheduleLock || isGlobalTimeBypassActive() || isGlobalLockingDisabled();

  if (!schedule) {
    return {
      status: 'no_schedule',
      startDateTime: null,
      endDateTime: null,
      secondsUntilOpen: 0,
      secondsUntilClose: 0,
      isCurrentlyOpen: true,
      isUpcoming: false,
      isExpired: false,
      statusLabel: 'Siap Dikerjakan',
      statusDescription: '',
      badge: {
        bg: 'bg-slate-800/60',
        border: 'border-slate-700',
        text: 'text-slate-300',
        dotColor: 'bg-slate-400',
      },
    };
  }

  if (isBypassed) {
    return {
      status: 'open_active',
      startDateTime: null,
      endDateTime: null,
      secondsUntilOpen: 0,
      secondsUntilClose: 0,
      isCurrentlyOpen: true,
      isUpcoming: false,
      isExpired: false,
      statusLabel: 'Terbuka',
      statusDescription: '',
      badge: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/50',
        text: 'text-emerald-300',
        dotColor: 'bg-emerald-400',
      },
    };
  }

  const { startDateTime, endDateTime } = parseScheduleDates(schedule);

  if (!startDateTime || !endDateTime || isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    return {
      status: 'open_active',
      startDateTime: null,
      endDateTime: null,
      secondsUntilOpen: 0,
      secondsUntilClose: 0,
      isCurrentlyOpen: true,
      isUpcoming: false,
      isExpired: false,
      statusLabel: 'Terbuka',
      statusDescription: 'Jadwal aktif.',
      badge: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/40',
        text: 'text-emerald-300',
        dotColor: 'bg-emerald-400',
      },
    };
  }

  const nowMs = currentTime.getTime();
  const startMs = startDateTime.getTime();
  const endMs = endDateTime.getTime();

  // 1. BEFORE START TIME -> LOCKED (TERKUNCI)
  if (nowMs < startMs) {
    const secondsUntilOpen = Math.max(0, Math.floor((startMs - nowMs) / 1000));
    return {
      status: 'locked_upcoming',
      startDateTime,
      endDateTime,
      secondsUntilOpen,
      secondsUntilClose: 0,
      isCurrentlyOpen: false,
      isUpcoming: true,
      isExpired: false,
      statusLabel: 'Terkunci (Belum Waktunya)',
      statusDescription: `Dibuka otomatis pada ${schedule.dateDisplay || schedule.dayName} pukul ${schedule.startTime} WIB.`,
      badge: {
        bg: 'bg-amber-500/20',
        border: 'border-amber-500/50',
        text: 'text-amber-300',
        dotColor: 'bg-amber-400',
      },
    };
  }

  // 2. WITHIN WINDOW -> OPEN (TERBUKA)
  if (nowMs >= startMs && nowMs <= endMs) {
    const secondsUntilClose = Math.max(0, Math.floor((endMs - nowMs) / 1000));
    return {
      status: 'open_active',
      startDateTime,
      endDateTime,
      secondsUntilOpen: 0,
      secondsUntilClose,
      isCurrentlyOpen: true,
      isUpcoming: false,
      isExpired: false,
      statusLabel: 'Sedang Berlangsung (Terbuka)',
      statusDescription: `Sesi ujian aktif hingga pukul ${schedule.endTime} WIB.`,
      badge: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/50',
        text: 'text-emerald-300',
        dotColor: 'bg-emerald-400',
      },
    };
  }

  // 3. AFTER END TIME -> CLOSED / EXPIRED (TERTUTUP)
  return {
    status: 'closed_expired',
    startDateTime,
    endDateTime,
    secondsUntilOpen: 0,
    secondsUntilClose: 0,
    isCurrentlyOpen: false,
    isUpcoming: false,
    isExpired: true,
    statusLabel: 'Telah Berakhir (Sesi Ditutup)',
    statusDescription: `Waktu pengerjaan sesi ini telah berakhir pada pukul ${schedule.endTime} WIB.`,
    badge: {
      bg: 'bg-rose-500/20',
      border: 'border-rose-500/50',
      text: 'text-rose-300',
      dotColor: 'bg-rose-400',
    },
  };
};

/**
 * Formats seconds into human-readable countdown string (e.g. "01:25:30" or "2 Hari 04:30:00")
 */
export const formatCountdownSeconds = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return '00:00:00';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (days > 0) {
    return `${days} Hari ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Loads schedule list from localStorage
 */
export const getCustomScheduleItems = (): ExamScheduleItem[] => {
  try {
    const raw = localStorage.getItem('cbt_custom_exam_schedules_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

/**
 * Finds matching schedule for a package
 */
export const findScheduleForPackage = (
  packageId: string,
  fallbackSchedules?: ExamScheduleItem[]
): ExamScheduleItem | null => {
  const fromStorage = getCustomScheduleItems();
  const matchStorage = fromStorage.find(s => s.packageId === packageId);
  if (matchStorage) return matchStorage;

  if (fallbackSchedules) {
    const matchFallback = fallbackSchedules.find(s => s.packageId === packageId);
    if (matchFallback) return matchFallback;
  }

  return null;
};
