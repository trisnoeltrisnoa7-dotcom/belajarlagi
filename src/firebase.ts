import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import {
  initializeFirestore,
  setLogLevel,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromServer,
  deleteDoc,
  collection,
  onSnapshot,
  writeBatch,
  query,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  StudentRosterEntry,
  ExamResult,
  NisSecuritySettings,
  SchoolInfo,
  MAX_ROSTER_STUDENTS,
} from './types';

// 1. Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Suppress transient backend timeout notifications in console
setLogLevel('error');

// 2. Initialize Firestore with designated database ID and forced long polling
// Using experimentalForceLongPolling avoids the 10-second WebSockets timeout hang in sandbox/proxy/iframe environments
const targetDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  targetDbId && targetDbId.trim() && targetDbId !== '(default)' ? targetDbId : undefined
);

// 3. Initialize Auth
export const auth = getAuth(app);

// Ensure Firestore has an authenticated identity on student/admin clients.
// This satisfies authenticated-only security rules while keeping the existing passwordless
// student flow. Sensitive administrative authorization should still be moved to
// server-side roles/custom claims before production use.
let authReadyPromise: Promise<unknown> | null = null;
export function ensureFirebaseAuth(): Promise<unknown> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authReadyPromise) {
    authReadyPromise = signInAnonymously(auth)
      .then(cred => cred.user)
      .catch(err => {
        authReadyPromise = null;
        // In offline environments or if anonymous auth is pending, log gracefully
        console.info('Firebase auth note (offline or pending):', err?.message || err);
        return null;
      });
  }
  return authReadyPromise;
}

void ensureFirebaseAuth().catch(() => {});

// 4. Initialize Analytics if supported in current client environment
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && (firebaseConfig as { measurementId?: string }).measurementId) {
  isSupported()
    .then(supported => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

// 4. Error Handling conforming to Firebase Skill guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  const isOfflineOrUnavailable =
    errInfo.error.includes('unavailable') ||
    errInfo.error.includes('the client is offline') ||
    errInfo.error.includes('Could not reach Cloud Firestore backend');
  if (isOfflineOrUnavailable) {
    console.info('Firestore offline/cached mode active:', errInfo.operationType, errInfo.path || '');
  } else {
    console.warn('Firestore Operation Notification: ', JSON.stringify(errInfo));
  }
  return errInfo;
}

// 5. Safe connection test helper
export async function testConnection(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'test', 'connection'));
    return snap.exists();
  } catch (error) {
    return false;
  }
}

// ==========================================
// FIRESTORE SYNC HELPERS FOR CBT PLATFORM
// ==========================================

export interface ActiveSessionData {
  nis: string;
  studentName: string;
  className: string;
  packageId?: string;
  sessionId: string;
  deviceInfo: string;
  loginTimestamp: number;
  lastHeartbeat: number;
}

/**
 * Save / Update Single Student in Firebase
 */
export async function saveStudentToFirebase(student: StudentRosterEntry): Promise<void> {
  const path = `students/${student.id}`;
  try {
    await setDoc(doc(db, 'students', student.id), {
      id: student.id,
      nis: student.nis,
      fullName: student.fullName,
      studentClass: student.studentClass,
      schoolName: student.schoolName || '',
      isActive: student.isActive,
      notes: student.notes || '',
      createdAt: student.createdAt || new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete Single Student from Firebase
 */
export async function deleteStudentFromFirebase(studentId: string): Promise<void> {
  const path = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Delete Multiple Students from Firebase
 */
export async function deleteMultipleStudentsFromFirebase(studentIds: string[]): Promise<void> {
  if (!studentIds.length) return;
  try {
    const batch = writeBatch(db);
    studentIds.forEach(id => {
      batch.delete(doc(db, 'students', id));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'students');
  }
}

/**
 * Batch Sync Roster to Firebase (Clamped to MAX_ROSTER_STUDENTS = 400)
 */
export async function batchSyncRosterToFirebase(students: StudentRosterEntry[]): Promise<void> {
  const clamped = students.slice(0, MAX_ROSTER_STUDENTS);
  try {
    const batch = writeBatch(db);
    clamped.forEach(student => {
      const ref = doc(db, 'students', student.id);
      batch.set(ref, {
        id: student.id,
        nis: student.nis,
        fullName: student.fullName,
        studentClass: student.studentClass,
        schoolName: student.schoolName || '',
        isActive: student.isActive,
        notes: student.notes || '',
        createdAt: student.createdAt || new Date().toISOString(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'students');
  }
}

/**
 * Realtime Listener for Student Roster
 */
export function subscribeToStudentRoster(onUpdate: (students: StudentRosterEntry[]) => void): () => void {
  let unsub: (() => void) | null = null;
  let isCancelled = false;

  const startListening = () => {
    if (isCancelled) return;
    try {
      const studentsQuery = query(collection(db, 'students'), limit(MAX_ROSTER_STUDENTS));
      unsub = onSnapshot(
        studentsQuery,
        snapshot => {
          if (!snapshot.empty) {
            const students: StudentRosterEntry[] = [];
            snapshot.forEach(docSnap => {
              const data = docSnap.data() as StudentRosterEntry;
              if (data && data.nis && data.fullName) {
                students.push(data);
              }
            });
            if (students.length > 0) {
              onUpdate(students.slice(0, MAX_ROSTER_STUDENTS));
            }
          }
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, 'students');
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'students');
    }
  };

  if (auth.currentUser) {
    startListening();
  } else {
    ensureFirebaseAuth().finally(() => {
      if (!isCancelled && !unsub) {
        startListening();
      }
    });
  }

  return () => {
    isCancelled = true;
    if (unsub) unsub();
  };
}

/**
 * Save Exam Submission Result to Firebase
 */
export async function saveExamSubmissionToFirebase(result: ExamResult): Promise<void> {
  const safeId = result.id.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const path = `examSubmissions/${safeId}`;
  try {
    await setDoc(doc(db, 'examSubmissions', safeId), {
      id: result.id,
      packageId: result.packageId,
      packageTitle: result.packageTitle,
      studentNis: result.studentProfile?.nis || 'Anon',
      studentName: result.studentProfile?.fullName || 'Siswa',
      studentClass: result.studentProfile?.studentClass || 'Kelas',
      totalIrtScore: result.totalIrtScore,
      overallAccuracy: result.overallAccuracy,
      totalCorrect: result.totalCorrect,
      totalIncorrect: result.totalIncorrect,
      totalBlank: result.totalBlank,
      totalQuestions: result.totalQuestions,
      totalDurationSeconds: result.totalDurationSeconds,
      submittedAt: new Date(result.submittedAt || Date.now()).toISOString(),
      ownerUid: auth.currentUser?.uid || null,
      payloadSummary: JSON.stringify({
        subtestSummaries: result.subtestSummaries || {},
        targetPtnEvaluations: result.targetPtnEvaluations || [],
        proctoringSummary: result.proctoringSummary || null,
      }),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Clear all Exam Submissions from Firebase Firestore
 */
export async function clearAllExamSubmissionsFromFirebase(): Promise<number> {
  const path = 'examSubmissions';
  try {
    const colRef = collection(db, 'examSubmissions');
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    let count = 0;
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
      count++;
    });
    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return 0;
  }
}

/**
 * Delete Exam Submissions by Package ID from Firebase Firestore
 */
export async function deleteExamSubmissionsByPackageFromFirebase(packageId: string): Promise<number> {
  const path = 'examSubmissions';
  try {
    const colRef = collection(db, 'examSubmissions');
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    let count = 0;
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.packageId === packageId) {
        batch.delete(d.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return 0;
  }
}

/**
 * Register Active Student Session in Firebase (Anti Dual-Login)
 */
export async function registerActiveSession(session: ActiveSessionData): Promise<void> {
  const safeNis = session.nis.trim().toLowerCase().replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const path = `activeSessions/${safeNis}`;
  try {
    await setDoc(doc(db, 'activeSessions', safeNis), { ...session, ownerUid: auth.currentUser?.uid || null });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Clear Student Active Session in Firebase (Logout or Finished)
 */
export async function clearActiveSession(nis: string): Promise<void> {
  const safeNis = nis.trim().toLowerCase().replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const path = `activeSessions/${safeNis}`;
  try {
    await deleteDoc(doc(db, 'activeSessions', safeNis));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to Active Sessions for Real-Time Supervisor Monitoring
 */
export function subscribeToActiveSessions(onUpdate: (sessions: ActiveSessionData[]) => void): () => void {
  let unsub: (() => void) | null = null;
  let isCancelled = false;

  const startListening = () => {
    if (isCancelled) return;
    try {
      unsub = onSnapshot(
        collection(db, 'activeSessions'),
        snapshot => {
          const list: ActiveSessionData[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as ActiveSessionData;
            if (data && data.nis) {
              list.push(data);
            }
          });
          onUpdate(list);
        },
        error => {
          handleFirestoreError(error, OperationType.LIST, 'activeSessions');
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'activeSessions');
    }
  };

  if (auth.currentUser) {
    startListening();
  } else {
    ensureFirebaseAuth().finally(() => {
      if (!isCancelled && !unsub) {
        startListening();
      }
    });
  }

  return () => {
    isCancelled = true;
    if (unsub) unsub();
  };
}

export type SystemSettingKey =
  | 'nis_security'
  | 'school_profile'
  | 'display_settings'
  | 'all_links_disabled'
  | 'global_locking'
  | 'time_bypass'
  | 'exam_schedules'
  | 'sma_packages'
  | 'questions_bank'
  | 'hide_admin_nav_student_mode'
  | 'token_requirement_active'
  | 'logo_tap_count'
  | 'default_subject_and_class';

/**
 * Save System Settings to Firebase (School Kop Surat, NIS Security Settings, Exam Schedules, etc.)
 */
export async function saveSystemSettingToFirebase(
  settingId: SystemSettingKey,
  payload: unknown
): Promise<void> {
  const path = `systemSettings/${settingId}`;
  try {
    await setDoc(doc(db, 'systemSettings', settingId), {
      id: settingId,
      payload: JSON.stringify(payload),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Load System Setting from Firebase
 * Supports forceServer to bypass device/browser cache (essential for real-time exam tokens on iOS Safari & mobile)
 */
export async function loadSystemSettingFromFirebase<T>(
  settingId: string,
  options?: { forceServer?: boolean; bypassCache?: boolean }
): Promise<T | null> {
  const path = `systemSettings/${settingId}`;
  try {
    const docRef = doc(db, 'systemSettings', settingId);
    let snap;
    // For sensitive real-time items or explicit forceServer flag, query directly from Firestore server
    if (options?.forceServer || options?.bypassCache || settingId === 'token_requirement_active') {
      try {
        snap = await getDocFromServer(docRef);
      } catch (serverErr) {
        // Fall back to getDoc if offline or network connection interrupted
        snap = await getDoc(docRef);
      }
    } else {
      snap = await getDoc(docRef);
    }

    if (snap && snap.exists()) {
      const data = snap.data();
      if (data && data.payload) {
        return JSON.parse(data.payload) as T;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
  return null;
}

/**
 * Specifically loads fresh token requirement setting directly from server,
 * strictly bypassing local browser / iOS Safari / mobile cache.
 */
export async function loadLiveTokenRequirementFresh(): Promise<boolean> {
  try {
    const setting = await loadSystemSettingFromFirebase<{ isTokenRequired: boolean }>(
      'token_requirement_active',
      { forceServer: true, bypassCache: true }
    );
    if (setting && typeof setting.isTokenRequired === 'boolean') {
      return setting.isTokenRequired;
    }
  } catch (e) {}
  return false; // Default: Token is optional (bebas tanpa token)
}

/**
 * Subscribe to a system setting in real-time
 */
export function subscribeToSystemSetting<T>(settingId: string, onUpdate: (data: T) => void): () => void {
  let unsub: (() => void) | null = null;
  let isCancelled = false;

  const startListening = () => {
    if (isCancelled) return;
    try {
      unsub = onSnapshot(
        doc(db, 'systemSettings', settingId),
        snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && data.payload) {
              try {
                const parsed = JSON.parse(data.payload) as T;
                onUpdate(parsed);
              } catch (e) {}
            }
          }
        },
        error => {
          handleFirestoreError(error, OperationType.GET, `systemSettings/${settingId}`);
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `systemSettings/${settingId}`);
    }
  };

  if (auth.currentUser) {
    startListening();
  } else {
    ensureFirebaseAuth().finally(() => {
      if (!isCancelled && !unsub) {
        startListening();
      }
    });
  }

  return () => {
    isCancelled = true;
    if (unsub) unsub();
  };
}
