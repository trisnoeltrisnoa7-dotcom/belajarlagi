import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ExamResult } from '../types';

// Initialize Firebase App singleton safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export const getFirebaseProjectId = (): string => {
  return (firebaseConfig as { projectId?: string }).projectId || 'ujiankusma19bandung';
};

export const getFirebaseConsoleAuthorizedDomainsUrl = (): string => {
  const projectId = getFirebaseProjectId();
  return `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
};

export const getGoogleDriveApiEnableUrl = (projectId = getFirebaseProjectId()): string => {
  return `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectId}`;
};

export const getGoogleSheetsApiEnableUrl = (projectId = getFirebaseProjectId()): string => {
  return `https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=${projectId}`;
};

export const extractGoogleApiErrorMessage = (errText: string, defaultPrefix = 'Gagal mengakses Google Drive'): string => {
  try {
    const parsed = JSON.parse(errText);
    const msg = parsed?.error?.message;
    if (msg) {
      if (
        msg.includes('has not been used in project') ||
        msg.includes('is disabled') ||
        msg.includes('accessNotConfigured') ||
        parsed?.error?.status === 'PERMISSION_DENIED'
      ) {
        return `API_DISABLED: ${msg}`;
      }
      return `${defaultPrefix}: ${msg}`;
    }
  } catch {
    // If not json but contains known disabling substring
    if (errText.includes('has not been used in project') || errText.includes('is disabled')) {
      return `API_DISABLED: ${errText}`;
    }
  }
  return `${defaultPrefix}: ${errText}`;
};

const provider = new GoogleAuthProvider();
// Request Google Drive & Google Sheets scopes as authorized
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');

// Token Storage Keys
const TOKEN_STORAGE_KEY = 'cbt_gdrive_access_token';
const TOKEN_EXPIRY_KEY = 'cbt_gdrive_token_expiry';

// In-memory access token cache with persistent storage fallback
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const setCachedAccessToken = (token: string, expiresInSeconds: number = 3500): void => {
  cachedAccessToken = token;
  try {
    const expiry = Date.now() + expiresInSeconds * 1000;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    }
  } catch (e) {
    // Ignore quota or security storage errors
  }
};

export const clearCachedAccessToken = (): void => {
  cachedAccessToken = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  } catch (e) {}
};

export const getAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved =
      (typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null) ||
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_STORAGE_KEY) : null);
    const expiry =
      (typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_EXPIRY_KEY) : null) ||
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_EXPIRY_KEY) : null);

    if (saved && expiry) {
      const expTime = parseInt(expiry, 10);
      if (!isNaN(expTime) && Date.now() < expTime) {
        cachedAccessToken = saved;
        return cachedAccessToken;
      } else {
        clearCachedAccessToken();
      }
    }
  } catch (e) {}
  return null;
};

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  owners?: { displayName?: string; emailAddress?: string }[];
  studentName?: string;
  studentClass?: string;
  nis?: string;
  score?: number;
  packageTitle?: string;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink: string;
}

// Initialize Auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        // User logged in to Firebase but Workspace token is absent or expired
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearCachedAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh akses token Google dari otentikasi.');
    }
    setCachedAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    // Gracefully handle user cancellation (closing popup) without throwing or error spam
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      console.log('Login dengan Google dibatalkan oleh pengguna (popup ditutup).');
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('Jendela popup login Google diblokir oleh browser. Harap izinkan popup untuk melanjutkan.');
    }
    if (
      error?.code === 'auth/unauthorized-domain' ||
      error?.message?.includes('auth/unauthorized-domain')
    ) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain hosting Anda';
      const customErr = new Error(
        `Domain hosting "${currentHost}" belum diotorisasi di Firebase Authentication (auth/unauthorized-domain). Silakan tambahkan "${currentHost}" atau "vercel.app" pada menu Firebase Console > Authentication > Settings > Authorized domains.`
      );
      (customErr as any).code = 'auth/unauthorized-domain';
      (customErr as any).hostname = currentHost;
      (customErr as any).projectId = getFirebaseProjectId();
      (customErr as any).settingsUrl = getFirebaseConsoleAuthorizedDomainsUrl();
      throw customErr;
    }
    console.warn('Google Sign In:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const googleLogout = async (): Promise<void> => {
  await signOut(auth);
  clearCachedAccessToken();
};

export const ensureGoogleAccessToken = async (): Promise<{ user: User; accessToken: string } | null> => {
  const currentToken = getAccessToken();
  if (currentToken && auth.currentUser) {
    return { user: auth.currentUser, accessToken: currentToken };
  }
  return await googleSignIn();
};

/**
 * Fallback helper to download Exam Results as formatted CSV locally
 * Useful when offline or when Firebase auth domain is not yet whitelisted on Vercel
 */
export const downloadExamResultsCsv = (examHistory: ExamResult[], schoolName = 'SMAN 19 Bandung'): void => {
  const headers = [
    'No',
    'NIS',
    'Nama Siswa',
    'Kelas',
    'Mata Pelajaran',
    'Waktu Selesai',
    'Durasi (Menit)',
    'Benar',
    'Salah',
    'Kosong',
    'Total Soal',
    'Nilai Akhir (0-100)',
    'Skor IRT UTBK',
    'Akurasi',
    'Kelulusan',
    'Integritas Pengawas',
  ];

  const rows = examHistory.map((r, idx) => [
    idx + 1,
    `"${r.studentProfile?.nis || '-'}"`,
    `"${(r.studentProfile?.fullName || 'Siswa CBT').replace(/"/g, '""')}"`,
    `"${r.studentProfile?.studentClass || '12 MIPA'}"`,
    `"${(r.packageTitle || 'Paket Ujian').replace(/"/g, '""')}"`,
    `"${new Date(r.submittedAt).toLocaleString('id-ID')}"`,
    Math.round(r.totalDurationSeconds / 60),
    r.totalCorrect,
    r.totalIncorrect,
    r.totalBlank,
    r.totalQuestions,
    Math.round((r.totalCorrect / Math.max(1, r.totalQuestions)) * 100),
    r.totalIrtScore,
    `"${Math.round(r.overallAccuracy)}%"`,
    Math.round((r.totalCorrect / Math.max(1, r.totalQuestions)) * 100) >= 75 ? 'TUNTAS' : 'REMEDIAL',
    `"${r.proctoringSummary?.integrityStatus || 'Tertib'}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Nilai_CBT_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Find or create root folder for CBT Edu student answers
 */
export const getOrCreateRootCbtFolder = async (): Promise<DriveFolderInfo> => {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Drive membutuhkan login dengan Google.');

  const folderName = 'UJIANKU - Rekap Jawaban & Nilai Siswa SMAN 19 Bandung';

  // 1. Search if folder already exists
  const query = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(extractGoogleApiErrorMessage(errText, 'Gagal mencari folder Google Drive'));
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    return {
      id: existing.id,
      name: existing.name,
      webViewLink: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
    };
  }

  // 2. Create new root folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Folder penyimpanan otomatis seluruh rekapan jawaban dan nilai akhir simulasi ujian siswa CBT Edu (UTBK SMA).',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(extractGoogleApiErrorMessage(errText, 'Gagal membuat folder Google Drive'));
  }

  const newFolder = await createRes.json();
  return {
    id: newFolder.id,
    name: newFolder.name || folderName,
    webViewLink: newFolder.webViewLink || `https://drive.google.com/drive/folders/${newFolder.id}`,
  };
};

/**
 * Get or create subfolder inside root folder for specific exam package
 */
export const getOrCreateExamSubfolder = async (
  parentFolderId: string,
  subfolderName: string
): Promise<DriveFolderInfo> => {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Drive membutuhkan login.');

  const safeName = subfolderName.replace(/'/g, "\\'");
  const query = encodeURIComponent(
    `name = '${safeName}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const existing = searchData.files[0];
      return {
        id: existing.id,
        name: existing.name,
        webViewLink: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
      };
    }
  }

  // Create subfolder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: subfolderName,
      parents: [parentFolderId],
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(extractGoogleApiErrorMessage(errText, 'Gagal membuat subfolder ujian'));
  }

  const newSub = await createRes.json();
  return {
    id: newSub.id,
    name: newSub.name || subfolderName,
    webViewLink: newSub.webViewLink || `https://drive.google.com/drive/folders/${newSub.id}`,
  };
};

/**
 * Upload student exam answers and final score report to Google Drive
 */
export const uploadExamResultToDrive = async (
  result: ExamResult,
  targetFolderId?: string
): Promise<{ fileId: string; webViewLink: string; fileName: string; folderLink: string }> => {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Drive belum aktif.');

  const rootFolder = await getOrCreateRootCbtFolder();
  const folderId = targetFolderId || rootFolder.id;

  const studentName = result.studentProfile?.fullName || 'Siswa_CBT';
  const studentClass = result.studentProfile?.studentClass || 'Umum';
  const studentNis = result.studentProfile?.nis || 'NIS-Auto';
  const timestamp = new Date(result.submittedAt).toISOString().slice(0, 10);
  
  // Calculate scaled 0-100 score
  const score100 = Math.round((result.totalCorrect / Math.max(1, result.totalQuestions)) * 100);

  // File Name
  const cleanStudentName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanPackageTitle = result.packageTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `[NILAI_${result.totalIrtScore}]_${cleanStudentName}_${studentClass}_${cleanPackageTitle}.json`;

  // Structured payload for detailed examination report
  const filePayload = {
    app: 'UJIANKU - CBT Resmi SMAN 19 Bandung',
    exportVersion: '2.0',
    exportDate: new Date().toISOString(),
    student: {
      fullName: studentName,
      class: studentClass,
      nis: studentNis,
      schoolName: result.studentProfile?.schoolName || 'SMA',
    },
    exam: {
      resultId: result.id,
      packageId: result.packageId,
      packageTitle: result.packageTitle,
      startedAt: result.startedAt,
      submittedAt: result.submittedAt,
      durationMinutesSpent: Math.round(result.totalDurationSeconds / 60),
    },
    scoring: {
      finalIrtScore: result.totalIrtScore,
      scoreScale100: score100,
      overallAccuracyPercent: Math.round(result.overallAccuracy),
      totalQuestions: result.totalQuestions,
      totalCorrect: result.totalCorrect,
      totalIncorrect: result.totalIncorrect,
      totalBlank: result.totalBlank,
    },
    subtests: Object.values(result.subtestSummaries || {}).map((s) => ({
      subtestName: s.subtestName,
      category: s.category,
      correct: s.correct,
      incorrect: s.incorrect,
      blank: s.blank,
      irtScore: s.irtScore,
      accuracy: Math.round(s.accuracyPercentage),
    })),
    proctoringSummary: result.proctoringSummary,
    detailedAnswers: result.answers,
    aiDiagnostic: result.aiDiagnostic,
  };

  const fileContent = JSON.stringify(filePayload, null, 2);

  // Use multipart upload to Google Drive v3
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
    description: `Lembar Jawaban & Rekap Nilai Siswa: ${studentName} (${studentClass}) - Paket: ${result.packageTitle} - Skor IRT: ${result.totalIrtScore}`,
    properties: {
      studentName,
      studentClass,
      nis: studentNis,
      packageTitle: result.packageTitle,
      irtScore: String(result.totalIrtScore),
      score100: String(score100),
      submittedAt: result.submittedAt,
    },
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Gagal mengunggah lembar jawaban ke Google Drive: ${err}`);
  }

  const uploadedFile = await uploadRes.json();

  // Also create human-readable Summary text file in parallel for easy reading
  try {
    const textReportName = `[LAPORAN]_${cleanStudentName}_${cleanPackageTitle}.txt`;
    const textReportBody = `=====================================================
LAPORAN REKAPITULASI HASIL UJIAN SISWA - CBT EDU
=====================================================
Nama Siswa      : ${studentName}
Kelas / Rumpun  : ${studentClass}
NIS / NISN      : ${studentNis}
Paket Ujian     : ${result.packageTitle}
Waktu Ujian     : ${new Date(result.submittedAt).toLocaleString('id-ID')}
Durasi Pengerjaan: ${Math.round(result.totalDurationSeconds / 60)} Menit

-----------------------------------------------------
NILAI AKHIR & REKAP SKOR:
-----------------------------------------------------
★ NILAI SKOR IRT    : ${result.totalIrtScore}
★ NILAI SKALA 100   : ${score100} / 100
★ AKURASI KESELURUHAN: ${Math.round(result.overallAccuracy)}%
★ JAWABAN BENAR     : ${result.totalCorrect} Soal
★ JAWABAN SALAH     : ${result.totalIncorrect} Soal
★ JAWABAN KOSONG    : ${result.totalBlank} Soal
★ TOTAL BUTIR SOAL  : ${result.totalQuestions} Soal

-----------------------------------------------------
RINCIAN PER MATA PELAJARAN / SUBTES:
-----------------------------------------------------
${Object.values(result.subtestSummaries || {})
  .map(
    (s, idx) =>
      `${idx + 1}. ${s.subtestName}
   - Skor IRT: ${s.irtScore} | Benar: ${s.correct}/${s.totalQuestions} (${Math.round(s.accuracyPercentage)}%)`
  )
  .join('\n\n')}

${
  result.aiDiagnostic
    ? `-----------------------------------------------------
EVALUASI DIAGNOSTIK AI:
-----------------------------------------------------
${result.aiDiagnostic.overallSummary}
`
    : ''
}
=====================================================
Dokumen ini dibuat otomatis oleh Sistem UJIANKU SMAN 19 Bandung.
=====================================================`;

    const textMetadata = {
      name: textReportName,
      parents: [folderId],
      mimeType: 'text/plain',
    };

    const textMultipart =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(textMetadata) +
      delimiter +
      'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
      textReportBody +
      closeDelimiter;

    await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: textMultipart,
      }
    );
  } catch (e) {
    console.warn('Text report generation warning:', e);
  }

  return {
    fileId: uploadedFile.id,
    webViewLink: uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`,
    fileName,
    folderLink: rootFolder.webViewLink,
  };
};

/**
 * Generate Master Spreadsheet (CSV) of all student submissions in Google Drive folder
 */
export const updateMasterCsvInDrive = async (
  folderId: string,
  results: ExamResult[]
): Promise<{ fileId: string; webViewLink: string }> => {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Drive belum login.');

  const csvRows = [
    [
      'No',
      'Waktu Submit',
      'Nama Siswa',
      'Kelas',
      'NIS/NISN',
      'Paket Ujian',
      'Nilai Skor IRT',
      'Nilai Skala 100',
      'Akurasi (%)',
      'Benar',
      'Salah',
      'Kosong',
      'Total Soal',
      'Durasi (Menit)',
    ].join(','),
  ];

  results.forEach((r, idx) => {
    const studentName = (r.studentProfile?.fullName || 'Siswa CBT').replace(/,/g, ' ');
    const studentClass = (r.studentProfile?.studentClass || '12 MIPA').replace(/,/g, ' ');
    const nis = (r.studentProfile?.nis || '-').replace(/,/g, ' ');
    const pkgTitle = r.packageTitle.replace(/,/g, ' ');
    const score100 = Math.round((r.totalCorrect / Math.max(1, r.totalQuestions)) * 100);
    const minutes = Math.round(r.totalDurationSeconds / 60);

    csvRows.push(
      [
        idx + 1,
        `"${new Date(r.submittedAt).toLocaleString('id-ID')}"`,
        `"${studentName}"`,
        `"${studentClass}"`,
        `"${nis}"`,
        `"${pkgTitle}"`,
        r.totalIrtScore,
        score100,
        Math.round(r.overallAccuracy),
        r.totalCorrect,
        r.totalIncorrect,
        r.totalBlank,
        r.totalQuestions,
        minutes,
      ].join(',')
    );
  });

  const csvContent = '\uFEFF' + csvRows.join('\r\n'); // Add UTF-8 BOM for Excel
  const fileName = 'REKAP_MASTER_NILAI_SEMUA_SISWA_CBT_EDU.csv';

  // Check if file already exists in folder
  const query = encodeURIComponent(
    `name = '${fileName}' and '${folderId}' in parents and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  let existingFileId: string | null = null;
  if (searchRes.ok) {
    const sData = await searchRes.json();
    if (sData.files && sData.files.length > 0) {
      existingFileId = sData.files[0].id;
    }
  }

  if (existingFileId) {
    // Update existing file content
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/csv; charset=UTF-8',
        },
        body: csvContent,
      }
    );
    const updated = await updateRes.json();
    return {
      fileId: existingFileId,
      webViewLink: `https://drive.google.com/file/d/${existingFileId}/view`,
    };
  } else {
    // Create new file
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'text/csv',
      description: 'Rekapitulasi nilai dan jawaban seluruh siswa simulasi CBT Edu dalam format Spreadsheet / CSV',
    };

    const multipart =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/csv; charset=UTF-8\r\n\r\n' +
      csvContent +
      closeDelimiter;

    const createRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipart,
      }
    );

    const created = await createRes.json();
    return {
      fileId: created.id,
      webViewLink: created.webViewLink || `https://drive.google.com/file/d/${created.id}/view`,
    };
  }
};

/**
 * List files inside the CBT Edu Google Drive folder
 */
export const listCbtDriveFiles = async (folderId: string): Promise<DriveFileItem[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Drive belum aktif.');

  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&fields=files(id,name,mimeType,webViewLink,webContentLink,size,createdTime,modifiedTime,owners,properties,description)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(extractGoogleApiErrorMessage(err, 'Gagal memuat berkas Google Drive'));
  }

  const data = await res.json();
  const files: DriveFileItem[] = (data.files || []).map((f: any) => {
    return {
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
      webContentLink: f.webContentLink,
      size: f.size,
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      owners: f.owners,
      studentName: f.properties?.studentName,
      studentClass: f.properties?.studentClass,
      nis: f.properties?.nis,
      score: f.properties?.irtScore ? Number(f.properties.irtScore) : undefined,
      packageTitle: f.properties?.packageTitle,
    };
  });

  return files;
};

/**
 * Delete a file with token
 */
export const deleteDriveFile = async (fileId: string): Promise<void> => {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Drive belum login.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`Gagal menghapus berkas: ${err}`);
  }
};
