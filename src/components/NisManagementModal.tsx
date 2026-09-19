import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  Check,
  AlertCircle,
  Clock,
  Radio,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  Smartphone,
  Monitor,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  School,
  CheckSquare,
  Square,
  MinusSquare,
  CheckCheck,
  Eraser,
  Layers,
  Fingerprint,
  BookOpen,
  Star,
  GraduationCap,
} from 'lucide-react';
import {
  StudentRosterEntry,
  NisSecuritySettings,
  ActiveExamSession,
  NisValidationMode,
  DEFAULT_NIS_SECURITY_SETTINGS,
  SchoolInfo,
  DEFAULT_SCHOOL_INFO,
  MAX_ROSTER_STUDENTS,
  SmaGrade,
  SmaMajor,
} from '../types';
import {
  isGlobalTokenRequired,
  setGlobalTokenRequired,
} from '../utils/tokenSecurity';
import { INITIAL_STUDENT_ROSTER } from '../data/mockStudentRoster';
import { SMA_SUBJECTS_LIST } from '../data/mockSmaData';
import {
  getDefaultSubject,
  getDefaultClass,
  getDefaultGrade,
  getDefaultMajor,
  setDefaultSubjectAndClass,
  inferGradeAndMajorFromClass,
} from '../utils/defaultSettingsHelper';
import {
  getAllActiveSessions,
  forceResetSessionByNis,
  forceResetAllActiveSessions,
} from '../utils/sessionManager';
import {
  getMasterClasses,
  getMasterSubjects,
  subscribeMasterSubjectClass,
} from '../utils/centralSubjectClassManager';
import { MultiSheetStudentImportModal } from './MultiSheetStudentImportModal';
import { generateMultiSheetTemplateExcel } from '../utils/studentRosterImportUtils';

interface NisManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  rosterStudents: StudentRosterEntry[];
  onUpdateRoster: (students: StudentRosterEntry[]) => void;
  securitySettings: NisSecuritySettings;
  onUpdateSecuritySettings?: (settings: NisSecuritySettings) => void;
  onUpdateSettings?: (settings: NisSecuritySettings) => void;
  activeSessionsCount?: number;
  schoolInfo?: SchoolInfo;
  onOpenEditKop?: () => void;
  onOpenCentralSubjectClass?: () => void;
}

export const NisManagementModal: React.FC<NisManagementModalProps> = ({
  isOpen,
  onClose,
  rosterStudents,
  onUpdateRoster,
  securitySettings,
  onUpdateSecuritySettings,
  onUpdateSettings,
  schoolInfo = DEFAULT_SCHOOL_INFO,
  onOpenEditKop,
  onOpenCentralSubjectClass,
}) => {
  const saveSettingsCallback = onUpdateSecuritySettings || onUpdateSettings;
  const [activeTab, setActiveTab] = useState<'settings' | 'roster' | 'live_sessions' | 'school_kop'>('settings');

  // Form State for Settings
  const [currentSettings, setCurrentSettings] = useState<NisSecuritySettings>(securitySettings);
  const [savedSettingsSuccess, setSavedSettingsSuccess] = useState(false);

  // Master subjects & classes state
  const [masterClasses, setMasterClasses] = useState(() => getMasterClasses());
  const [masterSubjects, setMasterSubjects] = useState(() => getMasterSubjects());

  useEffect(() => {
    const unsub = subscribeMasterSubjectClass(() => {
      setMasterClasses(getMasterClasses());
      setMasterSubjects(getMasterSubjects());
    });
    return unsub;
  }, []);

  // Sync settings when modal opens
  useEffect(() => {
    setCurrentSettings({
      ...securitySettings,
    });
  }, [securitySettings, isOpen]);

  // Available classes strictly from centralized master classes
  const availableRosterClasses = useMemo(() => {
    return masterClasses.map(c => c.name).sort();
  }, [masterClasses]);

  // Live active sessions
  const [activeSessions, setActiveSessions] = useState<ActiveExamSession[]>([]);
  const [sessionActionMsg, setSessionActionMsg] = useState<string>('');

  const refreshSessions = () => {
    const sessions = getAllActiveSessions(currentSettings.sessionTimeoutMinutes);
    setActiveSessions(sessions);
  };

  useEffect(() => {
    if (isOpen) {
      refreshSessions();
      const interval = setInterval(refreshSessions, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, currentSettings.sessionTimeoutMinutes]);

  // Roster Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [editingStudent, setEditingStudent] = useState<StudentRosterEntry | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isMultiSheetImportOpen, setIsMultiSheetImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Multi-Selection State for Bulk Actions (Hapus NIS Terpilih)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);

  // Reset Data NIS Dialog State (Kosongkan / Default / Per Kelas)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetOption, setResetOption] = useState<'clear_all' | 'restore_default' | 'delete_class'>('clear_all');
  const [selectedClassToDelete, setSelectedClassToDelete] = useState('');

  // Toast / Feedback message
  const [rosterToastMsg, setRosterToastMsg] = useState('');
  const showToast = (msg: string) => {
    setRosterToastMsg(msg);
    setTimeout(() => setRosterToastMsg(''), 3500);
  };

  // New Student Form State
  const [formNis, setFormNis] = useState('');
  const [formName, setFormName] = useState('');
  const [formClass, setFormClass] = useState('12 MIPA 1');
  const [formSchool, setFormSchool] = useState(schoolInfo.schoolName || DEFAULT_SCHOOL_INFO.schoolName);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  // Extract unique classes for filter
  const classList = Array.from(new Set(rosterStudents.map(s => s.studentClass))).sort();

  // Filtered roster
  const filteredRoster = rosterStudents.filter(student => {
    const matchesSearch =
      student.nis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentClass.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClassFilter === 'ALL' || student.studentClass === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  // Multi-Selection Checkbox States
  const isAllFilteredSelected =
    filteredRoster.length > 0 && filteredRoster.every(s => selectedStudentIds.has(s.id));
  const isSomeFilteredSelected =
    filteredRoster.some(s => selectedStudentIds.has(s.id)) && !isAllFilteredSelected;

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredRoster.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredRoster.forEach(s => next.add(s.id));
        return next;
      });
    }
  };

  const handleSelectAllTotal = () => {
    setSelectedStudentIds(new Set(rosterStudents.map(s => s.id)));
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Bulk Delete Selected NIS
  const handleExecuteBulkDelete = () => {
    if (selectedStudentIds.size === 0) return;
    const count = selectedStudentIds.size;
    const updated = rosterStudents.filter(s => !selectedStudentIds.has(s.id));
    onUpdateRoster(updated);
    setSelectedStudentIds(new Set());
    setIsConfirmBulkDeleteOpen(false);
    showToast(`Berhasil menghapus ${count} data siswa (NIS) terpilih.`);
  };

  // Bulk Activate / Deactivate Selected
  const handleBulkSetStatus = (active: boolean) => {
    if (selectedStudentIds.size === 0) return;
    const count = selectedStudentIds.size;
    const updated = rosterStudents.map(s =>
      selectedStudentIds.has(s.id) ? { ...s, isActive: active } : s
    );
    onUpdateRoster(updated);
    showToast(`Berhasil ${active ? 'mengaktifkan' : 'menonaktifkan'} ${count} siswa terpilih.`);
  };

  // Reset Roster Options Handler
  const handleExecuteReset = () => {
    if (resetOption === 'clear_all') {
      const prevCount = rosterStudents.length;
      onUpdateRoster([]);
      setSelectedStudentIds(new Set());
      setIsResetModalOpen(false);
      showToast(`Seluruh data NIS (${prevCount} siswa) berhasil dikosongkan.`);
    } else if (resetOption === 'restore_default') {
      onUpdateRoster(INITIAL_STUDENT_ROSTER.slice(0, MAX_ROSTER_STUDENTS));
      setSelectedStudentIds(new Set());
      setIsResetModalOpen(false);
      showToast('Database NIS berhasil di-reset ke 23 siswa SMA contoh.');
    } else if (resetOption === 'delete_class') {
      if (!selectedClassToDelete) {
        alert('Pilih kelas/rombel yang ingin dihapus terlebih dahulu.');
        return;
      }
      const countToDelete = rosterStudents.filter(s => s.studentClass === selectedClassToDelete).length;
      const updated = rosterStudents.filter(s => s.studentClass !== selectedClassToDelete);
      onUpdateRoster(updated);
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        rosterStudents.filter(s => s.studentClass === selectedClassToDelete).forEach(s => next.delete(s.id));
        return next;
      });
      setIsResetModalOpen(false);
      showToast(`Semua siswa di kelas "${selectedClassToDelete}" (${countToDelete} siswa) berhasil dihapus.`);
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    if (saveSettingsCallback) {
      saveSettingsCallback(currentSettings);
    }
    // Synchronize global token security state
    if (typeof currentSettings.isTokenRequired === 'boolean') {
      setGlobalTokenRequired(currentSettings.isTokenRequired, true);
    }
    if (typeof currentSettings.logoTapCount === 'number') {
      try {
        localStorage.setItem('cbt_logo_tap_count_v1', String(currentSettings.logoTapCount));
      } catch (e) {}
    }
    if (currentSettings.defaultSubject || currentSettings.defaultClass) {
      const subjectToSave = currentSettings.defaultSubject || getDefaultSubject();
      const classToSave = currentSettings.defaultClass || getDefaultClass();
      const inferred = inferGradeAndMajorFromClass(classToSave);
      const gradeToSave = currentSettings.defaultGrade || inferred.grade;
      const majorToSave = currentSettings.defaultMajor || inferred.major;

      setDefaultSubjectAndClass(
        subjectToSave,
        classToSave,
        gradeToSave,
        majorToSave,
        true
      );
    }
    setSavedSettingsSuccess(true);
    setTimeout(() => setSavedSettingsSuccess(false), 2500);
  };

  // Add / Edit Student Submit
  const handleSubmitStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanNis = formNis.trim();
    const cleanName = formName.trim();
    const cleanClass = formClass.trim();

    if (!cleanNis) {
      setFormError('Nomor Induk Siswa (NIS) wajib diisi.');
      return;
    }
    if (!cleanName) {
      setFormError('Nama lengkap siswa wajib diisi.');
      return;
    }
    if (!cleanClass) {
      setFormError('Kelas siswa wajib ditentukan.');
      return;
    }

    // Check duplicate NIS
    const duplicate = rosterStudents.find(
      s => s.nis.toLowerCase() === cleanNis.toLowerCase() && (!editingStudent || s.id !== editingStudent.id)
    );
    if (duplicate) {
      setFormError(`NIS "${cleanNis}" sudah digunakan oleh siswa "${duplicate.fullName}".`);
      return;
    }

    if (editingStudent) {
      // Edit existing
      const updated = rosterStudents.map(s =>
        s.id === editingStudent.id
          ? {
              ...s,
              nis: cleanNis,
              fullName: cleanName,
              studentClass: cleanClass,
              schoolName: formSchool.trim() || undefined,
              notes: formNotes.trim() || undefined,
            }
          : s
      );
      onUpdateRoster(updated);
      setEditingStudent(null);
    } else {
      // Check 400 NIS limit
      if (rosterStudents.length >= MAX_ROSTER_STUDENTS) {
        setFormError(`Kapasitas maksimum ${MAX_ROSTER_STUDENTS} NIS telah tercapai. Hapus atau edit siswa yang tidak diperlukan untuk menambah data baru.`);
        return;
      }

      // Add new
      const newEntry: StudentRosterEntry = {
        id: 'roster-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        nis: cleanNis,
        fullName: cleanName,
        studentClass: cleanClass,
        schoolName: formSchool.trim() || undefined,
        isActive: true,
        notes: formNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      onUpdateRoster([newEntry, ...rosterStudents].slice(0, MAX_ROSTER_STUDENTS));
    }

    // Reset form
    setFormNis('');
    setFormName('');
    setFormNotes('');
    setIsAddStudentOpen(false);
  };

  const handleStartEdit = (student: StudentRosterEntry) => {
    setEditingStudent(student);
    setFormNis(student.nis);
    setFormName(student.fullName);
    setFormClass(student.studentClass);
    setFormSchool(student.schoolName || 'SMA Negeri 1 Edukasi');
    setFormNotes(student.notes || '');
    setFormError('');
    setIsAddStudentOpen(true);
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (window.confirm(`Hapus siswa "${name}" dari daftar terdaftar?`)) {
      const updated = rosterStudents.filter(s => s.id !== id);
      onUpdateRoster(updated);
    }
  };

  const handleToggleStudentActive = (id: string) => {
    const updated = rosterStudents.map(s => (s.id === id ? { ...s, isActive: !s.isActive } : s));
    onUpdateRoster(updated);
  };

  const handleResetToDefaultRoster = () => {
    if (window.confirm('Reset daftar siswa kembali ke data default 23 siswa SMA contoh?')) {
      onUpdateRoster(INITIAL_STUDENT_ROSTER);
    }
  };

  // Bulk Import CSV/Excel paste
  const handleBulkImport = () => {
    setImportError('');
    setImportSuccessMsg('');
    if (!importText.trim()) {
      setImportError('Silakan tempel teks data siswa terlebih dahulu.');
      return;
    }

    const lines = importText.split('\n');
    const newStudents: StudentRosterEntry[] = [];
    let skippedCount = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Detect separator: Tab, Comma, or Semicolon
      let parts: string[] = [];
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t');
      } else if (trimmed.includes(',')) {
        parts = trimmed.split(',');
      } else if (trimmed.includes(';')) {
        parts = trimmed.split(';');
      } else {
        parts = trimmed.split(/\s{2,}/); // 2 or more spaces
      }

      if (parts.length >= 2) {
        const fallbackClass = masterClasses[0]?.name || 'Kelas X';
        const nis = parts[0].trim().replace(/^["']|["']$/g, '');
        const name = parts[1].trim().replace(/^["']|["']$/g, '');
        const studentClass = parts[2] ? parts[2].trim().replace(/^["']|["']$/g, '') : fallbackClass;

        // Skip header if line 0 is "NIS, Nama, Kelas"
        if (nis.toLowerCase() === 'nis' || name.toLowerCase().includes('nama')) {
          return;
        }

        if (nis && name) {
          // Check if already in new list or existing
          const alreadyInNew = newStudents.some(s => s.nis.toLowerCase() === nis.toLowerCase());
          if (!alreadyInNew) {
            newStudents.push({
              id: 'roster-imp-' + Date.now() + '-' + index,
              nis,
              fullName: name,
              studentClass: studentClass || fallbackClass,
              schoolName: schoolInfo.schoolName || DEFAULT_SCHOOL_INFO.schoolName,
              isActive: true,
              notes: 'Diimpor Massal',
              createdAt: new Date().toISOString(),
            });
          } else {
            skippedCount++;
          }
        }
      }
    });

    if (newStudents.length === 0) {
      setImportError('Format tidak dikenali. Pastikan format setiap baris: NIS, Nama Siswa, Kelas');
      return;
    }

    // Merge without duplicate NIS
    const existingNisMap = new Set(rosterStudents.map(s => s.nis.toLowerCase()));
    const finalNew = newStudents.filter(s => !existingNisMap.has(s.nis.toLowerCase()));

    const availableSlots = Math.max(0, MAX_ROSTER_STUDENTS - rosterStudents.length);
    if (availableSlots <= 0) {
      setImportError(`Kapasitas database telah mencapai batas maksimum ${MAX_ROSTER_STUDENTS} NIS. Tidak dapat menambah siswa baru.`);
      return;
    }

    const studentsToAdd = finalNew.slice(0, availableSlots);
    const quotaExceededCount = finalNew.length - studentsToAdd.length;
    const updated = [...studentsToAdd, ...rosterStudents].slice(0, MAX_ROSTER_STUDENTS);

    onUpdateRoster(updated);
    
    if (quotaExceededCount > 0) {
      setImportSuccessMsg(`Berhasil mengimpor ${studentsToAdd.length} siswa baru (${quotaExceededCount} data diabaikan karena batas kuota ${MAX_ROSTER_STUDENTS} NIS).`);
    } else {
      setImportSuccessMsg(`Berhasil mengimpor ${studentsToAdd.length} siswa baru! (${skippedCount} duplikat diabaikan)`);
    }
    setImportText('');
    setTimeout(() => {
      setIsImportOpen(false);
      setImportSuccessMsg('');
    }, 2500);
  };

  // Force Unlock / Reset Session
  const handleForceResetSession = (nis: string, name: string) => {
    if (window.confirm(`Buka kunci dan akhiri sesi aktif untuk siswa: ${name} (NIS: ${nis})? Siswa akan dapat login kembali.`)) {
      forceResetSessionByNis(nis);
      refreshSessions();
      setSessionActionMsg(`Sesi siswa ${name} (${nis}) berhasil di-reset & dibuka kuncinya.`);
      setTimeout(() => setSessionActionMsg(''), 3500);
    }
  };

  const handleResetAllSessions = () => {
    if (window.confirm('Reset SEMUA sesi aktif yang sedang berlangsung? Semua siswa yang sedang ujian akan dibuka kuncinya.')) {
      forceResetAllActiveSessions();
      refreshSessions();
      setSessionActionMsg('Semua sesi aktif berhasil dibersihkan.');
      setTimeout(() => setSessionActionMsg(''), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Pengaturan Mode NIS & Manajemen Sesi Ujian
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Guru & Pengawas
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kontrol validasi NIS terdaftar dan kunci pengerjaan single-session (anti dual-login)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-7 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between flex-wrap gap-2 pt-2">
          <div className="flex space-x-2 sm:space-x-4 overflow-x-auto max-w-full pb-0.5 whitespace-nowrap">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 pb-3 pt-1 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>1. Mode NIS & Keamanan Sesi</span>
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center space-x-2 pb-3 pt-1 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'roster'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>2. Data Siswa Terdaftar</span>
              <span className={`ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                rosterStudents.length >= MAX_ROSTER_STUDENTS
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {rosterStudents.length}/{MAX_ROSTER_STUDENTS}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('live_sessions')}
              className={`flex items-center space-x-2 pb-3 pt-1 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'live_sessions'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>3. Monitor Sesi Aktif</span>
              {activeSessions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {activeSessions.length} Aktif
                </span>
              )}
            </button>
          </div>

          {/* Quick status pill & Kop button */}
          <div className="hidden sm:flex items-center gap-2 pb-2">
            {onOpenEditKop && (
              <button
                type="button"
                onClick={onOpenEditKop}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                title="Buka Editor Kop Surat & Identitas Bawaan Sekolah"
              >
                <School className="w-3.5 h-3.5 text-amber-400" />
                <span>Kop Sekolah</span>
              </button>
            )}

            <span
              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5 ${
                currentSettings.validationMode === 'registered_only'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              {currentSettings.validationMode === 'registered_only' ? 'Mode: NIS Terdaftar' : 'Mode: Bebas (Semua NIS)'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PENGATURAN MODE NIS & KEAMANAN SESI */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Alert Notification */}
              {savedSettingsSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Pengaturan validasi NIS dan keamanan sesi berhasil disimpan!</span>
                </div>
              )}

              {/* 1. Mode Validasi NIS */}
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      Mode Validasi Masuk Siswa (NIS)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tentukan apakah hanya siswa dalam daftar terdaftar (whitelist) yang boleh memulai ujian
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {/* Option A: Hanya NIS Terdaftar (Strict) */}
                  <label
                    onClick={() => setCurrentSettings({ ...currentSettings, validationMode: 'registered_only' })}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      currentSettings.validationMode === 'registered_only'
                        ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="nisMode"
                      checked={currentSettings.validationMode === 'registered_only'}
                      onChange={() => setCurrentSettings({ ...currentSettings, validationMode: 'registered_only' })}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Hanya NIS Terdaftar (Strict Roster)</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300">
                          Rekomendasi Ujian Resmi
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Siswa wajib memasukkan NIS yang ada di database. Nama & kelas otomatis terkunci/terisi sesuai data resmi.
                      </p>
                      <div className="text-[11px] text-indigo-300 font-medium pt-1">
                        🔒 Mencegah siswa palsu, joki, atau salah memasukkan identitas.
                      </div>
                    </div>
                  </label>

                  {/* Option B: Mode Bebas / Open */}
                  <label
                    onClick={() => setCurrentSettings({ ...currentSettings, validationMode: 'open' })}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      currentSettings.validationMode === 'open'
                        ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="nisMode"
                      checked={currentSettings.validationMode === 'open'}
                      onChange={() => setCurrentSettings({ ...currentSettings, validationMode: 'open' })}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Mode Terbuka / Bebas</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-700 text-slate-300">
                          Latihan Mandiri
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Semua nomor NIS diizinkan masuk. Siswa bebas mengetikkan nama lengkap, kelas, dan NIS masing-masing secara manual.
                      </p>
                      <div className="text-[11px] text-amber-300/90 font-medium pt-1">
                        🔓 Cocok untuk tryout terbuka atau drill mandiri siswa di rumah.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Single Session Lock (Anti Dual-Login) */}
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-rose-400" />
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Kunci 1 Sesi per NIS (Anti-Dual Login)
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Proteksi Ketat
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Mencegah satu nomor NIS melakukan ujian secara bersamaan di 2 perangkat / browser berbeda.
                    </p>
                  </div>
                  {/* Switch toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSettings({
                        ...currentSettings,
                        enforceSingleSession: !currentSettings.enforceSingleSession,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentSettings.enforceSingleSession ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        currentSettings.enforceSingleSession ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {currentSettings.enforceSingleSession && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs space-y-2">
                    <div className="flex items-start gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Cara Kerja:</strong> Saat siswa mulai mengerjakan ujian, sesi aktif akan didaftarkan. Jika ada orang lain yang mencoba login dengan NIS yang sama dari tab / HP lain, sistem akan memblokir dan menampilkan peringatan <em>"NIS sedang aktif di perangkat lain"</em>.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2.5 Fitur Aktifkan / Nonaktifkan Token Ujian Siswa */}
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {currentSettings.isTokenRequired === true ? (
                        <KeyRound className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Unlock className="w-4 h-4 text-emerald-400" />
                      )}
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Validasi Token Ujian Siswa
                      </h3>
                      {currentSettings.isTokenRequired === true ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Token Aktif (Wajib)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Token Opsional (Bebas)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Atur apakah siswa wajib memasukkan kode token resmi sebelum memulai pengerjaan lembar ujian.
                    </p>
                  </div>

                  {/* Switch toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = currentSettings.isTokenRequired === true ? false : true;
                      setCurrentSettings({
                        ...currentSettings,
                        isTokenRequired: nextVal,
                      });
                      setGlobalTokenRequired(nextVal, true);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentSettings.isTokenRequired === true ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        currentSettings.isTokenRequired === true ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  currentSettings.isTokenRequired === true
                    ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                    : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {currentSettings.isTokenRequired === true ? (
                      <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <span>
                      {currentSettings.isTokenRequired === true ? (
                        <>
                          <strong>Mode Normal (Token Wajib Diisi):</strong> Siswa wajib memasukkan kode token resmi dari pengawas sebelum ujian dapat dimulai, terlepas status token tersebut sebelumnya.
                        </>
                      ) : (
                        <>
                          <strong>Mode Bebas (Token Bebas / Tidak Wajib):</strong> Siswa dapat langsung masuk dan mengerjakan ujian secara bebas tanpa harus mengisi token, terlepas status token tersebut sebelumnya.
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-6 border-t border-slate-700/40 pt-1.5">
                    ⚡ <strong>Aturan Mutlak Mode Ujian:</strong> Pada saat mode normal maka status token wajib diisi terlepas status token tersebut sebelumnya, dan jika mode bebas maka status token bebas terlepas status token sebelumnya.
                  </p>
                </div>
              </div>

              {/* 3. PIN Pengawas & Timeout Sesi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supervisor PIN (Can be enabled or disabled) */}
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {currentSettings.enableSupervisorPin !== false ? (
                        <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-white block">
                          Proteksi PIN Guru / Pengawas
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {currentSettings.enableSupervisorPin !== false
                            ? 'Aktif (Memerlukan 4 Digit PIN)'
                            : 'Dinonaktifkan (Bebas Akses)'}
                        </span>
                      </div>
                    </div>

                    {/* Toggle switch for PIN Guru */}
                    <button
                      type="button"
                      id="toggle-supervisor-pin-active"
                      onClick={() =>
                        setCurrentSettings({
                          ...currentSettings,
                          enableSupervisorPin: currentSettings.enableSupervisorPin === false ? true : false,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        currentSettings.enableSupervisorPin !== false ? 'bg-amber-600' : 'bg-slate-700'
                      }`}
                      title={currentSettings.enableSupervisorPin !== false ? 'Klik untuk nonaktifkan PIN' : 'Klik untuk aktifkan PIN'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          currentSettings.enableSupervisorPin !== false ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    PIN rahasia untuk otorisasi akses menu pengawas, beralih peran ke admin, dan membuka paksa sesi siswa yang terkunci.
                  </p>

                  {currentSettings.enableSupervisorPin !== false ? (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={currentSettings.supervisorPin}
                          onChange={e =>
                            setCurrentSettings({ ...currentSettings, supervisorPin: e.target.value.replace(/\D/g, '').slice(0, 8) })
                          }
                          className="w-32 px-3 py-1.5 bg-slate-950 border border-amber-500/50 rounded-xl text-amber-300 font-mono text-sm tracking-widest text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          placeholder="1234"
                          maxLength={8}
                        />
                        <span className="text-xs text-slate-400">
                          Kode Default: <code className="text-amber-300 font-bold">1234</code>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Guru/pengawas wajib memasukkan PIN ini saat membuka menu admin atau mereset sesi.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <Unlock className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>
                        <strong>PIN Dinonaktifkan:</strong> Seluruh menu pengawas dan pembukaan sesi siswa dapat diakses langsung tanpa perlu memasukkan PIN.
                      </span>
                    </div>
                  )}
                </div>

                {/* AutoFill & Session Timeout */}
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <label className="text-xs sm:text-sm font-bold text-white">
                      Batas Timeout Heartbeat Sesi (Menit)
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sesi tanpa sinyal aktivitas akan otomatis kedaluwarsa setelah durasi ini.
                  </p>
                  <select
                    value={currentSettings.sessionTimeoutMinutes}
                    onChange={e =>
                      setCurrentSettings({
                        ...currentSettings,
                        sessionTimeoutMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={30}>30 Menit (Ketat)</option>
                    <option value={60}>60 Menit (Standar 1 Jam)</option>
                    <option value={120}>120 Menit (2 Jam Sesi Ujian)</option>
                    <option value={180}>180 Menit (3 Jam)</option>
                  </select>
                </div>

                {/* Konfigurasi Ketukan Logo Sekolah untuk Akses Guru/Pengawas */}
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-amber-400" />
                      <label className="text-xs sm:text-sm font-bold text-white">
                        Jumlah Ketukan Logo Sekolah
                      </label>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/40">
                      {currentSettings.logoTapCount || 3}x Ketukan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Jumlah ketukan pada logo sekolah yang diperlukan untuk kembali dari <strong>Mode Ujian Siswa</strong> ke halaman <strong>Pengawas / Guru</strong>.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      id="btn-nis-decrease-logo-tap"
                      onClick={() => {
                        const currentVal = currentSettings.logoTapCount || 3;
                        const nextVal = Math.max(1, currentVal - 1);
                        setCurrentSettings({ ...currentSettings, logoTapCount: nextVal });
                      }}
                      disabled={(currentSettings.logoTapCount || 3) <= 1}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-white font-bold text-xs border border-slate-700 cursor-pointer transition-colors"
                      title="Kurangi 1 ketukan"
                    >
                      -1 Ketukan
                    </button>
                    <button
                      type="button"
                      id="btn-nis-add-logo-tap"
                      onClick={() => {
                        const currentVal = currentSettings.logoTapCount || 3;
                        const nextVal = Math.min(15, currentVal + 1);
                        setCurrentSettings({ ...currentSettings, logoTapCount: nextVal });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 font-bold text-xs cursor-pointer active:scale-95 transition-all"
                      title="Tambah ketukan logo"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Ketukan (+1)</span>
                    </button>
                    {(currentSettings.logoTapCount || 3) !== 3 && (
                      <button
                        type="button"
                        id="btn-nis-reset-logo-tap"
                        onClick={() => {
                          setCurrentSettings({ ...currentSettings, logoTapCount: 3 });
                        }}
                        className="text-xs text-slate-400 hover:text-amber-300 underline cursor-pointer ml-auto"
                        title="Reset ke bawaan (3 ketukan)"
                      >
                        Reset (3x)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Pusat Manajemen Mata Pelajaran & Kelas Terpusat */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-850 to-slate-800/60 border border-indigo-500/30 space-y-4 shadow-lg shadow-indigo-950/20">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Pusat Manajemen Mata Pelajaran & Kelas Terpusat
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Sinkronisasi Terpusat
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Kelola daftar resmi mata pelajaran dan rombel kelas. Seluruh modul (bank soal, jadwal ujian, paket ujian, dan login siswa) otomatis mengikuti perubahan yang dilakukan di sini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-indigo-300">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    <span>{masterSubjects.length} Mata Pelajaran • {masterClasses.length} Kelas</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <span>Edit & Tambah Mata Pelajaran serta Kelas</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Ubah nama, tambah rombel baru, atau hapus mapel. Perubahan akan merambat otomatis ke seluruh sistem tanpa meninggalkan sisa data usang.
                    </p>
                  </div>
                  {onOpenCentralSubjectClass && (
                    <button
                      type="button"
                      id="btn-open-central-subject-class-from-nis"
                      onClick={onOpenCentralSubjectClass}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer shrink-0 flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Buka Pusat Mapel & Kelas</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Save Settings Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentSettings(DEFAULT_NIS_SECURITY_SETTINGS)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Kembalikan ke Default
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengaturan Mode NIS</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DATA SISWA TERDAFTAR (ROSTER) */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              {/* Capacity Status & 400 NIS Limit Banner */}
              {(() => {
                const count = rosterStudents.length;
                const available = Math.max(0, MAX_ROSTER_STUDENTS - count);
                const percent = Math.min(100, Math.round((count / MAX_ROSTER_STUDENTS) * 100));
                const isFull = count >= MAX_ROSTER_STUDENTS;

                return (
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold text-white">
                          Kapasitas Kuota NIS Terdaftar:
                        </span>
                        <span className={`font-bold ${isFull ? 'text-rose-400' : 'text-indigo-300'}`}>
                          {count} / {MAX_ROSTER_STUDENTS} NIS
                        </span>
                        <span className="text-[11px] text-slate-400">
                          (Tersisa <strong className="text-emerald-400">{available}</strong> slot pendaftaran)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isFull
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : percent >= 80
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {isFull ? 'Kuota Penuh (Maks 400)' : `${percent}% Terpakai`}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFull
                            ? 'bg-rose-500'
                            : percent >= 80
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
                {/* Search & Filter */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari NIS, Nama Siswa, atau Kelas..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={selectedClassFilter}
                    onChange={e => setSelectedClassFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    <option value="ALL">Semua Kelas ({rosterStudents.length})</option>
                    {classList.map(cls => (
                      <option key={cls} value={cls}>
                        {cls} ({rosterStudents.filter(s => s.studentClass === cls).length})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      if (rosterStudents.length >= MAX_ROSTER_STUDENTS) {
                        alert(`Batas maksimum ${MAX_ROSTER_STUDENTS} NIS telah tercapai. Hapus atau edit siswa yang sudah ada untuk menambah siswa baru.`);
                        return;
                      }
                      setEditingStudent(null);
                      setFormNis('');
                      setFormName('');
                      setFormNotes('');
                      setIsAddStudentOpen(true);
                    }}
                    disabled={rosterStudents.length >= MAX_ROSTER_STUDENTS}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    title={rosterStudents.length >= MAX_ROSTER_STUDENTS ? `Kapasitas kuota maksimum ${MAX_ROSTER_STUDENTS} NIS tercapai` : 'Tambah Siswa Baru'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Siswa</span>
                  </button>

                  <button
                    onClick={() => setIsMultiSheetImportOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                    title="Impor file Excel dengan banyak sheet kelas sekaligus & pratinjau interaktif"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Impor Multi-Sheet Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => generateMultiSheetTemplateExcel(schoolInfo.schoolName || DEFAULT_SCHOOL_INFO.schoolName)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                    title="Download template spreadsheet multi-sheet contoh"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Template Excel</span>
                  </button>

                  {/* Reset Data NIS Button with Dropdown Modal */}
                  <button
                    onClick={() => {
                      setResetOption('clear_all');
                      if (classList.length > 0) setSelectedClassToDelete(classList[0]);
                      setIsResetModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    title="Buka Opsi Reset Data NIS (Kosongkan / Reset Default / Hapus Kelas)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reset Data NIS</span>
                  </button>
                </div>
              </div>

              {/* Toast Feedback Notification Banner */}
              {rosterToastMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{rosterToastMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRosterToastMsg('')}
                    className="text-emerald-400 hover:text-white text-xs p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Multi-Selection Bulk Action Bar */}
              {selectedStudentIds.size > 0 && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-2 border-indigo-500 shadow-2xl flex items-center justify-between flex-wrap gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold font-mono shadow-md shadow-indigo-600/40">
                      {selectedStudentIds.size}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-white">
                          {selectedStudentIds.size} Siswa (NIS) Terpilih
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/40">
                          Multi-Select
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Pilih aksi untuk seluruh siswa yang dicentang di bawah ini
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleBulkSetStatus(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title="Aktifkan semua siswa terpilih untuk boleh mengikuti ujian"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Aktifkan ({selectedStudentIds.size})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBulkSetStatus(false)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title="Nonaktifkan semua siswa terpilih"
                    >
                      <XCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Nonaktifkan ({selectedStudentIds.size})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsConfirmBulkDeleteOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/60 transition-all cursor-pointer active:scale-95 ring-2 ring-rose-500/30"
                      title="Hapus siswa (NIS) yang sedang dicentang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus {selectedStudentIds.size} NIS Terpilih</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Batal Memilih"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Form Add / Edit Student Drawer */}
              {isAddStudentOpen && (
                <form
                  onSubmit={handleSubmitStudent}
                  className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-400" />
                      {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru ke Roster'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddStudentOpen(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Batal
                    </button>
                  </div>

                  {formError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Nomor Induk Siswa (NIS) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 12050"
                        value={formNis}
                        onChange={e => setFormNis(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Nama Lengkap Siswa *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Budi Santoso"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Kelas / Rombel *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 12 MIPA 1"
                        value={formClass}
                        onChange={e => setFormClass(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddStudentOpen(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
                    >
                      {editingStudent ? 'Simpan Perubahan' : 'Tambahkan Siswa'}
                    </button>
                  </div>
                </form>
              )}

              {/* Bulk Import Section */}
              {isImportOpen && (
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <Upload className="w-4 h-4 text-emerald-400" />
                        Impor Data Siswa Sekaligus (Paste dari Excel/CSV)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Format per baris: <code className="text-indigo-300">NIS, Nama Siswa, Kelas</code> (Pemisah bisa koma, titik koma, atau Tab dari Excel)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsImportOpen(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Tutup
                    </button>
                  </div>

                  {importError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {importSuccessMsg && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>{importSuccessMsg}</span>
                    </div>
                  )}

                  <textarea
                    rows={4}
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="12030, Aldi Pratama, 12 MIPA 1&#10;12031, Bella Safitri, 12 MIPA 1&#10;12130, Citra Lestari, 12 IPS 1"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                  />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Tip: Salin kolom NIS, Nama, Kelas langsung dari spreadsheet sekolah Anda.
                    </span>
                    <button
                      type="button"
                      onClick={handleBulkImport}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Proses Impor</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Roster Table */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/70 shadow-lg">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full min-w-[520px] text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                        {/* Checkbox Select All */}
                        <th className="px-3 py-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={handleToggleSelectAllFiltered}
                            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title={
                              isAllFilteredSelected
                                ? 'Batal Pilih Semua Siswa di Tampilan Ini'
                                : 'Pilih Semua Siswa di Tampilan Ini'
                            }
                          >
                            {isAllFilteredSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400" />
                            ) : isSomeFilteredSelected ? (
                              <MinusSquare className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-3">NIS</th>
                        <th className="px-4 py-3">Nama Lengkap Siswa</th>
                        <th className="px-4 py-3">Kelas / Rombel</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredRoster.length > 0 ? (
                        filteredRoster.map(student => {
                          const isSelected = selectedStudentIds.has(student.id);

                          return (
                            <tr
                              key={student.id}
                              className={`transition-colors ${
                                isSelected
                                  ? 'bg-indigo-950/40 border-l-2 border-indigo-500'
                                  : 'hover:bg-slate-800/40'
                              }`}
                            >
                              {/* Checkbox per row */}
                              <td className="px-3 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSelectStudent(student.id)}
                                  className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                                  title={isSelected ? 'Batal Pilih' : 'Pilih Siswa ini'}
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-indigo-300">
                                {student.nis}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-white">
                                {student.fullName}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px] font-semibold">
                                  {student.studentClass}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <button
                                  onClick={() => handleToggleStudentActive(student.id)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                    student.isActive
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                                  }`}
                                >
                                  {student.isActive ? 'Aktif (Boleh Ujian)' : 'Dinonaktifkan'}
                                </button>
                              </td>
                              <td className="px-4 py-2.5 text-right space-x-1">
                                <button
                                  onClick={() => handleStartEdit(student)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Edit Siswa"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student.id, student.fullName)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Hapus Siswa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            Tidak ada data siswa yang cocok dengan filter pencarian.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span>
                      Menampilkan {filteredRoster.length} dari {rosterStudents.length} siswa terdaftar
                    </span>
                    {selectedStudentIds.size > 0 && (
                      <span className="text-indigo-300 font-bold">
                        • {selectedStudentIds.size} dipilih
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedStudentIds.size < rosterStudents.length && rosterStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllTotal}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer font-semibold"
                      >
                        Pilih Seluruh {rosterStudents.length} Siswa
                      </button>
                    )}
                    <span>
                      {rosterStudents.filter(s => s.isActive).length} Siswa Aktif Diizinkan Ujian
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MONITOR SESI UJIAN AKTIF (LIVE SINGLE SESSION MONITOR) */}
          {activeTab === 'live_sessions' && (
            <div className="space-y-4">
              {/* Banner / Info */}
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Pemantauan Sesi Aktif Siswa (Anti-Dual Login Realtime)
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Siswa dalam daftar di bawah ini sedang aktif mengerjakan ujian. Setiap NIS hanya diizinkan memiliki 1 sesi aktif.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={refreshSessions}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer font-medium"
                    title="Segarkan / Reset data sesi"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>

                  {activeSessions.length > 0 && (
                    <button
                      onClick={handleResetAllSessions}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Reset Semua Sesi
                    </button>
                  )}
                </div>
              </div>

              {sessionActionMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{sessionActionMsg}</span>
                </div>
              )}

              {/* Sessions List */}
              {activeSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeSessions.map(session => {
                    const elapsedMinutes = Math.floor((Date.now() - session.startedAt) / 60000);
                    const lastHeartbeatSec = Math.floor((Date.now() - session.lastHeartbeat) / 1000);
                    const isSignalStrong = lastHeartbeatSec < 30;

                    return (
                      <div
                        key={session.sessionId}
                        className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 space-y-3 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/30">
                                NIS: {session.nis}
                              </span>
                              <span className="text-xs font-semibold text-white truncate max-w-[170px]">
                                {session.fullName}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Kelas: {session.studentClass} • {session.packageTitle}
                            </p>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isSignalStrong
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
                            {isSignalStrong ? 'Live (Mengerjakan)' : 'Sinyal Lemah'}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Durasi: {elapsedMinutes} Menit</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate max-w-[110px]">{session.deviceInfo || 'Web Browser'}</span>
                          </div>

                          <button
                            onClick={() => handleForceResetSession(session.nis, session.fullName)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shadow transition-colors cursor-pointer flex items-center gap-1"
                            title="Buka kunci sesi siswa ini jika terjadi error / ganti perangkat"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Buka Kunci / Reset</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-800 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Tidak Ada Sesi Ujian Aktif Saat Ini</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Saat siswa mulai mengerjakan soal ujian dengan memasukkan NIS, status sesi mereka akan muncul secara langsung di sini.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sistem Keamanan Single Session CBT Terpasang</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Tutup Panel
          </button>
        </div>
      </div>

      {/* Multi-Sheet Excel Student Import Modal */}
      {isMultiSheetImportOpen && (
        <MultiSheetStudentImportModal
          isOpen={isMultiSheetImportOpen}
          onClose={() => setIsMultiSheetImportOpen(false)}
          rosterStudents={rosterStudents}
          onUpdateRoster={onUpdateRoster}
          schoolInfo={schoolInfo}
        />
      )}

      {/* Reset Data NIS Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 text-slate-100 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 shadow-md">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset & Bersihkan Data NIS</h3>
                  <p className="text-xs text-slate-400">Pilih opsi pembersihan atau pemulihan database siswa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Opsi 1: Kosongkan Seluruh Database NIS (0 Siswa) */}
              <label
                onClick={() => setResetOption('clear_all')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  resetOption === 'clear_all'
                    ? 'bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/20'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  checked={resetOption === 'clear_all'}
                  onChange={() => setResetOption('clear_all')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Kosongkan Seluruh Data NIS (0 Siswa)</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      Hapus Total
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Menghapus seluruh <strong>{rosterStudents.length} data siswa</strong> dari database saat ini. Database menjadi bersih (0 siswa) agar Anda dapat mengimpor data sekolah baru tanpa sisa data contoh.
                  </p>
                </div>
              </label>

              {/* Opsi 2: Reset ke Data Default Contoh (23 Siswa) */}
              <label
                onClick={() => setResetOption('restore_default')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  resetOption === 'restore_default'
                    ? 'bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  checked={resetOption === 'restore_default'}
                  onChange={() => setResetOption('restore_default')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Pulihkan ke Data Contoh Bawaan (23 Siswa)</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Data Contoh
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Mengisi kembali database dengan data bawaan 23 siswa SMA (12 MIPA & 12 IPS) untuk simulasi/uji coba ujian.
                  </p>
                </div>
              </label>

              {/* Opsi 3: Hapus Berdasarkan Kelas/Rombel Tertentu */}
              {classList.length > 0 && (
                <label
                  onClick={() => setResetOption('delete_class')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    resetOption === 'delete_class'
                      ? 'bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="resetOption"
                    checked={resetOption === 'delete_class'}
                    onChange={() => setResetOption('delete_class')}
                    className="mt-1 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Hapus Siswa Per Kelas / Rombel Tertentu</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Per Rombel
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Hapus seluruh siswa yang terdaftar di satu rombel/kelas tertentu saja.
                    </p>
                    {resetOption === 'delete_class' && (
                      <div className="pt-1">
                        <select
                          value={selectedClassToDelete}
                          onChange={e => setSelectedClassToDelete(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-amber-500"
                        >
                          {classList.map(cls => (
                            <option key={cls} value={cls}>
                              Kelas {cls} ({rosterStudents.filter(s => s.studentClass === cls).length} Siswa)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  resetOption === 'clear_all'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                    : resetOption === 'restore_default'
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/50'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {resetOption === 'clear_all'
                    ? 'Ya, Kosongkan Semua Data NIS'
                    : resetOption === 'restore_default'
                    ? 'Pulihkan Data Contoh'
                    : `Hapus Siswa Kelas ${selectedClassToDelete}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      {isConfirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 text-slate-100 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Konfirmasi Hapus {selectedStudentIds.size} NIS Terpilih
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Apakah Anda yakin ingin menghapus <strong className="text-rose-300">{selectedStudentIds.size} data siswa</strong> yang dipilih dari daftar terdaftar?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5 max-h-40 overflow-y-auto font-mono text-slate-300">
              {rosterStudents
                .filter(s => selectedStudentIds.has(s.id))
                .slice(0, 8)
                .map(s => (
                  <div key={s.id} className="flex items-center justify-between py-0.5 border-b border-slate-900 last:border-0">
                    <span className="text-indigo-300 font-bold">{s.nis} - {s.fullName}</span>
                    <span className="text-slate-500 text-[11px]">{s.studentClass}</span>
                  </div>
                ))}
              {selectedStudentIds.size > 8 && (
                <div className="text-[11px] text-slate-500 text-center pt-1 font-sans italic">
                  ...dan {selectedStudentIds.size - 8} siswa lainnya
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmBulkDeleteOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus {selectedStudentIds.size} Data Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
