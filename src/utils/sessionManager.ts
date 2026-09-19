import { ActiveExamSession, StudentProfile, ExamPackage, NisSecuritySettings } from '../types';

const STORAGE_KEY_ACTIVE_SESSIONS = 'cbt_active_exam_sessions';
const STORAGE_KEY_GLOBAL_LOCKING_DISABLED = 'cbt_global_locking_disabled';
const BROADCAST_CHANNEL_NAME = 'cbt_exam_sessions_channel';

/**
 * Check if the entire locking system has been globally disabled by the proctor
 */
export function isGlobalLockingDisabled(): boolean {
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
    const raw = localStorage.getItem(STORAGE_KEY_GLOBAL_LOCKING_DISABLED);
    if (raw !== null) {
      if (raw === 'true') return true;
      try {
        if (JSON.parse(raw) === true) return true;
      } catch (e) {}
    }
  } catch (e) {}
  return false;
}

/**
 * Enable or disable all locking mechanisms across the app
 */
export function setGlobalLockingDisabled(disabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_GLOBAL_LOCKING_DISABLED, JSON.stringify(disabled));
    broadcastSessionEvent('FORCE_RESET', { globalLockingDisabled: disabled });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cbt-global-locking-changed'));
      window.dispatchEvent(new Event('cbt-time-bypass-changed'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {}
}

// Unique Device / Tab ID per browser session
export function getOrCreateDeviceId(): string {
  try {
    let deviceId = sessionStorage.getItem('cbt_device_session_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      sessionStorage.setItem('cbt_device_session_id', deviceId);
    }
    return deviceId;
  } catch (e) {
    return 'dev_fallback_' + Date.now();
  }
}

// Get device description snippet
function getDeviceInfoSnippet(): string {
  if (typeof navigator === 'undefined') return 'Unknown Browser';
  const ua = navigator.userAgent;
  let browser = 'Web Browser';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  let os = 'PC/Laptop';
  if (/Android/i.test(ua)) os = 'Android Device';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS Device';
  else if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/Mac/i.test(ua)) os = 'MacOS';

  return `${browser} (${os})`;
}

// Read all active sessions and clean up expired ones
export function getAllActiveSessions(timeoutMinutes = 60): ActiveExamSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSIONS);
    if (!raw) return [];
    const sessions: ActiveExamSession[] = JSON.parse(raw);
    const now = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    // Filter out expired sessions (last heartbeat > timeoutMs or completed)
    const valid = sessions.filter(s => {
      if (s.status !== 'in_progress') return false;
      const isStale = now - s.lastHeartbeat > timeoutMs;
      return !isStale;
    });

    if (valid.length !== sessions.length) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SESSIONS, JSON.stringify(valid));
    }
    return valid;
  } catch (e) {
    return [];
  }
}

// Broadcast message across tabs
function broadcastSessionEvent(type: 'SESSION_STARTED' | 'SESSION_TERMINATED' | 'FORCE_RESET' | 'HEARTBEAT', payload: any) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type, payload, timestamp: Date.now() });
      channel.close();
    }
  } catch (e) {}
}

/**
 * Check if there is an active exam session for a specific NIS on a DIFFERENT device/tab.
 */
export function checkActiveSessionConflict(
  nis: string,
  currentDeviceId: string,
  settings?: NisSecuritySettings
): {
  hasConflict: boolean;
  activeSession?: ActiveExamSession;
} {
  const cleanNis = nis.trim().toLowerCase();
  if (!cleanNis) return { hasConflict: false };

  // If global locking is disabled or single session enforcement is turned off, allow
  if (isGlobalLockingDisabled()) {
    return { hasConflict: false };
  }

  if (settings && !settings.enforceSingleSession) {
    return { hasConflict: false };
  }

  const timeoutMinutes = settings?.sessionTimeoutMinutes || 60;
  const sessions = getAllActiveSessions(timeoutMinutes);

  // Active session exists with the same NIS
  const conflict = sessions.find(s => {
    const isSameNis = s.nis.trim().toLowerCase() === cleanNis;
    const isDifferentDevice = s.deviceId !== currentDeviceId;
    return isSameNis && isDifferentDevice && s.status === 'in_progress';
  });

  if (conflict) {
    return {
      hasConflict: true,
      activeSession: conflict,
    };
  }

  return { hasConflict: false };
}

/**
 * Register a new active exam session for a student.
 */
export function registerActiveExamSession(
  profile: StudentProfile,
  pkg: ExamPackage,
  deviceId: string
): ActiveExamSession {
  const sessions = getAllActiveSessions();
  const cleanNis = profile.nis.trim();

  // Remove any previous in_progress session on the SAME device or same NIS
  const filtered = sessions.filter(
    s => !(s.nis.trim().toLowerCase() === cleanNis.toLowerCase() && s.deviceId === deviceId)
  );

  const newSession: ActiveExamSession = {
    sessionId: 'ses_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    nis: cleanNis,
    fullName: profile.fullName,
    studentClass: profile.studentClass,
    packageId: pkg.id,
    packageTitle: pkg.title,
    startedAt: Date.now(),
    lastHeartbeat: Date.now(),
    deviceId: deviceId,
    deviceInfo: getDeviceInfoSnippet(),
    status: 'in_progress',
  };

  const updated = [...filtered, newSession];
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_SESSIONS, JSON.stringify(updated));
  } catch (e) {}

  broadcastSessionEvent('SESSION_STARTED', newSession);
  return newSession;
}

/**
 * Update session heartbeat (called periodically during exam)
 */
export function updateSessionHeartbeat(sessionId: string, nis: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSIONS);
    if (!raw) return;
    const sessions: ActiveExamSession[] = JSON.parse(raw);
    let changed = false;

    const updated = sessions.map(s => {
      if (s.sessionId === sessionId || (s.nis.trim().toLowerCase() === nis.trim().toLowerCase() && s.status === 'in_progress')) {
        changed = true;
        return {
          ...s,
          lastHeartbeat: Date.now(),
        };
      }
      return s;
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SESSIONS, JSON.stringify(updated));
    }
  } catch (e) {}
}

/**
 * Terminate/Finish active exam session (called on finish exam or quit)
 */
export function terminateActiveExamSession(nis: string, sessionId?: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSIONS);
    if (!raw) return;
    const sessions: ActiveExamSession[] = JSON.parse(raw);
    const cleanNis = nis.trim().toLowerCase();

    const updated = sessions.filter(s => {
      if (sessionId && s.sessionId === sessionId) return false;
      if (s.nis.trim().toLowerCase() === cleanNis) return false;
      return true;
    });

    localStorage.setItem(STORAGE_KEY_ACTIVE_SESSIONS, JSON.stringify(updated));
    broadcastSessionEvent('SESSION_TERMINATED', { nis, sessionId });
  } catch (e) {}
}

/**
 * Force reset session for a student NIS (by supervisor/teacher)
 */
export function forceResetSessionByNis(nis: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSIONS);
    if (!raw) return true;
    const sessions: ActiveExamSession[] = JSON.parse(raw);
    const cleanNis = nis.trim().toLowerCase();

    const updated = sessions.filter(s => s.nis.trim().toLowerCase() !== cleanNis);
    localStorage.setItem(STORAGE_KEY_ACTIVE_SESSIONS, JSON.stringify(updated));

    broadcastSessionEvent('FORCE_RESET', { nis });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Force reset all active sessions (e.g. at end of school exam day)
 */
export function forceResetAllActiveSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSIONS);
    broadcastSessionEvent('FORCE_RESET', { all: true });
  } catch (e) {}
}

export interface FinishedExamLockRecord {
  key: string;
  packageId: string;
  packageTitle: string;
  nis: string;
  fullName: string;
  studentClass: string;
  score: number;
  totalIrtScore?: number;
  submittedAt: string;
  resultData?: any;
}

/**
 * Scan localStorage for all completed exam locks (cbt_exam_finished_{packageId}_{nis})
 */
export function getAllFinishedExamLocks(): FinishedExamLockRecord[] {
  const records: FinishedExamLockRecord[] = [];
  try {
    const totalKeys = localStorage.length;
    for (let i = 0; i < totalKeys; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cbt_exam_finished_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const keyParts = key.replace('cbt_exam_finished_', '');
            // Key parts might be like "pkg123_1001" or similar
            const lastUnderscore = keyParts.lastIndexOf('_');
            const pkgIdFromKey = lastUnderscore > -1 ? keyParts.substring(0, lastUnderscore) : keyParts;
            const nisFromKey = lastUnderscore > -1 ? keyParts.substring(lastUnderscore + 1) : '';

            records.push({
              key,
              packageId: data.packageId || pkgIdFromKey,
              packageTitle: data.packageTitle || 'Paket Ujian CBT',
              nis: data.studentProfile?.nis || nisFromKey,
              fullName: data.studentProfile?.fullName || 'Peserta CBT',
              studentClass: data.studentProfile?.studentClass || 'Umum',
              score: typeof data.score === 'number' ? data.score : 0,
              totalIrtScore: data.totalIrtScore,
              submittedAt: data.submittedAt || new Date().toISOString(),
              resultData: data,
            });
          } catch (e) {}
        }
      }
    }
  } catch (e) {}

  // Sort by submittedAt descending
  return records.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

/**
 * Unlock a specific completed exam record so the student can retake it
 */
export function unlockFinishedExamRecord(packageId: string, nis: string): boolean {
  try {
    const cleanNis = nis.trim().toLowerCase();
    const targetKey = `cbt_exam_finished_${packageId}_${cleanNis}`;
    localStorage.removeItem(targetKey);

    // Also look for case-insensitive matches
    const totalKeys = localStorage.length;
    for (let i = 0; i < totalKeys; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cbt_exam_finished_')) {
        const keyParts = key.replace('cbt_exam_finished_', '').toLowerCase();
        if (keyParts.includes(cleanNis) && (keyParts.includes(packageId.toLowerCase()) || !packageId)) {
          localStorage.removeItem(key);
        }
      }
    }

    broadcastSessionEvent('FORCE_RESET', { nis: cleanNis, packageId, unlocked: true });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Unlock ALL finished exam records for a specific participant NIS across all packages
 */
export function unlockAllFinishedExamsForNis(nis: string): number {
  let count = 0;
  try {
    const cleanNis = nis.trim().toLowerCase();
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cbt_exam_finished_')) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.endsWith(`_${cleanNis}`) || lowerKey.includes(`_${cleanNis}`)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => {
      localStorage.removeItem(k);
      count++;
    });
    broadcastSessionEvent('FORCE_RESET', { nis: cleanNis, allUnlocked: true });
  } catch (e) {}
  return count;
}

/**
 * Unlock all locked states (active session + completed exam locks) for a participant
 */
export function unlockEverythingForParticipant(nis: string, packageId?: string): boolean {
  try {
    forceResetSessionByNis(nis);
    if (packageId) {
      unlockFinishedExamRecord(packageId, nis);
    } else {
      unlockAllFinishedExamsForNis(nis);
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Unlock all finished exam records across all participants (or specific package)
 */
export function unlockAllFinishedExamRecords(packageId?: string): number {
  let count = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cbt_exam_finished_')) {
        if (!packageId || key.includes(packageId)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => {
      localStorage.removeItem(k);
      count++;
    });
    broadcastSessionEvent('FORCE_RESET', { allFinishedUnlocked: true });
  } catch (e) {}
  return count;
}

/**
 * MASTER UNLOCK ALL: Resets all active exam sessions AND removes all completed exam locks.
 * Completely unlocks all students and packages in a single action.
 */
export function unlockAllEverything(): { activeCount: number; finishedCount: number } {
  let activeCount = 0;
  let finishedCount = 0;

  try {
    const active = getAllActiveSessions();
    activeCount = active.length;
    forceResetAllActiveSessions();
  } catch (e) {}

  try {
    finishedCount = unlockAllFinishedExamRecords();
  } catch (e) {}

  try {
    broadcastSessionEvent('FORCE_RESET', {
      all: true,
      allFinishedUnlocked: true,
      masterReset: true,
    });
  } catch (e) {}

  return { activeCount, finishedCount };
}

