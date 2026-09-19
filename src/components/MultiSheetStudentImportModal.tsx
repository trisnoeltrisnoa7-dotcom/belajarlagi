import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  Filter,
  Search,
  Check,
  RotateCcw,
  Trash2,
  Edit2,
  Layers,
  Sparkles,
  Users,
  Eye,
  EyeOff,
  ChevronRight,
  Info,
  ArrowRight,
  ShieldAlert,
  ListFilter,
  CheckSquare,
  Square,
  HelpCircle,
} from 'lucide-react';
import { StudentRosterEntry, SchoolInfo, DEFAULT_SCHOOL_INFO, MAX_ROSTER_STUDENTS } from '../types';
import {
  ParsedStudentItem,
  ParsedSheetInfo,
  MultiSheetImportResult,
  parseExcelWorkbook,
  parseRawTextRoster,
  applyImportedStudents,
  generateMultiSheetTemplateExcel,
} from '../utils/studentRosterImportUtils';

interface MultiSheetStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rosterStudents: StudentRosterEntry[];
  onUpdateRoster: (updatedStudents: StudentRosterEntry[]) => void;
  schoolInfo?: SchoolInfo;
}

export const MultiSheetStudentImportModal: React.FC<MultiSheetStudentImportModalProps> = ({
  isOpen,
  onClose,
  rosterStudents,
  onUpdateRoster,
  schoolInfo = DEFAULT_SCHOOL_INFO,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');

  // Import Result State
  const [importData, setImportData] = useState<MultiSheetImportResult | null>(null);

  // View / Layout Mode: 'combined' (Satukan Semua Sheet) vs 'separated' (Pisahkan Per-Sheet / Per-Kelas)
  const [viewMode, setViewMode] = useState<'combined' | 'separated'>('combined');
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);

  // Filter & Search in Preview
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'valid' | 'duplicate' | 'incomplete'>('ALL');
  const [filterSelection, setFilterSelection] = useState<'ALL' | 'included' | 'ignored'>('ALL');

  // Duplicate Strategy: 'skip' | 'overwrite' | 'append'
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'overwrite' | 'append'>('skip');

  // Inline editing state for preview item
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFormNis, setEditFormNis] = useState<string>('');
  const [editFormName, setEditFormName] = useState<string>('');
  const [editFormClass, setEditFormClass] = useState<string>('');

  // Success summary toast/modal
  const [importSuccessResult, setImportSuccessResult] = useState<{
    added: number;
    updated: number;
    skipped: number;
    quotaExceeded: number;
    total: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Excel File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processSelectedFile = async (file: File) => {
    setParseError('');
    setIsParsing(true);
    setSelectedFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelWorkbook(
        buffer,
        file.name,
        rosterStudents,
        schoolInfo.schoolName || DEFAULT_SCHOOL_INFO.schoolName,
        { useSheetNameAsClass: true }
      );

      if (result.allStudents.length === 0) {
        setParseError('Tidak ditemukan baris data siswa yang valid pada file ini. Pastikan file berisi kolom NIS dan Nama.');
        setImportData(null);
      } else {
        setImportData(result);
        setActiveSheetIndex(0);
      }
    } catch (err: any) {
      console.error('Error parsing file:', err);
      setParseError(`Gagal membaca file spreadsheet: ${err?.message || 'Format tidak didukung'}`);
      setImportData(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Raw Text Parse
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setParseError('Silakan tempel teks data siswa terlebih dahulu.');
      return;
    }
    setParseError('');
    setIsParsing(true);

    try {
      const result = parseRawTextRoster(
        pastedText,
        rosterStudents,
        schoolInfo.schoolName || DEFAULT_SCHOOL_INFO.schoolName,
        '12 MIPA 1'
      );

      if (result.allStudents.length === 0) {
        setParseError('Format tidak dikenali. Pastikan setiap baris berisi: NIS, Nama Siswa, Kelas');
        setImportData(null);
      } else {
        setImportData(result);
        setActiveSheetIndex(0);
      }
    } catch (err: any) {
      setParseError(`Gagal memproses teks: ${err?.message || 'Format tidak valid'}`);
      setImportData(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Toggle inclusion of an entire sheet
  const handleToggleSheetInclusion = (sheetName: string, include: boolean) => {
    if (!importData) return;

    const updatedSheets = importData.sheets.map(s => {
      if (s.name === sheetName) {
        return {
          ...s,
          isIncluded: include,
          students: s.students.map(st => ({ ...st, isIncluded: include && st.validationStatus !== 'incomplete' })),
        };
      }
      return s;
    });

    const updatedAllStudents = importData.allStudents.map(st => {
      if (st.sheetName === sheetName) {
        return { ...st, isIncluded: include && st.validationStatus !== 'incomplete' };
      }
      return st;
    });

    setImportData({
      ...importData,
      sheets: updatedSheets,
      allStudents: updatedAllStudents,
      summary: {
        ...importData.summary,
        totalIncluded: updatedAllStudents.filter(s => s.isIncluded).length,
      },
    });
  };

  // Change class override for all students in a sheet
  const handleUpdateSheetClass = (sheetName: string, newClassName: string) => {
    if (!importData || !newClassName.trim()) return;

    const updatedSheets = importData.sheets.map(s => {
      if (s.name === sheetName) {
        return {
          ...s,
          targetClassOverride: newClassName,
          students: s.students.map(st => ({ ...st, studentClass: newClassName })),
        };
      }
      return s;
    });

    const updatedAllStudents = importData.allStudents.map(st => {
      if (st.sheetName === sheetName) {
        return { ...st, studentClass: newClassName };
      }
      return st;
    });

    const uniqueClasses = Array.from(new Set(updatedAllStudents.map(s => s.studentClass).filter(Boolean))).sort();

    setImportData({
      ...importData,
      sheets: updatedSheets,
      allStudents: updatedAllStudents,
      summary: {
        ...importData.summary,
        uniqueClasses,
      },
    });
  };

  // Toggle inclusion of a single student row
  const handleToggleItemInclusion = (itemId: string) => {
    if (!importData) return;

    const updatedAllStudents = importData.allStudents.map(st => {
      if (st.id === itemId) {
        return { ...st, isIncluded: !st.isIncluded };
      }
      return st;
    });

    setImportData({
      ...importData,
      allStudents: updatedAllStudents,
      summary: {
        ...importData.summary,
        totalIncluded: updatedAllStudents.filter(s => s.isIncluded).length,
      },
    });
  };

  // Batch actions
  const handleSelectAllValid = () => {
    if (!importData) return;
    const updated = importData.allStudents.map(st => ({
      ...st,
      isIncluded: st.validationStatus !== 'incomplete',
    }));
    setImportData({
      ...importData,
      allStudents: updated,
      summary: { ...importData.summary, totalIncluded: updated.filter(s => s.isIncluded).length },
    });
  };

  const handleIgnoreAllDuplicates = () => {
    if (!importData) return;
    const updated = importData.allStudents.map(st => ({
      ...st,
      isIncluded: st.validationStatus === 'valid',
    }));
    setImportData({
      ...importData,
      allStudents: updated,
      summary: { ...importData.summary, totalIncluded: updated.filter(s => s.isIncluded).length },
    });
  };

  const handleSelectAll = () => {
    if (!importData) return;
    const updated = importData.allStudents.map(st => ({
      ...st,
      isIncluded: true,
    }));
    setImportData({
      ...importData,
      allStudents: updated,
      summary: { ...importData.summary, totalIncluded: updated.filter(s => s.isIncluded).length },
    });
  };

  const handleDeselectAll = () => {
    if (!importData) return;
    const updated = importData.allStudents.map(st => ({
      ...st,
      isIncluded: false,
    }));
    setImportData({
      ...importData,
      allStudents: updated,
      summary: { ...importData.summary, totalIncluded: 0 },
    });
  };

  // Inline editing save
  const handleStartInlineEdit = (item: ParsedStudentItem) => {
    setEditingItemId(item.id);
    setEditFormNis(item.nis);
    setEditFormName(item.fullName);
    setEditFormClass(item.studentClass);
  };

  const handleSaveInlineEdit = (itemId: string) => {
    if (!importData) return;
    const cleanNis = editFormNis.trim();
    const cleanName = editFormName.trim();
    const cleanClass = editFormClass.trim() || '12 MIPA 1';

    const existingNisSet = new Set(rosterStudents.map(s => s.nis.trim().toLowerCase()));

    const updated = importData.allStudents.map(st => {
      if (st.id === itemId) {
        let validationStatus: ParsedStudentItem['validationStatus'] = 'valid';
        let validationMessage = '';

        if (!cleanNis || !cleanName) {
          validationStatus = 'incomplete';
          validationMessage = 'NIS atau Nama Kosong';
        } else if (existingNisSet.has(cleanNis.toLowerCase())) {
          validationStatus = 'duplicate_database';
          validationMessage = 'NIS sudah terdaftar di sistem';
        }

        return {
          ...st,
          nis: cleanNis,
          fullName: cleanName,
          studentClass: cleanClass,
          validationStatus,
          validationMessage,
          isIncluded: validationStatus !== 'incomplete',
        };
      }
      return st;
    });

    const uniqueClasses = Array.from(new Set(updated.map(s => s.studentClass).filter(Boolean))).sort();

    setImportData({
      ...importData,
      allStudents: updated,
      summary: {
        ...importData.summary,
        totalIncluded: updated.filter(s => s.isIncluded).length,
        totalValid: updated.filter(s => s.validationStatus === 'valid').length,
        uniqueClasses,
      },
    });

    setEditingItemId(null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!importData) return;
    const updated = importData.allStudents.filter(st => st.id !== itemId);
    const uniqueClasses = Array.from(new Set(updated.map(s => s.studentClass).filter(Boolean))).sort();

    setImportData({
      ...importData,
      allStudents: updated,
      summary: {
        ...importData.summary,
        totalDetected: updated.length,
        totalIncluded: updated.filter(s => s.isIncluded).length,
        totalValid: updated.filter(s => s.validationStatus === 'valid').length,
        totalDuplicates: updated.filter(s => s.validationStatus === 'duplicate_database' || s.validationStatus === 'duplicate_file').length,
        totalIncomplete: updated.filter(s => s.validationStatus === 'incomplete').length,
        uniqueClasses,
      },
    });
  };

  // Filter students based on active view and filters
  const displayedStudents = useMemo(() => {
    if (!importData) return [];

    let list = importData.allStudents;

    // If separated view mode is active, filter by current active sheet
    if (viewMode === 'separated' && importData.sheets[activeSheetIndex]) {
      const currentSheetName = importData.sheets[activeSheetIndex].name;
      list = list.filter(st => st.sheetName === currentSheetName);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        st =>
          st.nis.toLowerCase().includes(q) ||
          st.fullName.toLowerCase().includes(q) ||
          st.studentClass.toLowerCase().includes(q) ||
          st.sheetName.toLowerCase().includes(q)
      );
    }

    // Filter by class
    if (filterClass !== 'ALL') {
      list = list.filter(st => st.studentClass === filterClass);
    }

    // Filter by status
    if (filterStatus === 'valid') {
      list = list.filter(st => st.validationStatus === 'valid');
    } else if (filterStatus === 'duplicate') {
      list = list.filter(st => st.validationStatus === 'duplicate_database' || st.validationStatus === 'duplicate_file');
    } else if (filterStatus === 'incomplete') {
      list = list.filter(st => st.validationStatus === 'incomplete');
    }

    // Filter by selection
    if (filterSelection === 'included') {
      list = list.filter(st => st.isIncluded);
    } else if (filterSelection === 'ignored') {
      list = list.filter(st => !st.isIncluded);
    }

    return list;
  }, [importData, viewMode, activeSheetIndex, searchQuery, filterClass, filterStatus, filterSelection]);

  // Execute Import
  const handleProceedImport = () => {
    if (!importData) return;

    const itemsToImport = importData.allStudents.filter(s => s.isIncluded);
    if (itemsToImport.length === 0) {
      alert('Tidak ada data siswa yang dicentang untuk diimpor. Silakan centang minimal 1 siswa.');
      return;
    }

    const { updatedRoster, addedCount, updatedCount, skippedCount, quotaExceededCount } = applyImportedStudents(
      itemsToImport,
      rosterStudents,
      duplicateStrategy
    );

    // Save to parent state & localStorage
    onUpdateRoster(updatedRoster);

    setImportSuccessResult({
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
      quotaExceeded: quotaExceededCount,
      total: itemsToImport.length,
    });
  };

  const handleResetImport = () => {
    setImportData(null);
    setSelectedFile(null);
    setPastedText('');
    setParseError('');
    setImportSuccessResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      id="modal-multisheet-student-import"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Impor Data Siswa Multi-Sheet Excel
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Pratinjau Interaktif
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Maks. 400 NIS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dukungan file banyak sheet: satukan seluruh sheet atau pisahkan per-kelas dengan batas kapasitas 400 NIS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateMultiSheetTemplateExcel(schoolInfo.schoolName || DEFAULT_SCHOOL_INFO.schoolName)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Download contoh file Excel dengan 3 sheet kelas berbeda"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download Template Multi-Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* STEP 1: SUCCESS RESULT BANNER IF IMPORTED */}
          {importSuccessResult ? (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-2 border-emerald-500/50 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Impor Data Siswa Berhasil Diproses!</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  Data siswa dari spreadsheet Anda telah berhasil dimasukkan ke dalam daftar terdaftar CBT (Kapasitas saat ini: {rosterStudents.length} / {MAX_ROSTER_STUDENTS} NIS).
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto pt-2">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Diproses</span>
                  <span className="text-xl font-bold text-white">{importSuccessResult.total}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Siswa Baru</span>
                  <span className="text-xl font-bold text-emerald-400">+{importSuccessResult.added}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30">
                  <span className="text-[10px] text-amber-400 uppercase font-bold block">Diperbarui</span>
                  <span className="text-xl font-bold text-amber-400">{importSuccessResult.updated}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Dilewati</span>
                  <span className="text-xl font-bold text-slate-400">{importSuccessResult.skipped}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-rose-500/30">
                  <span className="text-[10px] text-rose-400 uppercase font-bold block">Batas 400 NIS</span>
                  <span className="text-xl font-bold text-rose-400">
                    {importSuccessResult.quotaExceeded > 0 ? `+${importSuccessResult.quotaExceeded} Dibatasi` : 'Aman'}
                  </span>
                </div>
              </div>

              {importSuccessResult.quotaExceeded > 0 && (
                <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs max-w-lg mx-auto flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>
                    Sebanyak <strong>{importSuccessResult.quotaExceeded} data siswa tidak diimpor</strong> karena kuota sistem dibatasi maksimal 400 NIS terdaftar.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleResetImport}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Impor File Lainnya</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Selesai & Tutup</span>
                </button>
              </div>
            </div>
          ) : !importData ? (
            /* STEP 2: UPLOAD & INPUT SECTION */
            <div className="space-y-4">
              {/* Method Selector Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Upload File Excel (.xlsx / .xls / .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Tempel Teks Spreadsheet (Paste Clipboard)</span>
                </button>
              </div>

              {parseError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{parseError}</span>
                </div>
              )}

              {activeTab === 'upload' ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-700 hover:border-indigo-500/70 bg-slate-900/50 hover:bg-indigo-950/20 transition-all text-center cursor-pointer space-y-4 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .tsv, .txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30 transition-transform group-hover:scale-105">
                    <Upload className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-200">
                      Tarik & Letakkan File Excel Multi-Sheet Di Sini
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Mendukung format <strong className="text-indigo-300">.XLSX</strong>, <strong className="text-indigo-300">.XLS</strong>, dan <strong className="text-indigo-300">.CSV</strong> dengan banyak sheet kelas secara bersamaan.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 group-hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/40">
                    <span>Pilih File Dari Komputer</span>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                    <span>✓ Otomatis Membaca Semua Sheet</span>
                    <span>✓ Deteksi Kolom Pintar</span>
                    <span>✓ Cek Duplikat Realtime</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      Salin kolom dari spreadsheet dan tempel di bawah. Format standar: <code className="text-white bg-slate-900 px-1.5 py-0.5 rounded font-mono">NIS, Nama Siswa, Kelas</code>
                    </span>
                  </div>

                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder="12001	Achmad Rizky Maulana	12 MIPA 1&#10;12002	Adinda Putri Maharani	12 MIPA 1&#10;12003	Bagus Prasetyo	12 MIPA 1&#10;12101	Jovian Pratama	12 IPS 1"
                    className="w-full p-4 bg-slate-950 border border-slate-700 rounded-2xl text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-600"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Pemisah otomatis terdeteksi (Tab Excel, Koma, atau Titik Koma)
                    </span>
                    <button
                      type="button"
                      onClick={handleParsePastedText}
                      disabled={isParsing || !pastedText.trim()}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isParsing ? 'Memproses...' : 'Buka Pratinjau Data'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP 3: INTERACTIVE PREVIEW & SELECTION VIEW */
            <div className="space-y-4 animate-in fade-in">
              {/* Top Overview & Mode Switcher */}
              <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-sm">
                        File: {importData.fileName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                        {importData.totalSheets} Sheet Terbaca
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Tinjau data di bawah ini. Anda dapat mencentang, mengabaikan baris tertentu, atau mengubah kelas sebelum data resmi diimpor.
                    </p>
                  </div>

                  {/* Mode Satukan vs Pisahkan Per-Kelas */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-700 self-stretch sm:self-auto justify-center">
                    <button
                      type="button"
                      onClick={() => setViewMode('combined')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'combined'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Menyatukan seluruh data siswa dari semua sheet dalam satu tabel master"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Satukan Semua Sheet ({importData.allStudents.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode('separated')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'separated'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Menampilkan dan memfilter data per masing-masing sheet / kelas"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Pisahkan Per-Sheet / Kelas</span>
                    </button>
                  </div>
                </div>

                {/* Statistical Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80">
                  <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Terbaca</span>
                    <span className="text-base font-bold text-white">{importData.summary.totalDetected} Siswa</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-center">
                    <span className="text-[10px] text-indigo-300 uppercase font-bold block">Akan Diimpor</span>
                    <span className="text-base font-bold text-indigo-300">
                      {importData.allStudents.filter(s => s.isIncluded).length} Siswa
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">Valid Baru</span>
                    <span className="text-base font-bold text-emerald-400">{importData.summary.totalValid}</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-center">
                    <span className="text-[10px] text-amber-400 uppercase font-bold block">Duplikat Terdeteksi</span>
                    <span className="text-base font-bold text-amber-400">{importData.summary.totalDuplicates}</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Kelas Terbentuk</span>
                    <span className="text-base font-bold text-purple-300">
                      {importData.summary.uniqueClasses.length} Kelas
                    </span>
                  </div>
                </div>

                {/* Capacity & 400 NIS Limit Status Bar */}
                {(() => {
                  const currentCount = rosterStudents.length;
                  const availableSlots = Math.max(0, MAX_ROSTER_STUDENTS - currentCount);
                  const selectedCount = importData.allStudents.filter(s => s.isIncluded).length;
                  const isNearOrOver = currentCount + selectedCount > MAX_ROSTER_STUDENTS;
                  const percentage = Math.min(100, Math.round((currentCount / MAX_ROSTER_STUDENTS) * 100));

                  return (
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                            Kapasitas Kuota Sistem NIS:
                          </span>
                          <span className="font-semibold text-indigo-300">
                            {currentCount} / {MAX_ROSTER_STUDENTS} Terisi
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            (Sisa Kuota: <strong className="text-emerald-400">{availableSlots}</strong> Siswa)
                          </span>
                        </div>

                        <div className="text-[11px] font-medium text-slate-400">
                          Maksimum {MAX_ROSTER_STUDENTS} NIS Terdaftar
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
                        <div
                          className={`h-full transition-all duration-300 ${
                            percentage >= 95
                              ? 'bg-rose-500'
                              : percentage >= 75
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {isNearOrOver && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                          <span>
                            <strong>Peringatan Batas 400 NIS:</strong> Total siswa terdaftar saat ini ({currentCount}) ditambah siswa terpilih ({selectedCount}) melebihi kuota 400 siswa. Sistem secara otomatis hanya akan mengimpor hingga batas 400 NIS pertama tercapai.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Per-Sheet Cards / Selector Tabs */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                      Daftar Sheet Terdeteksi ({importData.sheets.length} Sheet):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Klik nama sheet untuk beralih / ubah nama kelas sheet
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {importData.sheets.map((sheet, sIdx) => {
                      const isSheetActive = viewMode === 'separated' && activeSheetIndex === sIdx;
                      return (
                        <div
                          key={sheet.name}
                          className={`p-3 rounded-2xl border transition-all ${
                            isSheetActive
                              ? 'bg-indigo-950/60 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                              : sheet.isIncluded
                              ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600'
                              : 'bg-slate-950/60 border-slate-800 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={sheet.isIncluded}
                                onChange={e => handleToggleSheetInclusion(sheet.name, e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-white truncate max-w-[130px]">
                                {sheet.name}
                              </span>
                            </label>

                            {viewMode === 'separated' && (
                              <button
                                type="button"
                                onClick={() => setActiveSheetIndex(sIdx)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                                  isSheetActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {isSheetActive ? 'Sedang Dilihat' : 'Buka Sheet'}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 mt-2 border-t border-slate-800">
                            <span>{sheet.totalRows} Siswa</span>
                            <span className="text-emerald-400">{sheet.validCount} Valid</span>
                            {sheet.duplicateCount > 0 && (
                              <span className="text-amber-400">{sheet.duplicateCount} Duplikat</span>
                            )}
                          </div>

                          {/* Quick Class Override */}
                          <div className="mt-2 pt-1 flex items-center gap-1.5 text-[10px]">
                            <span className="text-slate-400 shrink-0">Target Kelas:</span>
                            <input
                              type="text"
                              value={sheet.targetClassOverride || sheet.name}
                              onChange={e => handleUpdateSheetClass(sheet.name, e.target.value)}
                              placeholder="Ubah Kelas"
                              className="w-full px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-slate-200 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Duplicate Handling Strategy Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Strategi Penanganan NIS Duplikat:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      duplicateStrategy === 'skip'
                        ? 'bg-indigo-950/40 border-indigo-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dup_strategy"
                      value="skip"
                      checked={duplicateStrategy === 'skip'}
                      onChange={() => setDuplicateStrategy('skip')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <strong className="block text-white font-semibold">1. Lewati / Abaikan Duplikat (Rekomendasi)</strong>
                      <span className="text-[11px] text-slate-400">
                        NIS yang sudah ada di database tidak akan ditimpa atau digandakan.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      duplicateStrategy === 'overwrite'
                        ? 'bg-amber-950/40 border-amber-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dup_strategy"
                      value="overwrite"
                      checked={duplicateStrategy === 'overwrite'}
                      onChange={() => setDuplicateStrategy('overwrite')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <strong className="block text-white font-semibold">2. Perbarui / Timpa Data</strong>
                      <span className="text-[11px] text-slate-400">
                        Nama dan Kelas dari Excel akan memperbarui data siswa yang sudah ada.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      duplicateStrategy === 'append'
                        ? 'bg-purple-950/40 border-purple-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dup_strategy"
                      value="append"
                      checked={duplicateStrategy === 'append'}
                      onChange={() => setDuplicateStrategy('append')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <strong className="block text-white font-semibold">3. Tambahkan Semua Sebagai Baru</strong>
                      <span className="text-[11px] text-slate-400">
                        Tetap ditambahkan sebagai entri baru meski NIS serupa.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Table Action Bar & Filters */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari NIS / Nama / Kelas..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <select
                    value={filterClass}
                    onChange={e => setFilterClass(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    <option value="ALL">Semua Kelas ({importData.summary.uniqueClasses.length})</option>
                    {importData.summary.uniqueClasses.map(cls => (
                      <option key={cls} value={cls}>
                        {cls} ({importData.allStudents.filter(s => s.studentClass === cls).length})
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="valid">Hanya Valid ({importData.summary.totalValid})</option>
                    <option value="duplicate">Hanya Duplikat ({importData.summary.totalDuplicates})</option>
                    <option value="incomplete">Hanya Tidak Lengkap ({importData.summary.totalIncomplete})</option>
                  </select>

                  <select
                    value={filterSelection}
                    onChange={e => setFilterSelection(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    <option value="ALL">Semua Pilihan</option>
                    <option value="included">Hanya Dicentang (Akan Diimpor)</option>
                    <option value="ignored">Hanya Diabaikan</option>
                  </select>
                </div>

                {/* Batch Selection Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectAllValid}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 text-[11px] font-semibold transition-colors cursor-pointer"
                    title="Centang hanya siswa yang valid dan tidak kosong"
                  >
                    Centang Semua Valid
                  </button>

                  <button
                    type="button"
                    onClick={handleIgnoreAllDuplicates}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-600/40 text-[11px] font-semibold transition-colors cursor-pointer"
                    title="Abaikan dan hilangkan centang semua data yang duplikat"
                  >
                    Abaikan Duplikat
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                    title="Pilih Semua"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs border border-slate-700 transition-colors"
                    title="Batalkan Pilihan Semua"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/80">
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-3 w-10 text-center">
                          <span className="sr-only">Centang</span>
                        </th>
                        <th className="px-3 py-3">Sheet Asal</th>
                        <th className="px-3 py-3">NIS</th>
                        <th className="px-3 py-3">Nama Siswa</th>
                        <th className="px-3 py-3">Kelas / Rombel</th>
                        <th className="px-3 py-3">Status Validasi</th>
                        <th className="px-3 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {displayedStudents.length > 0 ? (
                        displayedStudents.map(item => {
                          const isEditing = editingItemId === item.id;
                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                !item.isIncluded
                                  ? 'bg-slate-950/40 opacity-50'
                                  : item.validationStatus === 'duplicate_database'
                                  ? 'bg-amber-950/15 hover:bg-amber-950/30'
                                  : item.validationStatus === 'incomplete'
                                  ? 'bg-rose-950/20 hover:bg-rose-950/30'
                                  : 'hover:bg-slate-800/40'
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.isIncluded}
                                  onChange={() => handleToggleItemInclusion(item.id)}
                                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                                  title={item.isIncluded ? 'Abaikan / Jangan Impor' : 'Sertakan untuk Diimpor'}
                                />
                              </td>

                              {/* Sheet Name */}
                              <td className="px-3 py-2.5">
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
                                  {item.sheetName}
                                </span>
                              </td>

                              {/* NIS */}
                              <td className="px-3 py-2.5 font-mono font-bold">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editFormNis}
                                    onChange={e => setEditFormNis(e.target.value)}
                                    className="w-24 px-2 py-0.5 bg-slate-950 border border-indigo-500 rounded text-indigo-300 font-mono text-xs focus:outline-none"
                                  />
                                ) : (
                                  <span className={item.nis ? 'text-indigo-300' : 'text-rose-400 italic'}>
                                    {item.nis || '(Kosong)'}
                                  </span>
                                )}
                              </td>

                              {/* Nama Siswa */}
                              <td className="px-3 py-2.5 font-medium">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editFormName}
                                    onChange={e => setEditFormName(e.target.value)}
                                    className="w-full px-2 py-0.5 bg-slate-950 border border-indigo-500 rounded text-white text-xs focus:outline-none"
                                  />
                                ) : (
                                  <span className={item.fullName ? 'text-white' : 'text-rose-400 italic'}>
                                    {item.fullName || '(Nama Belum Diisi)'}
                                  </span>
                                )}
                              </td>

                              {/* Kelas */}
                              <td className="px-3 py-2.5">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editFormClass}
                                    onChange={e => setEditFormClass(e.target.value)}
                                    className="w-28 px-2 py-0.5 bg-slate-950 border border-indigo-500 rounded text-slate-200 text-xs focus:outline-none"
                                  />
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-500/30 text-[11px] font-semibold">
                                    {item.studentClass}
                                  </span>
                                )}
                              </td>

                              {/* Validation Status Badge */}
                              <td className="px-3 py-2.5">
                                {!item.isIncluded ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                    Diabaikan
                                  </span>
                                ) : item.validationStatus === 'valid' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    Siap Impor
                                  </span>
                                ) : item.validationStatus === 'duplicate_database' ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                    title="NIS sudah ada di sistem. Akan disesuaikan dengan opsi strategi di atas."
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                    Duplikat Sistem
                                  </span>
                                ) : item.validationStatus === 'duplicate_file' ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30"
                                    title="NIS muncul berulang kali di dalam file Excel"
                                  >
                                    <AlertTriangle className="w-3 h-3 text-orange-400" />
                                    Duplikat di File
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                    title={item.validationMessage}
                                  >
                                    <AlertCircle className="w-3 h-3 text-rose-400" />
                                    Data Kosong
                                  </span>
                                )}
                              </td>

                              {/* Row Action Buttons */}
                              <td className="px-3 py-2.5 text-right space-x-1">
                                {isEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineEdit(item.id)}
                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                                  >
                                    Simpan
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleItemInclusion(item.id)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                      title={item.isIncluded ? 'Abaikan Siswa Ini' : 'Sertakan Siswa Ini'}
                                    >
                                      {item.isIncluded ? (
                                        <EyeOff className="w-3.5 h-3.5" />
                                      ) : (
                                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleStartInlineEdit(item)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                                      title="Edit Cepat Baris Ini"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                      title="Hapus dari daftar pratinjau"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                            Tidak ada siswa yang cocok dengan filter yang dipilih.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    Menampilkan <strong>{displayedStudents.length}</strong> siswa (Total dalam file: {importData.allStudents.length})
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    ✓ {importData.allStudents.filter(s => s.isIncluded).length} Siswa Terpilih Siap Diimpor
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between flex-wrap gap-3">
          <div>
            {importData && !importSuccessResult && (
              <button
                type="button"
                onClick={handleResetImport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ganti / Upload File Baru</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              {importSuccessResult ? 'Tutup' : 'Abaikan & Batal'}
            </button>

            {importData && !importSuccessResult && (
              <button
                type="button"
                onClick={handleProceedImport}
                disabled={importData.allStudents.filter(s => s.isIncluded).length === 0}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-900/40 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>
                  Diteruskan untuk di-Import ({importData.allStudents.filter(s => s.isIncluded).length} Siswa Terpilih)
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
