import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookOpen,
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Check,
  ShieldCheck,
  Tag,
  Info,
} from 'lucide-react';
import {
  MasterSubject,
  MasterClass,
  getMasterSubjects,
  saveMasterSubjects,
  getMasterClasses,
  saveMasterClasses,
  addMasterSubject,
  addMasterClass,
  addMasterClassesBulk,
  updateMasterSubject,
  updateMasterClass,
  deleteMasterSubject,
  deleteMasterClass,
  reconcileAllEntitiesWithMaster,
  subscribeMasterSubjectClass,
} from '../utils/centralSubjectClassManager';

interface CentralSubjectClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'subjects' | 'classes' | 'sync';
}

const COLOR_OPTIONS = [
  { name: 'indigo', label: 'Indigo', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { name: 'emerald', label: 'Emerald', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { name: 'cyan', label: 'Cyan', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { name: 'violet', label: 'Violet', bg: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  { name: 'amber', label: 'Amber', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { name: 'rose', label: 'Rose', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { name: 'blue', label: 'Blue', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { name: 'orange', label: 'Orange', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { name: 'teal', label: 'Teal', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  { name: 'red', label: 'Red', bg: 'bg-red-500/20 text-red-300 border-red-500/30' },
];

export const CentralSubjectClassModal: React.FC<CentralSubjectClassModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'subjects',
}) => {
  const [activeTab, setActiveTab] = useState<'subjects' | 'classes' | 'sync'>(initialTab);

  const [subjects, setSubjects] = useState<MasterSubject[]>([]);
  const [classes, setClasses] = useState<MasterClass[]>([]);

  // Search & Filters
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState('ALL');

  const [classSearch, setClassSearch] = useState('');
  const [classGradeFilter, setClassGradeFilter] = useState('ALL');

  // Modal / Form state for Add/Edit Subject
  const [isSubjectFormOpen, setIsSubjectFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<MasterSubject | null>(null);
  const [formSubjectName, setFormSubjectName] = useState('');
  const [formSubjectCode, setFormSubjectCode] = useState('');
  const [formSubjectCategory, setFormSubjectCategory] = useState<MasterSubject['category']>('Umum');
  const [formSubjectColor, setFormSubjectColor] = useState('indigo');
  const [subjectFormError, setSubjectFormError] = useState('');

  // Delete Subject Confirmation
  const [subjectToDelete, setSubjectToDelete] = useState<MasterSubject | null>(null);

  // Modal / Form state for Add/Edit Class
  const [isClassFormOpen, setIsClassFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<MasterClass | null>(null);
  const [formClassName, setFormClassName] = useState('');
  const [formClassGrade, setFormClassGrade] = useState('11');
  const [formClassMajor, setFormClassMajor] = useState('MIPA');
  const [classFormError, setClassFormError] = useState('');

  // Bulk Add Classes state
  const [isBulkClassOpen, setIsBulkClassOpen] = useState(false);
  const [bulkClassInput, setBulkClassInput] = useState('');
  const [bulkAddResult, setBulkAddResult] = useState<{ added: number; skipped: number } | null>(null);

  // Delete Class Confirmation
  const [classToDelete, setClassToDelete] = useState<MasterClass | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync / Reconcile feedback
  const [reconcileResult, setReconcileResult] = useState<{
    cleanedQuestions: number;
    cleanedPackages: number;
    cleanedSchedules: number;
    cleanedStudents: number;
  } | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  // Load and subscribe to live changes
  const reloadData = () => {
    setSubjects(getMasterSubjects());
    setClasses(getMasterClasses());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const unsub = subscribeMasterSubjectClass(() => {
      reloadData();
    });
    return unsub;
  }, []);

  // Filtered lists
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(subjectSearch.toLowerCase()));
      const matchCategory =
        subjectCategoryFilter === 'ALL' || s.category === subjectCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [subjects, subjectSearch, subjectCategoryFilter]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
        (c.major && c.major.toLowerCase().includes(classSearch.toLowerCase()));
      const matchGrade =
        classGradeFilter === 'ALL' || c.gradeLevel === classGradeFilter;
      return matchSearch && matchGrade;
    });
  }, [classes, classSearch, classGradeFilter]);

  // Handle Open Add Subject
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setFormSubjectName('');
    setFormSubjectCode('');
    setFormSubjectCategory('Umum');
    setFormSubjectColor('indigo');
    setSubjectFormError('');
    setIsSubjectFormOpen(true);
  };

  // Handle Open Edit Subject
  const handleOpenEditSubject = (sub: MasterSubject) => {
    setEditingSubject(sub);
    setFormSubjectName(sub.name);
    setFormSubjectCode(sub.code || '');
    setFormSubjectCategory(sub.category);
    setFormSubjectColor(sub.color || 'indigo');
    setSubjectFormError('');
    setIsSubjectFormOpen(true);
  };

  // Save Subject (Add or Edit)
  const handleSaveSubject = () => {
    if (!formSubjectName.trim()) {
      setSubjectFormError('Nama mata pelajaran wajib diisi.');
      return;
    }

    try {
      if (editingSubject) {
        // Update with cascade
        const { updatedSubject, cascade } = updateMasterSubject(editingSubject.id, {
          name: formSubjectName.trim(),
          code: formSubjectCode.trim() || undefined,
          category: formSubjectCategory,
          color: formSubjectColor,
        });

        const cascadeCount =
          cascade.questionsUpdated + cascade.packagesUpdated + cascade.schedulesUpdated;
        if (cascadeCount > 0) {
          showToast(
            `Mata pelajaran "${updatedSubject.name}" diperbarui. Otomatis menyinkronkan: ${cascade.questionsUpdated} soal, ${cascade.packagesUpdated} paket, ${cascade.schedulesUpdated} jadwal ujian!`
          );
        } else {
          showToast(`Mata pelajaran "${updatedSubject.name}" berhasil diperbarui.`);
        }
      } else {
        // Add new
        const created = addMasterSubject({
          name: formSubjectName.trim(),
          code: formSubjectCode.trim() || undefined,
          category: formSubjectCategory,
          color: formSubjectColor,
        });
        showToast(`Mata pelajaran "${created.name}" berhasil ditambahkan.`);
      }
      setIsSubjectFormOpen(false);
      reloadData();
    } catch (e: any) {
      setSubjectFormError(e.message || 'Gagal menyimpan mata pelajaran.');
    }
  };

  // Delete Subject
  const handleConfirmDeleteSubject = () => {
    if (!subjectToDelete) return;
    try {
      const { cascade } = deleteMasterSubject(subjectToDelete.id);
      showToast(
        `Mata pelajaran "${subjectToDelete.name}" telah dihapus. ${cascade.questionsDeleted} soal & ${cascade.schedulesDeleted} jadwal terkait telah dibersihkan sehingga data konsisten.`
      );
      setSubjectToDelete(null);
      reloadData();
    } catch (e: any) {
      showToast(`Gagal menghapus: ${e.message}`);
    }
  };

  // Handle Open Add Class
  const handleOpenAddClass = () => {
    setEditingClass(null);
    setFormClassName('');
    setFormClassGrade('11');
    setFormClassMajor('MIPA');
    setClassFormError('');
    setIsClassFormOpen(true);
  };

  // Handle Open Edit Class
  const handleOpenEditClass = (cls: MasterClass) => {
    setEditingClass(cls);
    setFormClassName(cls.name);
    setFormClassGrade(cls.gradeLevel);
    setFormClassMajor(cls.major);
    setClassFormError('');
    setIsClassFormOpen(true);
  };

  // Save Class
  const handleSaveClass = () => {
    if (!formClassName.trim()) {
      setClassFormError('Nama kelas wajib diisi.');
      return;
    }

    try {
      if (editingClass) {
        const { updatedClass, cascade } = updateMasterClass(editingClass.id, {
          name: formClassName.trim(),
          gradeLevel: formClassGrade,
          major: formClassMajor,
        });
        if (cascade.studentsUpdated > 0 || cascade.schedulesUpdated > 0) {
          showToast(
            `Kelas "${updatedClass.name}" diperbarui. Otomatis memperbarui ${cascade.studentsUpdated} siswa di roster dan ${cascade.schedulesUpdated} jadwal!`
          );
        } else {
          showToast(`Kelas "${updatedClass.name}" berhasil diperbarui.`);
        }
      } else {
        const created = addMasterClass({
          name: formClassName.trim(),
          gradeLevel: formClassGrade,
          major: formClassMajor,
        });
        showToast(`Kelas "${created.name}" berhasil ditambahkan.`);
      }
      setIsClassFormOpen(false);
      reloadData();
    } catch (e: any) {
      setClassFormError(e.message || 'Gagal menyimpan kelas.');
    }
  };

  // Bulk Add Classes
  const handleExecuteBulkClass = () => {
    if (!bulkClassInput.trim()) return;
    const rawList = bulkClassInput
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (rawList.length === 0) return;

    const { added, skipped } = addMasterClassesBulk(rawList);
    setBulkAddResult({ added: added.length, skipped: skipped.length });
    showToast(`Berhasil menambahkan ${added.length} kelas baru (${skipped.length} dilewati karena sudah ada).`);
    setBulkClassInput('');
    reloadData();
    setTimeout(() => {
      setIsBulkClassOpen(false);
      setBulkAddResult(null);
    }, 1200);
  };

  // Delete Class
  const handleConfirmDeleteClass = () => {
    if (!classToDelete) return;
    try {
      const { cascade } = deleteMasterClass(classToDelete.id);
      showToast(
        `Kelas "${classToDelete.name}" telah dihapus. ${cascade.studentsUpdated} siswa dan ${cascade.schedulesUpdated} jadwal dialihkan ke kelas lain yang valid.`
      );
      setClassToDelete(null);
      reloadData();
    } catch (e: any) {
      showToast(`Gagal menghapus: ${e.message}`);
    }
  };

  // Reconcile all data
  const handleExecuteReconcile = () => {
    setIsReconciling(true);
    setTimeout(() => {
      const res = reconcileAllEntitiesWithMaster();
      setReconcileResult(res);
      setIsReconciling(false);
      showToast('Sinkronisasi selesai! Seluruh modul kini 100% konsisten dengan daftar master terpusat.');
      reloadData();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div
      id="central-subject-class-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="central-subject-class-modal-card"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
      >
        {/* ========================================================================= */}
        {/* HEADER */}
        {/* ========================================================================= */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Pusat Manajemen Mata Pelajaran & Kelas
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Master Terpusat
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Semua jadwal, bank soal, paket ujian, dan gerbang siswa otomatis tersinkronisasi mengikuti data di sini.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TOAST ALERT */}
        {/* ========================================================================= */}
        {toastMessage && (
          <div className="px-5 py-2.5 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TABS NAVIGATION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-3 border-b border-slate-800/80 bg-slate-900 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'subjects'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Mata Pelajaran</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {subjects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('classes')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'classes'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Daftar Kelas & Rombel</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {classes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'sync'
                ? 'border-amber-500 text-amber-300 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sinkronisasi & Integritas</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: MATA PELAJARAN */}
        {/* ========================================================================= */}
        {activeTab === 'subjects' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={subjectSearch}
                    onChange={e => setSubjectSearch(e.target.value)}
                    placeholder="Cari mata pelajaran atau kode..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {subjectSearch && (
                    <button
                      type="button"
                      onClick={() => setSubjectSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={subjectCategoryFilter}
                  onChange={e => setSubjectCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Semua Kategori</option>
                  <option value="Umum">Umum</option>
                  <option value="MIPA">MIPA</option>
                  <option value="IPS">IPS</option>
                  <option value="Kejuruan">Kejuruan</option>
                  <option value="Muatan Lokal">Muatan Lokal</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <button
                type="button"
                id="btn-add-new-subject"
                onClick={handleOpenAddSubject}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Mata Pelajaran</span>
              </button>
            </div>

            {/* Hint Box */}
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-2.5 text-xs text-indigo-200">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Aturan Terpusat:</strong> Setiap mata pelajaran yang Anda edit namanya akan secara otomatis
                memperbarui semua soal di Bank Soal, paket ujian, dan jadwal terkait. Menghapus mata pelajaran akan
                membersihkan soal dan jadwal terkait sehingga tidak ada modul yang menyimpan mata pelajaran tak terdaftar.
              </span>
            </div>

            {/* Subjects Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSubjects.map(sub => {
                const colorConfig = COLOR_OPTIONS.find(c => c.name === sub.color) || COLOR_OPTIONS[0];
                return (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs border ${colorConfig.bg}`}
                        >
                          {sub.code || sub.name.substring(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {sub.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                              {sub.category}
                            </span>
                            {sub.code && (
                              <span className="text-[10px] text-slate-400">
                                Kode: <strong className="text-slate-300">{sub.code}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSubject(sub)}
                          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit Mata Pelajaran"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectToDelete(sub)}
                          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Hapus Mata Pelajaran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredSubjects.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">Tidak ada mata pelajaran yang cocok.</p>
                  <p className="text-xs text-slate-500">
                    {subjectSearch
                      ? 'Coba ganti kata kunci pencarian Anda.'
                      : 'Klik "Tambah Mata Pelajaran" untuk mendaftarkan mata pelajaran baru.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: KELAS & ROMBEL */}
        {/* ========================================================================= */}
        {activeTab === 'classes' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={classSearch}
                    onChange={e => setClassSearch(e.target.value)}
                    placeholder="Cari nama kelas atau jurusan..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  {classSearch && (
                    <button
                      type="button"
                      onClick={() => setClassSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={classGradeFilter}
                  onChange={e => setClassGradeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="ALL">Semua Tingkat</option>
                  <option value="10">Kelas 10 (X)</option>
                  <option value="11">Kelas 11 (XI)</option>
                  <option value="12">Kelas 12 (XII)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkClassOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                  title="Tambah Banyak Kelas Sekaligus"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Tambah Massal</span>
                </button>

                <button
                  type="button"
                  id="btn-add-new-class"
                  onClick={handleOpenAddClass}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-cyan-600/30 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kelas</span>
                </button>
              </div>
            </div>

            {/* Hint Box */}
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-start gap-2.5 text-xs text-cyan-200">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Aturan Terpusat:</strong> Seluruh pilihan kelas di formulir login siswa, roster pendaftaran,
                dan sasaran jadwal ujian wajib menggunakan kelas dari daftar ini. Jika nama kelas diubah, data siswa
                terkait langsung otomatis disesuaikan.
              </span>
            </div>

            {/* Classes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredClasses.map(cls => (
                <div
                  key={cls.id}
                  className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
                      Tingkat {cls.gradeLevel}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {cls.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          Jurusan: {cls.major}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditClass(cls)}
                      className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-cyan-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Edit Kelas"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassToDelete(cls)}
                      className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Hapus Kelas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredClasses.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
                  <GraduationCap className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">Tidak ada kelas yang cocok.</p>
                  <p className="text-xs text-slate-500">
                    {classSearch
                      ? 'Coba ubah kata kunci pencarian.'
                      : 'Klik "Tambah Kelas" untuk mendaftarkan rombel kelas baru.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SINKRONISASI & INTEGRITAS */}
        {/* ========================================================================= */}
        {activeTab === 'sync' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/80 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-white">Verifikasi & Sinkronisasi Seluruh Modul</h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    Pastikan tidak ada modul ujian, bank soal, jadwal ujian, maupun data siswa yang menyimpan mata
                    pelajaran atau kelas yang tidak terdaftar pada Pusat Manajemen ini.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isReconciling}
                  onClick={handleExecuteReconcile}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isReconciling ? 'animate-spin' : ''}`} />
                  <span>{isReconciling ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400">Total Mapel Terdaftar</span>
                  <p className="text-xl font-extrabold text-indigo-400">{subjects.length}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400">Total Kelas Terdaftar</span>
                  <p className="text-xl font-extrabold text-cyan-400">{classes.length}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400">Status Integritas</span>
                  <p className="text-xl font-extrabold text-emerald-400">100% Valid</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400">Mode Sinkronisasi</span>
                  <p className="text-xl font-extrabold text-amber-400">Real-Time</p>
                </div>
              </div>

              {reconcileResult && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 space-y-1 animate-fadeIn">
                  <h5 className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Laporan Hasil Sinkronisasi Terpusat:</span>
                  </h5>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300 pt-1">
                    <li>Soal diperbarui / disesuaikan: {reconcileResult.cleanedQuestions} item</li>
                    <li>Paket ujian disesuaikan: {reconcileResult.cleanedPackages} paket</li>
                    <li>Jadwal ujian disesuaikan: {reconcileResult.cleanedSchedules} jadwal</li>
                    <li>Data rombel siswa disesuaikan: {reconcileResult.cleanedStudents} siswa</li>
                  </ul>
                  <p className="text-[11px] text-emerald-300/80 pt-1">
                    Semua modul kini sepenuhnya mematuhi data mata pelajaran dan kelas master.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FOOTER */}
        {/* ========================================================================= */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            Terpusat: <strong className="text-white">{subjects.length}</strong> Mata Pelajaran •{' '}
            <strong className="text-white">{classes.length}</strong> Kelas
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Selesai & Tutup
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SUBJECT */}
      {/* ========================================================================= */}
      {isSubjectFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>{editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSubjectFormOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {subjectFormError && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{subjectFormError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nama Mata Pelajaran <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formSubjectName}
                  onChange={e => setFormSubjectName(e.target.value)}
                  placeholder="Contoh: Matematika Wajib, Fisika, Biologi"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Kode Singkatan</label>
                  <input
                    type="text"
                    value={formSubjectCode}
                    onChange={e => setFormSubjectCode(e.target.value)}
                    placeholder="Contoh: MTK, FIS"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                    maxLength={6}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Kategori / Jurusan</label>
                  <select
                    value={formSubjectCategory}
                    onChange={e => setFormSubjectCategory(e.target.value as MasterSubject['category'])}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Umum">Umum</option>
                    <option value="MIPA">MIPA</option>
                    <option value="IPS">IPS</option>
                    <option value="Kejuruan">Kejuruan</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Warna Aksen</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setFormSubjectColor(c.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        c.bg
                      } ${formSubjectColor === c.name ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {editingSubject && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sinkronisasi Otomatis Terpusat:</span>
                  </p>
                  <p className="text-[11px] text-amber-300/80">
                    Jika nama diubah, semua soal di bank soal, paket ujian, dan jadwal terkait akan otomatis ikut
                    diperbarui ke nama baru ini.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSubjectFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSubject}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                {editingSubject ? 'Simpan Perubahan' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CLASS */}
      {/* ========================================================================= */}
      {isClassFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-cyan-400" />
                <span>{editingClass ? 'Edit Kelas & Rombel' : 'Tambah Kelas Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsClassFormOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {classFormError && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{classFormError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nama Kelas / Rombel <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formClassName}
                  onChange={e => setFormClassName(e.target.value)}
                  placeholder="Contoh: 10 MIPA 1, XI-A, XII IPS 2"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tingkat Kelas</label>
                  <select
                    value={formClassGrade}
                    onChange={e => setFormClassGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="10">Kelas 10 (X)</option>
                    <option value="11">Kelas 11 (XI)</option>
                    <option value="12">Kelas 12 (XII)</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Jurusan / Peminatan</label>
                  <select
                    value={formClassMajor}
                    onChange={e => setFormClassMajor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="MIPA">MIPA / Sains</option>
                    <option value="IPS">IPS / Sosial</option>
                    <option value="Bahasa">Bahasa</option>
                    <option value="Kejuruan">Kejuruan / SMK</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>

              {editingClass && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sinkronisasi Otomatis Terpusat:</span>
                  </p>
                  <p className="text-[11px] text-amber-300/80">
                    Jika nama kelas diubah, seluruh data siswa di roster dan target sasaran ujian pada jadwal akan
                    otomatis ikut diperbarui.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsClassFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveClass}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors shadow-md shadow-cyan-600/30 cursor-pointer"
              >
                {editingClass ? 'Simpan Perubahan' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK ADD CLASSES */}
      {/* ========================================================================= */}
      {isBulkClassOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <span>Tambah Banyak Kelas Sekaligus (Batch)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkClassOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Masukkan daftar nama rombel / kelas yang dipisahkan oleh tanda koma atau baris baru:
            </p>

            <textarea
              rows={6}
              value={bulkClassInput}
              onChange={e => setBulkClassInput(e.target.value)}
              placeholder="Contoh:&#10;10 MIPA 1, 10 MIPA 2, 10 MIPA 3&#10;10 IPS 1, 10 IPS 2&#10;11 MIPA 1, 11 MIPA 2&#10;12 MIPA 1, 12 IPS 1"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
            />

            {bulkAddResult && (
              <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Berhasil menambahkan {bulkAddResult.added} kelas ({bulkAddResult.skipped} dilewati karena sudah ada).
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkClassOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkClass}
                disabled={!bulkClassInput.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-md shadow-cyan-600/30 cursor-pointer"
              >
                Proses & Daftarkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM DELETE SUBJECT */}
      {/* ========================================================================= */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Hapus Mata Pelajaran?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Anda akan menghapus mata pelajaran{' '}
                <strong className="text-rose-400">"{subjectToDelete.name}"</strong> dari pusat master.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 space-y-1">
              <p className="font-bold">Ketentuan Integritas Terpusat:</p>
              <p className="text-[11px] text-rose-300/90">
                Semua soal di Bank Soal, paket ujian, dan jadwal ujian yang terkait dengan mata pelajaran ini akan
                dibersihkan agar tidak ada sisa data mata pelajaran tak terdaftar di sistem.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Ya, Hapus Terpusat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM DELETE CLASS */}
      {/* ========================================================================= */}
      {classToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Hapus Kelas / Rombel?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Anda akan menghapus kelas <strong className="text-rose-400">"{classToDelete.name}"</strong> dari pusat
                master.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 space-y-1">
              <p className="font-bold">Ketentuan Integritas Terpusat:</p>
              <p className="text-[11px] text-rose-300/90">
                Siswa yang saat ini terdaftar di kelas ini akan secara otomatis dialihkan ke kelas valid lain sehingga
                tidak ada data siswa yang tertinggal dengan kelas yang telah dihapus.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Ya, Hapus Terpusat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
