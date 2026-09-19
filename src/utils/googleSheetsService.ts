import { getAccessToken, getOrCreateRootCbtFolder, extractGoogleApiErrorMessage } from './googleDriveService';
import { ExamResult, StudentRosterEntry, SchoolInfo, Question } from '../types';

export interface GoogleSpreadsheetItem {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime?: string;
  createdTime?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  index: number;
}

/**
 * Extracts spreadsheet ID from full URL or raw ID string
 */
export function extractSpreadsheetId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * List Google Spreadsheets accessible to user
 */
export async function listUserSpreadsheets(): Promise<GoogleSpreadsheetItem[]> {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Sheets membutuhkan otentikasi Google.');

  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,webViewLink,createdTime,modifiedTime)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(extractGoogleApiErrorMessage(errText, 'Gagal mengambil daftar Google Sheets'));
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
    modifiedTime: f.modifiedTime,
    createdTime: f.createdTime,
  }));
}

/**
 * Fetch spreadsheet metadata including tab names
 */
export async function getSpreadsheetDetails(spreadsheetId: string): Promise<{
  id: string;
  title: string;
  sheets: SheetTabInfo[];
  webViewLink: string;
}> {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Sheets membutuhkan otentikasi Google.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=spreadsheetId,properties.title,sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(extractGoogleApiErrorMessage(err, 'Gagal memuat detail Google Sheets'));
  }

  const data = await res.json();
  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId || 0,
    title: s.properties?.title || 'Sheet1',
    index: s.properties?.index || 0,
  }));

  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets,
    webViewLink: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

/**
 * Read values from range in Google Sheet
 */
export async function readSheetRange(
  spreadsheetId: string,
  range: string = 'A1:Z500'
): Promise<string[][]> {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Sheets membutuhkan otentikasi Google.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(extractGoogleApiErrorMessage(err, 'Gagal membaca data dari Google Sheets'));
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Append row(s) to a Google Sheet
 */
export async function appendSheetRows(
  spreadsheetId: string,
  range: string,
  rows: (string | number)[][]
): Promise<{ updatedRows: number }> {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Sheets membutuhkan otentikasi Google.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(extractGoogleApiErrorMessage(err, 'Gagal menambahkan baris ke Google Sheets'));
  }

  const data = await res.json();
  return { updatedRows: data.updates?.updatedRows || rows.length };
}

/**
 * Write or overwrite values in a range
 */
export async function writeSheetRange(
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Sheets membutuhkan otentikasi Google.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(extractGoogleApiErrorMessage(err, 'Gagal memperbarui cell Google Sheets'));
  }
}

/**
 * Create a new styled Master CBT Gradebook Google Spreadsheet
 */
export async function createMasterGradesSpreadsheet(
  results: ExamResult[],
  schoolInfo?: SchoolInfo,
  customTitle?: string
): Promise<{ id: string; title: string; webViewLink: string }> {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Sheets membutuhkan otentikasi Google.');

  const schoolName = schoolInfo?.schoolName || 'SMAN 19 BANDUNG';
  const title =
    customTitle ||
    `[UJIANKU] Rekapitulasi Nilai CBT & Asesmen - ${schoolName} (${new Date().toLocaleDateString('id-ID')})`;

  // 1. Create Spreadsheet resource with structured tabs
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'DAFTAR NILAI SISWA',
            gridProperties: {
              frozenRowCount: 4,
            },
          },
        },
        {
          properties: {
            title: 'STATISTIK & KKM',
            gridProperties: {
              frozenRowCount: 2,
            },
          },
        },
        {
          properties: {
            title: 'DATA SISWA ROSTER',
            gridProperties: {
              frozenRowCount: 2,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(extractGoogleApiErrorMessage(err, 'Gagal membuat Google Spreadsheet baru'));
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // Move spreadsheet into Root CBT Google Drive Folder if available
  try {
    const rootFolder = await getOrCreateRootCbtFolder();
    if (rootFolder && rootFolder.id) {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${rootFolder.id}&fields=id,parents`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    }
  } catch (e) {
    console.warn('Folder relocation warning:', e);
  }

  // 2. Populate "DAFTAR NILAI SISWA" tab
  const rowsSheet1: (string | number)[][] = [
    [`REKAPITULASI DAFTAR NILAI CBT & ASESMEN UJIAN - ${schoolName.toUpperCase()}`],
    [`Diperbarui Otomatis oleh Sistem CBT UJIANKU • Tanggal: ${new Date().toLocaleString('id-ID')}`],
    [],
    [
      'No',
      'NIS / NISN',
      'Nama Lengkap Siswa',
      'Kelas / Rombel',
      'Mata Pelajaran / Paket Ujian',
      'Tanggal Selesai',
      'Durasi (Menit)',
      'Benar',
      'Salah',
      'Kosong',
      'Total Soal',
      'Nilai Akhir (0-100)',
      'Skor IRT',
      'Akurasi (%)',
      'Status KKM (Min 75)',
      'Status Pengawas / Integritas',
    ],
  ];

  results.forEach((r, idx) => {
    const sName = r.studentProfile?.fullName || 'Siswa CBT';
    const sClass = r.studentProfile?.studentClass || '12 MIPA';
    const sNis = r.studentProfile?.nis || '-';
    const pkg = r.packageTitle || 'Paket Ujian';
    const score100 = Math.round((r.totalCorrect / Math.max(1, r.totalQuestions)) * 100);
    const accuracy = Math.round(r.overallAccuracy);
    const minutes = Math.round(r.totalDurationSeconds / 60);
    const statusKkm = score100 >= 75 ? 'TUNTAS' : 'REMEDIAL';
    const integrity = r.proctoringSummary?.integrityStatus || 'Tertib & Terverifikasi';

    rowsSheet1.push([
      idx + 1,
      sNis,
      sName,
      sClass,
      pkg,
      new Date(r.submittedAt).toLocaleString('id-ID'),
      minutes,
      r.totalCorrect,
      r.totalIncorrect,
      r.totalBlank,
      r.totalQuestions,
      score100,
      r.totalIrtScore,
      `${accuracy}%`,
      statusKkm,
      integrity,
    ]);
  });

  // 3. Populate "STATISTIK & KKM" tab
  const totalSubmissions = results.length;
  const scores = results.map((r) => Math.round((r.totalCorrect / Math.max(1, r.totalQuestions)) * 100));
  const avgScore = totalSubmissions > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalSubmissions) : 0;
  const maxScore = totalSubmissions > 0 ? Math.max(...scores) : 0;
  const minScore = totalSubmissions > 0 ? Math.min(...scores) : 0;
  const tuntasCount = scores.filter((s) => s >= 75).length;
  const remedialCount = totalSubmissions - tuntasCount;
  const tuntasPercentage = totalSubmissions > 0 ? Math.round((tuntasCount / totalSubmissions) * 100) : 0;

  const rowsSheet2: (string | number)[][] = [
    ['RINGKASAN STATISTIK EVALUASI HASIL UJIAN CBT'],
    ['Parameter Asesmen', 'Nilai / Jumlah', 'Keterangan'],
    ['Total Peserta Mengikuti Ujian', totalSubmissions, 'Orang Siswa'],
    ['Nilai Rata-rata Ujian', avgScore, 'Skala 0 - 100'],
    ['Nilai Tertinggi (Maksimum)', maxScore, 'Peringkat 1'],
    ['Nilai Terendah (Minimum)', minScore, 'Perlu Pembinaan'],
    ['Peserta Mencapai KKM (≥ 75)', tuntasCount, `${tuntasPercentage}% dari total peserta`],
    ['Peserta Remedial (< 75)', remedialCount, `${100 - tuntasPercentage}% dari total peserta`],
    ['Standar KKM Sekolah', 75, 'Batas Ketuntasan Minimal'],
  ];

  // 4. Batch update data to the sheets
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: "'DAFTAR NILAI SISWA'!A1:P" + (rowsSheet1.length + 5),
            values: rowsSheet1,
          },
          {
            range: "'STATISTIK & KKM'!A1:C" + (rowsSheet2.length + 2),
            values: rowsSheet2,
          },
        ],
      }),
    }
  );

  return {
    id: spreadsheetId,
    title,
    webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Export student roster to Google Sheet
 */
export async function exportRosterToSpreadsheet(
  spreadsheetId: string,
  roster: StudentRosterEntry[],
  sheetTitle: string = 'DATA SISWA ROSTER'
): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error('Akses Google Sheets membutuhkan otentikasi Google.');

  const cleanId = extractSpreadsheetId(spreadsheetId);

  const headerRows: (string | number)[][] = [
    ['DAFTAR ROSTER & IDENTITAS SISWA PESERTA UJIAN'],
    ['No', 'NIS / NISN', 'Nama Lengkap Siswa', 'Kelas / Rombel', 'Asal Sekolah', 'Status Akun', 'Catatan Khusus'],
  ];

  roster.forEach((s, idx) => {
    headerRows.push([
      idx + 1,
      s.nis,
      s.fullName,
      s.studentClass,
      s.schoolName || 'UJIANKU',
      s.isActive ? 'AKTIF' : 'NONAKTIF',
      s.notes || '-',
    ]);
  });

  await writeSheetRange(cleanId, `'${sheetTitle}'!A1:G${headerRows.length + 5}`, headerRows);
}

/**
 * Import student roster from Google Sheet (parses rows and recognizes columns)
 */
export async function importRosterFromGoogleSheet(
  spreadsheetId: string,
  range: string = 'A1:Z500'
): Promise<{ students: StudentRosterEntry[]; summary: string }> {
  const rawValues = await readSheetRange(spreadsheetId, range);

  if (!rawValues || rawValues.length === 0) {
    throw new Error('Google Spreadsheet kosong atau tidak memiliki data.');
  }

  // Find header row
  let headerIndex = -1;
  let colNis = -1;
  let colName = -1;
  let colClass = -1;
  let colSchool = -1;

  for (let r = 0; r < Math.min(10, rawValues.length); r++) {
    const row = rawValues[r].map((cell) => String(cell || '').trim().toLowerCase());
    const nisIdx = row.findIndex((c) => c.includes('nis') || c.includes('nomor induk') || c.includes('id siswa'));
    const nameIdx = row.findIndex((c) => c.includes('nama') || c.includes('student') || c.includes('name'));
    const classIdx = row.findIndex((c) => c.includes('kelas') || c.includes('class') || c.includes('rombel'));
    const schoolIdx = row.findIndex((c) => c.includes('sekolah') || c.includes('school'));

    if (nisIdx !== -1 && nameIdx !== -1) {
      headerIndex = r;
      colNis = nisIdx;
      colName = nameIdx;
      colClass = classIdx !== -1 ? classIdx : (nameIdx + 1);
      colSchool = schoolIdx;
      break;
    }
  }

  // If standard header not found, fallback to columns 0, 1, 2
  if (headerIndex === -1) {
    headerIndex = 0;
    colNis = 1;
    colName = 2;
    colClass = 3;
  }

  const parsedStudents: StudentRosterEntry[] = [];
  const startRow = headerIndex + 1;

  for (let r = startRow; r < rawValues.length; r++) {
    const row = rawValues[r];
    if (!row || row.length === 0) continue;

    const nis = String(row[colNis] || '').trim();
    const fullName = String(row[colName] || '').trim();
    const studentClass = colClass >= 0 && row[colClass] ? String(row[colClass]).trim() : '12 MIPA 1';
    const schoolName = colSchool >= 0 && row[colSchool] ? String(row[colSchool]).trim() : 'UJIANKU';

    if (nis && fullName && nis.toLowerCase() !== 'nis' && fullName.toLowerCase() !== 'nama') {
      parsedStudents.push({
        id: `roster_gsheet_${nis}_${Date.now()}_${r}`,
        nis,
        fullName,
        studentClass,
        schoolName,
        isActive: true,
        notes: 'Diimpor dari Google Sheets',
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (parsedStudents.length === 0) {
    throw new Error('Tidak ditemukan data siswa yang valid pada sheet. Pastikan terdapat kolom NIS dan Nama.');
  }

  return {
    students: parsedStudents,
    summary: `Berhasil mengekstrak ${parsedStudents.length} siswa dari Google Sheets.`,
  };
}

/**
 * Import Questions from Google Sheet
 */
export async function importQuestionsFromGoogleSheet(
  spreadsheetId: string,
  range: string = 'A1:Z500'
): Promise<{ questions: Question[]; count: number }> {
  const rawValues = await readSheetRange(spreadsheetId, range);

  if (!rawValues || rawValues.length === 0) {
    throw new Error('Google Spreadsheet kosong.');
  }

  // Find question header row
  let headerIndex = -1;
  let colSoal = -1;
  let colA = -1;
  let colB = -1;
  let colC = -1;
  let colD = -1;
  let colE = -1;
  let colKey = -1;
  let colExpl = -1;
  let colCategory = -1;

  for (let r = 0; r < Math.min(10, rawValues.length); r++) {
    const row = rawValues[r].map((cell) => String(cell || '').trim().toLowerCase());
    const soalIdx = row.findIndex((c) => c.includes('soal') || c.includes('pertanyaan') || c.includes('question'));
    const keyIdx = row.findIndex((c) => c.includes('kunci') || c.includes('jawaban benar') || c.includes('key') || c.includes('answer'));

    if (soalIdx !== -1) {
      headerIndex = r;
      colSoal = soalIdx;
      colKey = keyIdx;
      colA = row.findIndex((c) => c === 'a' || c === 'opsi a' || c === 'pilihan a');
      colB = row.findIndex((c) => c === 'b' || c === 'opsi b' || c === 'pilihan b');
      colC = row.findIndex((c) => c === 'c' || c === 'opsi c' || c === 'pilihan c');
      colD = row.findIndex((c) => c === 'd' || c === 'opsi d' || c === 'pilihan d');
      colE = row.findIndex((c) => c === 'e' || c === 'opsi e' || c === 'pilihan e');
      colExpl = row.findIndex((c) => c.includes('pembahasan') || c.includes('explanation'));
      colCategory = row.findIndex((c) => c.includes('mapel') || c.includes('kategori') || c.includes('subtes'));
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
    colSoal = 1;
    colA = 2;
    colB = 3;
    colC = 4;
    colD = 5;
    colE = 6;
    colKey = 7;
    colExpl = 8;
  }

  const questions: Question[] = [];
  const startRow = headerIndex + 1;

  for (let r = startRow; r < rawValues.length; r++) {
    const row = rawValues[r];
    if (!row || row.length === 0) continue;

    const questionText = String(row[colSoal] || '').trim();
    if (!questionText) continue;

    const optA = colA >= 0 && row[colA] ? String(row[colA]).trim() : '';
    const optB = colB >= 0 && row[colB] ? String(row[colB]).trim() : '';
    const optC = colC >= 0 && row[colC] ? String(row[colC]).trim() : '';
    const optD = colD >= 0 && row[colD] ? String(row[colD]).trim() : '';
    const optE = colE >= 0 && row[colE] ? String(row[colE]).trim() : '';

    const rawOptions = [
      { label: 'A', text: optA },
      { label: 'B', text: optB },
      { label: 'C', text: optC },
      { label: 'D', text: optD },
      { label: 'E', text: optE },
    ].filter((o) => !!o.text);

    if (rawOptions.length < 2) continue;

    const qOptions = rawOptions.map((o) => ({
      id: `opt_${o.label.toLowerCase()}`,
      label: o.label,
      text: o.text,
    }));

    const keyRaw = colKey >= 0 && row[colKey] ? String(row[colKey]).trim().toUpperCase() : 'A';
    let correctAnswer = 'A';
    if (['A', 'B', 'C', 'D', 'E'].includes(keyRaw)) {
      correctAnswer = keyRaw;
    } else if (keyRaw === '1') correctAnswer = 'B';
    else if (keyRaw === '2') correctAnswer = 'C';
    else if (keyRaw === '3') correctAnswer = 'D';
    else if (keyRaw === '4') correctAnswer = 'E';

    const explText = colExpl >= 0 && row[colExpl] ? String(row[colExpl]).trim() : 'Pembahasan standar asesmen CBT.';
    const subtestName = colCategory >= 0 && row[colCategory] ? String(row[colCategory]).trim() : 'Matematika';

    questions.push({
      id: `gsheet_q_${Date.now()}_${r}`,
      subtestId: 'subtest_general',
      subtestName: subtestName,
      category: 'SMA_MIPA',
      type: 'multiple_choice',
      questionText,
      options: qOptions,
      correctAnswer,
      explanation: {
        summary: explText,
        steps: [explText],
        concept: 'Pemahaman materi inti asesmen CBT',
      },
      difficulty: 'Sedang',
      irtWeight: 750,
      topic: subtestName,
      isUserCreated: true,
    });
  }

  return { questions, count: questions.length };
}
