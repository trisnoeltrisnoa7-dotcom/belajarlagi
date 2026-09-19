import React, { useState, useEffect } from 'react';
import {
  Layout,
  Sliders,
  Compass,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Palette,
  Eye,
  Grid,
  Laptop,
  Layers,
  ArrowRight,
  School,
  FileSpreadsheet,
  GraduationCap,
  Calendar,
  Lock,
  BarChart2,
  FolderOpen,
} from 'lucide-react';
import { AppLayoutSettings, ExamViewMode } from '../types';
import {
  loadAppLayoutSettings,
  DEFAULT_APP_LAYOUT_SETTINGS,
} from '../utils/appLayoutHelper';

interface AppLayoutEditorViewProps {
  onSaveSettings: (settings: AppLayoutSettings) => void;
  onNavigateToView: (view: ExamViewMode) => void;
  onBackToDashboard: () => void;
}

interface FlowNode {
  id: ExamViewMode;
  title: string;
  category: 'core' | 'admin' | 'exam' | 'analytics';
  description: string;
  badge: string;
  icon: React.ElementType;
}

export const AppLayoutEditorView: React.FC<AppLayoutEditorViewProps> = ({
  onSaveSettings,
  onNavigateToView,
  onBackToDashboard,
}) => {
  const [settings, setSettings] = useState<AppLayoutSettings>(() => loadAppLayoutSettings());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'layout' | 'flowchart'>('layout');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  useEffect(() => {
    setSettings(loadAppLayoutSettings());
  }, []);

  const handleUpdate = <K extends keyof AppLayoutSettings>(key: K, value: AppLayoutSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    onSaveSettings(settings);
    setHasUnsavedChanges(false);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_APP_LAYOUT_SETTINGS });
    setHasUnsavedChanges(true);
  };

  const flowNodes: FlowNode[] = [
    {
      id: 'dashboard',
      title: 'Dashboard Utama',
      category: 'core',
      description: 'Pusat beranda ringkasan siswa, paket ujian, dan navigasi utama sistem.',
      badge: 'Root Node',
      icon: Layout,
    },
    {
      id: 'sma_hub',
      title: 'Bank Soal SMA Hub',
      category: 'admin',
      description: 'Pusat master per mata pelajaran, kurikulum Merdeka, dan filter kelas SMA.',
      badge: 'Admin & Guru',
      icon: GraduationCap,
    },
    {
      id: 'question_bank_input',
      title: 'Editor Butir Soal',
      category: 'admin',
      description: 'Input manual, generator AI, rumus LaTeX, dan upload spreadsheet bank soal.',
      badge: 'Admin & Guru',
      icon: FileSpreadsheet,
    },
    {
      id: 'exam_schedule_management',
      title: 'Manajemen Jadwal & Token',
      category: 'admin',
      description: 'Pengaturan kalender ujian, alokasi ruang, token dinamis, dan pengawas.',
      badge: 'Admin & Guru',
      icon: Calendar,
    },
    {
      id: 'student_gate',
      title: 'Gerbang Peserta Ujian',
      category: 'exam',
      description: 'Validasi NIS, verifikasi identitas, kesiapan perangkat, dan verifikasi token.',
      badge: 'Siswa / Peserta',
      icon: School,
    },
    {
      id: 'exam_cbt',
      title: 'Ruang Ujian CBT Interaktif',
      category: 'exam',
      description: 'Pengerjaan soal, timer real-time, navigasi nomor, dan deteksi pelanggaran.',
      badge: 'Siswa / Peserta',
      icon: ShieldCheck,
    },
    {
      id: 'result_analysis',
      title: 'Laporan Analisis Nilai',
      category: 'analytics',
      description: 'Perhitungan skor ujian (10-100), konversi nilai PTN (100-1000), statistik KKM.',
      badge: 'Siswa & Guru',
      icon: BarChart2,
    },
    {
      id: 'google_drive_hub',
      title: 'Google Drive Sync',
      category: 'admin',
      description: 'Sinkronisasi cloud backup paket soal, rekap nilai spreadsheet, dan arsip.',
      badge: 'Cloud Sync',
      icon: FolderOpen,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                Editor Tata Letak & Navigasi Arsitektur
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Kustomisasi posisi menu, tema antarmuka, dan visualisasi topologi alur aplikasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Default
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 ${
                hasUnsavedChanges
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                  : 'bg-slate-200 text-slate-500 cursor-default'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {hasUnsavedChanges ? 'Simpan Perubahan' : 'Tersimpan'}
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('layout')}
            className={`py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'layout'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Palette className="w-4 h-4" />
            Kustomisasi Tata Letak & Visual
          </button>
          <button
            onClick={() => setActiveTab('flowchart')}
            className={`py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'flowchart'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Compass className="w-4 h-4" />
            Peta Alur / Flowchart Node CBT
          </button>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pengaturan tata letak berhasil disimpan dan diterapkan ke antarmuka aplikasi.</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {activeTab === 'layout' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Setting Options */}
            <div className="lg:col-span-2 space-y-6">
              {/* Floating Menu Position */}
              <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-1 flex items-center gap-2">
                  <Grid className="w-4 h-4 text-indigo-600" />
                  Posisi Floating Menu Guru / Navigasi Cepat
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Tentukan penempatan tombol mengambang navigasi pengawas di bagian bawah layar.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'left', label: 'Bawah Kiri', desc: 'Sudut kiri bawah' },
                    { id: 'center', label: 'Bawah Tengah', desc: 'Floating di tengah' },
                    { id: 'right', label: 'Bawah Kanan', desc: 'Sudut kanan bawah' },
                    { id: 'hidden', label: 'Sembunyikan', desc: 'Akses via Header' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => handleUpdate('floatingMenuPosition', pos.id as any)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        settings.floatingMenuPosition === pos.id
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-xs sm:text-sm text-slate-900">{pos.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{pos.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Preset */}
              <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-1 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  Aksen Tema Warna Aplikasi
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Pilih skema warna utama untuk tombol aksi, sorotan status, dan kartu aktif.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: 'default', label: 'Indigo Formal', color: '#6366f1', bg: 'bg-indigo-600' },
                    { id: 'ocean', label: 'Ocean Blue', color: '#0284c7', bg: 'bg-sky-600' },
                    { id: 'emerald', label: 'Emerald Mint', color: '#059669', bg: 'bg-emerald-600' },
                    { id: 'amber', label: 'Amber Gold', color: '#d97706', bg: 'bg-amber-600' },
                    { id: 'crimson', label: 'Crimson Rose', color: '#e11d48', bg: 'bg-rose-600' },
                  ].map((thm) => (
                    <button
                      key={thm.id}
                      onClick={() => {
                        handleUpdate('themePreset', thm.id as any);
                        handleUpdate('accentColorHex', thm.color);
                      }}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        settings.themePreset === thm.id
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-6 h-6 mx-auto rounded-full ${thm.bg} mb-2 shadow-xs`} />
                      <div className="font-semibold text-xs text-slate-900">{thm.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Density & Card Radius */}
              <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-1">
                    Kepadatan Konten
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">Ukuran spasi dan padding kontainer.</p>
                  <div className="flex gap-2">
                    {(['compact', 'normal', 'spacious'] as const).map((density) => (
                      <button
                        key={density}
                        onClick={() => handleUpdate('contentDensity', density)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border capitalize transition-all ${
                          settings.contentDensity === density
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {density === 'compact' ? 'Ringkas' : density === 'normal' ? 'Standar' : 'Lega'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-1">
                    Kelengkungan Sudut Kartu
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">Radius sudut elemen antarmuka.</p>
                  <div className="flex gap-2">
                    {(['md', 'lg', 'xl', '2xl'] as const).map((radius) => (
                      <button
                        key={radius}
                        onClick={() => handleUpdate('cardRadius', radius)}
                        className={`flex-1 py-2 text-xs font-semibold border uppercase transition-all ${
                          settings.cardRadius === radius
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        } ${radius === 'md' ? 'rounded-md' : radius === 'lg' ? 'rounded-lg' : radius === 'xl' ? 'rounded-xl' : 'rounded-2xl'}`}
                      >
                        {radius}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Visual Preview Panel */}
            <div className="space-y-6">
              <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  Pratinjau Komponen
                </h3>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                  {/* Simulated App Card */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Contoh Kartu Ujian
                      </span>
                      <span className="text-xs text-slate-400">90 Menit</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800">Matematika Wajib - Kelas XII</div>
                    <p className="text-xs text-slate-500 mt-1">40 Butir Soal • KKM 75</p>

                    <button
                      className="w-full mt-3 py-2 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90 shadow-xs"
                      style={{ backgroundColor: settings.accentColorHex || '#6366f1' }}
                    >
                      Mulai Simulasi Ujian
                    </button>
                  </div>

                  {/* Simulated Floating Position */}
                  <div className="text-xs text-slate-500">
                    Posisi Tombol Pengawas: <span className="font-semibold text-slate-800 capitalize">{settings.floatingMenuPosition}</span>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-slate-50 p-5 rounded-xl border border-indigo-100">
                <h4 className="text-xs font-bold uppercase text-indigo-900 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Akses Cepat Pengawas
                </h4>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  Semua modul administrasi, bank soal, jadwal, dan pelaporan dapat diakses langsung tanpa hambatan.
                </p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => onNavigateToView('sma_hub')}
                    className="w-full py-1.5 px-2.5 text-xs text-left font-medium text-slate-700 bg-white hover:bg-indigo-50 rounded border border-slate-200 flex items-center justify-between transition-colors"
                  >
                    <span>Bank Soal & Kelas SMA</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => onNavigateToView('exam_schedule_management')}
                    className="w-full py-1.5 px-2.5 text-xs text-left font-medium text-slate-700 bg-white hover:bg-indigo-50 rounded border border-slate-200 flex items-center justify-between transition-colors"
                  >
                    <span>Jadwal Ujian & Token</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Flowchart / Topologi Node Arsitektur */
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Diagram Arsitektur Alur Sistem CBT SMA
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Visualisasi terstruktur hubungan antar view modul. Anda dapat langsung mengklik node untuk berpindah ke tampilan terkait.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {flowNodes.map((node) => {
                const IconComponent = node.icon;
                return (
                  <div
                    key={node.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {node.badge}
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <IconComponent className="w-4 h-4" />
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {node.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {node.description}
                      </p>
                    </div>

                    <button
                      onClick={() => onNavigateToView(node.id)}
                      className="mt-4 w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Buka Tampilan
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
