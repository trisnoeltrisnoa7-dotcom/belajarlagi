import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  Plus,
  Trash2,
  ArrowRight,
  BookOpen,
  Calendar,
  AlertCircle,
  HelpCircle,
  Lock,
  ExternalLink,
  Send,
  Sliders,
  Award,
} from 'lucide-react';
import {
  ExamPackage,
  ExamSubjectSessionSchedule,
  Question,
  SubtestConfig,
} from '../types';
import { SMA_SUBJECTS_LIST, INITIAL_SMA_QUESTIONS, SUBTEST_SMA_CONFIGS } from '../data/mockSmaData';
import { getMasterSubjects, subscribeMasterSubjectClass } from '../services/masterDataService';
import { ALL_MOCK_QUESTIONS } from '../data/mockQuestions';
import { isExamFreeModeActive } from '../utils/tokenSecurity';

interface MultiSubjectExamCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePackage?: (pkg: ExamPackage) => void;
  onSaveExamPackage?: (pkg: ExamPackage) => void;
  onLaunchDirectly?: (pkg: ExamPackage) => void;
}

interface SessionDraft {
  sessionNumber: number;
  subjectId: string;
  subjectName: string;
  customTitle: string;
  durationMinutes: number;
  questionCount: number;
  kkmScore: number;
  breakAfterMinutes: number;
  allowEarlyFinish: boolean;
  isLockedAfterFinish: boolean;
}

export const MultiSubjectExamCreatorModal: React.FC<MultiSubjectExamCreatorModalProps> = ({
  isOpen,
  onClose,
  onSavePackage,
  onSaveExamPackage,
  onLaunchDirectly,
}) => {
  const [masterSubjects, setMasterSubjects] = useState(() => getMasterSubjects());
  const SUBJECTS = masterSubjects.length ? masterSubjects : SMA_SUBJECTS_LIST;

  React.useEffect(() => {
    const unsub = subscribeMasterSubjectClass(() => {
      setMasterSubjects(getMasterSubjects());
    });
    return unsub;
  }, []);
  const [title, setTitle] = useState('Ujian Terpadu 3 Mata Pelajaran: Matematika, Fisika & Ekonomi');
  const [tagline, setTagline] = useState('Format 1 Link Multi-Sesi: Jam Ke-1 Matematika (30m) ➔ Jam Ke-2 Fisika (30m) ➔ Jam Ke-3 Ekonomi (30m). Nilai terpisah masing-masing mapel.');
  const [grade, setGrade] = useState<'10' | '11' | '12'>('11');
  const [major, setMajor] = useState<'MIPA' | 'IPS' | 'Umum'>('Umum');
  const [examType, setExamType] = useState('Sumatif Akhir Semester (SAS / PAS)');
  const [kkmScore, setKkmScore] = useState(75);
  const [strictSessionLocking, setStrictSessionLocking] = useState(true);
  const [breakBetweenSessionsMinutes, setBreakBetweenSessionsMinutes] = useState(1);
  
  // Waktu Buka Ujian & Penguncian Jadwal
  const [isScheduleLocked, setIsScheduleLocked] = useState(false);
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [allowEarlyBypassBySupervisor, setAllowEarlyBypassBySupervisor] = useState(true);

  // Default sessions preset: 3 Subjects (Matematika, Fisika, Ekonomi)
  const [sessions, setSessions] = useState<SessionDraft[]>([
    {
      sessionNumber: 1,
      subjectId: 'matematika_wajib',
      subjectName: 'Matematika Wajib',
      customTitle: 'Jam Ke-1: Matematika Wajib',
      durationMinutes: 30,
      questionCount: 3,
      kkmScore: 75,
      breakAfterMinutes: 1,
      allowEarlyFinish: true,
      isLockedAfterFinish: true,
    },
    {
      sessionNumber: 2,
      subjectId: 'fisika',
      subjectName: 'Fisika',
      customTitle: 'Jam Ke-2: Fisika',
      durationMinutes: 30,
      questionCount: 3,
      kkmScore: 75,
      breakAfterMinutes: 1,
      allowEarlyFinish: true,
      isLockedAfterFinish: true,
    },
    {
      sessionNumber: 3,
      subjectId: 'ekonomi',
      subjectName: 'Ekonomi',
      customTitle: 'Jam Ke-3: Ekonomi',
      durationMinutes: 30,
      questionCount: 3,
      kkmScore: 75,
      breakAfterMinutes: 0,
      allowEarlyFinish: true,
      isLockedAfterFinish: true,
    },
  ]);

  const [savedPackage, setSavedPackage] = useState<ExamPackage | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  // Preset templates for quick 1-click loading
  const loadPresetTemplate = (type: 'tri_exam' | 'mipa_full' | 'ips_full' | 'bahasa') => {
    if (type === 'tri_exam') {
      setTitle('Ujian Terpadu 3 Mata Pelajaran: Matematika, Fisika & Ekonomi');
      setTagline('Format 1 Link: Jam Ke-1 Matematika (30m) ➔ Jam Ke-2 Fisika (30m) ➔ Jam Ke-3 Ekonomi (30m). Nilai terpisah masing-masing.');
      setGrade('11');
      setMajor('Umum');
      setSessions([
        {
          sessionNumber: 1,
          subjectId: 'matematika_wajib',
          subjectName: 'Matematika Wajib',
          customTitle: 'Jam Ke-1: Matematika Wajib',
          durationMinutes: 30,
          questionCount: 3,
          kkmScore: 75,
          breakAfterMinutes: 1,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
        {
          sessionNumber: 2,
          subjectId: 'fisika',
          subjectName: 'Fisika',
          customTitle: 'Jam Ke-2: Fisika',
          durationMinutes: 30,
          questionCount: 3,
          kkmScore: 75,
          breakAfterMinutes: 1,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
        {
          sessionNumber: 3,
          subjectId: 'ekonomi',
          subjectName: 'Ekonomi',
          customTitle: 'Jam Ke-3: Ekonomi',
          durationMinutes: 30,
          questionCount: 3,
          kkmScore: 75,
          breakAfterMinutes: 0,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
      ]);
    } else if (type === 'mipa_full') {
      setTitle('Penilaian Terpadu MIPA: Matematika, Fisika, Kimia & Biologi');
      setTagline('Ujian Saintek Komprehensif dengan alokasi waktu dan nilai terpisah per mapel');
      setGrade('11');
      setMajor('MIPA');
      setSessions([
        {
          sessionNumber: 1,
          subjectId: 'matematika_wajib',
          subjectName: 'Matematika Wajib',
          customTitle: 'Jam Ke-1: Matematika Wajib',
          durationMinutes: 30,
          questionCount: 3,
          kkmScore: 75,
          breakAfterMinutes: 1,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
        {
          sessionNumber: 2,
          subjectId: 'fisika',
          subjectName: 'Fisika',
          customTitle: 'Jam Ke-2: Fisika',
          durationMinutes: 30,
          questionCount: 3,
          kkmScore: 75,
          breakAfterMinutes: 1,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
        {
          sessionNumber: 3,
          subjectId: 'kimia',
          subjectName: 'Kimia',
          customTitle: 'Jam Ke-3: Kimia',
          durationMinutes: 25,
          questionCount: 2,
          kkmScore: 75,
          breakAfterMinutes: 1,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
        {
          sessionNumber: 4,
          subjectId: 'biologi',
          subjectName: 'Biologi',
          customTitle: 'Jam Ke-4: Biologi',
          durationMinutes: 25,
          questionCount: 2,
          kkmScore: 75,
          breakAfterMinutes: 0,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
      ]);
    } else if (type === 'ips_full') {
      setTitle('Penilaian Terpadu IPS: Ekonomi, Sosiologi & Geografi');
      setTagline('Ujian Soshum Terpadu: 1 Tautan dengan jadwal waktu jam pelajaran mandiri');
      setGrade('11');
      setMajor('IPS');
      setSessions([
        {
          sessionNumber: 1,
          subjectId: 'ekonomi',
          subjectName: 'Ekonomi',
          customTitle: 'Jam Ke-1: Ekonomi',
          durationMinutes: 30,
          questionCount: 3,
          kkmScore: 75,
          breakAfterMinutes: 1,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
        {
          sessionNumber: 2,
          subjectId: 'sosiologi',
          subjectName: 'Sosiologi',
          customTitle: 'Jam Ke-2: Sosiologi',
          durationMinutes: 25,
          questionCount: 2,
          kkmScore: 75,
          breakAfterMinutes: 1,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
        {
          sessionNumber: 3,
          subjectId: 'geografi',
          subjectName: 'Geografi',
          customTitle: 'Jam Ke-3: Geografi',
          durationMinutes: 25,
          questionCount: 2,
          kkmScore: 75,
          breakAfterMinutes: 0,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
      ]);
    } else if (type === 'bahasa') {
      setTitle('Asesmen Literasi Bahasa Indonesia & Bahasa Inggris');
      setTagline('Jam Ke-1: Bahasa Indonesia (35m) ➔ Jam Ke-2: Bahasa Inggris (30m)');
      setGrade('12');
      setMajor('Umum');
      setSessions([
        {
          sessionNumber: 1,
          subjectId: 'bahasa_indonesia',
          subjectName: 'Bahasa Indonesia',
          customTitle: 'Jam Ke-1: Bahasa Indonesia',
          durationMinutes: 35,
          questionCount: 3,
          kkmScore: 75,
          breakAfterMinutes: 1,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
        {
          sessionNumber: 2,
          subjectId: 'bahasa_inggris',
          subjectName: 'Bahasa Inggris',
          customTitle: 'Jam Ke-2: Bahasa Inggris',
          durationMinutes: 30,
          questionCount: 3,
          kkmScore: 75,
          breakAfterMinutes: 0,
          allowEarlyFinish: true,
          isLockedAfterFinish: true,
        },
      ]);
    }
  };

  const handleAddSession = () => {
    const nextNum = sessions.length + 1;
    const available = SUBJECTS[nextNum % SUBJECTS.length];
    setSessions([
      ...sessions,
      {
        sessionNumber: nextNum,
        subjectId: available.id,
        subjectName: available.name,
        customTitle: `Jam Ke-${nextNum}: ${available.name}`,
        durationMinutes: 30,
        questionCount: 3,
        kkmScore: 75,
        breakAfterMinutes: 1,
        allowEarlyFinish: true,
        isLockedAfterFinish: true,
      },
    ]);
  };

  const handleRemoveSession = (index: number) => {
    if (sessions.length <= 1) return;
    const updated = sessions.filter((_, i) => i !== index).map((s, idx) => ({
      ...s,
      sessionNumber: idx + 1,
      customTitle: `Jam Ke-${idx + 1}: ${s.subjectName}`,
    }));
    setSessions(updated);
  };

  const handleUpdateSession = (index: number, field: keyof SessionDraft, value: any) => {
    const updated = [...sessions];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'subjectId') {
      const found = SUBJECTS.find(s => s.id === value);
      if (found) {
        updated[index].subjectName = found.name;
        updated[index].customTitle = `Jam Ke-${updated[index].sessionNumber}: ${found.name}`;
      }
    }
    setSessions(updated);
  };

  const totalExamDurationMinutes = sessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
  const totalExamQuestionCount = sessions.reduce((acc, s) => acc + (Number(s.questionCount) || 0), 0);

  const handleCreateAndSave = () => {
    const pkgId = `pkg-multi-${Date.now()}`;

    // Collect questions for each session
    const compiledQuestions: Question[] = [];
    const subtestConfigs: SubtestConfig[] = [];
    const sessionSchedules: ExamSubjectSessionSchedule[] = [];

    sessions.forEach((draft, idx) => {
      const matchingSubtest = SUBTEST_SMA_CONFIGS.find(s => s.id === `sma_${draft.subjectId}`) || {
        id: `sma_${draft.subjectId}`,
        name: draft.subjectName,
        shortName: draft.subjectName.substring(0, 3).toUpperCase(),
        category: (draft.subjectId === 'ekonomi' || draft.subjectId === 'sosiologi' || draft.subjectId === 'geografi') ? 'SMA_IPS' : 'SMA_MIPA',
        description: `Materi Ujian ${draft.subjectName}`,
        durationMinutes: draft.durationMinutes,
        questionCount: draft.questionCount,
        iconName: 'BookOpen',
        color: 'indigo',
      };

      subtestConfigs.push(matchingSubtest as SubtestConfig);

      sessionSchedules.push({
        sessionNumber: idx + 1,
        subtestId: matchingSubtest.id,
        subjectName: draft.subjectName,
        customTitle: draft.customTitle,
        durationMinutes: Number(draft.durationMinutes) || 30,
        questionCount: Number(draft.questionCount) || 3,
        kkmScore: Number(draft.kkmScore) || kkmScore || 75,
        category: matchingSubtest.category as any,
        breakAfterMinutes: draft.breakAfterMinutes,
        allowEarlyFinish: draft.allowEarlyFinish,
        isLockedAfterFinish: draft.isLockedAfterFinish,
        instructions: `Alokasi waktu: ${draft.durationMinutes} Menit. Kerjakan secara mandiri. Begitu waktu habis, sistem otomatis beralih ke sesi berikutnya dan mengunci mapel ini dengan tanda selesai.`,
      });

      // Find matching questions from question bank
      let matchingQuestions = INITIAL_SMA_QUESTIONS.filter(
        q => q.subject?.toLowerCase().includes(draft.subjectName.toLowerCase()) || q.subtestId === matchingSubtest.id
      );

      if (matchingQuestions.length === 0) {
        // Fallback: pick any questions and adjust subject title
        matchingQuestions = ALL_MOCK_QUESTIONS.slice(0, draft.questionCount).map((q, qIdx) => ({
          ...q,
          id: `q-${draft.subjectId}-${idx}-${qIdx + 1}`,
          subtestId: matchingSubtest.id,
          subtestName: draft.subjectName,
          subject: draft.subjectName,
        }));
      }

      const selectedQuestions = matchingQuestions.slice(0, draft.questionCount);
      // If still fewer than requested count, duplicate or adjust
      while (selectedQuestions.length < draft.questionCount && matchingQuestions.length > 0) {
        const item = { ...matchingQuestions[selectedQuestions.length % matchingQuestions.length] };
        item.id = `${item.id}-copy-${selectedQuestions.length}`;
        selectedQuestions.push(item);
      }

      compiledQuestions.push(...selectedQuestions);
    });

    const newPackage: ExamPackage = {
      id: pkgId,
      title: title.trim() || 'Paket Ujian Multi-Mapel Berjadwal',
      badge: 'Format 1 Link Multi-Sesi',
      tagline: tagline.trim() || `Pengerjaan berurutan ${sessions.length} mata pelajaran dengan nilai terpisah masing-masing.`,
      category: 'SMA_UMUM',
      grade,
      major,
      subject: sessions.map(s => s.subjectName).join(', '),
      examType: examType as any,
      kkmScore,
      durationMinutes: totalExamDurationMinutes,
      totalQuestions: compiledQuestions.length || totalExamQuestionCount,
      subtests: subtestConfigs,
      questions: compiledQuestions,
      isCustomCreated: true,
      createdAt: new Date().toISOString(),
      isMultiSubjectSequential: true,
      sessionSchedules,
      breakBetweenSessionsMinutes,
      strictSessionLocking,
      scheduledStartTime: isScheduleLocked ? scheduledStartTime : undefined,
      isScheduleLocked,
      allowEarlyBypassBySupervisor,
    };

    if (typeof onSavePackage === 'function') {
      onSavePackage(newPackage);
    } else if (typeof onSaveExamPackage === 'function') {
      onSaveExamPackage(newPackage);
    }
    setSavedPackage(newPackage);
  };

  const getPackageUrl = (pkgId: string) => {
    if (typeof window === 'undefined') return '';
    const isFree = isExamFreeModeActive();
    const modeParam = isFree ? '&mode=bebas' : '&mode=normal';
    return `${window.location.origin}${window.location.pathname}?exam=${encodeURIComponent(pkgId)}${modeParam}`;
  };

  const handleCopyLink = () => {
    if (!savedPackage) return;
    const url = getPackageUrl(savedPackage.id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleShareWhatsApp = () => {
    if (!savedPackage) return;
    const url = getPackageUrl(savedPackage.id);
    const scheduleText = sessions
      .map(s => `  • Jam ${s.sessionNumber}: *${s.subjectName}* (${s.durationMinutes} Menit - ${s.questionCount} Soal)`)
      .join('\n');
    const msg = `📢 *PENGUMUMAN JADWAL UJIAN CBT (1 LINK BANYAK MAPEL)*\n\n📝 *${savedPackage.title}*\n⏱ Total Durasi: ${totalExamDurationMinutes} Menit\n📚 Total Soal: ${savedPackage.questions.length} Butir\n\n🕒 *Jadwal Sesi Pengerjaan (Otomatis Berpindah):*\n${scheduleText}\n\n👉 *Klik 1 link berikut untuk memulai pengerjaan:* \n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Buat Format Ujian Multi-Mapel (1 Link Banyak Jam)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Fitur Berjadwal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Satu tautan untuk mengerjakan beberapa mata pelajaran berurutan dengan pembatasan waktu mandiri per jam.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {savedPackage ? (
            /* Success & Direct Share Screen */
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Paket Ujian Multi-Mapel Berhasil Dibuat!
                </h3>
                <p className="text-xs text-slate-300 max-w-xl mx-auto">
                  Paket <strong>"{savedPackage.title}"</strong> kini siap dibagikan ke siswa menggunakan satu tautan terpadu.
                </p>
              </div>

              {/* Schedule Summary Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Jadwal Alokasi Waktu per Jam Pelajaran:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {savedPackage.sessionSchedules?.map(sess => (
                    <div key={sess.sessionNumber} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase">
                        Jam Ke-{sess.sessionNumber}
                      </span>
                      <p className="font-bold text-sm text-white">{sess.subjectName}</p>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span>⏱ {sess.durationMinutes} Menit</span>
                        <span>📚 {sess.questionCount} Soal</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shareable Link Box */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Tautan 1 Link untuk Siswa:</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                    Otomatis Berpindah Jam Mapel
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getPackageUrl(savedPackage.id)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-indigo-300 font-mono select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      copiedLink ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Tersalin!' : 'Salin'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-600/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Bagikan Jadwal ke WhatsApp</span>
                  </button>
                  {onLaunchDirectly && (
                    <button
                      onClick={() => {
                        onClose();
                        onLaunchDirectly(savedPackage);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Masuk ke Halaman Siswa Sekarang</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Builder Form */
            <>
              {/* 1-Click Quick Template Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pilih Template Preset Cepat:</span>
                  </label>
                  <span className="text-[11px] text-slate-500">1-Klik Isi Otomatis</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => loadPresetTemplate('tri_exam')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-indigo-500/40 text-left space-y-1 transition-all cursor-pointer"
                  >
                    <span className="text-xs font-bold text-cyan-300">⭐ MTK + Fisika + Ekonomi</span>
                    <p className="text-[10px] text-slate-400">3 Jam @ 30 Menit (90m)</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetTemplate('mipa_full')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left space-y-1 transition-all cursor-pointer"
                  >
                    <span className="text-xs font-bold text-emerald-300">🧪 MIPA Terpadu</span>
                    <p className="text-[10px] text-slate-400">MTK, Fisika, Kimia, Bio (110m)</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetTemplate('ips_full')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-left space-y-1 transition-all cursor-pointer"
                  >
                    <span className="text-xs font-bold text-amber-300">📊 IPS Terpadu</span>
                    <p className="text-[10px] text-slate-400">Ekonomi, Sosiologi, Geografi (80m)</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetTemplate('bahasa')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-violet-500/40 text-left space-y-1 transition-all cursor-pointer"
                  >
                    <span className="text-xs font-bold text-violet-300">📖 Literasi Bahasa</span>
                    <p className="text-[10px] text-slate-400">B. Indonesia & B. Inggris (65m)</p>
                  </button>
                </div>
              </div>

              {/* Exam Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Judul Paket Ujian Multi-Mapel</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: Ujian Terpadu Semester Ganjil - 3 Mapel"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Deskripsi / Petunjuk</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    placeholder="Petunjuk pengerjaan..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Tingkat Kelas & Jurusan</label>
                  <div className="flex gap-2">
                    <select
                      value={grade}
                      onChange={e => setGrade(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white flex-1"
                    >
                      <option value="10">Kelas 10</option>
                      <option value="11">Kelas 11</option>
                      <option value="12">Kelas 12</option>
                    </select>
                    <select
                      value={major}
                      onChange={e => setMajor(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white flex-1"
                    >
                      <option value="Umum">Umum / Semua</option>
                      <option value="MIPA">MIPA</option>
                      <option value="IPS">IPS</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Standar KKM Sekolah</label>
                  <input
                    type="number"
                    value={kkmScore}
                    onChange={e => setKkmScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    min={50}
                    max={100}
                  />
                </div>
              </div>

              {/* Sessions Timeline & Schedule Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>Daftar Sesi Mata Pelajaran (Berurutan per Jam):</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Tiap jam mapel memiliki batas waktu tersendiri. Begitu waktu habis, sistem otomatis berpindah dan mengunci mapel sebelumnya.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSession}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Jam Mapel</span>
                  </button>
                </div>

                {/* Session Draft Cards */}
                <div className="space-y-3">
                  {sessions.map((sess, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
                            {sess.sessionNumber}
                          </span>
                          <h4 className="font-bold text-sm text-white">
                            Jam Ke-{sess.sessionNumber}: {sess.subjectName}
                          </h4>
                        </div>

                        {sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSession(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer"
                            title="Hapus Sesi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400">Pilih Mata Pelajaran</label>
                          <select
                            value={sess.subjectId}
                            onChange={e => handleUpdateSession(idx, 'subjectId', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                          >
                            {SUBJECTS.map(sub => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name} ({sub.major})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400">Batas Waktu (Menit)</label>
                          <input
                            type="number"
                            value={sess.durationMinutes}
                            onChange={e => handleUpdateSession(idx, 'durationMinutes', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                            min={5}
                            max={180}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400">Jumlah Soal</label>
                          <input
                            type="number"
                            value={sess.questionCount}
                            onChange={e => handleUpdateSession(idx, 'questionCount', Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                            min={1}
                            max={50}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Protocol, Scheduling & Security Options */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Jadwal Buka Ujian & Protokol Keamanan (Anti-Buka Sebelum Waktunya):</span>
                </h4>
                
                {/* Time-gating setting */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <label className="flex items-start gap-2.5 text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isScheduleLocked}
                      onChange={e => setIsScheduleLocked(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-amber-300">
                        Kunci Ujian Sampai Waktunya Tiba (Time-Gated Access)
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Jika diaktifkan, link ujian tidak bisa dibuka oleh siswa sebelum jam/waktu yang ditentukan. Siswa akan melihat hitung mundur di ruang tunggu.
                      </p>
                    </div>
                  </label>

                  {isScheduleLocked && (
                    <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Jadwal Waktu Buka Ujian (WIB):
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledStartTime}
                          onChange={e => setScheduledStartTime(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div className="flex flex-col justify-end space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            const nowPlus15m = new Date(Date.now() + 15 * 60 * 1000);
                            const localIso = new Date(nowPlus15m.getTime() - nowPlus15m.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                            setScheduledStartTime(localIso);
                          }}
                          className="px-3 py-2 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 rounded-xl border border-indigo-500/40 text-[11px] font-semibold text-center transition-colors"
                        >
                          ⚡ Setel Mulai 15 Menit Lagi
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={strictSessionLocking}
                      onChange={e => setStrictSessionLocking(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>
                      <strong>Kunci Sesi Sebelumnya (Strict Lock):</strong> Jawaban jam sebelumnya terkunci permanen dengan tanda selesai dan siswa tidak dapat kembali mengubah jawaban.
                    </span>
                  </label>

                  <div className="flex items-center justify-between pt-1 text-slate-300">
                    <span>Jeda Istirahat Otomatis Antar Jam Pelajaran:</span>
                    <select
                      value={breakBetweenSessionsMinutes}
                      onChange={e => setBreakBetweenSessionsMinutes(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    >
                      <option value={0}>Langsung Mulai (0 Detik)</option>
                      <option value={1}>Jeda 1 Menit</option>
                      <option value={2}>Jeda 2 Menit</option>
                      <option value={5}>Jeda 5 Menit</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Summary Stats Banner */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white font-bold">
                    {sessions.length} Mapel
                  </div>
                  <div>
                    <span className="text-white font-bold">Total Waktu: {totalExamDurationMinutes} Menit</span>
                    <p className="text-[11px] text-slate-400">Total Butir Soal: {totalExamQuestionCount} Butir</p>
                  </div>
                </div>
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                  1 Link Siap Digunakan
                </span>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            {savedPackage ? 'Tutup' : 'Batal'}
          </button>

          {!savedPackage && (
            <button
              type="button"
              onClick={handleCreateAndSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-950 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Simpan & Buat 1 Link Ujian</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
