import React, { useState } from 'react';
import {
  Sliders,
  Eye,
  EyeOff,
  Clock,
  User,
  GraduationCap,
  ListOrdered,
  Tag,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Bookmark,
  Type,
  Maximize2,
  Lock,
  Layers,
  FileCheck2,
  Check,
  RotateCcw,
  X,
  Zap,
  HelpCircle,
  Strikethrough,
  Edit3,
  BarChart2,
  Info,
  Play,
  Award,
  FileText,
  AlertTriangle,
  ArrowRight,
  Send,
  ChevronLeft,
  ChevronRight,
  Smartphone,
} from 'lucide-react';
import { ExamDisplaySettings, DEFAULT_EXAM_DISPLAY_SETTINGS } from '../types';

interface ExamDisplayCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ExamDisplaySettings;
  onSaveSettings: (newSettings: ExamDisplaySettings) => void;
  title?: string;
  subtitle?: string;
}

export const ExamDisplayCustomizerModal: React.FC<ExamDisplayCustomizerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  title = 'Pengaturan Tampilan Ujian & Mode Siswa',
  subtitle = 'Pilih elemen dan fitur apa saja yang ingin ditampilkan atau disembunyikan dari layar siswa saat pengerjaan soal.',
}) => {
  const [localSettings, setLocalSettings] = useState<ExamDisplaySettings>(settings);
  const [activeCategory, setActiveCategory] = useState<'all' | 'header' | 'tools' | 'security' | 'post_exam'>('all');
  const [previewStage, setPreviewStage] = useState<'before' | 'during' | 'after'>('during');

  if (!isOpen) return null;

  const handleToggle = (key: keyof ExamDisplaySettings) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Check which preset is currently active
  const isOfficialPreset =
    localSettings.showTimer === true &&
    localSettings.showStudentIdentity === true &&
    localSettings.showQuestionCounter === true &&
    localSettings.showSubtestBadge === true &&
    localSettings.showDifficultyBadge === false &&
    localSettings.showTopicTag === false &&
    localSettings.showQuestionGrid === true &&
    localSettings.showDoubtfulButton === true &&
    localSettings.showOptionElimination === true &&
    localSettings.showAiTutorHelper === false &&
    localSettings.showFontSizeControls === true &&
    localSettings.showScratchpad === true &&
    localSettings.showOptionLetters === true &&
    localSettings.showProctoringAlerts === true &&
    localSettings.showWatermark === true &&
    localSettings.forceFullscreen === true &&
    localSettings.showImmediateScore === false &&
    localSettings.showAnswerKeyAndExplanation === false &&
    localSettings.showIrtAnalytics === false;

  const isPracticePreset =
    localSettings.showTimer === true &&
    localSettings.showStudentIdentity === true &&
    localSettings.showQuestionCounter === true &&
    localSettings.showSubtestBadge === true &&
    localSettings.showDifficultyBadge === true &&
    localSettings.showTopicTag === true &&
    localSettings.showQuestionGrid === true &&
    localSettings.showDoubtfulButton === true &&
    localSettings.showOptionElimination === true &&
    localSettings.showAiTutorHelper === true &&
    localSettings.showFontSizeControls === true &&
    localSettings.showScratchpad === true &&
    localSettings.showOptionLetters === true &&
    localSettings.showProctoringAlerts === true &&
    localSettings.showWatermark === false &&
    localSettings.forceFullscreen === false &&
    localSettings.showImmediateScore === true &&
    localSettings.showAnswerKeyAndExplanation === true &&
    localSettings.showIrtAnalytics === true;

  const isRelaxedPreset =
    localSettings.showTimer === false &&
    localSettings.showStudentIdentity === true &&
    localSettings.showQuestionCounter === true &&
    localSettings.showSubtestBadge === true &&
    localSettings.showDifficultyBadge === true &&
    localSettings.showTopicTag === true &&
    localSettings.showQuestionGrid === true &&
    localSettings.showDoubtfulButton === true &&
    localSettings.showOptionElimination === true &&
    localSettings.showAiTutorHelper === true &&
    localSettings.showFontSizeControls === true &&
    localSettings.showScratchpad === true &&
    localSettings.showOptionLetters === true &&
    localSettings.showProctoringAlerts === false &&
    localSettings.showWatermark === false &&
    localSettings.forceFullscreen === false &&
    localSettings.showImmediateScore === true &&
    localSettings.showAnswerKeyAndExplanation === true &&
    localSettings.showIrtAnalytics === true;

  const isDistractionFreePreset =
    localSettings.showTimer === true &&
    localSettings.showStudentIdentity === false &&
    localSettings.showQuestionCounter === true &&
    localSettings.showSubtestBadge === false &&
    localSettings.showDifficultyBadge === false &&
    localSettings.showTopicTag === false &&
    localSettings.showQuestionGrid === false &&
    localSettings.showDoubtfulButton === false &&
    localSettings.showOptionElimination === true &&
    localSettings.showAiTutorHelper === false &&
    localSettings.showFontSizeControls === true &&
    localSettings.showScratchpad === false &&
    localSettings.showOptionLetters === true &&
    localSettings.showProctoringAlerts === false &&
    localSettings.showWatermark === false &&
    localSettings.forceFullscreen === false &&
    localSettings.showImmediateScore === true &&
    localSettings.showAnswerKeyAndExplanation === true &&
    localSettings.showIrtAnalytics === false;

  // Preset Handlers
  const applyPresetOfficialExam = () => {
    setLocalSettings({
      showTimer: true,
      showStudentIdentity: true,
      showQuestionCounter: true,
      showSubtestBadge: true,
      showDifficultyBadge: false, // Disembunyikan agar siswa tidak terpengaruh sugesti
      showTopicTag: false,
      showQuestionGrid: true,
      showDoubtfulButton: true,
      showOptionElimination: true,
      showAiTutorHelper: false, // Dilarang saat ujian resmi
      showFontSizeControls: true,
      showScratchpad: true,
      showOptionLetters: true,
      showProctoringAlerts: true,
      showWatermark: true, // Watermark anti-joki diaktifkan
      forceFullscreen: true,
      showImmediateScore: false, // Nilai dirahasiakan sementara sampai guru rilis
      showAnswerKeyAndExplanation: false, // Kunci dirahasiakan
      showIrtAnalytics: false,
    });
  };

  const applyPresetSelfPractice = () => {
    setLocalSettings({
      showTimer: true,
      showStudentIdentity: true,
      showQuestionCounter: true,
      showSubtestBadge: true,
      showDifficultyBadge: true,
      showTopicTag: true,
      showQuestionGrid: true,
      showDoubtfulButton: true,
      showOptionElimination: true,
      showAiTutorHelper: true,
      showFontSizeControls: true,
      showScratchpad: true,
      showOptionLetters: true,
      showProctoringAlerts: true,
      showWatermark: false,
      forceFullscreen: false,
      showImmediateScore: true,
      showAnswerKeyAndExplanation: true,
      showIrtAnalytics: true,
    });
  };

  const applyPresetRelaxedNoTimer = () => {
    setLocalSettings({
      showTimer: false, // Waktu disembunyikan agar anak tidak cemas
      showStudentIdentity: true,
      showQuestionCounter: true,
      showSubtestBadge: true,
      showDifficultyBadge: true,
      showTopicTag: true,
      showQuestionGrid: true,
      showDoubtfulButton: true,
      showOptionElimination: true,
      showAiTutorHelper: true,
      showFontSizeControls: true,
      showScratchpad: true,
      showOptionLetters: true,
      showProctoringAlerts: false,
      showWatermark: false,
      forceFullscreen: false,
      showImmediateScore: true,
      showAnswerKeyAndExplanation: true,
      showIrtAnalytics: true,
    });
  };

  const applyPresetDistractionFree = () => {
    setLocalSettings({
      showTimer: true,
      showStudentIdentity: false,
      showQuestionCounter: true,
      showSubtestBadge: false,
      showDifficultyBadge: false,
      showTopicTag: false,
      showQuestionGrid: false, // Navigasi disederhanakan
      showDoubtfulButton: false,
      showOptionElimination: true,
      showAiTutorHelper: false,
      showFontSizeControls: true,
      showScratchpad: false,
      showOptionLetters: true,
      showProctoringAlerts: false,
      showWatermark: false,
      forceFullscreen: false,
      showImmediateScore: true,
      showAnswerKeyAndExplanation: true,
      showIrtAnalytics: false,
    });
  };

  const handleResetDefault = () => {
    setLocalSettings(DEFAULT_EXAM_DISPLAY_SETTINGS);
  };

  const handleSaveAndClose = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  // Count active vs hidden
  const totalToggles = Object.keys(localSettings).length;
  const activeTogglesCount = Object.values(localSettings).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col h-[90vh] max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-950/50 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeTogglesCount}/{totalToggles} Aktif
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            id="btn-close-display-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/90 border-b border-slate-800/80 shrink-0 overflow-x-auto custom-scrollbar">
          <div className="flex flex-nowrap sm:flex-wrap items-center justify-between gap-2 min-w-max sm:min-w-0">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Preset Mode Cepat:</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                id="preset-btn-official"
                type="button"
                onClick={applyPresetOfficialExam}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${
                  isOfficialPreset
                    ? 'bg-rose-950/90 text-rose-100 border-2 border-rose-400 ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-rose-950/70 font-black'
                    : 'bg-slate-800 hover:bg-rose-950/60 text-slate-200 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40'
                }`}
                title="Sembunyikan AI Tutor, sembunyikan kunci & aktifkan watermark anti-joki"
              >
                <Lock className={`w-3.5 h-3.5 ${isOfficialPreset ? 'text-rose-300' : 'text-rose-400'}`} />
                <span>🏫 Ujian Resmi / Ketat</span>
                {isOfficialPreset && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full shadow-sm ml-0.5 animate-fade-in">
                    <Check className="w-2.5 h-2.5 stroke-[3]" /> Terpilih
                  </span>
                )}
              </button>

              <button
                id="preset-btn-practice"
                type="button"
                onClick={applyPresetSelfPractice}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${
                  isPracticePreset
                    ? 'bg-indigo-950/90 text-indigo-100 border-2 border-indigo-400 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-indigo-950/70 font-black'
                    : 'bg-slate-800 hover:bg-indigo-950/60 text-slate-200 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500/40'
                }`}
                title="Tampilkan semua fitur lengkap termasuk AI Tutor & Pembahasan"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isPracticePreset ? 'text-indigo-300' : 'text-indigo-400'}`} />
                <span>📚 Latihan Mandiri Lengkap</span>
                {isPracticePreset && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded-full shadow-sm ml-0.5 animate-fade-in">
                    <Check className="w-2.5 h-2.5 stroke-[3]" /> Terpilih
                  </span>
                )}
              </button>

              <button
                id="preset-btn-relaxed"
                type="button"
                onClick={applyPresetRelaxedNoTimer}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${
                  isRelaxedPreset
                    ? 'bg-emerald-950/90 text-emerald-100 border-2 border-emerald-400 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-emerald-950/70 font-black'
                    : 'bg-slate-800 hover:bg-emerald-950/60 text-slate-200 hover:text-emerald-200 border border-slate-700 hover:border-emerald-500/40'
                }`}
                title="Sembunyikan hitung mundur timer untuk latihan santai tanpa tekanan"
              >
                <EyeOff className={`w-3.5 h-3.5 ${isRelaxedPreset ? 'text-emerald-300' : 'text-emerald-400'}`} />
                <span>🌿 Santai (Tanpa Timer)</span>
                {isRelaxedPreset && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded-full shadow-sm ml-0.5 animate-fade-in">
                    <Check className="w-2.5 h-2.5 stroke-[3]" /> Terpilih
                  </span>
                )}
              </button>

              <button
                id="preset-btn-distraction-free"
                type="button"
                onClick={applyPresetDistractionFree}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${
                  isDistractionFreePreset
                    ? 'bg-amber-950/90 text-amber-100 border-2 border-amber-400 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-amber-950/70 font-black'
                    : 'bg-slate-800 hover:bg-amber-950/60 text-slate-200 hover:text-amber-200 border border-slate-700 hover:border-amber-500/40'
                }`}
                title="Sembunyikan ornamen badge dan sidebar navigasi agar fokus membaca soal"
              >
                <Layers className={`w-3.5 h-3.5 ${isDistractionFreePreset ? 'text-amber-300' : 'text-amber-400'}`} />
                <span>🎯 Minimalis Bebas Distraksi</span>
                {isDistractionFreePreset && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full shadow-sm ml-0.5 animate-fade-in">
                    <Check className="w-2.5 h-2.5 stroke-[3]" /> Terpilih
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800/80 shrink-0 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Semua Tampilan ({totalToggles})
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('header')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'header'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Header & Info Soal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('tools')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'tools'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Alat Bantu & Pengerjaan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('security')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'security'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Pengawasan & Keamanan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('post_exam')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'post_exam'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Pasca Ujian (Hasil & Kunci)</span>
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {/* GROUP 1: Header & Informasi Soal */}
          {(activeCategory === 'all' || activeCategory === 'header') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>1. Tampilan Header & Informasi Soal</span>
                </h4>
                <span className="text-[11px] text-slate-500">Elemen identitas & waktu di bilah atas</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Timer */}
                <div
                  onClick={() => handleToggle('showTimer')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showTimer
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Timer Countdown Waktu Ujian</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan hitung mundur waktu tersisa. Sembunyikan untuk latihan santai tanpa beban waktu.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showTimer} />
                </div>

                {/* Identitas Siswa */}
                <div
                  onClick={() => handleToggle('showStudentIdentity')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showStudentIdentity
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <User className="w-4 h-4 text-indigo-400" />
                      <span>Identitas Siswa (Nama, NIS, Kelas)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan tag profil siswa di bilah header saat pengerjaan berlangsung.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showStudentIdentity} />
                </div>

                {/* Nomor & Counter Soal */}
                <div
                  onClick={() => handleToggle('showQuestionCounter')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showQuestionCounter
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <ListOrdered className="w-4 h-4 text-cyan-400" />
                      <span>Nomor Urut & Indikator Soal</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan kotak nomor soal aktif (contoh: No. 1 dari 20 butir).
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showQuestionCounter} />
                </div>

                {/* Subtest Badge */}
                <div
                  onClick={() => handleToggle('showSubtestBadge')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showSubtestBadge
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <GraduationCap className="w-4 h-4 text-blue-400" />
                      <span>Label / Nama Subtes Ujian</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan nama bidang (contoh: Penalaran Matematika, Fisika, Literasi).
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showSubtestBadge} />
                </div>

                {/* Difficulty Badge */}
                <div
                  onClick={() => handleToggle('showDifficultyBadge')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showDifficultyBadge
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Tag className="w-4 h-4 text-amber-400" />
                      <span>Badge Tingkat Kesulitan (Mudah/HOTS)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan label tingkat kesulitan butir soal. Sembunyikan untuk simulasi murni.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showDifficultyBadge} />
                </div>

                {/* Topic Tag */}
                <div
                  onClick={() => handleToggle('showTopicTag')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showTopicTag
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Tag className="w-4 h-4 text-purple-400" />
                      <span>Tag Bab / Topik Materi Soal</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan nama topik/bab pembahasan pada bagian atas soal.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showTopicTag} />
                </div>
              </div>
            </div>
          )}

          {/* GROUP 2: Alat Bantu & Interaktivitas Siswa */}
          {(activeCategory === 'all' || activeCategory === 'tools') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  <span>2. Alat Bantu & Interaktivitas Pengerjaan</span>
                </h4>
                <span className="text-[11px] text-slate-500">Fitur interaktif yang dapat diakses anak</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* AI Tutor Assistant Button */}
                <div
                  onClick={() => handleToggle('showAiTutorHelper')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showAiTutorHelper
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Bantuan AI Tutor Saat Ujian</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan tombol asisten AI untuk panduan konsep/petunjuk. Matikan saat ujian resmi.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showAiTutorHelper} />
                </div>

                {/* Option Elimination Feature */}
                <div
                  onClick={() => handleToggle('showOptionElimination')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showOptionElimination
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Strikethrough className="w-4 h-4 text-rose-400" />
                      <span>Fitur Coret / Eliminasi Opsi Salah</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Memungkinkan anak mencoret pilihan ganda yang diyakini salah untuk mempermudah eliminasi.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showOptionElimination} />
                </div>

                {/* Tombol Ragu-Ragu */}
                <div
                  onClick={() => handleToggle('showDoubtfulButton')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showDoubtfulButton
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Bookmark className="w-4 h-4 text-amber-400" />
                      <span>Tombol Tandai 'Ragu-Ragu'</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan tombol penanda kuning di bilah bawah untuk soal yang belum pasti.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showDoubtfulButton} />
                </div>

                {/* Grid Daftar Nomor Soal */}
                <div
                  onClick={() => handleToggle('showQuestionGrid')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showQuestionGrid
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <ListOrdered className="w-4 h-4 text-emerald-400" />
                      <span>Daftar / Grid Navigasi Nomor Soal</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan panel navigasi lompat nomor soal di sisi kanan/drawer mobile.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showQuestionGrid} />
                </div>

                {/* Scratchpad Coretan Virtual */}
                <div
                  onClick={() => handleToggle('showScratchpad')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showScratchpad
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Edit3 className="w-4 h-4 text-blue-400" />
                      <span>Papan Coretan / Catatan Hitung Virtual</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menyediakan kanvas coretan digital untuk corat-coret rumus atau hitungan anak di layar.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showScratchpad} />
                </div>

                {/* Pengatur Ukuran Font */}
                <div
                  onClick={() => handleToggle('showFontSizeControls')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showFontSizeControls
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Type className="w-4 h-4 text-slate-300" />
                      <span>Pengatur Ukuran Huruf (A / A+ / A++)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan tombol pembesar teks wacana dan soal untuk kenyamanan membaca.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showFontSizeControls} />
                </div>

                {/* Huruf Pilihan Opsi A, B, C, D, E */}
                <div
                  onClick={() => handleToggle('showOptionLetters')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showOptionLetters
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <span className="w-4 h-4 rounded bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-300">
                        A
                      </span>
                      <span>Label Huruf Pilihan (A, B, C, D, E)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan kotak huruf abjad di samping opsi pilihan ganda.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showOptionLetters} />
                </div>
              </div>
            </div>
          )}

          {/* GROUP 3: Keamanan, Pengawasan & Privasi */}
          {(activeCategory === 'all' || activeCategory === 'security') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>3. Keamanan, Pengawasan & Privasi</span>
                </h4>
                <span className="text-[11px] text-slate-500">Proctoring dan pencegahan kecurangan</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Proctoring Alerts */}
                <div
                  onClick={() => handleToggle('showProctoringAlerts')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showProctoringAlerts
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Status Pengawas & Notifikasi Peringatan</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan badge integritas dan toast peringatan saat anak pindah tab atau split layar.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showProctoringAlerts} />
                </div>

                {/* Watermark Anti-Joki */}
                <div
                  onClick={() => handleToggle('showWatermark')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showWatermark
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Watermark Anti-Joki / Foto Layar</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan watermark transparan (Nama & NIS Siswa) di latar belakang layar soal untuk mencegah joki / foto.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showWatermark} />
                </div>

                {/* Force Fullscreen */}
                <div
                  onClick={() => handleToggle('forceFullscreen')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.forceFullscreen
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Maximize2 className="w-4 h-4 text-cyan-400" />
                      <span>Kunci Mode Layar Penuh (Fullscreen)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Mengarahkan otomatis aplikasi masuk ke mode fullscreen saat ujian dimulai.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.forceFullscreen} />
                </div>
              </div>
            </div>
          )}

          {/* GROUP 4: Pasca Ujian (Hasil & Pembahasan untuk Siswa) */}
          {(activeCategory === 'all' || activeCategory === 'post_exam') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-400" />
                  <span>4. Pasca Ujian (Hasil & Pembahasan untuk Siswa)</span>
                </h4>
                <span className="text-[11px] text-slate-500">Akses siswa setelah mengumpulkan ujian</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Tampilkan Skor Langsung */}
                <div
                  onClick={() => handleToggle('showImmediateScore')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showImmediateScore
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <FileCheck2 className="w-4 h-4 text-emerald-400" />
                      <span>Tampilkan Skor / Nilai Instan</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Siswa dapat melihat nilai akhir langsung setelah klik kumpulkan. Matikan jika guru ingin merekap dulu.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showImmediateScore} />
                </div>

                {/* Kunci Jawaban & Pembahasan Lengkap */}
                <div
                  onClick={() => handleToggle('showAnswerKeyAndExplanation')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showAnswerKeyAndExplanation
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Check className="w-4 h-4 text-indigo-400" />
                      <span>Kunci Jawaban & Pembahasan Lengkap</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Mengizinkan siswa membuka pembahasan langkah demi langkah dan konsep materi per butir soal.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showAnswerKeyAndExplanation} />
                </div>

                {/* Analisis IRT & Peluang PTN */}
                <div
                  onClick={() => handleToggle('showIrtAnalytics')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    localSettings.showIrtAnalytics
                      ? 'bg-slate-900 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <BarChart2 className="w-4 h-4 text-purple-400" />
                      <span>Grafik IRT, Radar & Peluang Lulus PTN</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menampilkan kurva IRT, radar kekuatan/kelemahan subtes, dan simulasi probabilitas kampus impian.
                    </p>
                  </div>
                  <ToggleSwitch checked={localSettings.showIrtAnalytics} />
                </div>
              </div>
            </div>
          )}

          {/* Multi-Stage Real-time Layout Preview Mockup */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            {/* Preview Header & Stage Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Pratinjau Layar Siswa (Live Preview)</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {activeTogglesCount} Fitur Aktif
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      ↕️ Dapat Di-scroll
                    </span>
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Pilih fase pengerjaan untuk melihat simulasi tampilan antarmuka siswa (gulir layar untuk melihat seluruh elemen):
                  </p>
                </div>
              </div>

              {/* Stage Switcher Buttons */}
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                <button
                  id="preview-tab-before"
                  type="button"
                  onClick={() => setPreviewStage('before')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewStage === 'before'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  <span>Sebelum Ujian</span>
                </button>

                <button
                  id="preview-tab-during"
                  type="button"
                  onClick={() => setPreviewStage('during')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewStage === 'during'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Saat Ujian</span>
                </button>

                <button
                  id="preview-tab-after"
                  type="button"
                  onClick={() => setPreviewStage('after')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewStage === 'after'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <BarChart2 className="w-3 h-3" />
                  <span>Setelah Ujian</span>
                </button>
              </div>
            </div>

            {/* STAGE 1: SEBELUM UJIAN (Gerbang Masuk / Verifikasi & Petunjuk) */}
            {previewStage === 'before' && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Layar Gerbang Siswa (Gulir ke bawah untuk melihat tombol & petunjuk)</span>
                  </span>
                  <span className="text-emerald-400 font-mono text-[10px]">↕️ Scrollable</span>
                </div>

                <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-inner space-y-4 max-h-[480px] overflow-y-auto custom-scrollbar select-none">
                  {/* Mini Watermark indicator if enabled */}
                  {localSettings.showWatermark && (
                    <div className="sticky top-0 z-20 flex items-center justify-end">
                      <div className="flex items-center gap-1 text-[9px] font-mono text-indigo-400/80 bg-indigo-950/80 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-indigo-500/30 shadow-md">
                        <Lock className="w-2.5 h-2.5" /> Watermark Anti-Joki Diaktifkan (Nama & NIS)
                      </div>
                    </div>
                  )}

                  {/* Header Title */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {localSettings.showSubtestBadge ? 'Subtes: Penalaran Matematika & TPS' : 'Simulasi Ujian Sekolah'}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        Sumatif Akhir Semester (SAS / PAS CBT)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Pastikan data diri dan perangkat sudah sesuai sebelum menekan tombol mulai ujian.
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400">Alokasi Waktu</div>
                      <div className="text-xs font-mono font-bold text-amber-400">
                        {localSettings.showTimer ? '⏱ 45 Menit (Timer Aktif)' : '🌿 Mode Santai (Tanpa Timer)'}
                      </div>
                    </div>
                  </div>

                  {/* Identity Box */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold">Nama & NIS Siswa</div>
                        <div className="font-bold text-slate-200">
                          {localSettings.showStudentIdentity ? 'Budi Santoso • NIS. 20261042' : 'Peserta Ujian (Anonim / Rahasia)'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold">Kelas & Rumpun</div>
                        <div className="font-bold text-slate-200">
                          {localSettings.showStudentIdentity ? 'Kelas 12 MIPA 1' : 'Tingkat Standar SMA'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rules & Security Badges before start */}
                  <div className="space-y-1.5 text-xs">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Ketentuan & Fitur yang Disediakan Saat Ujian:</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className={`p-2 rounded-lg border ${localSettings.forceFullscreen ? 'bg-slate-900 border-indigo-500/40 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <Maximize2 className="w-3 h-3" />
                          <span>Layar Penuh</span>
                        </div>
                        <div className="text-[9px] text-slate-400">{localSettings.forceFullscreen ? 'Wajib Fullscreen' : 'Bebas Jendela'}</div>
                      </div>

                      <div className={`p-2 rounded-lg border ${localSettings.showProctoringAlerts ? 'bg-slate-900 border-rose-500/40 text-rose-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Pengawas AI</span>
                        </div>
                        <div className="text-[9px] text-slate-400">{localSettings.showProctoringAlerts ? 'Deteksi Tab Aktif' : 'Non-aktif'}</div>
                      </div>

                      <div className={`p-2 rounded-lg border ${localSettings.showAiTutorHelper ? 'bg-slate-900 border-indigo-500/40 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Bantuan AI</span>
                        </div>
                        <div className="text-[9px] text-slate-400">{localSettings.showAiTutorHelper ? 'Tersedia' : 'Dilarang Saat Ujian'}</div>
                      </div>

                      <div className={`p-2 rounded-lg border ${localSettings.showOptionElimination ? 'bg-slate-900 border-emerald-500/40 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <Strikethrough className="w-3 h-3" />
                          <span>Coret Opsi</span>
                        </div>
                        <div className="text-[9px] text-slate-400">{localSettings.showOptionElimination ? 'Diizinkan' : 'Disembunyikan'}</div>
                      </div>

                      <div className={`p-2 rounded-lg border ${localSettings.showScratchpad ? 'bg-slate-900 border-blue-500/40 text-blue-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <Edit3 className="w-3 h-3" />
                          <span>Papan Coretan</span>
                        </div>
                        <div className="text-[9px] text-slate-400">{localSettings.showScratchpad ? 'Tersedia Digital' : 'Kertas Manual'}</div>
                      </div>

                      <div className={`p-2 rounded-lg border ${localSettings.showImmediateScore ? 'bg-slate-900 border-amber-500/40 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        <div className="font-bold flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>Rilis Nilai</span>
                        </div>
                        <div className="text-[9px] text-slate-400">{localSettings.showImmediateScore ? 'Langsung Keluar' : 'Ditahan Pengawas'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Scrollable Instructions */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                    <p className="font-semibold text-white">Petunjuk Khusus Pengerjaan:</p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                      <li>Gunakan tombol nomor soal untuk melompat langsung ke soal yang diinginkan.</li>
                      <li>Jawaban otomatis tersimpan setiap kali Anda memilih opsi pilihan ganda.</li>
                      <li>Periksa kembali status ragu-ragu sebelum mengakhiri sesi pengerjaan.</li>
                    </ul>
                  </div>

                  {/* Start Button Simulation */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-500">
                      Simulasi siap diuji coba
                    </span>
                    <button
                      id="preview-btn-start-exam-sim"
                      type="button"
                      onClick={() => setPreviewStage('during')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                    >
                      <span>Simulasikan Masuk Ujian</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 2: SAAT UJIAN (Layar Pengerjaan CBT - Fully Scrollable Mockup) */}
            {previewStage === 'during' && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Layar Ujian Siswa (Gulir ke bawah untuk membaca wacana, rumus, dan tombol navigasi)</span>
                  </span>
                  <span className="text-emerald-400 font-mono text-[10px]">↕️ Scrollable</span>
                </div>

                <div className="relative rounded-2xl bg-slate-900 border border-slate-800 shadow-inner max-h-[480px] overflow-y-auto custom-scrollbar p-3 sm:p-4 text-xs space-y-3.5 select-none">
                  {/* Watermark Overlay if active */}
                  {localSettings.showWatermark && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-15 rotate-[-20deg]">
                      <span className="text-sm sm:text-base font-mono font-black text-white tracking-widest uppercase">
                        SMA NEGERI 1 • 2026-NIS-VERIFIED
                      </span>
                    </div>
                  )}

                  {/* Proctoring Warning Badge if active */}
                  {localSettings.showProctoringAlerts && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-200">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Pengawas Aktif: Tab browser & pergerakan jendela dipantau</span>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        Integritas 100%
                      </span>
                    </div>
                  )}

                  {/* CBT Top Header Bar (Sticky within the scrollable preview) */}
                  <div className="sticky top-0 z-20 pb-2.5 pt-1 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {localSettings.showQuestionCounter && (
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow">
                          1
                        </span>
                      )}
                      {localSettings.showSubtestBadge && (
                        <span className="font-bold text-white text-xs">
                          Penalaran Matematika
                        </span>
                      )}
                      {localSettings.showDifficultyBadge && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Sedang
                        </span>
                      )}
                      {localSettings.showTopicTag && (
                        <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Bab: Aljabar & Fungsi
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {localSettings.showFontSizeControls && (
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-bold text-slate-400">
                          <span className="hover:text-white cursor-pointer">A-</span>
                          <span className="text-white">A</span>
                          <span className="hover:text-white cursor-pointer">A+</span>
                        </div>
                      )}
                      {localSettings.showStudentIdentity && (
                        <span className="hidden sm:inline text-[10px] text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          Budi Santoso (12 MIPA 1)
                        </span>
                      )}
                      {localSettings.showTimer && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-400 font-mono font-black text-xs border border-amber-500/40 shadow-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>44:59</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stimulus / Reading Passage */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-indigo-400 font-bold">
                      <span>Wacana Stimulus Soal #1</span>
                      <span className="text-slate-500 text-[10px]">Tipe: Pilihan Ganda</span>
                    </div>
                    <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                      Diberikan grafik fungsi kuadrat <code className="px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono border border-slate-800">f(x) = ax² + bx + c</code> yang memiliki titik puncak simetri di koordinat <code className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 font-mono border border-slate-800">(2, -4)</code> serta memotong sumbu Y tepat pada titik pangkal <code className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 font-mono border border-slate-800">(0, 0)</code>.
                    </p>
                    <p className="text-slate-300 text-xs font-semibold">
                      Berdasarkan informasi karakteristik kurva parabola tersebut, berapakah nilai dari fungsi komposisi <code className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono border border-slate-800">f(4)</code>?
                    </p>
                  </div>

                  {/* Question Options & Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 py-1">
                    {/* Left: Main Question Content Options */}
                    <div className={`${localSettings.showQuestionGrid ? 'md:col-span-3' : 'md:col-span-4'} space-y-2.5`}>
                      {/* Option A */}
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center justify-between gap-2 transition-all">
                        <div className="flex items-center gap-2.5">
                          {localSettings.showOptionLetters && (
                            <span className="w-5 h-5 rounded-md bg-slate-800 font-bold flex items-center justify-center text-[10px] text-slate-300 border border-slate-700">
                              A
                            </span>
                          )}
                          <span>Nilai f(4) = -2</span>
                        </div>
                        {localSettings.showOptionElimination && (
                          <button
                            type="button"
                            className="text-slate-500 hover:text-rose-400 p-1 flex items-center gap-1 text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 cursor-pointer"
                            title="Coret Opsi"
                          >
                            <Strikethrough className="w-3 h-3" />
                            <span>Coret</span>
                          </button>
                        )}
                      </div>

                      {/* Option B (Selected) */}
                      <div className="p-2.5 rounded-xl bg-indigo-600/25 border-2 border-indigo-400 text-xs text-white flex items-center justify-between gap-2 shadow-md shadow-indigo-950/40">
                        <div className="flex items-center gap-2.5">
                          {localSettings.showOptionLetters && (
                            <span className="w-5 h-5 rounded-md bg-indigo-600 font-black flex items-center justify-center text-[10px] text-white shadow ring-1 ring-indigo-400">
                              B
                            </span>
                          )}
                          <span className="font-semibold">Nilai f(4) = 0</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-600 text-white shadow-sm border border-indigo-300/40">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Terpilih
                        </span>
                      </div>

                      {/* Option C */}
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {localSettings.showOptionLetters && (
                            <span className="w-5 h-5 rounded-md bg-slate-800 font-bold flex items-center justify-center text-[10px] text-slate-300 border border-slate-700">
                              C
                            </span>
                          )}
                          <span>Nilai f(4) = 2</span>
                        </div>
                        {localSettings.showOptionElimination && (
                          <button
                            type="button"
                            className="text-slate-500 hover:text-rose-400 p-1 flex items-center gap-1 text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 cursor-pointer"
                            title="Coret Opsi"
                          >
                            <Strikethrough className="w-3 h-3" />
                            <span>Coret</span>
                          </button>
                        )}
                      </div>

                      {/* Option D */}
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {localSettings.showOptionLetters && (
                            <span className="w-5 h-5 rounded-md bg-slate-800 font-bold flex items-center justify-center text-[10px] text-slate-300 border border-slate-700">
                              D
                            </span>
                          )}
                          <span>Nilai f(4) = 4</span>
                        </div>
                        {localSettings.showOptionElimination && (
                          <button
                            type="button"
                            className="text-slate-500 hover:text-rose-400 p-1 flex items-center gap-1 text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 cursor-pointer"
                            title="Coret Opsi"
                          >
                            <Strikethrough className="w-3 h-3" />
                            <span>Coret</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right: Question Navigation Grid (If enabled) */}
                    {localSettings.showQuestionGrid && (
                      <div className="hidden md:flex flex-col p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                        <div className="font-bold text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Nomor Soal</span>
                          <span className="text-indigo-400">1 / 15</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          <span className="w-6 h-6 rounded bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shadow">
                            1
                          </span>
                          <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 font-bold text-[10px] flex items-center justify-center">
                            2
                          </span>
                          <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 font-bold text-[10px] flex items-center justify-center">
                            3
                          </span>
                          <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 font-bold text-[10px] flex items-center justify-center">
                            4
                          </span>
                          <span className="w-6 h-6 rounded bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                            5
                          </span>
                          <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 font-bold text-[10px] flex items-center justify-center">
                            6
                          </span>
                          <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 font-bold text-[10px] flex items-center justify-center">
                            7
                          </span>
                          <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 font-bold text-[10px] flex items-center justify-center">
                            8
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 pt-1 border-t border-slate-800/80">
                          🔵 Dijawab • 🟡 Ragu • ⚪ Belum
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scratchpad Simulated Canvas Note if enabled */}
                  {localSettings.showScratchpad && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-blue-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Papan Coretan Digital (Scratchpad Siswa)</span>
                        </span>
                        <span className="text-[10px] text-slate-500">Coretan Tersimpan Otomatis</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-[11px] text-slate-300">
                        f(x) = a(x)(x-4) ➔ substitusi puncak (2, -4) ➔ a=1 ➔ f(4)=0 ✔
                      </div>
                    </div>
                  )}

                  {/* Bottom Navigation & Extra Tools */}
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Sebelumnya</span>
                      </button>

                      {localSettings.showDoubtfulButton && (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>Ragu-Ragu</span>
                        </button>
                      )}

                      {localSettings.showAiTutorHelper && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold">
                          <Sparkles className="w-3 h-3" /> Bantuan AI Tutor
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Selanjutnya</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        id="preview-btn-submit-exam-sim"
                        type="button"
                        onClick={() => setPreviewStage('after')}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-indigo-500"
                      >
                        <Send className="w-3 h-3" />
                        <span>Kumpulkan</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 3: SETELAH UJIAN (Laporan Hasil & Analisis Nilai - Fully Scrollable Mockup) */}
            {previewStage === 'after' && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Layar Pasca Ujian (Gulir ke bawah untuk melihat pembahasan, skor, dan grafik IRT)</span>
                  </span>
                  <span className="text-emerald-400 font-mono text-[10px]">↕️ Scrollable</span>
                </div>

                <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-inner space-y-4 max-h-[480px] overflow-y-auto custom-scrollbar select-none">
                  {/* Status Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          Ujian Selesai Dikumpulkan
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        Jawaban siswa telah tersimpan dan diverifikasi secara aman.
                      </p>
                    </div>

                    {/* Immediate Score or Hidden Score */}
                    {localSettings.showImmediateScore ? (
                      <div className="bg-slate-950 border border-indigo-500/40 rounded-xl px-4 py-2 text-center min-w-[160px] shadow-md">
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                          Skor Skala IRT
                        </span>
                        <span className="text-xl font-black text-white tracking-tight">
                          742 <span className="text-xs font-normal text-slate-400">/ 1000</span>
                        </span>
                      </div>
                    ) : (
                      <div className="bg-slate-950/80 border border-amber-500/40 rounded-xl px-4 py-2 text-center min-w-[160px]">
                        <span className="text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" /> Nilai Dirahasiakan
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Menunggu pengumuman resmi guru
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Counters (If Score is shown) */}
                  {localSettings.showImmediateScore && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                        <div className="text-[10px] text-emerald-400 font-bold">Benar</div>
                        <div className="text-base font-black text-emerald-300">12 Soal</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30">
                        <div className="text-[10px] text-rose-400 font-bold">Salah</div>
                        <div className="text-base font-black text-rose-300">3 Soal</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-bold">Akurasi</div>
                        <div className="text-base font-black text-white">80%</div>
                      </div>
                    </div>
                  )}

                  {/* Answer Key & Explanation Section Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Kunci Jawaban & Pembahasan:</span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {localSettings.showAnswerKeyAndExplanation ? '🔓 Terbuka untuk Siswa' : '🔒 Ditutup oleh Guru'}
                      </span>
                    </div>

                    {localSettings.showAnswerKeyAndExplanation ? (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-[11px]">Soal No. 1 • Aljabar Kuadrat</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                            Jawaban Siswa: B (Benar)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          <strong className="text-indigo-300">Langkah:</strong> Sumbu simetri x = 2, f(0)=0 maka c=0. f(x) = a(x)(x-4). Substitusi (2,-4) didapat a=1. Maka f(4) = 1(4)(0) = 0.
                        </p>
                        <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[10px] text-indigo-200">
                          💡 <strong>Fast Trick:</strong> Karena grafik simetris terhadap x=2 dan f(0)=0, maka titik potong satunya lagi adalah x = 2(2) - 0 = 4, sehingga pasti f(4) = 0.
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                        <Lock className="w-4 h-4 text-slate-500 mx-auto" />
                        <div className="text-xs font-bold text-slate-400">Pembahasan Tidak Ditampilkan</div>
                        <p className="text-[10px] text-slate-500">
                          Guru menonaktifkan pembahasan untuk menjaga kerahasiaan bank soal.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* IRT Analytics & Radar Graph Section Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Analisis IRT & Radar Subtes:</span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {localSettings.showIrtAnalytics ? '📊 Grafik Terbuka' : 'Disembunyikan'}
                      </span>
                    </div>

                    {localSettings.showIrtAnalytics ? (
                      <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300">Penalaran Matematika</span>
                          <span className="font-mono font-bold text-purple-300">760 / 1000 (Sangat Kuat)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full w-[76%]" />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          🎯 <strong>Peluang Kelulusan:</strong> Nilai ini melampaui passing grade target prodi impian.
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-[10px] text-slate-500">
                        Grafik analisis IRT dan radar subtes tidak ditampilkan ke akun siswa.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-6 border-t border-slate-800/80 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Standar</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              id="btn-save-exam-display"
              type="button"
              onClick={handleSaveAndClose}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Terapkan Tampilan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Toggle Switch Component
const ToggleSwitch: React.FC<{ checked: boolean }> = ({ checked }) => {
  return (
    <div
      className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer shrink-0 ${
        checked ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
      }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
          checked ? 'translate-x-0' : 'translate-x-0'
        }`}
      />
    </div>
  );
};
