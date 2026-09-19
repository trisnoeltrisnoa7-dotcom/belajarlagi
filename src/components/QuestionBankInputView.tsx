import React, { useState, useRef } from 'react';
import {
  PlusCircle,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Trash2,
  Edit3,
  Copy,
  Download,
  Upload,
  Layers,
  FileQuestion,
  Search,
  Filter,
  Save,
  HelpCircle,
  Lightbulb,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Play,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  ChevronDown,
  ChevronUp,
  Award,
  CheckSquare,
  FileText,
  FileCode,
  Image as ImageIcon,
  Volume2,
  Mic,
  Bot,
  Cpu,
  Star,
  RefreshCw,
  Minus,
  Split,
  Tag,
} from 'lucide-react';
import {
  getDefaultSubject,
  getDefaultGrade,
  getDefaultMajor,
  setDefaultSubject,
  isDefaultSubject,
  subscribeDefaultSubjectClass,
} from '../utils/defaultSettingsHelper';
import { generateSmartQuestionsFallback } from '../utils/questionGeneratorFallback';
import {
  Question,
  QuestionFormat,
  DifficultyLevel,
  SmaGrade,
  SmaMajor,
  SmaExamType,
  ExamPackage,
  QuestionOption,
  ComplexStatement,
  AiProvider
} from '../types';

import { getMasterSubjects, subscribeMasterSubjectClass } from '../services/masterDataService';
import { SMA_SUBJECTS_LIST } from '../data/mockSmaData';
import { MediaInputWidget } from './MediaInputWidget';
import { AudioPlayerBadge } from './AudioPlayerBadge';

interface QuestionBankInputViewProps {
  questionsList: Question[];
  onAddQuestion: (q: Question) => void;
  onUpdateQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onCreateExamPackage: (pkg: ExamPackage) => void;
  onStartExam: (pkg: ExamPackage) => void;
  onNavigateToSmaHub: () => void;
  onNavigateToDashboard?: () => void;
  onOpenCentralSubjectClass?: (tab?: 'subjects' | 'classes' | 'sync') => void;
}

export const QuestionBankInputView: React.FC<QuestionBankInputViewProps> = ({
  questionsList = [],
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onCreateExamPackage,
  onStartExam,
  onNavigateToSmaHub,
  onNavigateToDashboard,
  onOpenCentralSubjectClass,
}) => {
  const [masterSubjects, setMasterSubjects] = useState(() => getMasterSubjects());
  const SUBJECTS = masterSubjects.length ? masterSubjects : SMA_SUBJECTS_LIST;

  React.useEffect(() => {
    const unsub = subscribeMasterSubjectClass(() => {
      setMasterSubjects(getMasterSubjects());
    });
    return unsub;
  }, []);

  const [activeTab, setActiveTab] = useState<'input_form' | 'bank_list' | 'ai_generator'>('input_form');

  // Form State
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>(() => getDefaultSubject() || 'Matematika Wajib');
  const [grade, setGrade] = useState<SmaGrade>(() => (getDefaultGrade() as SmaGrade) || '11');
  const [major, setMajor] = useState<SmaMajor>(() => (getDefaultMajor() as SmaMajor) || 'MIPA');
  const [defaultToast, setDefaultToast] = useState<string | null>(null);

  React.useEffect(() => {
    const unsub = subscribeDefaultSubjectClass((cfg) => {
      if (!editingQuestionId) {
        setSubject(cfg.subject);
        setGrade(cfg.grade as SmaGrade);
        setMajor(cfg.major as SmaMajor);
      }
    });
    return unsub;
  }, [editingQuestionId]);
  const [chapter, setChapter] = useState<string>('');
  const [examType, setExamType] = useState<SmaExamType>('Sumatif Tengah Semester (STS / PTS)');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Sedang');
  const [type, setType] = useState<QuestionFormat>('multiple_choice');

  // Stimulus & Question Media & Text State
  const [stimulusTitle, setStimulusTitle] = useState<string>('');
  const [stimulus, setStimulus] = useState<string>('');
  const [stimulusImage, setStimulusImage] = useState<string | undefined>(undefined);
  const [stimulusAudio, setStimulusAudio] = useState<string | undefined>(undefined);

  const [questionText, setQuestionText] = useState<string>('');
  const [questionImage, setQuestionImage] = useState<string | undefined>(undefined);
  const [questionAudio, setQuestionAudio] = useState<string | undefined>(undefined);

  // Options for multiple_choice & cause_reason
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: 'A', label: 'A', text: '', image: undefined, audio: undefined },
    { id: 'B', label: 'B', text: '', image: undefined, audio: undefined },
    { id: 'C', label: 'C', text: '', image: undefined, audio: undefined },
    { id: 'D', label: 'D', text: '', image: undefined, audio: undefined },
    { id: 'E', label: 'E', text: '', image: undefined, audio: undefined },
  ]);
  const [correctOption, setCorrectOption] = useState<string>('A');
  const [correctMultiOptions, setCorrectMultiOptions] = useState<string[]>(['A', 'C']);

  // Complex Statements for complex_multiple_choice
  const [complexStatements, setComplexStatements] = useState<ComplexStatement[]>([
    { id: 'stmt1', text: '', correctAnswer: true },
    { id: 'stmt2', text: '', correctAnswer: false },
    { id: 'stmt3', text: '', correctAnswer: true },
  ]);

  // Short numeric answer & minimum word constraint
  const [numericAnswer, setNumericAnswer] = useState<string>('');
  const [minWordCount, setMinWordCount] = useState<number>(0);

  // 4 Foldable / Accordion Sections State
  const [collapsedSections, setCollapsedSections] = useState<{
    identity: boolean;
    format: boolean;
    question: boolean;
    answer: boolean;
  }>({
    identity: false,
    format: false,
    question: false,
    answer: false,
  });

  const toggleSection = (sec: 'identity' | 'format' | 'question' | 'answer') => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sec]: !prev[sec],
    }));
  };

  const expandAllSections = () => {
    setCollapsedSections({
      identity: false,
      format: false,
      question: false,
      answer: false,
    });
  };

  const collapseAllSections = () => {
    setCollapsedSections({
      identity: true,
      format: true,
      question: true,
      answer: true,
    });
  };

  // Explanation
  const [explanationSummary, setExplanationSummary] = useState<string>('');
  const [explanationSteps, setExplanationSteps] = useState<string[]>(['']);
  const [explanationConcept, setExplanationConcept] = useState<string>('');
  const [explanationFastTrick, setExplanationFastTrick] = useState<string>('');

  // UI status
  const [isGeneratingAiExplanation, setIsGeneratingAiExplanation] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  // Bank List Filters & Selection for Package Creation
  const [bankSearch, setBankSearch] = useState<string>('');
  const [bankSubjectFilter, setBankSubjectFilter] = useState<string>('ALL');
  const [bankGradeFilter, setBankGradeFilter] = useState<string>('ALL');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Modal Package Creation
  const [showPackageModal, setShowPackageModal] = useState<boolean>(false);
  const [packageTitle, setPackageTitle] = useState<string>('');
  const [packageDuration, setPackageDuration] = useState<number>(30);
  const [packageKkm, setPackageKkm] = useState<number>(75);
  const [packageTagline, setPackageTagline] = useState<string>('');

  // AI Generator Form State
  const [aiEngine, setAiEngine] = useState<AiProvider>('gemini');
  const [aiGenSubject, setAiGenSubject] = useState<string>('Matematika Wajib');
  const [aiGenGrade, setAiGenGrade] = useState<SmaGrade>('11');
  const [aiGenMajor, setAiGenMajor] = useState<SmaMajor>('MIPA');
  const [aiGenChapter, setAiGenChapter] = useState<string>('Transformasi Geometri');
  const [aiGenDifficulty, setAiGenDifficulty] = useState<DifficultyLevel>('HOTS');
  const [aiGenCount, setAiGenCount] = useState<number>(3);
  const [aiGenQuestionFormat, setAiGenQuestionFormat] = useState<QuestionFormat>('multiple_choice');
  const [aiGenMediaType, setAiGenMediaType] = useState<'text_only' | 'with_image' | 'with_audio' | 'with_chart_curve'>('text_only');
  const [aiGenMinWordCount, setAiGenMinWordCount] = useState<number>(0);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<Question[]>([]);

  // AI Question Update State (Review & Prompt before updating)
  const [updateProposal, setUpdateProposal] = useState<{
    originalQuestion: Question;
    updatedQuestion: Question;
    changelog: string[];
  } | null>(null);
  const [isAiCheckingUpdate, setIsAiCheckingUpdate] = useState<boolean>(false);
  const [checkingQuestionId, setCheckingQuestionId] = useState<string | null>(null);
  const [updateDiffTab, setUpdateDiffTab] = useState<'comparison' | 'updated_preview'>('comparison');

  // Import / Export State
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importFormat, setImportFormat] = useState<'text' | 'json'>('text');
  const [importRawText, setImportRawText] = useState<string>('');
  const [importSubject, setImportSubject] = useState<string>('Fisika');
  const [importGrade, setImportGrade] = useState<SmaGrade>('11');
  const [importMajor, setImportMajor] = useState<SmaMajor>('MIPA');
  const [importChapter, setImportChapter] = useState<string>('Materi Pokok');
  const [importExamType, setImportExamType] = useState<SmaExamType>('Sumatif Tengah Semester (STS / PTS)');
  const [importDifficulty, setImportDifficulty] = useState<DifficultyLevel>('Sedang');
  const [importDefaultFormat, setImportDefaultFormat] = useState<QuestionFormat | 'auto'>('auto');
  const [importSeparatorMode, setImportSeparatorMode] = useState<'auto' | 'dash' | 'tag' | 'custom'>('auto');
  const [importCustomSeparator, setImportCustomSeparator] = useState<string>('---');
  const [importParsedPreview, setImportParsedPreview] = useState<Question[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to insert text at cursor position in import textarea
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const nextText = importRawText ? `${importRawText}\n\n${textToInsert}` : textToInsert;
      handleRawTextChange(nextText, importDefaultFormat, importSeparatorMode, importCustomSeparator);
      return;
    }

    const start = textarea.selectionStart ?? importRawText.length;
    const end = textarea.selectionEnd ?? importRawText.length;
    const before = importRawText.substring(0, start);
    const after = importRawText.substring(end);
    const nextText = `${before}${textToInsert}${after}`;

    handleRawTextChange(nextText, importDefaultFormat, importSeparatorMode, importCustomSeparator);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + textToInsert.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 15);
  };

  const handleInsertSeparator = () => {
    insertTextAtCursor('\n\n---\n\n');
    showNotification('Garis pemisah (---) berhasil disisipkan!');
  };

  const handleInsertEssayTemplate = () => {
    const essaySnippet = `\n\n---\n\n[SOAL]
BENTUK: ISIAN PANJANG
BAB: ${importChapter.trim() || 'Materi Pokok'}
TARGET KATA: 50
PERTANYAAN: Tuliskan rumusan pertanyaan esai / uraian komprehensif di sini...
MODEL JAWABAN: Tuliskan model jawaban acuan, rubrik poin penilaian, dan kata kunci yang diharapkan dari siswa di sini...
PEMBAHASAN: Penjelasan konsep, teori rujukan, atau langkah analisis materi...`;
    insertTextAtCursor(essaySnippet);
    showNotification('Template soal isian panjang (esai) berhasil disisipkan!');
  };

  const handleInsertPgTemplate = () => {
    const pgSnippet = `\n\n---\n\n[SOAL]
BENTUK: PILIHAN GANDA
BAB: ${importChapter.trim() || 'Materi Pokok'}
PERTANYAAN: Tuliskan rumusan pertanyaan pilihan ganda di sini...
A. Pilihan jawaban A
B. Pilihan jawaban B
C. Pilihan jawaban C
D. Pilihan jawaban D
E. Pilihan jawaban E
KUNCI: A
PEMBAHASAN: Penjelasan materi dan pembuktian kunci jawaban...`;
    insertTextAtCursor(pgSnippet);
    showNotification('Template soal pilihan ganda berhasil disisipkan!');
  };

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success',
    duration = 3500
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };

  const resetForm = () => {
    setEditingQuestionId(null);
    setChapter('');
    setStimulusTitle('');
    setStimulus('');
    setStimulusImage(undefined);
    setStimulusAudio(undefined);
    setQuestionText('');
    setQuestionImage(undefined);
    setQuestionAudio(undefined);
    setOptions([
      { id: 'A', label: 'A', text: '', image: undefined, audio: undefined },
      { id: 'B', label: 'B', text: '', image: undefined, audio: undefined },
      { id: 'C', label: 'C', text: '', image: undefined, audio: undefined },
      { id: 'D', label: 'D', text: '', image: undefined, audio: undefined },
      { id: 'E', label: 'E', text: '', image: undefined, audio: undefined },
    ]);
    setCorrectOption('A');
    setCorrectMultiOptions(['A', 'C']);
    setComplexStatements([
      { id: 'stmt1', text: '', correctAnswer: true, image: undefined, audio: undefined },
      { id: 'stmt2', text: '', correctAnswer: false, image: undefined, audio: undefined },
      { id: 'stmt3', text: '', correctAnswer: true, image: undefined, audio: undefined },
    ]);
    setNumericAnswer('');
    setMinWordCount(0);
    setExplanationSummary('');
    setExplanationSteps(['']);
    setExplanationConcept('');
    setExplanationFastTrick('');
  };

  // Dedicated Reset Form Action with Explicit Toast Notification
  const handleResetForm = (showToast = true) => {
    const isEditing = !!editingQuestionId;
    const hadContent = !!(questionText.trim() || chapter.trim() || stimulus.trim() || explanationSummary.trim());
    resetForm();
    if (showToast) {
      if (isEditing) {
        showNotification('🔄 Mode edit dibatalkan dan formulir berhasil dikosongkan.', 'info');
      } else if (hadContent) {
        showNotification('🗑️ Formulir pembuatan soal berhasil direset & dikosongkan.', 'warning');
      } else {
        showNotification('ℹ️ Formulir pembuatan soal sudah dalam kondisi bersih/kosong.', 'info');
      }
    }
  };

  const loadQuestionIntoForm = (q: Question) => {
    setEditingQuestionId(q.id);
    setSubject(q.subject || 'Fisika');
    setGrade(q.grade || '11');
    setMajor(q.major || 'MIPA');
    setChapter(q.chapter || q.topic || '');
    setExamType(q.examType || 'Sumatif Tengah Semester (STS / PTS)');
    setDifficulty(q.difficulty || 'Sedang');
    setType(q.type || 'multiple_choice');
    setStimulusTitle(q.stimulusTitle || '');
    setStimulus(q.stimulus || '');
    setStimulusImage(q.stimulusImage);
    setStimulusAudio(q.stimulusAudio);
    setQuestionText(q.questionText || '');
    setQuestionImage(q.questionImage);
    setQuestionAudio(q.questionAudio);

    if (q.options && q.options.length > 0) {
      setOptions(q.options);
      if (typeof q.correctAnswer === 'string') {
        setCorrectOption(q.correctAnswer);
      }
    }
    if (q.type === 'multi_select_choice') {
      if (Array.isArray(q.correctAnswer)) {
        setCorrectMultiOptions(q.correctAnswer);
      } else if (typeof q.correctAnswer === 'string') {
        setCorrectMultiOptions(q.correctAnswer.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean));
      }
    }
    if (q.complexStatements) {
      setComplexStatements(q.complexStatements);
    }
    if (typeof q.correctAnswer === 'string' || typeof q.correctAnswer === 'number') {
      setNumericAnswer(String(q.correctAnswer));
    }
    setMinWordCount(q.minWordCount || 0);
    if (q.explanation) {
      setExplanationSummary(q.explanation.summary || '');
      setExplanationSteps(q.explanation.steps && q.explanation.steps.length > 0 ? q.explanation.steps : ['']);
      setExplanationConcept(q.explanation.concept || '');
      setExplanationFastTrick(q.explanation.fastTrick || '');
    }
    setActiveTab('input_form');
    showNotification(`Soal "${q.id}" dimuat ke formulir editor.`);
  };

  // AI Auto-Complete Explanation
  const handleAiAutoCompleteExplanation = async () => {
    if (!questionText.trim()) {
      showNotification('Mohon isi teks pertanyaan terlebih dahulu!', 'error');
      return;
    }
    setIsGeneratingAiExplanation(true);
    try {
      const payload = {
        subject,
        questionText,
        stimulus,
        options: type === 'multiple_choice' || type === 'cause_reason' ? options : complexStatements,
        correctAnswer: type === 'multiple_choice' || type === 'cause_reason' ? correctOption : numericAnswer,
      };

      const res = await fetch('/api/ai/complete-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Gagal menghubungi server AI');
      const data = await res.json();
      if (data.explanation) {
        setExplanationSummary(data.explanation.summary || '');
        if (data.explanation.steps && Array.isArray(data.explanation.steps)) {
          setExplanationSteps(data.explanation.steps);
        }
        setExplanationConcept(data.explanation.concept || `${subject}: ${chapter || 'Konsep SMA'}`);
        setExplanationFastTrick(data.explanation.fastTrick || '');
        showNotification('⚡ Pembahasan dan trik kilat berhasil dibuat otomatis oleh AI!');
      }
    } catch (err: any) {
      console.warn('AI Explanation unavailable, using local template:', err);
      showNotification('Menggunakan template pembahasan materi standar.', 'info');
      setExplanationSummary(`Kunci jawaban adalah ${correctOption}. Sesuai konsep dasar materi ${subject}.`);
      setExplanationSteps(['1. Analisis premis soal', '2. Terapkan rumus pokok', '3. Simpulkan jawaban']);
      setExplanationConcept(`Materi Pokok ${subject}`);
    } finally {
      setIsGeneratingAiExplanation(false);
    }
  };

  const handleSaveQuestion = (resetAfter = false) => {
    if (!questionText.trim()) {
      showNotification('Teks pertanyaan tidak boleh kosong!', 'error');
      return;
    }

    let correctAnswerValue: any = correctOption;
    if (type === 'multi_select_choice') {
      correctAnswerValue = correctMultiOptions.length > 0 ? correctMultiOptions : ['A'];
    } else if (type === 'complex_multiple_choice') {
      const complexMap: Record<string, boolean> = {};
      complexStatements.forEach((s) => {
        complexMap[s.id] = s.correctAnswer;
      });
      correctAnswerValue = complexMap;
    } else if (type === 'short_numeric' || type === 'long_essay') {
      correctAnswerValue = numericAnswer.trim();
    }

    const newQuestion: Question = {
      id: editingQuestionId || `sma-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      subtestId: `sma_${(subject || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      subtestName: `${subject} SMA`,
      category: major === 'MIPA' ? 'SMA_MIPA' : major === 'IPS' ? 'SMA_IPS' : 'SMA_UMUM',
      grade,
      major,
      subject,
      chapter: chapter.trim() || 'Topik Umum',
      examType,
      type,
      minWordCount: (type === 'short_numeric' || type === 'long_essay') && minWordCount > 0 ? minWordCount : undefined,
      stimulusTitle: stimulusTitle.trim() || undefined,
      stimulus: stimulus.trim() || undefined,
      stimulusImage: stimulusImage || undefined,
      stimulusAudio: stimulusAudio || undefined,
      questionText: questionText.trim(),
      questionImage: questionImage || undefined,
      questionAudio: questionAudio || undefined,
      options: type === 'multiple_choice' || type === 'cause_reason' || type === 'multi_select_choice' ? options : undefined,
      complexStatements: type === 'complex_multiple_choice' ? complexStatements : undefined,
      correctAnswer: correctAnswerValue,
      explanation: {
        summary: explanationSummary.trim() || 'Kunci jawaban terbukti benar berdasarkan kaidah kurikulum materi terkait.',
        steps: explanationSteps.filter((s) => s.trim() !== ''),
        concept: explanationConcept.trim() || `Konsep ${subject}`,
        fastTrick: explanationFastTrick.trim() || undefined,
      },
      difficulty,
      irtWeight: difficulty === 'HOTS' ? 90 : difficulty === 'Sulit' ? 85 : difficulty === 'Sedang' ? 80 : 70,
      topic: chapter.trim() || subject,
      isUserCreated: true,
      createdAt: new Date().toISOString(),
    };

    if (editingQuestionId) {
      onUpdateQuestion(newQuestion);
      if (resetAfter) {
        resetForm();
        showNotification('💾 Soal berhasil diperbarui & formulir siap untuk input soal baru!', 'success');
      } else {
        showNotification('💾 Perubahan butir soal berhasil diperbarui di Bank Soal!', 'success');
      }
    } else {
      onAddQuestion(newQuestion);
      if (resetAfter) {
        resetForm();
        showNotification('✅ Soal berhasil disimpan! Formulir dikosongkan untuk soal berikutnya.', 'success');
      } else {
        showNotification('✅ Butir soal baru berhasil disimpan ke Bank Soal SMA!', 'success');
      }
    }
  };

  // AI Generator Handler
  const handleGenerateQuestionsWithAi = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-sma-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: aiGenSubject,
          grade: aiGenGrade,
          major: aiGenMajor,
          chapter: aiGenChapter,
          difficulty: aiGenDifficulty,
          count: aiGenCount,
          questionFormat: aiGenQuestionFormat,
          mediaType: aiGenMediaType,
          minWordCount: (aiGenQuestionFormat === 'short_numeric' || aiGenQuestionFormat === 'long_essay') ? aiGenMinWordCount : 0,
          aiEngine: aiEngine,
        }),
      });

      if (!res.ok) throw new Error('Gagal request AI generator');
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setAiGeneratedQuestions(data.questions);
        showNotification(`✨ Berhasil men-generate ${data.questions.length} butir soal ${aiGenSubject}!`);
      }
    } catch (err: any) {
      console.warn('AI Question generator offline or network unavailable, generating local format:', err);
      const fallbackQuestions = generateSmartQuestionsFallback({
        subject: aiGenSubject,
        grade: aiGenGrade,
        major: aiGenMajor,
        chapter: aiGenChapter.trim() || 'Materi Pokok',
        examType: 'Sumatif Tengah Semester (STS / PTS)',
        difficulty: aiGenDifficulty,
        count: aiGenCount,
        questionFormat: aiGenQuestionFormat,
        mediaType: aiGenMediaType,
        minWordCount: (aiGenQuestionFormat === 'short_numeric' || aiGenQuestionFormat === 'long_essay') ? aiGenMinWordCount : 0,
        aiEngine,
      });

      setAiGeneratedQuestions(fallbackQuestions);
      showNotification(`✨ Berhasil men-generate ${fallbackQuestions.length} butir soal ${aiGenSubject} (Mode Cepat)!`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleImportAiQuestion = (q: Question) => {
    onAddQuestion(q);
    setAiGeneratedQuestions((prev) => prev.filter((item) => item.id !== q.id));
    showNotification(`Soal "${q.chapter || q.subject}" ditambahkan ke Bank Soal.`);
  };

  const handleImportAllAiQuestions = () => {
    aiGeneratedQuestions.forEach((q) => onAddQuestion(q));
    showNotification(`Semua ${aiGeneratedQuestions.length} soal AI berhasil dimasukkan ke Bank Soal!`);
    setAiGeneratedQuestions([]);
  };

  // AI Question Update Handler (Review, Formulate Update & Prompt Before Applying)
  const handleCheckQuestionUpdate = async (targetQuestion: Question) => {
    setIsAiCheckingUpdate(true);
    setCheckingQuestionId(targetQuestion.id);
    try {
      const res = await fetch('/api/ai/update-sma-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: targetQuestion,
          targetDifficulty: aiGenDifficulty || targetQuestion.difficulty || 'Sedang',
          aiEngine,
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal memeriksa pembaruan soal via AI');
      }

      const data = await res.json();
      if (data.hasUpdates && data.updatedQuestion) {
        setUpdateProposal({
          originalQuestion: targetQuestion,
          updatedQuestion: data.updatedQuestion,
          changelog: data.changelog || [
            'Pembaruan wacana stimulus sesuai standar kurikulum terkini',
            'Penyempurnaan opsi distraktor jawaban',
            'Penyusunan langkah pembahasan ilmiah dan trik cepat',
          ],
        });
        setUpdateDiffTab('comparison');
        showNotification('💡 AI menemukan rekomendasi pembaruan! Tinjau usulan sebelum konfirmasi.', 'info');
      } else {
        showNotification('✅ Butir soal ini sudah optimal dan sesuai standar kurikulum, belum memerlukan pembaruan.', 'info');
      }
    } catch (err: any) {
      console.warn('AI update request error, using fallback update analyzer:', err);
      const fallbackUpdated: Question = {
        ...targetQuestion,
        stimulus: targetQuestion.stimulus || `Wacana Materi ${targetQuestion.subject} (Kelas ${targetQuestion.grade}): Konsep dan prinsip penting pada pembahasan ${targetQuestion.chapter || 'terkait'}.`,
        explanation: {
          summary: targetQuestion.explanation?.summary || `Kunci jawaban ${typeof targetQuestion.correctAnswer === 'object' ? JSON.stringify(targetQuestion.correctAnswer) : targetQuestion.correctAnswer} terbukti benar sesuai kaidah kurikulum materi.`,
          steps: targetQuestion.explanation?.steps && targetQuestion.explanation.steps.length > 0
            ? targetQuestion.explanation.steps
            : [
                `Langkah 1: Identifikasi kata kunci pada pokok bahasan ${targetQuestion.chapter || 'materi'}.`,
                `Langkah 2: Terapkan prinsip konsep dan evaluasi alternatif jawaban.`,
                `Langkah 3: Konfirmasi kebenaran opsi jawaban.`,
              ],
          concept: targetQuestion.explanation?.concept || `Konsep Pokok ${targetQuestion.subject}`,
          fastTrick: targetQuestion.explanation?.fastTrick || 'Gunakan teknik eliminasi opsi yang tidak relevan dengan konsep materi.',
        },
        updatedAt: new Date().toISOString(),
      };
      setUpdateProposal({
        originalQuestion: targetQuestion,
        updatedQuestion: fallbackUpdated,
        changelog: [
          `Penyempurnaan stimulus wacana untuk materi ${targetQuestion.chapter || targetQuestion.subject}`,
          `Penyempurnaan formulasi pertanyaan dan opsi jawaban`,
          `Penyempurnaan langkah pembahasan dan trik penyelesaian`,
        ],
      });
      setUpdateDiffTab('comparison');
      showNotification('💡 Usulan pembaruan butir soal siap ditinjau sebelum dikonfirmasi.', 'info');
    } finally {
      setIsAiCheckingUpdate(false);
      setCheckingQuestionId(null);
    }
  };

  const handleApplyQuestionUpdate = () => {
    if (!updateProposal) return;
    onUpdateQuestion(updateProposal.updatedQuestion);
    showNotification(`✅ Pembaruan butir soal "${updateProposal.updatedQuestion.chapter || updateProposal.updatedQuestion.subject}" berhasil diterapkan ke Bank Soal!`, 'success');
    setUpdateProposal(null);
  };

  const handleSaveUpdatedAsNew = () => {
    if (!updateProposal) return;
    const newQuestion: Question = {
      ...updateProposal.updatedQuestion,
      id: `sma-ai-revised-${Date.now()}`,
      isUserCreated: true,
      createdAt: new Date().toISOString(),
    };
    onAddQuestion(newQuestion);
    showNotification(`✨ Versi pembaruan disimpan sebagai butir soal baru (soal asli tetap dipertahankan)!`, 'success');
    setUpdateProposal(null);
  };

  const handleDismissUpdate = () => {
    setUpdateProposal(null);
    showNotification('ℹ️ Pembaruan dibatalkan. Butir soal asli dipertahankan tanpa perubahan.', 'info');
  };

  const handleCheckUpdatesForCurrentTopic = () => {
    const targetSubject = (aiGenSubject || '').toLowerCase();
    const targetChapter = (aiGenChapter || '').trim().toLowerCase();
    const matching = questionsList.filter(
      (q) =>
        (q?.subject || '').toLowerCase() === targetSubject &&
        (!targetChapter || (q?.chapter || q?.topic || '').toLowerCase().includes(targetChapter))
    );
    if (matching.length === 0) {
      showNotification(`Belum ada butir soal materi "${aiGenChapter || aiGenSubject}" di Bank Soal untuk diperbarui. Silakan gunakan tombol Generate untuk membuat soal baru.`, 'info');
      return;
    }
    handleCheckQuestionUpdate(matching[0]);
  };

  // Package Creation from selected questions
  const handleOpenPackageModal = () => {
    if (selectedQuestionIds.length === 0) {
      showNotification('Pilih minimal 1 butir soal untuk membuat Paket Ujian!', 'error');
      return;
    }
    const firstSelected = questionsList.find((q) => q.id === selectedQuestionIds[0]);
    setPackageTitle(`Ujian ${firstSelected?.subject || 'SMA'} - ${firstSelected?.examType || 'Ulangan Harian'}`);
    setPackageTagline(`Paket Ujian Kustom ${selectedQuestionIds.length} butir soal materi ${firstSelected?.chapter || firstSelected?.subject}`);
    setShowPackageModal(true);
  };

  const handleSaveExamPackage = () => {
    const selectedQuestions = questionsList.filter((q) => selectedQuestionIds.includes(q.id));
    if (selectedQuestions.length === 0) return;

    const mainSubject = selectedQuestions[0]?.subject || 'Mata Pelajaran SMA';
    const mainGrade = selectedQuestions[0]?.grade || '11';
    const mainMajor = selectedQuestions[0]?.major || 'MIPA';

    const newPackage: ExamPackage = {
      id: `pkg-custom-${Date.now()}`,
      title: packageTitle.trim() || `Paket Ujian Kustom ${mainSubject}`,
      badge: 'Paket Kustom Guru/Siswa',
      tagline: packageTagline.trim() || `Latihan terstruktur ${selectedQuestions.length} butir soal dengan penilaian KKM otomatis.`,
      category: mainMajor === 'MIPA' ? 'SMA_MIPA' : mainMajor === 'IPS' ? 'SMA_IPS' : 'SMA_UMUM',
      grade: mainGrade,
      major: mainMajor,
      subject: mainSubject,
      examType: selectedQuestions[0]?.examType || 'Sumatif Tengah Semester (STS / PTS)',
      kkmScore: packageKkm,
      durationMinutes: packageDuration,
      totalQuestions: selectedQuestions.length,
      subtests: [
        {
          id: `sma_sub_${Date.now()}`,
          name: `${mainSubject} SMA`,
          shortName: mainSubject.substring(0, 3).toUpperCase(),
          category: mainMajor === 'MIPA' ? 'SMA_MIPA' : mainMajor === 'IPS' ? 'SMA_IPS' : 'SMA_UMUM',
          description: `Ujian ${mainSubject} Terpadu`,
          durationMinutes: packageDuration,
          questionCount: selectedQuestions.length,
          iconName: 'BookOpen',
          color: 'indigo',
        },
      ],
      questions: selectedQuestions,
      isCustomCreated: true,
      createdAt: new Date().toISOString(),
    };

    onCreateExamPackage(newPackage);
    setShowPackageModal(false);
    setSelectedQuestionIds([]);
    showNotification('🎉 Paket Ujian Baru Berhasil Dibuat dan Siap Dimainkan!');
  };

  // Filtered Bank Soal
  const filteredBankQuestions = questionsList.filter((q) => {
    if (!q) return false;
    if (bankSubjectFilter !== 'ALL' && q.subject !== bankSubjectFilter) return false;
    if (bankGradeFilter !== 'ALL' && q.grade !== bankGradeFilter) return false;
    if (bankSearch.trim() !== '') {
      const searchLower = bankSearch.trim().toLowerCase();
      const matchText = (q.questionText || '').toLowerCase().includes(searchLower);
      const matchSubject = (q.subject || '').toLowerCase().includes(searchLower);
      const matchChapter = (q.chapter || '').toLowerCase().includes(searchLower);
      const matchTopic = (q.topic || '').toLowerCase().includes(searchLower);
      if (!matchText && !matchSubject && !matchChapter && !matchTopic) return false;
    }
    return true;
  });

  // Export JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questionsList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `bank-soal-sma-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('💾 File Bank Soal JSON berhasil di-download!');
  };

  // Sample templates for import
  const SAMPLE_TEXT_IMPORT = `1. Organel sel yang berfungsi utama dalam respirasi seluler dan pembentukan adenosin trifosfat (ATP) adalah...
A. Ribosom
B. Mitokondria
C. Retikulum Endoplasma
D. Badan Golgi
E. Lisosom
KUNCI: B
PEMBAHASAN: Mitokondria adalah pusat pembangkit energi sel (powerhouse of cell) melalui reaksi fosforilasi oksidatif dalam respirasi aerob.

---

2. Satuan internasional (SI) yang baku untuk menyatakan besaran pokok intensitas cahaya adalah...
A. Candela
B. Kelvin
C. Ampere
D. Mol
E. Lumen
KUNCI: A
PEMBAHASAN: Berdasarkan standar SI, satuan intensitas cahaya adalah Candela (Cd).

---

3. BENTUK: ISIAN PANJANG
BAB: Dinamika Gerak
TINGKAT: HOTS
TARGET KATA: 40
PERTANYAAN: Jelaskan keterkaitan antara gaya impulsif, perubahan momentum, dan waktu kontak pada peristiwa tabrakan kendaraan serta bagaimana prinsip ini diterapkan dalam sistem airbag mobil!
MODEL JAWABAN: Berdasarkan teorema impuls-momentum (I = F . delta t = delta p), gaya benturan (F) berbanding terbalik dengan selang waktu kontak (delta t). Sistem kantong udara (airbag) dirancang mengembang saat benturan untuk memperpanjang waktu penghentian tubuh penumpang (delta t lebih besar), sehingga gaya benturan rata-rata (F) yang dialami penumpang dapat diminimalkan guna mencegah cedera parah.
PEMBAHASAN: Perlambatan yang mendadak tanpa penambahan waktu kontak menghasilkan gaya deselerasi yang sangat mematikan bagi organ dalam tubuh.`;

  const SAMPLE_TEXT_ESSAY_IMPORT = `[SOAL]
BENTUK: ISIAN PANJANG
BAB: Metabolisme Sel
TINGKAT: HOTS
TARGET KATA: 50
WACANA: Respirasi aerob dan fermentasi asam laktat merupakan dua jalur katabolisme glukosa yang menghasilkan energi bagi sel hidup dalam kondisi oksigen yang berbeda.
PERTANYAAN: Jelaskan perbedaan mendasar antara respirasi aerob dan respirasi anaerob (fermentasi) pada sel hewan ditinjau dari lokasi terjadinya, akseptor elektron terakhir, dan jumlah molekul ATP yang dihasilkan!
MODEL JAWABAN: Respirasi aerob berlangsung di sitoplasma (glikolisis) dan matriks serta krista mitokondria (dekarboksilasi oksidatif, siklus Krebs, dan rantai transpor elektron), dengan akseptor elektron terakhir berupa gas oksigen (O2) yang menghasilkan 36-38 ATP per molekul glukosa. Sedangkan respirasi anaerob/fermentasi berlangsung murni di sitoplasma tanpa melibatkan organel mitokondria, menggunakan senyawa organik seperti piruvat sebagai akseptor elektron, dan hanya menghasilkan 2 ATP dari glikolisis.
PEMBAHASAN: Fermentasi memiliki efisiensi energi jauh lebih rendah dibanding respirasi aerobik karena pemecahan molekul glukosa tidak berlangsung tuntas sampai CO2 dan H2O.

---

[SOAL]
BENTUK: ISIAN PANJANG
BAB: Ekosistem & Lingkungan
TINGKAT: Sedang
TARGET KATA: 40
PERTANYAAN: Analisislah dampak peningkatan kadar gas rumah kaca di atmosfer terhadap kestabilan ekosistem pesisir dan terumbu karang di perairan Indonesia!
MODEL JAWABAN: Peningkatan gas rumah kaca memicu pemanasan global yang menaikkan temperatur air laut sehingga menyebabkan pemutihan karang (coral bleaching) akibat lepasnya alga simbiotik zooxanthellae. Selain itu, penyerapan kelebihan CO2 oleh air laut menurunkan pH (asidifikasi laut) yang menghambat kalsifikasi kerangka karang, merusak rantai makanan bahari, dan melemahkan benteng alami penahan abrasi pantai bagi masyarakat pesisir.
PEMBAHASAN: Terumbu karang memiliki batas toleransi suhu yang sempit. Asidifikasi laut merusak kalsium karbonat (CaCO3) yang menjadi penyusun utama struktur rangka karang.

---

[SOAL]
BENTUK: ISIAN PANJANG
BAB: Hukum Newton & Dinamika
TINGKAT: Sulit
TARGET KATA: 35
PERTANYAAN: Berikan penjelasan fisis mengapa penumpang kendaraan terdorong ke depan ketika kendaraan yang melaju kencang tiba-tiba direm secara mendadak!
MODEL JAWABAN: Peristiwa tersebut merupakan manifestasi sifat inersia atau kelembaman materi sebagaimana dirumuskan dalam Hukum I Newton. Penumpang yang sedang bergerak bersama kendaraan pada kecepatan konstan cenderung mempertahankan keadaan gerak lurus beraturannya ke arah depan ketika rem hanya bekerja memberikan gaya perlambatan pada roda dan bodi kendaraan.
PEMBAHASAN: Hukum I Newton menyatakan bahwa setiap benda mempertahankan keadaan diam atau gerak lurus beraturannya kecuali ada resultan gaya eksternal yang memaksanya berubah (Sigma F = 0).`;

  const SAMPLE_JSON_IMPORT = `[
  {
    "questionText": "Manakah pernyataan yang paling tepat mengenai Hukum I Newton (Kelembaman)?",
    "subject": "Fisika",
    "grade": "10",
    "major": "MIPA",
    "chapter": "Dinamika Gerak",
    "difficulty": "Sedang",
    "type": "multiple_choice",
    "options": [
      { "id": "A", "label": "A", "text": "Benda selalu mengalami percepatan konstan" },
      { "id": "B", "label": "B", "text": "Setiap aksi selalu disertai reaksi berlawanan arah" },
      { "id": "C", "label": "C", "text": "Benda cenderung mempertahankan keadaan diam atau gerak lurus beraturan jika total gaya bernilai nol" },
      { "id": "D", "label": "D", "text": "Gaya gesek selalu bernilai nol di ruang hampa" },
      { "id": "E", "label": "E", "text": "Massa benda selalu bertambah seiring peningkatan kecepatan" }
    ],
    "correctAnswer": "C",
    "explanation": {
      "summary": "Hukum I Newton menyatakan bahwa benda akan diam atau bergerak lurus beraturan jika resultan gaya eksternal sama dengan nol (Sigma F = 0)."
    }
  }
]`;

  // Parser helper function with flexible separators (---, ===, [SOAL], or numbering)
  const parseRawImportText = (
    text: string,
    overrideFormat: QuestionFormat | 'auto' = importDefaultFormat,
    sepMode: 'auto' | 'dash' | 'tag' | 'custom' = importSeparatorMode,
    customSep: string = importCustomSeparator
  ): Question[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    // 1. JSON parsing branch
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        return arr
          .filter((item) => item && (item.questionText || item.text))
          .map((item, idx) => {
            const itemType = (item.type as QuestionFormat) || (overrideFormat !== 'auto' ? overrideFormat : 'multiple_choice');
            return {
              id: item.id || `import-json-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
              subtestId: item.subtestId || `sma_${(item.subject || importSubject || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              subtestName: item.subtestName || `${item.subject || importSubject} SMA`,
              category: item.category || (importMajor === 'MIPA' ? 'SMA_MIPA' : importMajor === 'IPS' ? 'SMA_IPS' : 'SMA_UMUM'),
              grade: item.grade || importGrade,
              major: item.major || importMajor,
              subject: item.subject || importSubject,
              chapter: item.chapter || item.topic || importChapter || 'Materi Pokok',
              examType: item.examType || importExamType,
              type: itemType,
              minWordCount: item.minWordCount || (itemType === 'long_essay' ? 50 : undefined),
              stimulusTitle: item.stimulusTitle,
              stimulus: item.stimulus,
              questionText: item.questionText || item.text || `Soal Nomor ${idx + 1}`,
              options:
                itemType === 'long_essay' || itemType === 'short_numeric'
                  ? undefined
                  : item.options || [
                      { id: 'A', label: 'A', text: 'Pilihan A' },
                      { id: 'B', label: 'B', text: 'Pilihan B' },
                      { id: 'C', label: 'C', text: 'Pilihan C' },
                      { id: 'D', label: 'D', text: 'Pilihan D' },
                      { id: 'E', label: 'E', text: 'Pilihan E' },
                    ],
              correctAnswer: item.correctAnswer || (itemType === 'long_essay' ? 'Model jawaban terlampir.' : 'A'),
              explanation: item.explanation || {
                summary: 'Kunci jawaban terbukti benar berdasarkan kurikulum.',
                steps: ['1. Analisis soal', '2. Terapkan rumus/konsep pokok'],
                concept: `Konsep ${item.subject || importSubject}`,
              },
              difficulty: item.difficulty || importDifficulty,
              irtWeight: item.difficulty === 'HOTS' ? 90 : item.difficulty === 'Sulit' ? 85 : 80,
              topic: item.topic || item.chapter || importSubject,
              isUserCreated: true,
              createdAt: new Date().toISOString(),
            };
          });
      } catch (e: any) {
        // Fallback to text parsing if JSON parse fails
      }
    }

    // 2. Multi-Question Text Parser with Delimiters / Separators (Pemisah Antar Soal)
    let rawBlocks: string[] = [];

    if (sepMode === 'custom' && customSep.trim()) {
      // Split strictly by user-defined custom separator
      rawBlocks = trimmed.split(customSep.trim()).map((b) => b.trim()).filter(Boolean);
    } else if (sepMode === 'dash') {
      // Split strictly by horizontal line markers (---, ===, ***)
      rawBlocks = trimmed.split(/\n\s*[-=_*~]{3,}\s*(?:\n|$)/).map((b) => b.trim()).filter(Boolean);
    } else if (sepMode === 'tag') {
      // Split strictly by tag markers [SOAL] or ---SOAL---
      rawBlocks = trimmed
        .split(/(?:^|\n)\s*(?:\[(?:SOAL|PEMISAH|QUESTION|ESAI|ESSAY)\]|[-=]{2,}(?:SOAL|PEMISAH|ESAI|ESSAY)[-=]{2,})\s*(?:\n|$)/i)
        .map((b) => b.trim())
        .filter(Boolean);
    } else {
      // AUTO DETECT MODE:
      const hasDashSep = /\n\s*[-=]{3,}\s*(?:\n|$)/.test(trimmed);
      const hasTagSep = /(?:^|\n)\s*(?:\[(?:SOAL|PEMISAH|QUESTION|ESAI|ESSAY)\]|[-=]{2,}(?:SOAL|PEMISAH|ESAI|ESSAY)[-=]{2,})\s*(?:\n|$)/i.test(trimmed);
      const hasAsteriskSep = /\n\s*[*_~]{3,}\s*(?:\n|$)/.test(trimmed);

      if (hasDashSep) {
        rawBlocks = trimmed.split(/\n\s*[-=]{3,}\s*(?:\n|$)/).map((b) => b.trim()).filter(Boolean);
      } else if (hasTagSep) {
        rawBlocks = trimmed
          .split(/(?:^|\n)\s*(?:\[(?:SOAL|PEMISAH|QUESTION|ESAI|ESSAY)\]|[-=]{2,}(?:SOAL|PEMISAH|ESAI|ESSAY)[-=]{2,})\s*(?:\n|$)/i)
          .map((b) => b.trim())
          .filter(Boolean);
      } else if (hasAsteriskSep) {
        rawBlocks = trimmed.split(/\n\s*[*_~]{3,}\s*(?:\n|$)/).map((b) => b.trim()).filter(Boolean);
      } else {
        // Fallback to traditional line-by-line numbering (1., 2., [1], Soal 1., etc.)
        const lines = trimmed.split('\n');
        let currentBlock: string[] = [];
        const isQuestionStart = (line: string) => {
          const l = line.trim();
          return (
            /^(?:soal\s+|no\.?\s*)?\(?\d+\)?[.\-\:]\s+/i.test(l) ||
            /^\[\d+\]\s+/i.test(l) ||
            /^(?:pertanyaan\s+\d+|question\s+\d+)/i.test(l)
          );
        };

        lines.forEach((line) => {
          if (isQuestionStart(line)) {
            if (currentBlock.length > 0) {
              rawBlocks.push(currentBlock.join('\n'));
            }
            currentBlock = [line];
          } else {
            if (currentBlock.length === 0) {
              currentBlock = [line];
            } else {
              currentBlock.push(line);
            }
          }
        });

        if (currentBlock.length > 0) {
          rawBlocks.push(currentBlock.join('\n'));
        }
      }
    }

    if (rawBlocks.length === 0) {
      rawBlocks = [trimmed];
    }

    const parsedResults: Question[] = [];

    rawBlocks.forEach((blockStr, qIdx) => {
      // Remove leading [SOAL] tags if still present at top of block
      const cleanBlock = blockStr.replace(/^(?:\[(?:SOAL|PEMISAH|QUESTION|ESAI|ESSAY)\]|[-=]{2,}(?:SOAL|PEMISAH|ESAI|ESSAY)[-=]{2,})\s*/i, '').trim();
      const blockLines = cleanBlock.split('\n');

      let questionTextLines: string[] = [];
      const opts: QuestionOption[] = [];
      let detectedType: QuestionFormat | null = null;
      let ansKey = '';
      let explText = '';
      let stimText = '';
      let stimHeading = '';
      let blockChapter = importChapter.trim() || 'Materi Pokok';
      let blockDifficulty: DifficultyLevel = importDifficulty;
      let blockMinWordCount: number = 0;
      let currMode: 'question' | 'stimulus' | 'explanation' | 'answer' = 'question';

      blockLines.forEach((rawL) => {
        const line = rawL.trim();
        if (!line) return;

        // Check if line is a secondary separator inside block
        if (/^[-=_*~]{3,}$/.test(line)) {
          return;
        }

        // 1. Tipe / Bentuk Soal Directive
        if (/^(?:tipe|format|bentuk|jenis)(?:\s*soal)?\s*[:\-=]\s*(.*)$/i.test(line)) {
          const match = line.match(/^(?:tipe|format|bentuk|jenis)(?:\s*soal)?\s*[:\-=]\s*(.*)$/i);
          if (match) {
            const val = match[1].toLowerCase();
            if (val.includes('essay') || val.includes('esai') || val.includes('uraian') || val.includes('panjang') || val.includes('long')) {
              detectedType = 'long_essay';
            } else if (val.includes('singkat') || val.includes('numeric') || val.includes('angka') || val.includes('short')) {
              detectedType = 'short_numeric';
            } else if (val.includes('kompleks') || val.includes('complex')) {
              detectedType = 'complex_multiple_choice';
            } else if (val.includes('banyak') || val.includes('multi')) {
              detectedType = 'multi_select_choice';
            } else if (val.includes('sebab') || val.includes('akibat') || val.includes('reason')) {
              detectedType = 'cause_reason';
            } else if (val.includes('ganda') || val.includes('pg') || val.includes('choice')) {
              detectedType = 'multiple_choice';
            }
          }
          return;
        }

        // 2. Target Minimal Kata Directive (khusus esai / isian panjang)
        if (/^(?:target\s*kata|min(?:imal)?\s*kata|batasan\s*kata|min_words?)\s*[:\-=]\s*(\d+)/i.test(line)) {
          const match = line.match(/^(?:target\s*kata|min(?:imal)?\s*kata|batasan\s*kata|min_words?)\s*[:\-=]\s*(\d+)/i);
          if (match) {
            blockMinWordCount = parseInt(match[1], 10);
            if (!detectedType) detectedType = 'long_essay';
          }
          return;
        }

        // 3. Bab / Materi Pokok Directive
        if (/^(?:bab|topik|chapter|materi)\s*[:\-=]\s*(.*)$/i.test(line)) {
          const match = line.match(/^(?:bab|topik|chapter|materi)\s*[:\-=]\s*(.*)$/i);
          if (match && match[1].trim()) {
            blockChapter = match[1].trim();
          }
          return;
        }

        // 4. Tingkat Kesulitan Directive
        if (/^(?:tingkat|kesulitan|difficulty|level)\s*[:\-=]\s*(.*)$/i.test(line)) {
          const match = line.match(/^(?:tingkat|kesulitan|difficulty|level)\s*[:\-=]\s*(.*)$/i);
          if (match && match[1].trim()) {
            const dVal = match[1].trim().toLowerCase();
            if (dVal.includes('hots')) blockDifficulty = 'HOTS';
            else if (dVal.includes('sulit')) blockDifficulty = 'Sulit';
            else if (dVal.includes('mudah')) blockDifficulty = 'Mudah';
            else blockDifficulty = 'Sedang';
          }
          return;
        }

        // 5. Wacana / Stimulus Directive
        if (/^(?:wacana|stimulus|bacaan|teks|narasi)\s*[:\-]\s*(.*)$/i.test(line)) {
          const match = line.match(/^(?:wacana|stimulus|bacaan|teks|narasi)\s*[:\-]\s*(.*)$/i);
          stimText = match ? match[1] : '';
          currMode = 'stimulus';
          return;
        }

        // 6. Explicit Question Directive (SOAL: / PERTANYAAN:)
        if (/^(?:soal|pertanyaan|question|tanya)\s*[:\-]\s*(.*)$/i.test(line)) {
          const match = line.match(/^(?:soal|pertanyaan|question|tanya)\s*[:\-]\s*(.*)$/i);
          if (match && match[1].trim()) {
            questionTextLines.push(match[1].trim());
          }
          currMode = 'question';
          return;
        }

        // 7. Model Jawaban / Rubrik / Kunci Jawaban Directive
        if (/^(?:model\s*jawaban|rubrik(?:nya)?|kunci\s*esai|kunci\s*uraian|kunci\s*isian|kunci\s*jawaban|kunci|jawaban|answer|key)\s*[:\-=]\s*(.*)$/i.test(line)) {
          const match = line.match(/^(?:model\s*jawaban|rubrik(?:nya)?|kunci\s*esai|kunci\s*uraian|kunci\s*isian|kunci\s*jawaban|kunci|jawaban|answer|key)\s*[:\-=]\s*(.*)$/i);
          const rawKeyVal = match ? match[1].trim() : '';
          ansKey = rawKeyVal;
          currMode = 'answer';
          return;
        }

        // 8. Pembahasan Directive
        if (/^(?:pembahasan|penjelasan|explanation|bahas|solusi)\s*[:\-]\s*(.*)$/i.test(line)) {
          const match = line.match(/^(?:pembahasan|penjelasan|explanation|bahas|solusi)\s*[:\-]\s*(.*)$/i);
          explText = match ? match[1].trim() : '';
          currMode = 'explanation';
          return;
        }

        // 9. Options A-E: A. ..., A) ..., (A) ...
        const optionMatch = line.match(/^\(?([A-Ea-e])\)?[.\-\:]\s*(.*)$/);
        if (optionMatch) {
          const optLetter = optionMatch[1].toUpperCase();
          const optVal = optionMatch[2].trim();
          opts.push({
            id: optLetter,
            label: optLetter,
            text: optVal,
          });
          currMode = 'question';
          return;
        }

        // 10. Multi-line appends based on currMode
        if (currMode === 'stimulus') {
          stimText += (stimText ? ' ' : '') + line;
        } else if (currMode === 'explanation') {
          explText += (explText ? ' ' : '') + line;
        } else if (currMode === 'answer') {
          ansKey += (ansKey ? '\n' : '') + line;
        } else {
          let cleanLine = line;
          if (questionTextLines.length === 0) {
            // Strip leading question numbering like "1. ", "Soal 1. ", "(1) "
            cleanLine = line.replace(/^(?:soal\s+|no\.?\s*)?\(?\d+\)?[.\-\:]\s*/i, '').trim();
          }
          if (cleanLine) {
            questionTextLines.push(cleanLine);
          }
        }
      });

      // Determine final question type
      let finalType: QuestionFormat = 'multiple_choice';
      if (detectedType) {
        finalType = detectedType;
      } else if (overrideFormat !== 'auto') {
        finalType = overrideFormat;
      } else if (opts.length >= 2) {
        finalType = ansKey.includes(',') || ansKey.includes('&') ? 'multi_select_choice' : 'multiple_choice';
      } else {
        // No options A-E found: determine whether long_essay or short_numeric
        const isAnswerLong = ansKey.length > 20 || (ansKey.includes(' ') && ansKey.split(/\s+/).length >= 4);
        const hasEssayKeyword = /jelaskan|uraikan|sebutkan|bagaimanakah|analisislah|deskripsikan|diskusikan|kemukakan/i.test(questionTextLines.join(' '));
        if (blockMinWordCount > 0 || isAnswerLong || hasEssayKeyword || !ansKey || ansKey.length > 15) {
          finalType = 'long_essay';
        } else {
          finalType = 'short_numeric';
        }
      }

      const fullQText = questionTextLines.join(' ').trim();
      if (!fullQText && opts.length === 0 && !ansKey) return;

      // Ensure appropriate correctAnswer and options based on finalType
      let finalCorrectAnswer: any = ansKey;
      let finalOpts: QuestionOption[] | undefined = undefined;

      if (finalType === 'long_essay') {
        finalOpts = undefined;
        if (!finalCorrectAnswer) {
          finalCorrectAnswer = 'Model jawaban / rubrik esai acuan penilaian.';
        }
        if (blockMinWordCount === 0) {
          blockMinWordCount = 50;
        }
      } else if (finalType === 'short_numeric') {
        finalOpts = undefined;
        if (!finalCorrectAnswer) {
          finalCorrectAnswer = '0';
        }
      } else {
        // Multiple choice & similar
        finalOpts =
          opts.length > 0
            ? opts
            : [
                { id: 'A', label: 'A', text: 'Pilihan A' },
                { id: 'B', label: 'B', text: 'Pilihan B' },
                { id: 'C', label: 'C', text: 'Pilihan C' },
                { id: 'D', label: 'D', text: 'Pilihan D' },
                { id: 'E', label: 'E', text: 'Pilihan E' },
              ];
        if (!finalCorrectAnswer || finalCorrectAnswer.length > 4) {
          finalCorrectAnswer = 'A';
        }
      }

      parsedResults.push({
        id: `import-txt-${Date.now()}-${qIdx}-${Math.floor(Math.random() * 1000)}`,
        subtestId: `sma_${(importSubject || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        subtestName: `${importSubject} SMA`,
        category: importMajor === 'MIPA' ? 'SMA_MIPA' : importMajor === 'IPS' ? 'SMA_IPS' : 'SMA_UMUM',
        grade: importGrade,
        major: importMajor,
        subject: importSubject,
        chapter: blockChapter,
        examType: importExamType,
        type: finalType,
        minWordCount: blockMinWordCount > 0 ? blockMinWordCount : undefined,
        stimulus: stimText || undefined,
        stimulusTitle: stimHeading || undefined,
        questionText: fullQText || `Soal Nomor ${qIdx + 1}`,
        options: finalOpts,
        correctAnswer: finalCorrectAnswer,
        explanation: {
          summary:
            explText ||
            (finalType === 'long_essay'
              ? `Rubrik penilaian dan pembahasan esai materi ${blockChapter}.`
              : `Kunci jawaban ${finalCorrectAnswer}. Pembahasan materi ${importSubject}.`),
          steps: ['1. Analisis premis soal', '2. Verifikasi kesesuaian konsep'],
          concept: `Konsep ${importSubject}: ${blockChapter}`,
        },
        difficulty: blockDifficulty,
        irtWeight: blockDifficulty === 'HOTS' ? 90 : blockDifficulty === 'Sulit' ? 85 : 80,
        topic: blockChapter,
        isUserCreated: true,
        createdAt: new Date().toISOString(),
      });
    });

    return parsedResults;
  };

  // Live parse effect when input changes
  const handleRawTextChange = (
    text: string,
    overrideFmt: QuestionFormat | 'auto' = importDefaultFormat,
    sepMode: 'auto' | 'dash' | 'tag' | 'custom' = importSeparatorMode,
    customSep: string = importCustomSeparator
  ) => {
    setImportRawText(text);
    setImportError(null);
    if (!text.trim()) {
      setImportParsedPreview([]);
      return;
    }
    try {
      const parsed = parseRawImportText(text, overrideFmt, sepMode, customSep);
      setImportParsedPreview(parsed);
    } catch (e: any) {
      setImportError(e.message || 'Gagal memproses format soal.');
    }
  };

  // File Upload Handler (.txt, .json, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (file.name.endsWith('.json')) {
          setImportFormat('json');
        } else {
          setImportFormat('text');
        }
        handleRawTextChange(content);
        showNotification(`📁 File "${file.name}" berhasil dibaca.`);
      }
    };
    reader.onerror = () => {
      showNotification('Gagal membaca file.', 'error');
    };
    reader.readAsText(file);
  };

  // Execute Import
  const handleConfirmImport = () => {
    const questionsToImport =
      importParsedPreview.length > 0
        ? importParsedPreview
        : parseRawImportText(importRawText, importDefaultFormat, importSeparatorMode, importCustomSeparator);
    if (questionsToImport.length === 0) {
      showNotification('Tidak ada butir soal valid yang dapat diimpor!', 'error');
      return;
    }

    let count = 0;
    questionsToImport.forEach((q) => {
      onAddQuestion(q);
      count++;
    });

    showNotification(`🎉 Berhasil mengimpor ${count} butir soal ke Bank Soal!`);
    setShowImportModal(false);
    setImportRawText('');
    setImportParsedPreview([]);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Notification Toast */}
        {notification && (
          <div
            id="toast-notification-banner"
            className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200 text-xs sm:text-sm font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-100 border-emerald-500/50 shadow-emerald-950/60 ring-1 ring-emerald-500/30'
                : notification.type === 'warning'
                ? 'bg-amber-950/95 text-amber-100 border-amber-500/50 shadow-amber-950/60 ring-1 ring-amber-500/30'
                : notification.type === 'error'
                ? 'bg-rose-950/95 text-rose-100 border-rose-500/50 shadow-rose-950/60 ring-1 ring-rose-500/30'
                : 'bg-indigo-950/95 text-indigo-100 border-indigo-500/50 shadow-indigo-950/60 ring-1 ring-indigo-500/30'
            }`}
          >
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-cyan-400 shrink-0" />}
            <span className="leading-snug">{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="ml-2 text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header & Navigation Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Pusat Pembuat Soal & Bank Soal UTBK SMA
              </span>
              <span className="text-xs text-slate-400">Total {questionsList.length} Soal Tersimpan</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              Input Soal & Manajemen Bank Soal UTBK SMA
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Buat butir soal mandiri, gunakan asisten AI untuk pembahasan otomatis, dan kemas menjadi paket ujian CBT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="tab-btn-input-form"
              onClick={() => setActiveTab('input_form')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'input_form'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Input Soal Baru</span>
            </button>

            <button
              id="tab-btn-bank-list"
              onClick={() => setActiveTab('bank_list')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'bank_list'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Bank Soal ({questionsList.length})</span>
            </button>

            <button
              id="tab-btn-ai-generator"
              onClick={() => setActiveTab('ai_generator')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'ai_generator'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>AI Soal Generator</span>
            </button>

            <button
              id="btn-top-import-soal"
              onClick={() => {
                setImportParsedPreview([]);
                setImportRawText('');
                setShowImportModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/40 border border-emerald-500/40 transition-all cursor-pointer"
              title="Import Butir Soal dari File Word/Text atau Format JSON"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>Import Soal</span>
            </button>

            {onOpenCentralSubjectClass && (
              <button
                type="button"
                id="btn-nav-to-central-from-bank"
                onClick={() => onOpenCentralSubjectClass('subjects')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-cyan-600/90 hover:bg-cyan-500 text-white border border-cyan-500/40 shadow-md shadow-cyan-950/40 transition-all cursor-pointer active:scale-95"
                title="Edit dan Sinkronisasi Master Mata Pelajaran & Kelas"
              >
                <Layers className="w-4 h-4 text-cyan-200" />
                <span>Edit Mapel & Kelas</span>
              </button>
            )}

            <button
              id="btn-nav-to-sma-hub"
              onClick={onNavigateToSmaHub}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>KUMPULAN MAPEL</span>
            </button>

            {onNavigateToDashboard && (
              <button
                id="btn-nav-to-dashboard-from-bank"
                type="button"
                onClick={onNavigateToDashboard}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 transition-all cursor-pointer active:scale-95"
                title="Kembali ke Dashboard Utama"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>Dashboard</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: FORMULIR INPUT SOAL */}
        {activeTab === 'input_form' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Main Question Form divided into 4 Foldable Sections */}
            <div className="lg:col-span-2 space-y-4">
              {/* Form Top Control Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">
                      {editingQuestionId ? `Edit Soal (${editingQuestionId})` : 'Formulir Pembuatan Soal'}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Bagian 1. Identitas, Bagian 2. Format Soal, Bagian 3. Pertanyaan Soal, dan Bagian 4. Jawaban Soal
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-expand-all-sections"
                    type="button"
                    onClick={expandAllSections}
                    className="flex items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    title="Buka semua bagian formulir"
                    aria-label="Buka semua bagian"
                  >
                    <ChevronDown className="w-4 h-4 text-indigo-400" />
                  </button>

                  <button
                    id="btn-collapse-all-sections"
                    type="button"
                    onClick={collapseAllSections}
                    className="flex items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    title="Lipat semua bagian formulir"
                    aria-label="Lipat semua bagian"
                  >
                    <ChevronUp className="w-4 h-4 text-indigo-400" />
                  </button>

                  {editingQuestionId && (
                    <button
                      onClick={() => handleResetForm(true)}
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1 px-2 py-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Batal Edit</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* BAGIAN 1: IDENTITAS (Collapsible) */}
              {/* ========================================================================= */}
              <div
                id="section-1-identity"
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md transition-all"
              >
                {/* Header / Fold Toggle */}
                <button
                  type="button"
                  id="toggle-section-1"
                  onClick={() => toggleSection('identity')}
                  className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-900/90 hover:bg-slate-850 text-left transition-colors border-b border-slate-800/80 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-extrabold">
                      1
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          Bagian 1. Identitas
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {subject} • Kelas {grade} ({major})
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mata pelajaran, kelas, jurusan, bab pokok bahasan, tipe ujian, dan level kesulitan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                      {collapsedSections.identity ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Collapsible Content */}
                {!collapsedSections.identity && (
                  <div className="p-5 sm:p-6 space-y-4 animate-in fade-in-50 duration-150">
                    {/* Metadata Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-slate-300">
                            Mata Pelajaran SMA
                          </label>
                          {isDefaultSubject(subject) ? (
                            <span
                              className="p-1 rounded text-amber-300 bg-amber-500/15 border border-amber-500/30 flex items-center justify-center"
                              title="Mata pelajaran ini adalah default sistem"
                            >
                              <Star className="w-3 h-3 fill-amber-300" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDefaultSubject(subject);
                                setDefaultToast(`Mata Pelajaran "${subject}" berhasil diset sebagai default!`);
                                setTimeout(() => setDefaultToast(null), 3000);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer flex items-center justify-center transition-colors"
                              title="Jadikan mata pelajaran ini sebagai default sistem"
                              aria-label="Set Default Mata Pelajaran"
                            >
                              <Star className="w-3 h-3 text-amber-400 hover:fill-amber-400" />
                            </button>
                          )}
                        </div>
                        <select
                          id="form-select-subject"
                          value={subject}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSubject(val);
                            const found = SUBJECTS.find((s) => s.name === val);
                            if (found) setMajor(found.major as SmaMajor);
                          }}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {SUBJECTS.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name} ({s.major}) {isDefaultSubject(s.name) ? '★' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Tingkat Kelas
                        </label>
                        <select
                          id="form-select-grade"
                          value={grade}
                          onChange={(e) => setGrade(e.target.value as SmaGrade)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="10">Kelas 10 (Fase E)</option>
                          <option value="11">Kelas 11 (Fase F)</option>
                          <option value="12">Kelas 12 (Fase F+)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Kelompok / Jurusan
                        </label>
                        <select
                          id="form-select-major"
                          value={major}
                          onChange={(e) => setMajor(e.target.value as SmaMajor)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="MIPA">MIPA / Sains</option>
                          <option value="IPS">IPS / Sosial Humaniora</option>
                          <option value="Bahasa">Bahasa & Sastra</option>
                          <option value="Umum">Umum / Wajib Nasional</option>
                        </select>
                      </div>
                    </div>

                    {/* Metadata Row 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Bab / Pokok Bahasan
                        </label>
                        <input
                          id="form-input-chapter"
                          type="text"
                          value={chapter}
                          onChange={(e) => setChapter(e.target.value)}
                          placeholder="Contoh: Dinamika Rotasi & Momen Inersia"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Tipe Penilaian / Ujian
                        </label>
                        <select
                          id="form-select-exam-type"
                          value={examType}
                          onChange={(e) => setExamType(e.target.value as SmaExamType)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Penilaian Harian (UH)">Penilaian Harian (UH)</option>
                          <option value="Sumatif Tengah Semester (STS / PTS)">Sumatif Tengah Semester (STS/PTS)</option>
                          <option value="Sumatif Akhir Semester (SAS / PAS)">Sumatif Akhir Semester (SAS/PAS)</option>
                          <option value="Ujian Sekolah (US / Asesmen Akhir)">Ujian Sekolah (US / Asesmen Akhir)</option>
                          <option value="Latihan Topik Mandiri">Latihan Topik Mandiri</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Tingkat Kesulitan & HOTS
                        </label>
                        <select
                          id="form-select-difficulty"
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Mudah">Mudah (LOTS)</option>
                          <option value="Sedang">Sedang (MOTS)</option>
                          <option value="Sulit">Sulit</option>
                          <option value="HOTS">HOTS (High Order Thinking Skills)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* BAGIAN 2: FORMAT SOAL (Collapsible) */}
              {/* ========================================================================= */}
              <div
                id="section-2-format"
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md transition-all"
              >
                {/* Header / Fold Toggle */}
                <button
                  type="button"
                  id="toggle-section-2"
                  onClick={() => toggleSection('format')}
                  className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-900/90 hover:bg-slate-850 text-left transition-colors border-b border-slate-800/80 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-extrabold">
                      2
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          Bagian 2. Format Soal
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-500/40">
                          {type === 'multiple_choice' && 'Pilihan Ganda (A-E)'}
                          {type === 'multi_select_choice' && 'PG Jawaban Banyak'}
                          {type === 'complex_multiple_choice' && 'PG Kompleks (B/S)'}
                          {type === 'short_numeric' && 'Isian Singkat'}
                          {type === 'long_essay' && 'Isian Panjang (Esai)'}
                          {type === 'cause_reason' && 'Sebab-Akibat'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pilih tipe bentuk soal ujian CBT UTBK SMA yang akan disajikan ke siswa
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                      {collapsedSections.format ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Collapsible Content */}
                {!collapsedSections.format && (
                  <div className="p-5 sm:p-6 space-y-3 animate-in fade-in-50 duration-150">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      {[
                        {
                          id: 'multiple_choice',
                          label: 'Pilihan Ganda (A-E)',
                          desc: '1 jawaban benar (standar)',
                          icon: '🔘',
                        },
                        {
                          id: 'multi_select_choice',
                          label: 'PG Jawaban Banyak',
                          desc: 'Centang > 1 opsi benar',
                          icon: '☑️',
                        },
                        {
                          id: 'complex_multiple_choice',
                          label: 'PG Kompleks (B/S)',
                          desc: 'Tabel Benar/Salah per baris',
                          icon: '📋',
                        },
                        {
                          id: 'short_numeric',
                          label: 'Isian Singkat',
                          desc: 'Kunci angka / kata pasti',
                          icon: '🔢',
                        },
                        {
                          id: 'long_essay',
                          label: 'Isian Panjang',
                          desc: 'Uraian esai & rubrik analisis',
                          icon: '📝',
                        },
                        {
                          id: 'cause_reason',
                          label: 'Sebab-Akibat',
                          desc: 'Pernyataan & Alasan (UTBK)',
                          icon: '⚡',
                        },
                      ].map((f) => {
                        const isSelected = type === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            id={`btn-format-${f.id}`}
                            onClick={() => setType(f.id as QuestionFormat)}
                            className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between relative ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-300 shadow-md shadow-indigo-900/50 ring-2 ring-indigo-400'
                                : 'bg-slate-800/70 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-base block">{f.icon}</span>
                                {isSelected && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-indigo-950 bg-white px-1.5 py-0.5 rounded-full shadow-sm">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" /> Terpilih
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold leading-tight">{f.label}</div>
                            </div>
                            <div className={`text-[10px] mt-2 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                              {f.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* BAGIAN 3: PERTANYAAN SOAL (Collapsible) */}
              {/* ========================================================================= */}
              <div
                id="section-3-question"
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md transition-all"
              >
                {/* Header / Fold Toggle */}
                <button
                  type="button"
                  id="toggle-section-3"
                  onClick={() => toggleSection('question')}
                  className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-900/90 hover:bg-slate-850 text-left transition-colors border-b border-slate-800/80 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold ${
                      questionText.trim()
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      3
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          Bagian 3. Pertanyaan Soal
                        </h3>
                        {questionText.trim() ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                            Teks Terisi ({questionText.length} Karakter)
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-500/40">
                            Wajib Diisi *
                          </span>
                        )}
                        {(questionImage || questionAudio || stimulusImage || stimulusAudio) && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/40">
                            Lampiran Media
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Teks pertanyaan utama, diagram/gambar soal, audio listening, dan wacana pendukung
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                      {collapsedSections.question ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Collapsible Content */}
                {!collapsedSections.question && (
                  <div className="p-5 sm:p-6 space-y-5 animate-in fade-in-50 duration-150">
                    {/* Teks Pertanyaan Utama */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-200">
                          Teks Pertanyaan Utama <span className="text-rose-400">*</span>
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {questionText.length} karakter
                        </span>
                      </div>
                      <textarea
                        id="form-input-question-text"
                        rows={4}
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="Ketik kalimat soal ujian yang jelas dan lugas. Contoh: Berapakah besar energi kinetik rotasi silinder pejal bermassa 2 kg dan jari-jari 0.2 m jika berputar dengan kecepatan sudut 10 rad/s?"
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                      />
                    </div>

                    {/* Media Pertanyaan (Diagram/Gambar & Audio Listening) */}
                    <MediaInputWidget
                      image={questionImage}
                      audio={questionAudio}
                      onImageChange={setQuestionImage}
                      onAudioChange={setQuestionAudio}
                      label="Media Lampiran Pertanyaan Soal (Diagram / Gambar Soal & Audio Listening)"
                    />

                    {/* Stimulus / Wacana Bacaan (Opsional) */}
                    <div className="space-y-3 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Stimulus / Teks Wacana / Narasi Pendukung (Opsional)</span>
                        </label>
                        <span className="text-[11px] text-slate-500">Teks cerita, wacana, gambar & audio wacana</span>
                      </div>
                      <input
                        id="form-input-stimulus-title"
                        type="text"
                        value={stimulusTitle}
                        onChange={(e) => setStimulusTitle(e.target.value)}
                        placeholder="Judul Wacana (Contoh: Percobaan Tabung Venturi Fluida Dinamis)"
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <textarea
                        id="form-input-stimulus-body"
                        rows={3}
                        value={stimulus}
                        onChange={(e) => setStimulus(e.target.value)}
                        placeholder="Ketik teks wacana bacaan, kutipan berita, rumus pendukung, atau data penelitian di sini..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />

                      {/* Media Stimulus (Gambar & Suara) */}
                      <MediaInputWidget
                        image={stimulusImage}
                        audio={stimulusAudio}
                        onImageChange={setStimulusImage}
                        onAudioChange={setStimulusAudio}
                        label="Media Lampiran Wacana (Gambar & Suara Wacana)"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* BAGIAN 4: JAWABAN SOAL (Collapsible) */}
              {/* ========================================================================= */}
              <div
                id="section-4-answer"
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md transition-all"
              >
                {/* Header / Fold Toggle */}
                <button
                  type="button"
                  id="toggle-section-4"
                  onClick={() => toggleSection('answer')}
                  className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-900/90 hover:bg-slate-850 text-left transition-colors border-b border-slate-800/80 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-xs font-extrabold">
                      4
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          Bagian 4. Jawaban Soal
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                          {type === 'multiple_choice' && `Kunci: ${correctOption}`}
                          {type === 'cause_reason' && `Kunci: ${correctOption}`}
                          {type === 'multi_select_choice' && `Kunci: [ ${correctMultiOptions.sort().join(', ')} ]`}
                          {type === 'complex_multiple_choice' && `Kunci: ${complexStatements.length} Pernyataan`}
                          {type === 'short_numeric' && `Kunci: ${numericAnswer || 'Belum diisi'}`}
                          {type === 'long_essay' && `Kunci: ${numericAnswer.trim() ? 'Model Esai Diisi' : 'Belum diisi'}`}
                        </span>
                        {explanationSummary.trim() && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-500/40">
                            Pembahasan Ada
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Opsi pilihan, penetapan kunci jawaban benar, dan modul pembahasan solusi
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                      {collapsedSections.answer ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Collapsible Content */}
                {!collapsedSections.answer && (
                  <div className="p-5 sm:p-6 space-y-6 animate-in fade-in-50 duration-150">
                    {/* 1. Multiple Choice & Cause Reason */}
                    {(type === 'multiple_choice' || type === 'cause_reason') && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200">
                            Opsi Pilihan Jawaban & Kunci Benar (Pilih Radio Button):
                          </label>
                          <span className="text-xs text-indigo-300 font-medium">
                            Kunci terpilih: <strong className="text-emerald-400 font-bold text-sm">{correctOption}</strong>
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {options.map((opt, idx) => (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-2xl border transition-all space-y-2 ${
                                correctOption === opt.id
                                  ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/70 shadow-md'
                                  : 'bg-slate-800/60 border-slate-700/60'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="correct_answer_radio"
                                    checked={correctOption === opt.id}
                                    onChange={() => setCorrectOption(opt.id)}
                                    className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-600 cursor-pointer"
                                  />
                                  <span
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                                      correctOption === opt.id
                                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                        : 'bg-slate-700 text-slate-200'
                                    }`}
                                  >
                                    {opt.id}
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => {
                                    const newOpts = [...options];
                                    newOpts[idx].text = e.target.value;
                                    setOptions(newOpts);
                                  }}
                                  placeholder={`Teks pilihan jawaban ${opt.id}...`}
                                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {correctOption === opt.id && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 shadow-sm shrink-0">
                                    <Check className="w-3 h-3 stroke-[3]" /> Kunci Terpilih
                                  </span>
                                )}
                              </div>

                              {/* Media Input for Option (Compact) */}
                              <div className="pl-8 pt-1">
                                <MediaInputWidget
                                  compact={true}
                                  image={opt.image}
                                  audio={opt.audio}
                                  onImageChange={(img) => {
                                    const newOpts = [...options];
                                    newOpts[idx].image = img;
                                    setOptions(newOpts);
                                  }}
                                  onAudioChange={(aud) => {
                                    const newOpts = [...options];
                                    newOpts[idx].audio = aud;
                                    setOptions(newOpts);
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 1.B Multi-Select Choice (Pilihan Ganda Jawaban Banyak) */}
                    {type === 'multi_select_choice' && (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                            <span>Opsi Jawaban & Kunci Jawaban Benar (Centang Opsi yang Benar):</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">Kunci Benar:</span>
                            <span className="px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/40">
                              [ {correctMultiOptions.sort().join(', ') || 'Belum Ada'} ]
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-[11px] text-indigo-200">
                          💡 <strong>Petunjuk Guru:</strong> Centang kotak pilihan untuk setiap opsi yang merupakan kunci jawaban yang benar (bisa lebih dari satu). Siswa menjawab dengan mencentang kotak pilihan.
                        </div>

                        <div className="space-y-2.5">
                          {options.map((opt, idx) => {
                            const isChecked = correctMultiOptions.includes(opt.id);
                            return (
                              <div
                                key={opt.id}
                                className={`p-3 rounded-2xl border transition-all space-y-2 ${
                                  isChecked
                                    ? 'bg-indigo-950/50 border-indigo-400 ring-2 ring-indigo-500/70 shadow-md'
                                    : 'bg-slate-800/60 border-slate-700/60'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setCorrectMultiOptions((prev) => Array.from(new Set([...prev, opt.id])));
                                        } else {
                                          setCorrectMultiOptions((prev) => prev.filter((id) => id !== opt.id));
                                        }
                                      }}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-600 cursor-pointer"
                                    />
                                    <span
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        isChecked
                                          ? 'bg-indigo-600 text-white shadow'
                                          : 'bg-slate-700 text-slate-200'
                                      }`}
                                    >
                                      {opt.id}
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => {
                                      const newOpts = [...options];
                                      newOpts[idx].text = e.target.value;
                                      setOptions(newOpts);
                                    }}
                                    placeholder={`Teks pilihan jawaban ${opt.id}...`}
                                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                  {isChecked && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-sm shrink-0">
                                      <Check className="w-3 h-3 stroke-[3]" /> Kunci Terpilih
                                    </span>
                                  )}
                                </div>

                                {/* Media Input for Multi Option (Compact) */}
                                <div className="pl-8 pt-1">
                                  <MediaInputWidget
                                    compact={true}
                                    image={opt.image}
                                    audio={opt.audio}
                                    onImageChange={(img) => {
                                      const newOpts = [...options];
                                      newOpts[idx].image = img;
                                      setOptions(newOpts);
                                    }}
                                    onAudioChange={(aud) => {
                                      const newOpts = [...options];
                                      newOpts[idx].audio = aud;
                                      setOptions(newOpts);
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. Complex Multiple Choice */}
                    {type === 'complex_multiple_choice' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200">
                            Pernyataan Benar / Salah:
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setComplexStatements((prev) => [
                                ...prev,
                                { id: `stmt${prev.length + 1}`, text: '', correctAnswer: true },
                              ])
                            }
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                          >
                            + Tambah Baris Pernyataan
                          </button>
                        </div>

                        <div className="space-y-2">
                          {complexStatements.map((stmt, idx) => (
                            <div
                              key={stmt.id}
                              className="flex items-center gap-3 p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl"
                            >
                              <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                              <input
                                type="text"
                                value={stmt.text}
                                onChange={(e) => {
                                  const newStmts = [...complexStatements];
                                  newStmts[idx].text = e.target.value;
                                  setComplexStatements(newStmts);
                                }}
                                placeholder={`Tulis pernyataan ke-${idx + 1}...`}
                                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newStmts = [...complexStatements];
                                    newStmts[idx].correctAnswer = true;
                                    setComplexStatements(newStmts);
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 ${
                                    stmt.correctAnswer
                                      ? 'bg-emerald-600 text-white shadow ring-1 ring-emerald-400 font-extrabold'
                                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                  }`}
                                >
                                  {stmt.correctAnswer && <Check className="w-3 h-3 stroke-[3]" />}
                                  BENAR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newStmts = [...complexStatements];
                                    newStmts[idx].correctAnswer = false;
                                    setComplexStatements(newStmts);
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 ${
                                    !stmt.correctAnswer
                                      ? 'bg-rose-600 text-white shadow ring-1 ring-rose-400 font-extrabold'
                                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                  }`}
                                >
                                  {!stmt.correctAnswer && <Check className="w-3 h-3 stroke-[3]" />}
                                  SALAH
                                </button>
                                {complexStatements.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setComplexStatements((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="p-1 text-slate-500 hover:text-rose-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Short Numeric Answer */}
                    {type === 'short_numeric' && (
                      <div className="space-y-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-200">
                            Kunci Jawaban Isian Singkat (Angka / Kata Pasti / Formula):
                          </label>
                          <input
                            id="form-input-numeric-answer"
                            type="text"
                            value={numericAnswer}
                            onChange={(e) => setNumericAnswer(e.target.value)}
                            placeholder="Contoh: 25 atau Fotosintesis atau 1.5 x 10^5..."
                            className="w-full sm:w-96 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="pt-3 border-t border-slate-700/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-emerald-300">
                              Batasan Minimal Kata (Opsional untuk Isian Singkat):
                            </label>
                            <span className="text-[11px] font-semibold text-emerald-400">
                              {minWordCount > 0 ? `Target: Min. ${minWordCount} kata` : 'Bebas (Tanpa Batas Kata)'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <select
                              id="form-input-min-word-count-select"
                              value={[0, 5, 10, 15, 20, 30].includes(minWordCount) ? minWordCount : 'custom'}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setMinWordCount(10);
                                } else {
                                  setMinWordCount(Number(e.target.value));
                                }
                              }}
                              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            >
                              <option value={0}>0 Kata (Bebas / Tanpa Batasan Kata)</option>
                              <option value={5}>Minimal 5 Kata</option>
                              <option value={10}>Minimal 10 Kata</option>
                              <option value={15}>Minimal 15 Kata</option>
                              <option value={20}>Minimal 20 Kata</option>
                              <option value={30}>Minimal 30 Kata</option>
                              <option value="custom">Kustom Jumlah Kata...</option>
                            </select>

                            {(![0, 5, 10, 15, 20, 30].includes(minWordCount) || minWordCount > 0) && (
                              <div className="flex items-center gap-1.5">
                                <input
                                  id="form-input-min-word-count-number"
                                  type="number"
                                  min={0}
                                  max={200}
                                  value={minWordCount}
                                  onChange={(e) => setMinWordCount(Math.max(0, parseInt(e.target.value) || 0))}
                                  placeholder="0"
                                  className="w-20 px-2.5 py-1.5 bg-slate-900 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-xs text-slate-400 font-medium">kata</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. Long Essay Answer */}
                    {type === 'long_essay' && (
                      <div className="space-y-4 p-4 rounded-xl bg-slate-800/60 border border-emerald-500/40">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-emerald-300">
                              Kunci Jawaban / Model Jawaban Uraian Komprehensif Guru:
                            </label>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {numericAnswer.trim() ? `${numericAnswer.trim().split(/\s+/).filter(Boolean).length} kata model` : 'Belum diisi'}
                            </span>
                          </div>
                          <textarea
                            id="form-input-essay-answer"
                            rows={5}
                            value={numericAnswer}
                            onChange={(e) => setNumericAnswer(e.target.value)}
                            placeholder="Tuliskan model jawaban esai lengkap, argumen mendalam, atau rubrik penilaian komprehensif yang diharapkan dari siswa..."
                            className="w-full px-3.5 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                          />
                        </div>

                        <div className="pt-3 border-t border-slate-700/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-emerald-300">
                              Target Batasan Minimal Kata Esai yang Wajib Dicapai Siswa:
                            </label>
                            <span className="text-[11px] font-semibold text-emerald-400">
                              {minWordCount > 0 ? `Target: Min. ${minWordCount} kata` : 'Bebas (Tanpa Batas Kata)'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <select
                              id="form-input-min-word-count-essay-select"
                              value={[0, 20, 30, 50, 75, 100, 150, 200, 300].includes(minWordCount) ? minWordCount : 'custom'}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setMinWordCount(50);
                                } else {
                                  setMinWordCount(Number(e.target.value));
                                }
                              }}
                              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            >
                              <option value={0}>0 Kata (Bebas / Tanpa Batasan Kata)</option>
                              <option value={20}>Minimal 20 Kata</option>
                              <option value={30}>Minimal 30 Kata</option>
                              <option value={50}>Minimal 50 Kata (Standar Esai)</option>
                              <option value={75}>Minimal 75 Kata</option>
                              <option value={100}>Minimal 100 Kata (Uraian Mendalam)</option>
                              <option value={150}>Minimal 150 Kata</option>
                              <option value={200}>Minimal 200 Kata</option>
                              <option value={300}>Minimal 300 Kata</option>
                              <option value="custom">Kustom Jumlah Kata...</option>
                            </select>

                            {(![0, 20, 30, 50, 75, 100, 150, 200, 300].includes(minWordCount) || minWordCount > 0) && (
                              <div className="flex items-center gap-1.5">
                                <input
                                  id="form-input-min-word-count-essay-number"
                                  type="number"
                                  min={0}
                                  max={1000}
                                  value={minWordCount}
                                  onChange={(e) => setMinWordCount(Math.max(0, parseInt(e.target.value) || 0))}
                                  placeholder="0"
                                  className="w-20 px-2.5 py-1.5 bg-slate-900 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-xs text-slate-400 font-medium">kata</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Saat ujian CBT berlangsung, siswa akan dipandu dengan live word counter dan visualisasi capaian target kata esai panjang ini.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Sub-modul Pembahasan & Solusi */}
                    <div className="pt-5 border-t border-slate-800 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs sm:text-sm font-bold text-white">Pembahasan & Solusi Jawaban</h4>
                        </div>

                        <button
                          id="btn-ai-autocomplete-explanation"
                          type="button"
                          onClick={handleAiAutoCompleteExplanation}
                          disabled={isGeneratingAiExplanation}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{isGeneratingAiExplanation ? 'Membuat Pembahasan AI...' : '⚡ AI Buatkan Pembahasan'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3.5">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Ringkasan Pembahasan (Summary)
                          </label>
                          <textarea
                            id="form-input-explanation-summary"
                            rows={2}
                            value={explanationSummary}
                            onChange={(e) => setExplanationSummary(e.target.value)}
                            placeholder="Ringkasan inti kunci jawaban..."
                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-slate-300">
                              Langkah Penyelesaian (Step-by-Step)
                            </label>
                            <button
                              type="button"
                              onClick={() => setExplanationSteps((prev) => [...prev, ''])}
                              className="text-[11px] text-indigo-400 hover:underline"
                            >
                              + Tambah Langkah
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {explanationSteps.map((step, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400 w-4 font-mono">{idx + 1}.</span>
                                <input
                                  type="text"
                                  value={step}
                                  onChange={(e) => {
                                    const newSteps = [...explanationSteps];
                                    newSteps[idx] = e.target.value;
                                    setExplanationSteps(newSteps);
                                  }}
                                  placeholder={`Langkah ${idx + 1}...`}
                                  className="flex-1 px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {explanationSteps.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setExplanationSteps((prev) => prev.filter((_, i) => i !== idx))}
                                    className="text-slate-500 hover:text-rose-400 text-xs"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Konsep Materi Pokok
                            </label>
                            <input
                              id="form-input-explanation-concept"
                              type="text"
                              value={explanationConcept}
                              onChange={(e) => setExplanationConcept(e.target.value)}
                              placeholder="Contoh: Hukum II Newton & Persamaan Bernoulli"
                              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                              <span>Trik Kilat / Rumus Cepat (The King Method)</span>
                            </label>
                            <input
                              id="form-input-explanation-fasttrick"
                              type="text"
                              value={explanationFastTrick}
                              onChange={(e) => setExplanationFastTrick(e.target.value)}
                              placeholder="Cara kilat menjawab soal ini dalam < 30 detik..."
                              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Action Buttons */}
            <div className="space-y-4">
              {/* Action Buttons Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md sticky top-6">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white">Aksi Simpan Soal</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pastikan Bagian 1 s.d. 4 telah diisi dengan benar sebelum menyimpan
                  </p>
                </div>

                <button
                  id="btn-save-question-only"
                  type="button"
                  onClick={() => handleSaveQuestion(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingQuestionId ? 'Perbarui Soal Ini' : 'Simpan ke Bank Soal'}</span>
                </button>

                <button
                  id="btn-save-and-create-another"
                  type="button"
                  onClick={() => handleSaveQuestion(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-900/30 transition-all active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Simpan & Buat Soal Lainnya</span>
                </button>

                <button
                  id="btn-reset-form"
                  type="button"
                  onClick={() => handleResetForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-xs font-semibold border border-slate-700 hover:border-amber-500/40 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Bersihkan Formulir (Reset)</span>
                </button>

                {editingQuestionId && (
                  <button
                    id="btn-ai-update-current-form-q"
                    type="button"
                    onClick={() => {
                      const currentQ = questionsList.find((q) => q.id === editingQuestionId);
                      if (currentQ) handleCheckQuestionUpdate(currentQ);
                    }}
                    disabled={isAiCheckingUpdate}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-950/80 via-purple-950/80 to-slate-900 hover:from-fuchsia-900 hover:to-indigo-900 text-fuchsia-300 text-xs font-semibold border border-fuchsia-500/30 transition-all cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isAiCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>Periksa Pembaruan via AI</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DAFTAR BANK SOAL TERSIMPAN */}
        {activeTab === 'bank_list' && (
          <div className="space-y-5">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    placeholder="Cari teks soal, topik, materi..."
                    className="w-full pl-10 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={bankSubjectFilter}
                  onChange={(e) => setBankSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">Semua Mapel</option>
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={bankGradeFilter}
                  onChange={(e) => setBankGradeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">Semua Kelas</option>
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                  <option value="12">Kelas 12</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                <button
                  id="btn-create-pkg-from-selected"
                  onClick={handleOpenPackageModal}
                  disabled={selectedQuestionIds.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Layers className="w-4 h-4" />
                  <span>Jadikan Paket Ujian ({selectedQuestionIds.length})</span>
                </button>

                <button
                  id="btn-export-bank-json"
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                  title="Export Bank Soal ke JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <button
                  id="btn-open-import-modal"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                  title="Import Bank Soal dari JSON"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import</span>
                </button>
              </div>
            </div>

            {/* Questions Table / List */}
            {filteredBankQuestions.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 space-y-3">
                <FileQuestion className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-300">Belum ada butir soal yang sesuai filter</h3>
                <button
                  onClick={() => setActiveTab('input_form')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  + Tambah Soal Baru
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Select All Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        filteredBankQuestions.length > 0 &&
                        filteredBankQuestions.every((q) => selectedQuestionIds.includes(q.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allIds = filteredBankQuestions.map((q) => q.id);
                          setSelectedQuestionIds(Array.from(new Set([...selectedQuestionIds, ...allIds])));
                        } else {
                          const filteredIds = filteredBankQuestions.map((q) => q.id);
                          setSelectedQuestionIds(selectedQuestionIds.filter((id) => !filteredIds.includes(id)));
                        }
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                    />
                    <span className="font-semibold">Pilih Semua ({filteredBankQuestions.length} Soal)</span>
                  </label>
                  <span className="text-slate-400">
                    {selectedQuestionIds.length} butir soal dipilih
                  </span>
                </div>

                {filteredBankQuestions.map((q, idx) => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  const isExpanded = expandedQuestionId === q.id;

                  return (
                    <div
                      key={q.id}
                      id={`bank-q-card-${q.id}`}
                      className={`bg-slate-900/90 border rounded-2xl transition-all ${
                        isSelected ? 'border-indigo-500/60 bg-indigo-950/20' : 'border-slate-800'
                      }`}
                    >
                      <div className="p-4 flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedQuestionIds((prev) => prev.filter((id) => id !== q.id));
                            } else {
                              setSelectedQuestionIds((prev) => [...prev, q.id]);
                            }
                          }}
                          className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
                        />

                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {q.subject || 'Mapel SMA'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">
                              Kelas {q.grade || '11'} • {q.major || 'MIPA'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400">
                              {q.chapter || q.topic || 'Topik Umum'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                q.difficulty === 'HOTS'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : q.difficulty === 'Sulit'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {q.difficulty}
                            </span>
                            <span className="text-[11px] text-indigo-300 font-medium px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30">
                              {q.type === 'multiple_choice' ? 'Pilihan Ganda' : q.type === 'multi_select_choice' ? 'PG Jawaban Banyak' : q.type === 'complex_multiple_choice' ? 'PG Kompleks' : q.type === 'short_numeric' ? 'Isian Singkat' : q.type === 'long_essay' ? 'Isian Panjang' : 'Sebab-Akibat'}
                            </span>
                            {(q.type === 'short_numeric' || q.type === 'long_essay') && (q.minWordCount || 0) > 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                                Min. {q.minWordCount} kata
                              </span>
                            )}
                          </div>

                          {q.stimulus && (
                            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 line-clamp-2 break-words">
                              <strong>Wacana:</strong> {q.stimulus}
                            </div>
                          )}

                          <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed break-words">
                            {q.questionText}
                          </p>

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <span className="text-xs text-slate-400 break-all">
                              Kunci Jawaban:{' '}
                              <strong className="text-emerald-400 font-bold break-all">
                                {typeof q.correctAnswer === 'object'
                                  ? JSON.stringify(q.correctAnswer)
                                  : String(q.correctAnswer)}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            id={`btn-ai-update-q-${q.id}`}
                            onClick={() => handleCheckQuestionUpdate(q)}
                            disabled={isAiCheckingUpdate && checkingQuestionId === q.id}
                            className="px-2 py-1 rounded-lg text-fuchsia-400 hover:text-fuchsia-200 hover:bg-fuchsia-950/60 border border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-all flex items-center gap-1 text-xs cursor-pointer"
                            title="Periksa & Perbarui Soal dengan AI (Bertanya Terlebih Dahulu)"
                          >
                            <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${checkingQuestionId === q.id ? 'animate-spin' : ''}`} />
                            <span className="hidden md:inline text-[11px] font-medium">Perbarui via AI</span>
                          </button>

                          <button
                            id={`btn-toggle-expand-${q.id}`}
                            onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Tinjau Pembahasan Lengkap"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          <button
                            id={`btn-edit-q-${q.id}`}
                            onClick={() => loadQuestionIntoForm(q)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                            title="Edit Butir Soal Ini"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            id={`btn-delete-q-${q.id}`}
                            onClick={() => {
                              if (confirm('Yakin ingin menghapus butir soal ini dari bank soal?')) {
                                onDeleteQuestion(q.id);
                                showNotification('🗑️ Soal berhasil dihapus dari Bank Soal.', 'warning');
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Hapus Soal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details & Explanation */}
                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-slate-800/80 mt-2 space-y-3 bg-slate-950/40 rounded-b-2xl">
                          {q.options && (
                            <div className="space-y-1.5 pt-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Pilihan Jawaban:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options.map((opt) => {
                                  let isCorrect = false;
                                  if (Array.isArray(q.correctAnswer)) {
                                    isCorrect = q.correctAnswer.includes(opt.id);
                                  } else {
                                    isCorrect = q.correctAnswer === opt.id;
                                  }
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`p-2 rounded-lg text-xs border ${
                                        isCorrect
                                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                                          : 'bg-slate-900 border-slate-800 text-slate-300'
                                      }`}
                                    >
                                      <strong className="mr-1.5">{opt.label}.</strong> {opt.text}
                                      {isCorrect && (
                                        <span className="ml-1 text-[10px] text-emerald-400 font-bold">✓ Kunci</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {q.explanation && (
                            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Pembahasan Resmi:</span>
                              </div>
                              <p className="text-slate-300">{q.explanation.summary}</p>
                              {q.explanation.steps && q.explanation.steps.length > 0 && (
                                <div className="space-y-1 pl-2 border-l border-slate-700">
                                  {q.explanation.steps.map((st, sIdx) => (
                                    <p key={sIdx} className="text-slate-400 text-[11px]">
                                      {st}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {q.explanation.fastTrick && (
                                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                                  <strong>⚡ Trik Cepat:</strong> {q.explanation.fastTrick}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI SOAL GENERATOR */}
        {activeTab === 'ai_generator' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>AI Instant Question Generator</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Multi-AI Engine
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Otomatisasi pembuatan butir soal SMA standar HOTS dan Kurikulum Merdeka dengan Google Gemini & DeepSeek AI.
                    </p>
                  </div>
                </div>

                {/* AI Engine Provider Selector */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto">
                  <button
                    type="button"
                    id="btn-select-engine-gemini"
                    onClick={() => setAiEngine('gemini')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      aiEngine === 'gemini'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Gemini 3.7</span>
                  </button>

                  <button
                    type="button"
                    id="btn-select-engine-deepseek-v3"
                    onClick={() => setAiEngine('deepseek_v3')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      aiEngine === 'deepseek_v3'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 text-cyan-300" />
                    <span>DeepSeek V3</span>
                  </button>

                  <button
                    type="button"
                    id="btn-select-engine-deepseek-r1"
                    onClick={() => setAiEngine('deepseek_r1')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      aiEngine === 'deepseek_r1'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm shadow-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5 text-pink-300" />
                    <span>DeepSeek R1</span>
                  </button>
                </div>
              </div>

              {/* Generator Settings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
                {/* 1. Mata Pelajaran SMA */}
                <div className="sm:col-span-2 md:col-span-2 lg:col-span-2 xl:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mata Pelajaran SMA
                  </label>
                  <select
                    id="ai-gen-select-subject"
                    value={aiGenSubject}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAiGenSubject(val);
                      const found = SUBJECTS.find((s) => s.name === val);
                      if (found) setAiGenMajor(found.major as SmaMajor);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.major})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Tingkat Kelas */}
                <div className="sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tingkat Kelas
                  </label>
                  <select
                    id="ai-gen-select-grade"
                    value={aiGenGrade}
                    onChange={(e) => setAiGenGrade(e.target.value as SmaGrade)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="10">Kelas 10 SMA</option>
                    <option value="11">Kelas 11 SMA</option>
                    <option value="12">Kelas 12 SMA</option>
                  </select>
                </div>

                {/* 3. Bentuk Soal (Kriteria: Droplist) */}
                <div className={(aiGenQuestionFormat === 'short_numeric' || aiGenQuestionFormat === 'long_essay') ? 'sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1' : 'sm:col-span-2 md:col-span-2 lg:col-span-2 xl:col-span-2'}>
                  <label className="block text-xs font-semibold text-cyan-300 mb-1.5 flex items-center justify-between">
                    <span>Bentuk Soal</span>
                    <span className="text-[10px] text-cyan-400 font-normal">Tipe Soal</span>
                  </label>
                  <select
                    id="ai-gen-select-format"
                    value={aiGenQuestionFormat}
                    onChange={(e) => {
                      const val = e.target.value as QuestionFormat;
                      setAiGenQuestionFormat(val);
                      if (val === 'long_essay' && aiGenMinWordCount === 0) {
                        setAiGenMinWordCount(50);
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-cyan-500/50 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                  >
                    <option value="multiple_choice">Pilihan Ganda (1 Jawaban Benar)</option>
                    <option value="multi_select_choice">Pilihan Ganda Banyak Jawaban</option>
                    <option value="complex_multiple_choice">Pilihan Ganda Kompleks (Salah Benar)</option>
                    <option value="short_numeric">Isian Singkat (Jawaban Pasti)</option>
                    <option value="long_essay">Isian Panjang (Esai Komprehensif)</option>
                    <option value="cause_reason">Sebab Akibat</option>
                  </select>
                </div>

                {/* Kolom Khusus: Batasan Minimal Kata (Hanya Muncul saat Isian Singkat atau Isian Panjang dipilih) */}
                {(aiGenQuestionFormat === 'short_numeric' || aiGenQuestionFormat === 'long_essay') && (
                  <div className="sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1 animate-in fade-in zoom-in-95 duration-200">
                    <label className="block text-xs font-semibold text-emerald-300 mb-1.5 flex items-center justify-between">
                      <span>{aiGenQuestionFormat === 'long_essay' ? 'Min. Kata Esai' : 'Batasan Min. Kata'}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {aiGenMinWordCount > 0 ? `${aiGenMinWordCount} kata` : 'Bebas'}
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        id="ai-gen-select-min-word-count"
                        value={[0, 5, 10, 15, 20, 30, 50, 75, 100, 150].includes(aiGenMinWordCount) ? aiGenMinWordCount : 'custom'}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setAiGenMinWordCount(aiGenQuestionFormat === 'long_essay' ? 50 : 20);
                          } else {
                            setAiGenMinWordCount(Number(e.target.value));
                          }
                        }}
                        className="w-full px-2.5 py-2.5 bg-slate-800 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                      >
                        <option value={0}>0 (Bebas / Tanpa Batas)</option>
                        {aiGenQuestionFormat === 'short_numeric' && <option value={5}>Min. 5 Kata</option>}
                        {aiGenQuestionFormat === 'short_numeric' && <option value={10}>Min. 10 Kata</option>}
                        <option value={15}>Min. 15 Kata</option>
                        <option value={20}>Min. 20 Kata</option>
                        <option value={30}>Min. 30 Kata</option>
                        <option value={50}>Min. 50 Kata (Esai Standar)</option>
                        <option value={75}>Min. 75 Kata</option>
                        <option value={100}>Min. 100 Kata (Esai Panjang)</option>
                        <option value={150}>Min. 150 Kata</option>
                        <option value="custom">Kustom...</option>
                      </select>
                      {(![0, 5, 10, 15, 20, 30, 50, 75, 100, 150].includes(aiGenMinWordCount) || aiGenMinWordCount > 0) && (
                        <input
                          id="ai-gen-input-custom-min-words"
                          type="number"
                          min={0}
                          max={500}
                          value={aiGenMinWordCount}
                          onChange={(e) => setAiGenMinWordCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 px-1.5 py-2.5 bg-slate-900 border border-emerald-500/60 rounded-xl text-xs text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          title="Jumlah minimal kata"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Media & Stimulus Soal (Kriteria: Droplist) */}
                <div className="sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1">
                  <label className="block text-xs font-semibold text-amber-300 mb-1.5 flex items-center justify-between">
                    <span>Media / Stimulus</span>
                    <span className="text-[10px] text-amber-400 font-normal">Format</span>
                  </label>
                  <select
                    id="ai-gen-select-media"
                    value={aiGenMediaType}
                    onChange={(e) => setAiGenMediaType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-amber-500/50 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    <option value="text_only">Cukup Teks Saja</option>
                    <option value="with_image">Ada Gambarnya</option>
                    <option value="with_audio">Ada Audio</option>
                    <option value="with_chart_curve">Kurva dan Grafik</option>
                  </select>
                </div>

                {/* 6. Tingkat Kesulitan */}
                <div className="sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tingkat Kesulitan
                  </label>
                  <select
                    id="ai-gen-select-difficulty"
                    value={aiGenDifficulty}
                    onChange={(e) => setAiGenDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Mudah">Mudah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Sulit">Sulit</option>
                    <option value="HOTS">HOTS (Standar SNBT/Olimpiade)</option>
                  </select>
                </div>

                {/* 7. Jumlah Butir Soal */}
                <div className="sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Jumlah Butir Soal
                  </label>
                  <select
                    id="ai-gen-select-count"
                    value={aiGenCount}
                    onChange={(e) => setAiGenCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1 Soal</option>
                    <option value={2}>2 Soal</option>
                    <option value={3}>3 Soal</option>
                    <option value={5}>5 Soal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bab / Pokok Bahasan Spesifik
                </label>
                <input
                  id="ai-gen-input-chapter"
                  type="text"
                  value={aiGenChapter}
                  onChange={(e) => setAiGenChapter(e.target.value)}
                  placeholder="Contoh: Termodinamika Mesin Kalor, Kesetimbangan Asam Basa, Transformasi Geometri, atau Teks Editorial"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Smart Update Detector Banner (Cek Pembaruan Sebelum Generate / Perbarui) */}
              {(() => {
                const targetSubject = (aiGenSubject || '').toLowerCase();
                const targetChapter = (aiGenChapter || '').trim().toLowerCase();
                const matchingTopicQuestions = questionsList.filter(
                  (q) =>
                    (q?.subject || '').toLowerCase() === targetSubject &&
                    (!targetChapter || (q?.chapter || q?.topic || '').toLowerCase().includes(targetChapter))
                );
                if (matchingTopicQuestions.length === 0) return null;
                return (
                  <div className="p-3.5 bg-gradient-to-r from-fuchsia-950/50 via-purple-950/40 to-slate-900 border border-fuchsia-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 shrink-0">
                        <RefreshCw className={`w-4 h-4 ${isAiCheckingUpdate ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white">
                            Pendeteksi Pembaruan Soal Bank Soal
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                            {matchingTopicQuestions.length} Butir Soal Terkait
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Topik ini telah memiliki butir soal di Bank Soal. AI Generator dapat memeriksa apakah terdapat rekomendasi pembaruan kurikulum/variasi sebelum Anda memutuskan memperbaruinya.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        id="btn-ai-check-topic-update"
                        onClick={handleCheckUpdatesForCurrentTopic}
                        disabled={isAiCheckingUpdate || isAiGenerating}
                        className="px-3.5 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isAiCheckingUpdate ? 'Menganalisis Soal...' : 'Periksa & Perbarui Soal Ada'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="text-slate-500">Mesin AI Aktif:</span>
                  <span className="font-semibold text-white">
                    {aiEngine === 'gemini' && 'Google Gemini 3.7'}
                    {aiEngine === 'deepseek_v3' && 'DeepSeek V3 (Chat/Struktur)'}
                    {aiEngine === 'deepseek_r1' && 'DeepSeek R1 (Deep Reasoner/HOTS)'}
                  </span>
                </div>

                <button
                  id="btn-trigger-ai-generate-sma"
                  onClick={handleGenerateQuestionsWithAi}
                  disabled={isAiGenerating}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                    aiEngine === 'deepseek_r1'
                      ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/40'
                      : aiEngine === 'deepseek_v3'
                      ? 'bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/40'
                      : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-indigo-900/40'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>
                    {isAiGenerating
                      ? `AI ${aiEngine.toUpperCase()} Merumuskan Soal...`
                      : `Generate ${aiGenCount} Butir Soal (${aiEngine === 'gemini' ? 'Gemini' : aiEngine === 'deepseek_v3' ? 'DeepSeek V3' : 'DeepSeek R1'})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Generated Results Area */}
            {aiGeneratedQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Hasil Pembuatan Soal AI ({aiGeneratedQuestions.length} Butir)</span>
                  </h3>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      id="btn-import-all-ai-questions"
                      onClick={handleImportAllAiQuestions}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 cursor-pointer transition-all active:scale-95"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Simpan Semua ke Bank Soal</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {aiGeneratedQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-indigo-300">
                            Butir #{idx + 1} • {q.subject} Kelas {q.grade} ({q.difficulty})
                          </span>
                          {q.aiEngine === 'deepseek_r1' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-pink-300 border border-purple-500/40 flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-pink-300" />
                              <span>DeepSeek R1</span>
                            </span>
                          ) : q.aiEngine === 'deepseek_v3' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                              <Bot className="w-3 h-3 text-cyan-300" />
                              <span>DeepSeek V3</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>Gemini AI</span>
                            </span>
                          )}
                          <span className="text-[10px] text-indigo-300 font-medium px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/40">
                            {q.type === 'multiple_choice' ? 'Pilihan Ganda' : q.type === 'multi_select_choice' ? 'PG Jawaban Banyak' : q.type === 'complex_multiple_choice' ? 'PG Kompleks' : q.type === 'short_numeric' ? 'Isian Singkat' : q.type === 'long_essay' ? 'Isian Panjang' : 'Sebab-Akibat'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCheckQuestionUpdate(q)}
                            disabled={isAiCheckingUpdate && checkingQuestionId === q.id}
                            className="px-2.5 py-1 bg-fuchsia-950/70 hover:bg-fuchsia-900 text-fuchsia-300 border border-fuchsia-500/30 text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm transition-all"
                            title="Tinjau & Perbarui Butir Soal Ini dengan AI"
                          >
                            <Sparkles className={`w-3 h-3 text-amber-300 ${checkingQuestionId === q.id ? 'animate-spin' : ''}`} />
                            <span>Perbarui via AI</span>
                          </button>
                          <button
                            onClick={() => loadQuestionIntoForm(q)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
                          >
                            Edit di Form
                          </button>
                          <button
                            onClick={() => handleImportAiQuestion(q)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm"
                          >
                            + Masukkan Bank Soal
                          </button>
                        </div>
                      </div>

                      {q.stimulus && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                          <strong className="text-indigo-300">Stimulus:</strong> {q.stimulus}
                        </div>
                      )}

                      <p className="text-xs sm:text-sm text-slate-100 font-semibold">{q.questionText}</p>

                      {q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-lg text-xs border ${
                                q.correctAnswer === opt.id
                                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 font-semibold'
                                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                              }`}
                            >
                              <strong>{opt.label}.</strong> {opt.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'short_numeric' && (
                        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Kunci Jawaban Isian Singkat:</span>
                            {q.minWordCount && q.minWordCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                Target: Min. {q.minWordCount} Kata
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Tanpa Batas Kata</span>
                            )}
                          </div>
                          <p className="text-emerald-400 font-mono font-bold">{String(q.correctAnswer || '-')}</p>
                        </div>
                      )}

                      {q.type === 'long_essay' && (
                        <div className="p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-xl text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-semibold">Model Jawaban / Rubrik Uraian Esai:</span>
                            {q.minWordCount && q.minWordCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                Target: Min. {q.minWordCount} Kata
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Tanpa Batas Kata</span>
                            )}
                          </div>
                          <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{String(q.correctAnswer || '-')}</p>
                        </div>
                      )}

                      {q.explanation && (
                        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1 text-slate-300">
                          <strong className="text-emerald-400">Pembahasan:</strong> {q.explanation.summary}
                          {q.explanation.fastTrick && (
                            <p className="text-amber-300 text-[11px] pt-1">
                              <strong>⚡ Trik:</strong> {q.explanation.fastTrick}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Create Exam Package */}
        {showPackageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Buat Paket Mapel Baru</h3>
                </div>
                <button
                  onClick={() => setShowPackageModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Judul Paket Ujian
                  </label>
                  <input
                    id="input-package-title"
                    type="text"
                    value={packageTitle}
                    onChange={(e) => setPackageTitle(e.target.value)}
                    placeholder="Contoh: Ulangan Harian Fisika Dinamika Gerak"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Durasi Ujian (Menit)
                    </label>
                    <input
                      id="input-package-duration"
                      type="number"
                      min={5}
                      max={180}
                      value={packageDuration}
                      onChange={(e) => setPackageDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Standar KKM (Skala 100)
                    </label>
                    <input
                      id="input-package-kkm"
                      type="number"
                      min={50}
                      max={100}
                      value={packageKkm}
                      onChange={(e) => setPackageKkm(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Deskripsi / Tagline Ujian
                  </label>
                  <textarea
                    id="input-package-tagline"
                    rows={2}
                    value={packageTagline}
                    onChange={(e) => setPackageTagline(e.target.value)}
                    placeholder="Keterangan materi yang diujikan..."
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
                  <span className="text-slate-400 block mb-1">Soal Terpilih:</span>
                  <strong>{selectedQuestionIds.length} Butir Soal</strong> siap dimasukkan ke dalam paket ujian ini.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowPackageModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  id="btn-confirm-save-package"
                  onClick={handleSaveExamPackage}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan & Terbitkan Paket</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Rich Multi-Format Import Soal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 xs:p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 overflow-hidden">
            <div className="relative w-full max-w-4xl max-h-[96dvh] sm:max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
              {/* Modal Header - Fixed/Sticky at top */}
              <div className="shrink-0 flex items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-lg font-extrabold text-white flex flex-wrap items-center gap-1.5 sm:gap-2 leading-tight">
                      <span>Import Soal ke Bank Soal</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Multi-Format
                      </span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                      Word/Notepad, teks, JSON, atau salin-tempel langsung
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="w-8 h-8 shrink-0 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Tutup dialog"
                  aria-label="Tutup"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-5 space-y-3.5 sm:space-y-4 text-slate-100">
                {/* Format Selection & Quick Templates */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setImportFormat('text');
                      }}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        importFormat === 'text'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Teks / Multi-Soal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setImportFormat('json');
                      }}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        importFormat === 'json'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 shrink-0" />
                      <span>Format JSON</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <label
                      htmlFor="file-upload-input"
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Pilih File (.txt/.json)</span>
                      <input
                        id="file-upload-input"
                        type="file"
                        accept=".txt,.json,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {importFormat === 'text' ? (
                      <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            handleRawTextChange(SAMPLE_TEXT_IMPORT, importDefaultFormat, importSeparatorMode, importCustomSeparator);
                            showNotification('Contoh teks PG & Esai dengan pemisah (---) berhasil dimuat!');
                          }}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] sm:text-xs font-bold transition-all cursor-pointer"
                          title="Muat teks contoh format standar campuran"
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Contoh Campuran</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setImportDefaultFormat('long_essay');
                            handleRawTextChange(SAMPLE_TEXT_ESSAY_IMPORT, 'long_essay', importSeparatorMode, importCustomSeparator);
                            showNotification('Contoh paket soal khusus Esai dengan pemisah (---) berhasil dimuat!');
                          }}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] sm:text-xs font-bold transition-all cursor-pointer"
                          title="Muat contoh soal khusus Isian Panjang / Esai dengan pemisah"
                        >
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Contoh Esai</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleRawTextChange(SAMPLE_JSON_IMPORT, importDefaultFormat, importSeparatorMode, importCustomSeparator);
                          showNotification('Contoh format JSON berhasil dimuat!');
                        }}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Muat Contoh JSON</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Presets Row: Target Subject, Grade, & Exam Type for parsed questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-slate-950/40 p-3 rounded-xl sm:rounded-2xl border border-slate-800/80">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Mapel Default
                    </label>
                    <select
                      value={importSubject}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImportSubject(val);
                        const found = SUBJECTS.find((s) => s.name === val);
                        if (found) setImportMajor(found.major as SmaMajor);
                        if (importRawText) handleRawTextChange(importRawText, importDefaultFormat, importSeparatorMode, importCustomSeparator);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Tingkat Kelas
                    </label>
                    <select
                      value={importGrade}
                      onChange={(e) => {
                        setImportGrade(e.target.value as SmaGrade);
                        if (importRawText) handleRawTextChange(importRawText, importDefaultFormat, importSeparatorMode, importCustomSeparator);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="10">Kelas 10</option>
                      <option value="11">Kelas 11</option>
                      <option value="12">Kelas 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Jenis Asesmen
                    </label>
                    <select
                      value={importExamType}
                      onChange={(e) => {
                        setImportExamType(e.target.value as SmaExamType);
                        if (importRawText) handleRawTextChange(importRawText, importDefaultFormat, importSeparatorMode, importCustomSeparator);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                    >
                      <option value="Ulangan Harian / Formatif">Ulangan Harian / Formatif</option>
                      <option value="Sumatif Tengah Semester (STS / PTS)">Sumatif Tengah Semester (STS / PTS)</option>
                      <option value="Sumatif Akhir Semester (SAS / PAS)">Sumatif Akhir Semester (SAS / PAS)</option>
                      <option value="Sumatif Akhir Tahun (SAT / PAT)">Sumatif Akhir Tahun (SAT / PAT)</option>
                      <option value="Simulasi Ujian Sekolah (US/USP)">Simulasi Ujian Sekolah (US/USP)</option>
                      <option value="Tryout UTBK SNBT">Tryout UTBK SNBT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Tingkat Kesulitan Default
                    </label>
                    <select
                      value={importDifficulty}
                      onChange={(e) => {
                        setImportDifficulty(e.target.value as DifficultyLevel);
                        if (importRawText) handleRawTextChange(importRawText, importDefaultFormat, importSeparatorMode, importCustomSeparator);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Mudah">Mudah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Sulit">Sulit</option>
                      <option value="HOTS">HOTS (Berpikir Kritis)</option>
                    </select>
                  </div>
                </div>

                {/* Separator Controls & Format Rules (Khusus Mode Teks) */}
                {importFormat === 'text' && (
                  <div className="p-3 sm:p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 rounded-xl sm:rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                      <div className="flex items-center gap-2">
                        <Split className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-white">
                          Pemisah Antar-Soal (Teks Satu Halaman):
                        </span>
                      </div>
                      <span className="text-[10.5px] sm:text-[11px] text-slate-400">
                        Memisahkan teks/esai panjang menjadi butir soal independen
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {/* Separator Mode */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Pola Pemisah (Delimiter)
                        </label>
                        <select
                          value={importSeparatorMode}
                          onChange={(e) => {
                            const nextMode = e.target.value as any;
                            setImportSeparatorMode(nextMode);
                            if (importRawText) handleRawTextChange(importRawText, importDefaultFormat, nextMode, importCustomSeparator);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                        >
                          <option value="auto">Otomatis (---, ===, [SOAL], dll)</option>
                          <option value="dash">Garis Pemisah (--- / === / ***)</option>
                          <option value="tag">Tag Pemisah ([SOAL] / ---SOAL---)</option>
                          <option value="custom">Kustom (Karakter Sendiri)</option>
                        </select>
                      </div>

                      {/* Custom separator or format default */}
                      {importSeparatorMode === 'custom' ? (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Karakter Pemisah Kustom
                          </label>
                          <input
                            type="text"
                            value={importCustomSeparator}
                            onChange={(e) => {
                              const val = e.target.value;
                              setImportCustomSeparator(val);
                              if (importRawText) handleRawTextChange(importRawText, importDefaultFormat, importSeparatorMode, val);
                            }}
                            placeholder="contoh: ### atau ---"
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Format Soal Default
                          </label>
                          <select
                            value={importDefaultFormat}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setImportDefaultFormat(val);
                              if (importRawText) handleRawTextChange(importRawText, val, importSeparatorMode, importCustomSeparator);
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                          >
                            <option value="auto">Otomatis (Deteksi / Tag BENTUK)</option>
                            <option value="long_essay">Khusus Isian Panjang (Esai)</option>
                            <option value="multiple_choice">Pilihan Ganda Biasa (A-E)</option>
                            <option value="short_numeric">Isian Singkat / Numerik</option>
                            <option value="complex_multiple_choice">Pilihan Ganda Kompleks</option>
                          </select>
                        </div>
                      )}

                      {/* Quick Insert Actions */}
                      <div className="sm:col-span-2 lg:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Sisipkan Cepat ke Kursor
                        </label>
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleInsertSeparator}
                            className="flex-1 min-w-[70px] flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10.5px] sm:text-[11px] font-bold transition-all cursor-pointer"
                            title="Sisipkan garis pembatas soal (---)"
                          >
                            <Minus className="w-3 h-3 shrink-0" />
                            <span className="truncate">Pemisah (---)</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleInsertEssayTemplate}
                            className="flex-1 min-w-[75px] flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-[10.5px] sm:text-[11px] font-bold transition-all cursor-pointer"
                            title="Sisipkan struktur template soal esai"
                          >
                            <BookOpen className="w-3 h-3 shrink-0" />
                            <span className="truncate">+ Format Esai</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleInsertPgTemplate}
                            className="flex-1 min-w-[70px] flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-[10.5px] sm:text-[11px] font-bold transition-all cursor-pointer"
                            title="Sisipkan struktur template soal pilihan ganda"
                          >
                            <PlusCircle className="w-3 h-3 shrink-0" />
                            <span className="truncate">+ Format PG</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Information callout banner */}
                    <div className="p-2.5 bg-slate-950/70 border border-indigo-500/20 rounded-xl flex items-start gap-2 text-[10.5px] sm:text-[11px] text-slate-300 leading-relaxed break-words">
                      <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">Panduan Pemisah Multi-Soal & Soal Esai:</strong> Gunakan garis pemisah{' '}
                        <code className="px-1 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono">---</code> atau{' '}
                        <code className="px-1 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono">===</code> atau tag{' '}
                        <code className="px-1 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">[SOAL]</code> di antara masing-masing butir soal. Pada soal esai, Anda dapat menyertakan{' '}
                        <span className="text-emerald-300 font-bold">MODEL JAWABAN:</span>,{' '}
                        <span className="text-amber-300 font-bold">TARGET KATA: 50</span>, dan{' '}
                        <span className="text-indigo-300 font-bold">PEMBAHASAN:</span> tanpa khawatir teks multi-barisnya terpotong atau salah dideteksi sebagai nomor baru.
                      </div>
                    </div>
                  </div>
                )}

                {/* Textarea for Paste / Editing */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <label className="font-bold text-slate-300 flex flex-wrap items-center gap-1.5 min-w-0">
                      <span>
                        {importFormat === 'text'
                          ? 'Salin-Tempel Teks Soal (Pemisah "---"):'
                          : 'Salin-Tempel Struktur JSON Soal:'}
                      </span>
                      {importFormat === 'text' && (
                        <span className="text-[10px] text-emerald-400 font-normal">
                          (Multi-baris & esai aman)
                        </span>
                      )}
                    </label>
                    {importRawText && (
                      <button
                        type="button"
                        onClick={() => handleRawTextChange('', importDefaultFormat, importSeparatorMode, importCustomSeparator)}
                        className="text-slate-400 hover:text-rose-400 transition-colors text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Bersihkan Teks
                      </button>
                    )}
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={6}
                    value={importRawText}
                    onChange={(e) => handleRawTextChange(e.target.value, importDefaultFormat, importSeparatorMode, importCustomSeparator)}
                    placeholder={
                      importFormat === 'text'
                        ? `Contoh format dengan garis pemisah (---):\n\n[SOAL]\nBENTUK: ISIAN PANJANG\nBAB: Dinamika Gerak\nTARGET KATA: 40\nPERTANYAAN: Jelaskan keterkaitan antara gaya impulsif, perubahan momentum, dan waktu kontak pada peristiwa tabrakan mobil!\nMODEL JAWABAN: Berdasarkan teorema impuls-momentum (I = F . dt = dp), gaya benturan berbanding terbalik dengan selang waktu kontak...\nPEMBAHASAN: Airbag memperpanjang durasi benturan sehingga meminimalkan gaya impulsif fatal.\n\n---\n\n[SOAL]\nBENTUK: PILIHAN GANDA\nPERTANYAAN: Satuan internasional (SI) untuk intensitas cahaya adalah...\nA. Candela\nB. Kelvin\nC. Ampere\nD. Mol\nE. Lumen\nKUNCI: A\nPEMBAHASAN: Satuan SI intensitas cahaya adalah Candela (Cd).`
                        : `[\n  {\n    "questionText": "Teks soal...",\n    "type": "long_essay",\n    "correctAnswer": "Model jawaban acuan...",\n    "explanation": { "summary": "..." }\n  }\n]`
                    }
                    className="w-full h-32 sm:h-44 min-h-[110px] max-h-[300px] px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 transition-all leading-relaxed resize-y"
                  />
                </div>

                {/* Live Preview Bar & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 shrink-0 rounded-full ${
                        importParsedPreview.length > 0
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-slate-600'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-200">
                      Status Parser:
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold ${
                        importParsedPreview.length > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {importParsedPreview.length > 0
                        ? `${importParsedPreview.length} Butir Soal Terpisah Rapi`
                        : 'Belum ada butir soal terdeteksi'}
                    </span>
                  </div>

                  {importParsedPreview.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400">
                      <span>
                        Mapel: <strong className="text-slate-200">{importSubject} • Kls {importGrade}</strong>
                      </span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span>
                        Jenis:{' '}
                        <strong className="text-emerald-300">
                          {importParsedPreview.filter((q) => q.type === 'long_essay').length > 0
                            ? `${importParsedPreview.filter((q) => q.type === 'long_essay').length} Esai`
                            : ''}
                          {importParsedPreview.filter((q) => q.type === 'long_essay').length > 0 &&
                          importParsedPreview.filter((q) => q.type !== 'long_essay').length > 0
                            ? ', '
                            : ''}
                          {importParsedPreview.filter((q) => q.type !== 'long_essay').length > 0
                            ? `${importParsedPreview.filter((q) => q.type !== 'long_essay').length} PG/Lainnya`
                            : ''}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Parsed Soal Preview Card List */}
                {importParsedPreview.length > 0 && (
                  <div className="space-y-2 max-h-52 sm:max-h-60 overflow-y-auto pr-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Pratinjau Hasil Pemisahan ({importParsedPreview.length} Butir Soal):
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                        Setiap blok dibatasi pemisah soal secara presisi
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {importParsedPreview.map((q, idx) => (
                        <React.Fragment key={idx}>
                          <div className="p-3 sm:p-3.5 bg-slate-950/90 border border-slate-800/90 rounded-xl sm:rounded-2xl space-y-2 text-xs text-slate-200 hover:border-slate-700 transition-colors break-words overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span className="font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                                  #{idx + 1}
                                </span>
                                <span className="font-semibold text-slate-300">
                                  {q.subject} • Kelas {q.grade} ({q.chapter || 'Materi Pokok'})
                                </span>
                                {q.type === 'long_essay' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                                    <BookOpen className="w-3 h-3 shrink-0" />
                                    <span>Isian Panjang (Esai)</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                                    Pilihan Ganda
                                  </span>
                                )}
                                {q.minWordCount && q.minWordCount > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                    Min. {q.minWordCount} Kata
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
                                  {q.difficulty}
                                </span>
                              </div>

                              <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] shrink-0">
                                {q.type === 'long_essay'
                                  ? 'Model Jawaban Esai'
                                  : `Kunci: ${String(q.correctAnswer)}`}
                              </span>
                            </div>

                            {/* Question Text */}
                            <div className="text-slate-200 font-medium leading-relaxed bg-slate-900/60 p-2 sm:p-2.5 rounded-xl border border-slate-800/60 break-words">
                              {q.questionText}
                            </div>

                            {/* Options if Multiple Choice */}
                            {q.options && q.options.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[11px] text-slate-400 pt-0.5">
                                {q.options.map((opt) => (
                                  <span
                                    key={opt.id}
                                    className={`px-2 py-1 rounded-lg break-words ${
                                      opt.id === q.correctAnswer
                                        ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-500/40 font-bold'
                                        : 'bg-slate-900/80 border border-slate-800 text-slate-300'
                                    }`}
                                  >
                                    {opt.label}. {opt.text.substring(0, 35)}{opt.text.length > 35 ? '...' : ''}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Model Answer preview if Essay */}
                            {q.type === 'long_essay' && q.correctAnswer && (
                              <div className="p-2.5 bg-emerald-950/30 rounded-xl border border-emerald-500/20 text-[11px] text-emerald-200 space-y-1 break-words">
                                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Model Jawaban / Rubrik Acuan Penilaian:</span>
                                </span>
                                <p className="line-clamp-2 text-slate-300 font-normal">
                                  {String(q.correctAnswer)}
                                </p>
                              </div>
                            )}

                            {/* Explanation preview */}
                            {q.explanation?.summary && (
                              <div className="text-[11px] text-slate-400 flex items-start gap-1.5 break-words">
                                <span className="text-indigo-400 font-bold shrink-0">Pembahasan:</span>
                                <span className="line-clamp-1 text-slate-300">{q.explanation.summary}</span>
                              </div>
                            )}
                          </div>

                          {/* Separator visual badge between preview cards */}
                          {idx < importParsedPreview.length - 1 && (
                            <div className="flex items-center gap-2 py-0.5 text-[10px] font-mono text-slate-500 justify-center">
                              <div className="h-px bg-slate-800/80 flex-1" />
                              <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1">
                                <Minus className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Pemisah Soal #{idx + 1} & #{idx + 2}</span>
                              </span>
                              <div className="h-px bg-slate-800/80 flex-1" />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions - Fixed/Sticky at bottom */}
              <div className="shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-3.5 py-3 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm z-10">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-center cursor-pointer min-h-[42px] flex items-center justify-center"
                >
                  Batal
                </button>

                <button
                  id="btn-confirm-import-questions"
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importParsedPreview.length === 0 && !importRawText.trim()}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-xl shadow-emerald-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[42px]"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {importParsedPreview.length > 0
                      ? `Impor ${importParsedPreview.length} Butir Soal ke Bank Soal`
                      : 'Proses & Impor Soal'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* AI QUESTION UPDATE PROPOSAL MODAL (Tanya Terlebih Dahulu Sebelum Update) */}
        {/* ========================================================================= */}
        {updateProposal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-fuchsia-500/40 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl shadow-fuchsia-950/50">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-indigo-500/20 rounded-2xl border border-fuchsia-500/30 text-fuchsia-400 shrink-0">
                    <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/40">
                        AI Generator • Konfirmasi Pembaruan
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ID: {updateProposal.originalQuestion.id}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Tinjau Rekomendasi Pembaruan Soal oleh AI
                    </h3>
                    <p className="text-xs text-slate-300">
                      AI telah menganalisis butir soal ini dan menemukan penyempurnaan pedagogik. Silakan tinjau perbandingan sebelum memutuskan untuk memperbarui.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDismissUpdate}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Batalkan & Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Badges metadata */}
              <div className="flex items-center gap-2 flex-wrap text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white">
                  {updateProposal.originalQuestion.subject} (Kelas {updateProposal.originalQuestion.grade} {updateProposal.originalQuestion.major})
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300">
                  Bab: <strong className="text-white">{updateProposal.originalQuestion.chapter || updateProposal.originalQuestion.topic || 'Umum'}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300">
                  Format: <span className="font-mono text-indigo-300">{updateProposal.updatedQuestion.type}</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                  Tingkat: {updateProposal.updatedQuestion.difficulty || 'Sedang'}
                </span>
              </div>

              {/* Changelog Highlights Box */}
              <div className="p-4 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-300" />
                  <span>Rincian Pembaruan yang Disiapkan AI:</span>
                </h4>
                <ul className="space-y-1.5 pl-2">
                  {updateProposal.changelog.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Comparison Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setUpdateDiffTab('comparison')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    updateDiffTab === 'comparison'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Perbandingan Sebelum vs Sesudah
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateDiffTab('updated_preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    updateDiffTab === 'updated_preview'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Pratinjau Hasil Akhir Pembaruan
                </button>
              </div>

              {/* Tab 1: Comparison */}
              {updateDiffTab === 'comparison' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Original Question */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        Soal Saat Ini (Asli)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Sebelum Pembaruan</span>
                    </div>

                    {updateProposal.originalQuestion.stimulus && (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                        <strong className="text-slate-300 block mb-1">Wacana/Stimulus:</strong>
                        {updateProposal.originalQuestion.stimulus}
                      </div>
                    )}

                    <div className="space-y-1">
                      <strong className="text-xs text-slate-300 block">Kalimat Pertanyaan:</strong>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {updateProposal.originalQuestion.questionText}
                      </p>
                    </div>

                    {updateProposal.originalQuestion.options && (
                      <div className="space-y-1 pt-1">
                        <strong className="text-[11px] text-slate-400 block">Pilihan Jawaban:</strong>
                        <div className="space-y-1">
                          {updateProposal.originalQuestion.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-1.5 rounded-lg text-xs flex items-center gap-2 ${
                                opt.id === updateProposal.originalQuestion.correctAnswer
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-900/60 text-slate-400'
                              }`}
                            >
                              <span className="font-bold">{opt.label}.</span>
                              <span className="truncate">{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {updateProposal.originalQuestion.explanation && (
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-400">
                        <strong className="text-slate-300 block mb-0.5">Ringkasan Pembahasan:</strong>
                        <p>{updateProposal.originalQuestion.explanation.summary}</p>
                      </div>
                    )}
                  </div>

                  {/* Right: AI Updated Question */}
                  <div className="p-4 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900 border border-fuchsia-500/40 rounded-2xl space-y-3 shadow-lg shadow-fuchsia-950/20">
                    <div className="flex items-center justify-between pb-2 border-fuchsia-500/30 border-b">
                      <span className="text-xs font-bold text-fuchsia-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Hasil Pembaruan AI
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        Disempurnakan
                      </span>
                    </div>

                    {updateProposal.updatedQuestion.stimulus && (
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-fuchsia-500/30 text-xs text-slate-200">
                        <strong className="text-fuchsia-300 block mb-1">Wacana/Stimulus Terkini:</strong>
                        {updateProposal.updatedQuestion.stimulus}
                      </div>
                    )}

                    <div className="space-y-1">
                      <strong className="text-xs text-indigo-300 block">Kalimat Pertanyaan Baru:</strong>
                      <p className="text-xs text-white font-medium leading-relaxed">
                        {updateProposal.updatedQuestion.questionText}
                      </p>
                    </div>

                    {updateProposal.updatedQuestion.options && (
                      <div className="space-y-1 pt-1">
                        <strong className="text-[11px] text-indigo-300 block">Pilihan Jawaban:</strong>
                        <div className="space-y-1">
                          {updateProposal.updatedQuestion.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-1.5 rounded-lg text-xs flex items-center gap-2 ${
                                opt.id === updateProposal.updatedQuestion.correctAnswer
                                  ? 'bg-emerald-950/80 text-emerald-200 font-semibold border border-emerald-500/50'
                                  : 'bg-slate-900 text-slate-300 border border-slate-800'
                              }`}
                            >
                              <span className="font-bold">{opt.label}.</span>
                              <span className="truncate">{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {updateProposal.updatedQuestion.explanation && (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-indigo-500/30 text-[11px] text-slate-300 space-y-1">
                        <strong className="text-emerald-300 block">Pembahasan Ilmiah:</strong>
                        <p>{updateProposal.updatedQuestion.explanation.summary}</p>
                        {updateProposal.updatedQuestion.explanation.fastTrick && (
                          <p className="text-amber-300 text-[10px] pt-1">
                            ⚡ <strong>Trik Cepat:</strong> {updateProposal.updatedQuestion.explanation.fastTrick}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Updated Preview */}
              {updateDiffTab === 'updated_preview' && (
                <div className="p-5 bg-slate-950 border border-fuchsia-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fuchsia-300">
                      Tampilan Penuh Butir Soal Setelah Pembaruan
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                      Kunci: {String(updateProposal.updatedQuestion.correctAnswer)}
                    </span>
                  </div>

                  {updateProposal.updatedQuestion.stimulus && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
                      <strong className="text-white block mb-1">Stimulus:</strong>
                      {updateProposal.updatedQuestion.stimulus}
                    </div>
                  )}

                  <p className="text-sm font-semibold text-white leading-relaxed">
                    {updateProposal.updatedQuestion.questionText}
                  </p>

                  {updateProposal.updatedQuestion.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {updateProposal.updatedQuestion.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                            opt.id === updateProposal.updatedQuestion.correctAnswer
                              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {opt.label}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {updateProposal.updatedQuestion.explanation && (
                    <div className="p-3.5 bg-slate-900/90 border border-indigo-500/30 rounded-xl space-y-2 text-xs">
                      <span className="text-indigo-300 font-bold block">Pembahasan Terpadu:</span>
                      <p className="text-slate-300">{updateProposal.updatedQuestion.explanation.summary}</p>
                      {updateProposal.updatedQuestion.explanation.steps && (
                        <ol className="list-decimal list-inside text-slate-400 space-y-0.5 text-[11px]">
                          {updateProposal.updatedQuestion.explanation.steps.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation Prompt Question Box */}
              <div className="p-4 bg-slate-950 border border-fuchsia-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">
                      Konfirmasi Tindakan Pembaruan
                    </h5>
                    <p className="text-[11px] text-slate-300">
                      Apakah Anda ingin menerapkan pembaruan ini langsung pada butir soal asli di Bank Soal, atau menyimpannya sebagai butir soal baru?
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    id="btn-confirm-apply-ai-update"
                    type="button"
                    onClick={handleApplyQuestionUpdate}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 cursor-pointer transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ya, Terapkan Pembaruan</span>
                  </button>

                  <button
                    id="btn-save-as-new-ai-question"
                    type="button"
                    onClick={handleSaveUpdatedAsNew}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-semibold border border-slate-700 hover:border-indigo-500/40 cursor-pointer transition-all active:scale-95"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Simpan Sebagai Soal Baru</span>
                  </button>

                  <button
                    id="btn-cancel-ai-update"
                    type="button"
                    onClick={handleDismissUpdate}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    Batalkan
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};
