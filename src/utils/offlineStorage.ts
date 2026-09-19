import { useState, useEffect } from 'react';
import { ExamPackage, ExamResult, Question, StudentProfile, UserAnswerRecord } from '../types';
import { EXAM_PACKAGES } from '../data/mockPackages';
import { INITIAL_SMA_EXAM_PACKAGES } from '../data/mockSmaData';

const OFFLINE_STORAGE_KEYS = {
  PACKAGES_CACHE: 'cbt_sman19_offline_packages_cache_v2',
  QUESTIONS_CACHE: 'cbt_sman19_offline_questions_cache_v2',
  RESULTS_QUEUE: 'cbt_sman19_offline_results_queue_v2',
  ACTIVE_EXAM_SESSION: 'cbt_sman19_active_exam_session_v2',
  OFFLINE_MODE_FLAG: 'cbt_sman19_force_offline_mode',
  LAST_SYNC_TIME: 'cbt_sman19_offline_last_sync_timestamp',
};

const IDB_NAME = 'ujianku-cbt-v3';
const IDB_STORE = 'examSessions';
const IDB_KEY = 'active';
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openExamDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

async function idbPutSession(session: ActiveExamSessionData): Promise<boolean> {
  const db = await openExamDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ ...session, lastSavedAt: Date.now() }, IDB_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function idbGetSession(): Promise<ActiveExamSessionData | null> {
  const db = await openExamDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve((req.result || null) as ActiveExamSessionData | null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function idbClearSession(): Promise<void> {
  const db = await openExamDb();
  if (!db) return;
  try {
    await new Promise<void>(resolve => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {}
}

export interface OfflineStorageStats {
  packagesCount: number;
  questionsCount: number;
  pendingResultsCount: number;
  lastSyncFormatted: string;
  isOfflineReady: boolean;
  estimatedSizeKb: number;
}

export interface ActiveExamSessionData {
  packageId: string;
  packageName: string;
  studentProfile?: StudentProfile;
  currentIndex: number;
  answers: Record<string, UserAnswerRecord>;
  timeLeftSeconds: number;
  startTime: number;
  lastSavedAt: number;
  eliminatedOptions?: Record<string, string[]>;
  scratchpadText?: string;
  activeSessionIndex?: number;
  lockedSessionIndices?: number[];
}

/**
 * Hook to track live online/offline network status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Check if the browser is currently online
 */
export function isNetworkOnline(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

/**
 * Cache all exam packages and their questions into offline storage
 */
export function cacheAllExamPackagesLocally(customPackages?: ExamPackage[]): {
  success: boolean;
  packagesCount: number;
  questionsCount: number;
} {
  try {
    const defaultSma = INITIAL_SMA_EXAM_PACKAGES;
    const all = customPackages && customPackages.length > 0
      ? customPackages
      : [...EXAM_PACKAGES, ...defaultSma];

    // Deduplicate by ID
    const packageMap = new Map<string, ExamPackage>();
    all.forEach(p => {
      if (p && p.id) packageMap.set(p.id, p);
    });

    const uniquePackages = Array.from(packageMap.values());
    
    // Store in localStorage
    localStorage.setItem(OFFLINE_STORAGE_KEYS.PACKAGES_CACHE, JSON.stringify(uniquePackages));
    localStorage.setItem(OFFLINE_STORAGE_KEYS.LAST_SYNC_TIME, Date.now().toString());

    let totalQuestions = 0;
    uniquePackages.forEach(p => {
      totalQuestions += p.questions?.length || 0;
    });

    return {
      success: true,
      packagesCount: uniquePackages.length,
      questionsCount: totalQuestions,
    };
  } catch (error) {
    console.error('Error caching exam packages for offline practice:', error);
    return { success: false, packagesCount: 0, questionsCount: 0 };
  }
}

/**
 * Retrieve cached packages from offline storage
 */
export function getCachedExamPackages(): ExamPackage[] {
  try {
    const saved = localStorage.getItem(OFFLINE_STORAGE_KEYS.PACKAGES_CACHE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached exam packages:', e);
  }

  // Fallback to built-in packages
  return [...EXAM_PACKAGES, ...INITIAL_SMA_EXAM_PACKAGES];
}

/**
 * Save active exam session state. IndexedDB is the primary store because it is
 * asynchronous and avoids blocking the CBT UI thread. localStorage is retained
 * only as a small compatibility fallback.
 */
export async function saveActiveExamSession(session: ActiveExamSessionData): Promise<void> {
  const ok = await idbPutSession(session);
  if (ok) return;
  try {
    localStorage.setItem(OFFLINE_STORAGE_KEYS.ACTIVE_EXAM_SESSION, JSON.stringify({ ...session, lastSavedAt: Date.now() }));
  } catch (e) {
    console.warn('Failed to auto-save exam session:', e);
  }
}

/** Load the most recent active exam session. */
export async function loadActiveExamSession(packageId?: string): Promise<ActiveExamSessionData | null> {
  try {
    let parsed = await idbGetSession();
    if (!parsed) {
      const saved = localStorage.getItem(OFFLINE_STORAGE_KEYS.ACTIVE_EXAM_SESSION);
      parsed = saved ? JSON.parse(saved) : null;
    }
    if (!parsed) return null;
    if (packageId && parsed.packageId !== packageId) return null;
    if (!parsed.lastSavedAt || Date.now() - parsed.lastSavedAt > 24 * 60 * 60 * 1000) {
      await clearActiveExamSession();
      return null;
    }
    return parsed;
  } catch { return null; }
}

/** Clear active exam session from both stores. */
export async function clearActiveExamSession(): Promise<void> {
  await idbClearSession();
  try { localStorage.removeItem(OFFLINE_STORAGE_KEYS.ACTIVE_EXAM_SESSION); } catch {}
}

/**
 * Queue an exam result completed while offline for subsequent cloud sync
 */
export function queueOfflineExamResult(result: ExamResult): void {
  try {
    const existing = getOfflineExamResultsQueue();
    const updated = [
      {
        ...result,
        isOfflineCompleted: true,
        queuedAt: Date.now(),
      },
      ...existing.filter(r => r.id !== result.id),
    ];
    localStorage.setItem(OFFLINE_STORAGE_KEYS.RESULTS_QUEUE, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to queue offline exam result:', e);
  }
}

/**
 * Get all queued offline exam results
 */
export function getOfflineExamResultsQueue(): ExamResult[] {
  try {
    const saved = localStorage.getItem(OFFLINE_STORAGE_KEYS.RESULTS_QUEUE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

/**
 * Remove a synced result from the offline queue
 */
export function removeOfflineExamResult(resultId: string): void {
  try {
    const existing = getOfflineExamResultsQueue();
    const filtered = existing.filter(r => r.id !== resultId);
    localStorage.setItem(OFFLINE_STORAGE_KEYS.RESULTS_QUEUE, JSON.stringify(filtered));
  } catch (e) {}
}

/**
 * Clear all queued offline exam results
 */
export function clearOfflineExamResultsQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_STORAGE_KEYS.RESULTS_QUEUE);
  } catch (e) {}
}

/**
 * Get offline storage statistics
 */
export function getOfflineStorageStats(): OfflineStorageStats {
  const packages = getCachedExamPackages();
  const queue = getOfflineExamResultsQueue();
  let totalQuestions = 0;
  packages.forEach(p => {
    totalQuestions += p.questions?.length || 0;
  });

  const lastSync = localStorage.getItem(OFFLINE_STORAGE_KEYS.LAST_SYNC_TIME);
  const lastSyncFormatted = lastSync
    ? new Date(parseInt(lastSync, 10)).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Belum Pernah Disinkron';

  let estimatedSizeKb = 0;
  try {
    const pkgStr = localStorage.getItem(OFFLINE_STORAGE_KEYS.PACKAGES_CACHE) || '';
    const resStr = localStorage.getItem(OFFLINE_STORAGE_KEYS.RESULTS_QUEUE) || '';
    estimatedSizeKb = Math.round((pkgStr.length + resStr.length) / 1024);
  } catch (e) {}

  return {
    packagesCount: packages.length,
    questionsCount: totalQuestions,
    pendingResultsCount: queue.length,
    lastSyncFormatted,
    isOfflineReady: packages.length > 0 && totalQuestions > 0,
    estimatedSizeKb: Math.max(12, estimatedSizeKb),
  };
}

/**
 * Export offline practice bundle (.json) for sharing / offline installation
 */
export function exportOfflinePracticeBundle(packages?: ExamPackage[]): void {
  const pkgs = packages || getCachedExamPackages();
  const bundle = {
    appName: 'UJIANKU',
    version: '2.5.0-offline',
    exportedAt: new Date().toISOString(),
    packagesCount: pkgs.length,
    packages: pkgs,
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Paket_Latihan_CBT_Offline_SMAN19_${new Date().toISOString().split('T')[0]}.cbtpkg.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse an imported offline practice bundle (.json)
 */
export function parseOfflinePracticeBundle(jsonString: string): {
  success: boolean;
  packages?: ExamPackage[];
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);
    const packages: ExamPackage[] = Array.isArray(data)
      ? data
      : Array.isArray(data.packages)
      ? data.packages
      : [];

    if (packages.length === 0) {
      return { success: false, error: 'File tidak berisi daftar paket soal yang valid.' };
    }

    return { success: true, packages };
  } catch (e: any) {
    return { success: false, error: 'Format file JSON tidak valid: ' + (e?.message || 'Error parsing') };
  }
}
