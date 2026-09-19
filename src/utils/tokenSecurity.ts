import { ExamScheduleItem } from '../types';
import { saveSystemSettingToFirebase, loadSystemSettingFromFirebase, loadLiveTokenRequirementFresh } from '../firebase';
import { isGlobalTimeBypassActive, setGlobalTimeBypassActive } from './examScheduleTimer';
import { isGlobalLockingDisabled } from './sessionManager';

export const TOKEN_STORAGE_KEY = 'cbt_is_token_required_v1';
export const TOKEN_EVENT_KEY = 'cbt-token-requirement-changed';

/**
 * Check if the CBT system is currently in Mode Bebas (Free Mode).
 * In Mode Bebas, exam schedules are unlocked and token is NOT mandatory (opsional/bebas).
 *
 * Checks URL parameter first (e.g. ?mode=bebas or ?free=1) for instant cross-browser / Safari support,
 * then checks global time bypass & locking flags.
 */
export const isExamFreeModeActive = (): boolean => {
  try {
    // 1. URL Query Parameter: Prioritas tertinggi untuk menjangkau semua HP/browser (Safari iOS, Samsung, Vivo, dll)
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
    return isGlobalTimeBypassActive() || isGlobalLockingDisabled();
  } catch (e) {
    return false;
  }
};

/**
 * Check if the global exam token validation requirement is active.
 * ATURAN MUTLAK SISTEM:
 * - Pada saat Mode Normal: TRUE (Token WAJIB diisi, terlepas status sebelumnya).
 * - Pada saat Mode Bebas: FALSE (Token BEBAS / tidak wajib diisi, terlepas status sebelumnya).
 */
export const isGlobalTokenRequired = (isFreeModeOverride?: boolean): boolean => {
  const isFree =
    typeof isFreeModeOverride === 'boolean'
      ? isFreeModeOverride
      : isExamFreeModeActive();

  // Terlepas dari status token sebelumnya:
  // Mode Bebas = false (bebas tanpa token)
  // Mode Normal = true (wajib diisi)
  return !isFree;
};

/**
 * Real-time fetch for exam token requirement status with anti-cache headers
 * and direct Firebase Firestore query, strictly bypassing local device / Safari cache.
 * Guarantees mobile Safari and all browsers receive the latest live status from server.
 */
export async function fetchExamTokenStatusFresh(params?: {
  packageId?: string;
  subjectName?: string;
  isFreeModeOverride?: boolean;
}): Promise<{ isTokenRequired: boolean; serverTimestamp: number }> {
  const timestamp = Date.now();

  // 1. Prioritas 1: Override dari parameter fungsi atau URL link
  let isFree: boolean | null = null;
  if (typeof params?.isFreeModeOverride === 'boolean') {
    isFree = params.isFreeModeOverride;
  } else if (typeof window !== 'undefined' && window.location && window.location.search) {
    const searchParams = new URLSearchParams(window.location.search);
    const modeParam = (searchParams.get('mode') || searchParams.get('exam_mode') || '').toLowerCase();
    const freeParam = (searchParams.get('free') || searchParams.get('bebas') || searchParams.get('bypass') || '').toLowerCase();
    if (modeParam === 'bebas' || modeParam === 'free' || freeParam === '1' || freeParam === 'true') {
      isFree = true;
    } else if (modeParam === 'normal' || freeParam === '0' || freeParam === 'false') {
      isFree = false;
    }
  }

  // 2. Prioritas 2: Ambil langsung dari Firebase Firestore (cloud) dengan memotong cache lokal
  if (isFree === null) {
    try {
      const remoteBypass = await loadSystemSettingFromFirebase<{ active: boolean }>('time_bypass', {
        forceServer: true,
        bypassCache: true,
      });
      if (remoteBypass && typeof remoteBypass.active === 'boolean') {
        isFree = remoteBypass.active;
        setGlobalTimeBypassActive(remoteBypass.active);
      }
    } catch (e) {}
  }

  // 3. Fallback: Status lokal di perangkat
  if (isFree === null) {
    isFree = isExamFreeModeActive();
  }

  // Terlepas dari status token sebelumnya:
  // - Mode Normal -> WAJIB (true)
  // - Mode Bebas -> BEBAS (false)
  const liveRequired = !isFree;

  // Sync to local memory and dispatch event
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(liveRequired));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TOKEN_EVENT_KEY, { detail: { isTokenRequired: liveRequired } }));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {}

  return {
    isTokenRequired: liveRequired,
    serverTimestamp: timestamp,
  };
}

/**
 * Set the global exam token requirement status (Active/Inactive),
 * persist to localStorage, dispatch real-time event to all open tabs/views,
 * sync to Firebase Firestore, and broadcast to the server API with no-cache headers.
 */
export const setGlobalTokenRequired = (required: boolean, syncFirebase: boolean = true): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(required));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TOKEN_EVENT_KEY, { detail: { isTokenRequired: required } }));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {}

  if (syncFirebase) {
    saveSystemSettingToFirebase('token_requirement_active', { isTokenRequired: required });
  }

  // Broadcast to server API endpoint with timestamp cache buster and Cache-Control: no-cache
  try {
    fetch(`/api/exam-token/status?t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      body: JSON.stringify({ isTokenRequired: required }),
    }).catch(() => {});
  } catch (e) {}
};

/**
 * Menentukan apakah token ujian wajib diisi:
 * ATURAN MUTLAK SISTEM:
 * - Pada saat MODE NORMAL: Token WAJIB DIISI (true), terlepas status token tersebut sebelumnya.
 * - Pada saat MODE BEBAS: Token BEBAS / TIDAK WAJIB DIISI (false), terlepas status sebelumnya.
 *
 * @param _schedule Parameter kompatibilitas jadwal (diabaikan demi aturan mutlak mode)
 * @param _globalActive Parameter kompatibilitas status global (diabaikan demi aturan mutlak mode)
 * @param isFreeModeOverride Status override Mode Bebas (jika ada)
 */
export const isTokenMandatoryForSchedule = (
  _schedule?: ExamScheduleItem | null,
  _globalActive?: boolean,
  isFreeModeOverride?: boolean
): boolean => {
  const isFreeMode =
    typeof isFreeModeOverride === 'boolean'
      ? isFreeModeOverride
      : isExamFreeModeActive();

  // Terlepas dari status token sebelumnya:
  // - Mode Bebas -> status token BEBAS (false, tidak wajib diisi)
  // - Mode Normal -> status token WAJIB DIISI (true)
  return !isFreeMode;
};

export interface TokenValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates a student's token input against the expected package/schedule token.
 * - Mode Bebas (isMandatory = false): Bebas tanpa token.
 * - Mode Normal (isMandatory = true): Wajib diisi token resmi yang sesuai.
 */
export const validateExamTokenInput = (
  inputToken: string,
  expectedToken?: string,
  isMandatory: boolean = true
): TokenValidationResult => {
  // If token is disabled / not mandatory (Mode Bebas), any input (including empty) is valid
  if (!isMandatory) {
    return { isValid: true };
  }

  const cleanInput = (inputToken || '').trim().toUpperCase();
  const cleanExpected = (expectedToken || '').trim().toUpperCase();

  // If token is mandatory (Mode Normal) but student left it empty
  if (!cleanInput) {
    return {
      isValid: false,
      errorMessage: 'Token Ujian wajib diisi untuk memulai ujian pada Mode Normal! Silakan tanyakan kode token resmi kepada pengawas ujian.',
    };
  }

  // If there's an expected token configured, check for match
  if (cleanExpected) {
    if (cleanInput !== cleanExpected) {
      return {
        isValid: false,
        errorMessage: `Token Ujian "${cleanInput}" tidak sesuai dengan jadwal mata pelajaran ini. Silakan periksa kembali token resmi dari guru/pengawas.`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Real-time token verification with the server API, applying Cache-Control: no-cache
 * and timestamp cache buster (?t=) to prevent stale tokens on mobile Safari & HP.
 */
export async function verifyExamTokenWithServer(
  inputToken: string,
  _expectedToken?: string,
  isMandatory: boolean = true,
  isFreeModeOverride?: boolean,
  packageId?: string,
): Promise<TokenValidationResult> {
  // The browser-side expectedToken is deliberately ignored. The server must be
  // the only authority that knows the real exam token.
  const timestamp = Date.now();
  try {
    const response = await fetch(`/api/exam-token/verify?t=${timestamp}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify({
        inputToken,
        packageId: packageId || '',
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return { isValid: Boolean(data.isValid), errorMessage: data.errorMessage };
    }
    return {
      isValid: false,
      errorMessage: data.errorMessage || 'Verifikasi token ke server gagal. Silakan coba lagi.',
    };
  } catch {
    // Fail closed for mandatory exams. Offline/free preview can still proceed
    // only when the caller explicitly says the token is not mandatory.
    if (!isMandatory || isFreeModeOverride) return { isValid: true };
    return {
      isValid: false,
      errorMessage: 'Server verifikasi token tidak dapat dihubungi. Periksa koneksi internet lalu coba lagi.',
    };
  }
}

/**
 * Generate standard clean, memorable token for subject exam
 */
export const generateSubjectExamToken = (subjectName?: string): string => {
  if (subjectName) {
    const sLower = subjectName.toLowerCase();
    if (sLower.includes('matematika')) return 'MTK2026';
    if (sLower.includes('fisika')) return 'FIS2026';
    if (sLower.includes('kimia')) return 'KIM2026';
    if (sLower.includes('biologi')) return 'BIO2026';
    if (sLower.includes('bahasa indonesia') || sLower.includes('b. indonesia') || sLower.includes('indonesia')) return 'BIN2026';
    if (sLower.includes('bahasa inggris') || sLower.includes('b. inggris') || sLower.includes('inggris')) return 'BIG2026';
    if (sLower.includes('ekonomi')) return 'EKO2026';
    if (sLower.includes('geografi')) return 'GEO2026';
    if (sLower.includes('sosiologi')) return 'SOS2026';
    if (sLower.includes('sejarah')) return 'SEJ2026';
    if (sLower.includes('pendidikan agama') || sLower.includes('agama')) return 'PAI2026';
    if (sLower.includes('ppkn') || sLower.includes('pancasila')) return 'PKN2026';
    if (sLower.includes('seni') || sLower.includes('budaya')) return 'SBD2026';
    if (sLower.includes('penjas') || sLower.includes('pjok') || sLower.includes('olahraga')) return 'PJK2026';
    if (sLower.includes('pkwu') || sLower.includes('prakarya')) return 'PKW2026';
    if (sLower.includes('informatika') || sLower.includes('tik')) return 'INF2026';

    const clean = subjectName.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (clean.length >= 3) {
      return `${clean.substring(0, 3)}2026`;
    }
  }
  return 'CBT2026';
};

