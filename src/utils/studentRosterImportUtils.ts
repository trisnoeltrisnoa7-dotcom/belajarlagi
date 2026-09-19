import * as XLSX from 'xlsx';
import { StudentRosterEntry, MAX_ROSTER_STUDENTS } from '../types';
import { getMasterClasses } from './centralSubjectClassManager';

export interface ParsedStudentItem {
  id: string;
  sheetName: string;
  rowIndex: number;
  nis: string;
  fullName: string;
  studentClass: string;
  schoolName?: string;
  notes?: string;
  isIncluded: boolean;
  validationStatus: 'valid' | 'duplicate_database' | 'duplicate_file' | 'incomplete';
  validationMessage?: string;
  originalRowData?: Record<string, any>;
}

export interface ParsedSheetInfo {
  name: string;
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  incompleteCount: number;
  isIncluded: boolean;
  targetClassOverride?: string;
  students: ParsedStudentItem[];
}

export interface MultiSheetImportResult {
  fileName: string;
  totalSheets: number;
  sheets: ParsedSheetInfo[];
  allStudents: ParsedStudentItem[];
  summary: {
    totalDetected: number;
    totalIncluded: number;
    totalValid: number;
    totalDuplicates: number;
    totalIncomplete: number;
    uniqueClasses: string[];
  };
}

/**
 * Normalizes string header to find matching column keys
 */
function findColumnKey(headers: string[], regexPattern: RegExp): string | null {
  for (const h of headers) {
    if (regexPattern.test(h.trim().toLowerCase())) {
      return h;
    }
  }
  return null;
}

/**
 * Parse Excel file array buffer containing single or multiple sheets
 */
export function parseExcelWorkbook(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  existingRoster: StudentRosterEntry[],
  defaultSchoolName: string = 'SMA Negeri 19 Jakarta',
  options: {
    useSheetNameAsClass?: boolean;
    defaultClass?: string;
  } = {}
): MultiSheetImportResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  const existingNisSet = new Set(
    existingRoster.map(s => s.nis.trim().toLowerCase()).filter(Boolean)
  );

  const seenNisInFile = new Map<string, number>(); // NIS -> count
  const allStudents: ParsedStudentItem[] = [];
  const parsedSheets: ParsedSheetInfo[] = [];

  sheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    // Convert sheet to JSON array of objects
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      raw: false,
    });

    const sheetStudents: ParsedStudentItem[] = [];

    if (jsonData.length === 0) {
      // Empty sheet
      parsedSheets.push({
        name: sheetName,
        totalRows: 0,
        validCount: 0,
        duplicateCount: 0,
        incompleteCount: 0,
        isIncluded: false,
        targetClassOverride: sheetName,
        students: [],
      });
      return;
    }

    // Inspect headers
    const sampleRow = jsonData[0] || {};
    const headers = Object.keys(sampleRow);

    const nisKey = findColumnKey(headers, /^(nis|no\.?\s*induk|nomor\s*induk|id\s*siswa|nisn|no_induk)$/i) ||
      findColumnKey(headers, /nis/i) ||
      headers[0]; // fallback to column 0

    const nameKey = findColumnKey(headers, /^(nama|nama\s*lengkap|nama\s*siswa|name|full\s*name|peserta|nama_lengkap)$/i) ||
      findColumnKey(headers, /nama|name/i) ||
      (headers.length > 1 ? headers[1] : headers[0]);

    const classKey = findColumnKey(headers, /^(kelas|rombel|class|tingkat|jurusan|ruang|rombongan_belajar)$/i) ||
      findColumnKey(headers, /kelas|rombel/i);

    const schoolKey = findColumnKey(headers, /^(sekolah|nama_sekolah|school|instansi)$/i);
    const notesKey = findColumnKey(headers, /^(catatan|notes|keterangan|ket|gender|jk)$/i);

    jsonData.forEach((row, rowIdx) => {
      const rawNis = String(row[nisKey] ?? '').trim();
      const rawName = String(row[nameKey] ?? '').trim();
      let rawClass = classKey && row[classKey] ? String(row[classKey]).trim() : '';

      // Skip table header row if accidentally captured
      if (
        rawNis.toLowerCase() === 'nis' ||
        rawNis.toLowerCase().includes('nomor') ||
        rawName.toLowerCase() === 'nama' ||
        rawName.toLowerCase().includes('nama siswa')
      ) {
        return;
      }

      // If class is empty or useSheetNameAsClass is requested, use sheet name (if not default 'Sheet1')
      if (!rawClass) {
        if (options.useSheetNameAsClass !== false && !sheetName.toLowerCase().startsWith('sheet')) {
          rawClass = sheetName;
        } else {
          const fallbackClass = getMasterClasses()[0]?.name || 'Kelas X';
          rawClass = options.defaultClass || (sheetName && !sheetName.toLowerCase().startsWith('sheet') ? sheetName : fallbackClass);
        }
      }

      const cleanNis = rawNis;
      const cleanName = rawName;
      const cleanSchool = schoolKey && row[schoolKey] ? String(row[schoolKey]).trim() : defaultSchoolName;
      const cleanNotes = notesKey && row[notesKey] ? String(row[notesKey]).trim() : `Sheet: ${sheetName}`;

      let validationStatus: ParsedStudentItem['validationStatus'] = 'valid';
      let validationMessage = '';

      if (!cleanNis || !cleanName) {
        validationStatus = 'incomplete';
        validationMessage = !cleanNis && !cleanName
          ? 'NIS dan Nama Siswa Kosong'
          : !cleanNis
          ? 'NIS Tidak Boleh Kosong'
          : 'Nama Siswa Tidak Boleh Kosong';
      } else {
        const nisLower = cleanNis.toLowerCase();
        // Check duplicate within file
        const prevCount = seenNisInFile.get(nisLower) || 0;
        seenNisInFile.set(nisLower, prevCount + 1);

        if (prevCount > 0) {
          validationStatus = 'duplicate_file';
          validationMessage = `Duplikat di dalam file (${prevCount + 1}x ditemukan)`;
        } else if (existingNisSet.has(nisLower)) {
          validationStatus = 'duplicate_database';
          validationMessage = 'NIS sudah terdaftar di sistem';
        }
      }

      const item: ParsedStudentItem = {
        id: `imp-${sheetName}-${rowIdx}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sheetName,
        rowIndex: rowIdx + 1,
        nis: cleanNis,
        fullName: cleanName,
        studentClass: rawClass,
        schoolName: cleanSchool,
        notes: cleanNotes,
        isIncluded: validationStatus !== 'incomplete', // Include by default if has NIS and name
        validationStatus,
        validationMessage,
        originalRowData: row,
      };

      sheetStudents.push(item);
      allStudents.push(item);
    });

    const validCount = sheetStudents.filter(s => s.validationStatus === 'valid').length;
    const duplicateCount = sheetStudents.filter(s => s.validationStatus === 'duplicate_database' || s.validationStatus === 'duplicate_file').length;
    const incompleteCount = sheetStudents.filter(s => s.validationStatus === 'incomplete').length;

    parsedSheets.push({
      name: sheetName,
      totalRows: sheetStudents.length,
      validCount,
      duplicateCount,
      incompleteCount,
      isIncluded: sheetStudents.length > 0,
      targetClassOverride: sheetName,
      students: sheetStudents,
    });
  });

  const uniqueClasses = Array.from(new Set(allStudents.map(s => s.studentClass).filter(Boolean))).sort();

  return {
    fileName,
    totalSheets: parsedSheets.length,
    sheets: parsedSheets,
    allStudents,
    summary: {
      totalDetected: allStudents.length,
      totalIncluded: allStudents.filter(s => s.isIncluded).length,
      totalValid: allStudents.filter(s => s.validationStatus === 'valid').length,
      totalDuplicates: allStudents.filter(s => s.validationStatus === 'duplicate_database' || s.validationStatus === 'duplicate_file').length,
      totalIncomplete: allStudents.filter(s => s.validationStatus === 'incomplete').length,
      uniqueClasses,
    },
  };
}

/**
 * Parse raw pasted text (CSV, TSV, or comma/tab-separated)
 */
export function parseRawTextRoster(
  rawText: string,
  existingRoster: StudentRosterEntry[],
  defaultSchoolName: string = 'SMA Negeri 19 Jakarta',
  defaultClass?: string
): MultiSheetImportResult {
  const fallbackClass = defaultClass || getMasterClasses()[0]?.name || 'Kelas X';
  const existingNisSet = new Set(
    existingRoster.map(s => s.nis.trim().toLowerCase()).filter(Boolean)
  );
  const seenNisInText = new Map<string, number>();

  const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const allStudents: ParsedStudentItem[] = [];

  lines.forEach((line, index) => {
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(';')) {
      parts = line.split(';');
    } else if (line.includes(',')) {
      parts = line.split(',');
    } else {
      parts = line.split(/\s{2,}/);
    }

    if (parts.length < 2) {
      return;
    }

    const rawNis = parts[0]?.trim().replace(/^["']|["']$/g, '') || '';
    const rawName = parts[1]?.trim().replace(/^["']|["']$/g, '') || '';
    const rawClass = parts[2]?.trim().replace(/^["']|["']$/g, '') || fallbackClass;
    const rawSchool = parts[3]?.trim().replace(/^["']|["']$/g, '') || defaultSchoolName;

    // Skip header row
    if (
      rawNis.toLowerCase() === 'nis' ||
      rawNis.toLowerCase().includes('nomor') ||
      rawName.toLowerCase() === 'nama' ||
      rawName.toLowerCase().includes('nama siswa')
    ) {
      return;
    }

    let validationStatus: ParsedStudentItem['validationStatus'] = 'valid';
    let validationMessage = '';

    if (!rawNis || !rawName) {
      validationStatus = 'incomplete';
      validationMessage = !rawNis && !rawName ? 'NIS & Nama Kosong' : !rawNis ? 'NIS Kosong' : 'Nama Kosong';
    } else {
      const nisLower = rawNis.toLowerCase();
      const count = seenNisInText.get(nisLower) || 0;
      seenNisInText.set(nisLower, count + 1);

      if (count > 0) {
        validationStatus = 'duplicate_file';
        validationMessage = `Duplikat di dalam teks (${count + 1}x)`;
      } else if (existingNisSet.has(nisLower)) {
        validationStatus = 'duplicate_database';
        validationMessage = 'NIS sudah terdaftar di sistem';
      }
    }

    const item: ParsedStudentItem = {
      id: `raw-imp-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sheetName: 'Data Teks Tempel',
      rowIndex: index + 1,
      nis: rawNis,
      fullName: rawName,
      studentClass: rawClass,
      schoolName: rawSchool,
      notes: 'Impor Teks Tempel',
      isIncluded: validationStatus !== 'incomplete',
      validationStatus,
      validationMessage,
    };

    allStudents.push(item);
  });

  const validCount = allStudents.filter(s => s.validationStatus === 'valid').length;
  const duplicateCount = allStudents.filter(s => s.validationStatus === 'duplicate_database' || s.validationStatus === 'duplicate_file').length;
  const incompleteCount = allStudents.filter(s => s.validationStatus === 'incomplete').length;
  const uniqueClasses = Array.from(new Set(allStudents.map(s => s.studentClass).filter(Boolean))).sort();

  const sheetInfo: ParsedSheetInfo = {
    name: 'Data Teks Tempel',
    totalRows: allStudents.length,
    validCount,
    duplicateCount,
    incompleteCount,
    isIncluded: true,
    targetClassOverride: defaultClass,
    students: allStudents,
  };

  return {
    fileName: 'Teks Tempel (Clipboard)',
    totalSheets: 1,
    sheets: [sheetInfo],
    allStudents,
    summary: {
      totalDetected: allStudents.length,
      totalIncluded: allStudents.filter(s => s.isIncluded).length,
      totalValid: validCount,
      totalDuplicates: duplicateCount,
      totalIncomplete: incompleteCount,
      uniqueClasses,
    },
  };
}

/**
 * Apply imported items to existing roster with selected duplicate strategy
 */
export function applyImportedStudents(
  itemsToImport: ParsedStudentItem[],
  existingRoster: StudentRosterEntry[],
  duplicateStrategy: 'skip' | 'overwrite' | 'append' = 'skip'
): {
  updatedRoster: StudentRosterEntry[];
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  quotaExceededCount: number;
} {
  const activeItems = itemsToImport.filter(i => i.isIncluded && i.nis.trim() && i.fullName.trim());

  const existingMap = new Map<string, StudentRosterEntry>();
  existingRoster.forEach(s => {
    existingMap.set(s.nis.trim().toLowerCase(), s);
  });

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let quotaExceededCount = 0;

  activeItems.forEach(item => {
    const nisKey = item.nis.trim().toLowerCase();
    const existing = existingMap.get(nisKey);

    if (existing) {
      if (duplicateStrategy === 'overwrite') {
        // Update existing record with fresh data (does not increase total count)
        existingMap.set(nisKey, {
          ...existing,
          fullName: item.fullName.trim(),
          studentClass: item.studentClass.trim() || existing.studentClass,
          schoolName: item.schoolName?.trim() || existing.schoolName,
          notes: item.notes?.trim() || existing.notes,
        });
        updatedCount++;
      } else if (duplicateStrategy === 'append') {
        // Check if database reached 400 NIS capacity
        if (existingMap.size >= MAX_ROSTER_STUDENTS) {
          quotaExceededCount++;
          return;
        }
        // Add duplicate record with unique internal id
        existingMap.set(`${nisKey}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, {
          id: `roster-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          nis: item.nis.trim(),
          fullName: item.fullName.trim(),
          studentClass: item.studentClass.trim(),
          schoolName: item.schoolName?.trim(),
          isActive: true,
          notes: item.notes?.trim() || 'Impor Baru',
          createdAt: new Date().toISOString(),
        });
        addedCount++;
      } else {
        // Skip duplicate
        skippedCount++;
      }
    } else {
      // Check if database reached 400 NIS capacity
      if (existingMap.size >= MAX_ROSTER_STUDENTS) {
        quotaExceededCount++;
        return;
      }
      // Brand new student
      existingMap.set(nisKey, {
        id: `roster-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        nis: item.nis.trim(),
        fullName: item.fullName.trim(),
        studentClass: item.studentClass.trim(),
        schoolName: item.schoolName?.trim(),
        isActive: true,
        notes: item.notes?.trim() || 'Impor Excel Multi-Sheet',
        createdAt: new Date().toISOString(),
      });
      addedCount++;
    }
  });

  const updatedRoster = Array.from(existingMap.values()).slice(0, MAX_ROSTER_STUDENTS);
  return { updatedRoster, addedCount, updatedCount, skippedCount, quotaExceededCount };
}

/**
 * Generates and downloads a multi-sheet template Excel (.xlsx) file
 */
export function generateMultiSheetTemplateExcel(schoolName: string = 'SMA Negeri 19 Jakarta') {
  const wb = XLSX.utils.book_new();

  // Sample Class Sheets
  const sheetConfigs = [
    {
      sheetName: '12 MIPA 1',
      data: [
        { NIS: '12001', 'Nama Lengkap': 'Achmad Rizky Maulana', Kelas: '12 MIPA 1', 'Nama Sekolah': schoolName, Catatan: 'Ketua Kelas' },
        { NIS: '12002', 'Nama Lengkap': 'Adinda Putri Maharani', Kelas: '12 MIPA 1', 'Nama Sekolah': schoolName, Catatan: 'Anggota' },
        { NIS: '12003', 'Nama Lengkap': 'Bagus Prasetyo', Kelas: '12 MIPA 1', 'Nama Sekolah': schoolName, Catatan: 'Anggota' },
        { NIS: '12004', 'Nama Lengkap': 'Bella Safitri', Kelas: '12 MIPA 1', 'Nama Sekolah': schoolName, Catatan: 'Anggota' },
        { NIS: '12005', 'Nama Lengkap': 'Dimas Arya Nugraha', Kelas: '12 MIPA 1', 'Nama Sekolah': schoolName, Catatan: 'Anggota' },
      ],
    },
    {
      sheetName: '12 MIPA 2',
      data: [
        { NIS: '12031', 'Nama Lengkap': 'Farhan Ramadhan', Kelas: '12 MIPA 2', 'Nama Sekolah': schoolName, Catatan: 'Ketua Kelas' },
        { NIS: '12032', 'Nama Lengkap': 'Gabriella Natasya', Kelas: '12 MIPA 2', 'Nama Sekolah': schoolName, Catatan: 'Anggota' },
        { NIS: '12033', 'Nama Lengkap': 'Hafiz Muhammad', Kelas: '12 MIPA 2', 'Nama Sekolah': schoolName, Catatan: 'Anggota' },
        { NIS: '12034', 'Nama Lengkap': 'Indah Permatasari', Kelas: '12 MIPA 2', 'Nama Sekolah': schoolName, Catatan: 'Anggota' },
      ],
    },
    {
      sheetName: '12 IPS 1',
      data: [
        { NIS: '12101', 'Nama Lengkap': 'Jovian Pratama', Kelas: '12 IPS 1', 'Nama Sekolah': schoolName, Catatan: 'Ketua Kelas' },
        { NIS: '12102', 'Nama Lengkap': 'Karin Anindya', Kelas: '12 IPS 1', 'Nama Sekolah': schoolName, Catatan: 'Anggota' },
        { NIS: '12103', 'Nama Lengkap': 'Lukman Hakim', Kelas: '12 IPS 1', 'Nama Sekolah': schoolName, Catatan: 'Anggota' },
        { NIS: '12104', 'Nama Lengkap': 'Maya Anggraini', Kelas: '12 IPS 1', 'Nama Sekolah': schoolName, Catatan: 'Anggota' },
      ],
    },
  ];

  sheetConfigs.forEach(cfg => {
    const ws = XLSX.utils.json_to_sheet(cfg.data);
    // Adjust column widths
    ws['!cols'] = [
      { wch: 12 }, // NIS
      { wch: 28 }, // Nama Lengkap
      { wch: 16 }, // Kelas
      { wch: 28 }, // Nama Sekolah
      { wch: 20 }, // Catatan
    ];
    XLSX.utils.book_append_sheet(wb, ws, cfg.sheetName);
  });

  // Download workbook
  XLSX.writeFile(wb, `Template_Data_Siswa_Multi_Sheet_${new Date().toISOString().split('T')[0]}.xlsx`);
}
