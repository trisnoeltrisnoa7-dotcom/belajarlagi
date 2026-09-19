import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Type,
  HelpCircle,
  FileText,
  ListOrdered,
  LogOut,
  Send,
  Sparkles,
  User,
  GraduationCap,
  CheckSquare,
  Check,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  Sliders,
  Strikethrough,
  Edit3,
  Trash2,
  Lock,
  Layers,
  ArrowRight,
  FastForward,
  Play,
  School,
  MapPin,
  Wifi,
  WifiOff,
  Calendar,
} from 'lucide-react';
import { SchoolLogoBadge } from './SchoolLogoBadge';
import {
  ExamPackage,
  Question,
  UserAnswerRecord,
  StudentProfile,
  ProctoringLogEntry,
  ProctoringSummary,
  ExamDisplaySettings,
  DEFAULT_EXAM_DISPLAY_SETTINGS,
  ExamSubjectSessionSchedule,
  SchoolInfo,
  DEFAULT_SCHOOL_INFO,
} from '../types';
import { AudioPlayerBadge } from './AudioPlayerBadge';
import { updateSessionHeartbeat, terminateActiveExamSession, isGlobalLockingDisabled } from '../utils/sessionManager';
import { isGlobalTimeBypassActive } from '../utils/examScheduleTimer';
import { ALL_MOCK_QUESTIONS } from '../data/mockQuestions';
import {
  useOnlineStatus,
  saveActiveExamSession,
  loadActiveExamSession,
  clearActiveExamSession,
} from '../utils/offlineStorage';

interface CbtExamViewProps {
  pkg: ExamPackage;
  studentProfile?: StudentProfile;
  displaySettings?: ExamDisplaySettings;
  onFinishExam: (
    answers: Record<string, UserAnswerRecord>,
    startedAt: number,
    proctoringSummary?: ProctoringSummary
  ) => void;
  onQuitExam: () => void;
  schoolInfo?: SchoolInfo;
}

export const CbtExamView: React.FC<CbtExamViewProps> = ({
  pkg,
  studentProfile,
  displaySettings: initialDisplaySettings,
  onFinishExam,
  onQuitExam,
  schoolInfo,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswerRecord>>({});
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false);
  const [isConfirmQuitOpen, setIsConfirmQuitOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Exam Display & Visibility Settings (configured in Dashboard Bagian E)
  const displaySettings = initialDisplaySettings || (() => {
    try {
      const saved = localStorage.getItem('cbt_exam_display_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_EXAM_DISPLAY_SETTINGS;
  })();

  const isOnline = useOnlineStatus();
  const isFreeMode = isGlobalLockingDisabled() || isGlobalTimeBypassActive();

  // Student Tooling State
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, string[]>>({});
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [scratchpadText, setScratchpadText] = useState('');
  const [isAiHintOpen, setIsAiHintOpen] = useState(false);
  const [aiHintLoading, setAiHintLoading] = useState(false);
  const [aiHintText, setAiHintText] = useState('');

  // Auto trigger fullscreen if forceFullscreen is enabled
  useEffect(() => {
    if (displaySettings.forceFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [displaySettings.forceFullscreen]);

  // Proctoring & Activity Tracking State
  const [proctoringLogs, setProctoringLogs] = useState<ProctoringLogEntry[]>([]);

  // Periodic heartbeat update for single session lock
  useEffect(() => {
    if (studentProfile?.nis) {
      updateSessionHeartbeat(studentProfile.nis, studentProfile.nis);
      const hbInterval = setInterval(() => {
        updateSessionHeartbeat(studentProfile.nis, studentProfile.nis);
      }, 10000);
      return () => clearInterval(hbInterval);
    }
  }, [studentProfile?.nis]);

  const [warningToast, setWarningToast] = useState<{
    id: string;
    title: string;
    description: string;
    durationSeconds: number;
    type: 'exit' | 'split' | 'fullscreen';
  } | null>(null);

  const proctoringLogsRef = useRef<ProctoringLogEntry[]>([]);
  const outOfFocusStartRef = useRef<number | null>(null);
  const splitScreenStartRef = useRef<number | null>(null);
  const isSplitActiveRef = useRef<boolean>(false);
  const currentIndexRef = useRef<number>(currentIndex);

  // Keep currentIndexRef synchronized
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Helper to record a new proctoring violation entry
  const recordProctoringEvent = (
    type: 'tab_switch_or_blur' | 'split_or_resize' | 'fullscreen_exit',
    title: string,
    durationSeconds: number,
    details: string
  ) => {
    if (durationSeconds < 1) return;

    const formattedTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const newEntry: ProctoringLogEntry = {
      id: `proc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      formattedTime,
      type,
      title,
      durationSeconds,
      details,
      questionNumber: currentIndexRef.current + 1,
    };

    proctoringLogsRef.current = [...proctoringLogsRef.current, newEntry];
    setProctoringLogs([...proctoringLogsRef.current]);

    // Trigger on-screen warning toast to student
    setWarningToast({
      id: newEntry.id,
      title,
      description: details,
      durationSeconds,
      type: type === 'split_or_resize' ? 'split' : type === 'fullscreen_exit' ? 'fullscreen' : 'exit',
    });
  };

  // Auto dismiss warning toast after 6 seconds
  useEffect(() => {
    if (!warningToast) return;
    const timer = setTimeout(() => {
      setWarningToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [warningToast]);

  // Anti-Cheating & Activity Monitoring Listeners
  useEffect(() => {
    // 1. Tab Switching & Window Minimization (document.hidden)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!outOfFocusStartRef.current) {
          outOfFocusStartRef.current = Date.now();
        }
      } else {
        if (outOfFocusStartRef.current) {
          const durSec = Math.max(1, Math.round((Date.now() - outOfFocusStartRef.current) / 1000));
          recordProctoringEvent(
            'tab_switch_or_blur',
            'Meninggalkan Layar Ujian (Pindah Tab / Aplikasi)',
            durSec,
            `Beralih ke tab/aplikasi lain di luar browser ujian selama ${durSec} detik pada butir soal No. ${currentIndexRef.current + 1}.`
          );
          outOfFocusStartRef.current = null;
        }
      }
    };

    // 2. Window Blur & Focus
    const handleWindowBlur = () => {
      if (!outOfFocusStartRef.current) {
        outOfFocusStartRef.current = Date.now();
      }
    };

    const handleWindowFocus = () => {
      if (outOfFocusStartRef.current) {
        const durSec = Math.max(1, Math.round((Date.now() - outOfFocusStartRef.current) / 1000));
        // Ambang toleransi minimal 4 detik agar notifikasi browser/sistem (seperti banner fullscreen domain asia-east1) tidak memicu alarm palsu
        if (durSec >= 4) {
          recordProctoringEvent(
            'tab_switch_or_blur',
            'Fokus Jendela Ujian Terlepas (Keluar Aplikasi)',
            durSec,
            `Jendela ujian kehilangan fokus kursor/aplikasi selama ${durSec} detik pada butir soal No. ${currentIndexRef.current + 1}.`
          );
        }
        outOfFocusStartRef.current = null;
      }
    };

    // 3. Split Screen & Window Resizing Check
    const checkSplitScreen = () => {
      // Abaikan jika aplikasi berada di dalam iframe preview (seperti AI Studio)
      const isEmbeddedInIframe = window.self !== window.top;
      if (isEmbeddedInIframe) {
        return;
      }

      // Deteksi perangkat mobile / tablet sentuh
      const isMobileDevice =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (window.screen && (window.screen.width < 640 || window.screen.height < 640));

      let isNarrow = false;

      if (isMobileDevice) {
        // Pada HP/smartphone, lebar layar secara wajar 360-430px (bukan split screen!)
        // Mode split screen di Android (Multi-Window) membagi tinggi layar menjadi separuh
        const isInputActive =
          document.activeElement &&
          (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

        if (!isInputActive && window.screen && window.screen.availHeight > 400) {
          isNarrow = window.innerHeight < window.screen.availHeight * 0.45;
        }
      } else {
        // Pada desktop / laptop: split screen nyata jika jendela ditarik kurang dari 48% lebar layar
        const availW = window.screen?.availWidth || window.innerWidth;
        if (availW >= 960) {
          isNarrow = window.innerWidth < availW * 0.48;
        }
      }

      if (isNarrow) {
        if (!isSplitActiveRef.current) {
          isSplitActiveRef.current = true;
          splitScreenStartRef.current = Date.now();
        }
      } else {
        if (isSplitActiveRef.current && splitScreenStartRef.current) {
          const durSec = Math.max(1, Math.round((Date.now() - splitScreenStartRef.current) / 1000));
          // Hanya catat pelanggaran jika split screen bertahan minimal 5 detik terus-menerus
          if (durSec >= 5) {
            recordProctoringEvent(
              'split_or_resize',
              'Split Layar / Memperkecil Jendela Ujian',
              durSec,
              `Terdeteksi mode split layar atau memperkecil jendela (${window.innerWidth}x${window.innerHeight}px) selama ${durSec} detik pada butir soal No. ${currentIndexRef.current + 1}.`
            );
          }
          isSplitActiveRef.current = false;
          splitScreenStartRef.current = null;
        }
      }
    };

    // 4. Fullscreen state
    const handleFullscreenChange = () => {
      const isNowFs = !!document.fullscreenElement;
      setIsFullscreen(isNowFs);
      if (!isNowFs && isFullscreen) {
        recordProctoringEvent(
          'fullscreen_exit',
          'Keluar dari Mode Layar Penuh',
          1,
          `Keluar dari tampilan layar penuh pada butir soal No. ${currentIndexRef.current + 1}.`
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('resize', checkSplitScreen);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('resize', checkSplitScreen);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Compute final ProctoringSummary object
  const buildProctoringSummary = (): ProctoringSummary => {
    const logs = [...proctoringLogsRef.current];

    if (outOfFocusStartRef.current) {
      const dur = Math.max(1, Math.round((Date.now() - outOfFocusStartRef.current) / 1000));
      logs.push({
        id: `proc-end-${Date.now()}`,
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        type: 'tab_switch_or_blur',
        title: 'Meninggalkan Layar Ujian Saat Pengumpulan',
        durationSeconds: dur,
        details: `Berada di luar ujian selama ${dur} detik.`,
        questionNumber: currentIndexRef.current + 1,
      });
    }

    if (isSplitActiveRef.current && splitScreenStartRef.current) {
      const dur = Math.max(1, Math.round((Date.now() - splitScreenStartRef.current) / 1000));
      if (dur >= 5) {
        logs.push({
          id: `proc-split-end-${Date.now()}`,
          timestamp: Date.now(),
          formattedTime: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          type: 'split_or_resize',
          title: 'Split Layar Saat Pengumpulan',
          durationSeconds: dur,
          details: `Split layar selama ${dur} detik.`,
          questionNumber: currentIndexRef.current + 1,
        });
      }
    }

    const exitAppCount = logs.filter(
      l => l.type === 'tab_switch_or_blur' || l.type === 'fullscreen_exit'
    ).length;
    const splitResizeCount = logs.filter(l => l.type === 'split_or_resize').length;
    const totalOutOfExamDurationSeconds = logs.reduce((acc, l) => acc + l.durationSeconds, 0);

    const deduction = exitAppCount * 12 + splitResizeCount * 8 + Math.floor(totalOutOfExamDurationSeconds / 10) * 3;
    const integrityScore = Math.max(0, Math.min(100, 100 - deduction));

    let integrityStatus: 'Sangat Tertib / Bersih' | 'Peringatan Ringan' | 'Indikasi Pelanggaran' | 'Pelanggaran Berat' =
      'Sangat Tertib / Bersih';

    if (logs.length === 0) {
      integrityStatus = 'Sangat Tertib / Bersih';
    } else if (integrityScore >= 80) {
      integrityStatus = 'Peringatan Ringan';
    } else if (integrityScore >= 50) {
      integrityStatus = 'Indikasi Pelanggaran';
    } else {
      integrityStatus = 'Pelanggaran Berat';
    }

    return {
      totalViolations: logs.length,
      exitAppCount,
      splitResizeCount,
      totalOutOfExamDurationSeconds,
      integrityScore,
      integrityStatus,
      logs,
    };
  };

  // Time state (seconds) & Multi-Subject Sequential Session Logic
  const isMultiSubject = Boolean(
    pkg.isMultiSubjectSequential ||
    (pkg.sessionSchedules && pkg.sessionSchedules.length > 1) ||
    (pkg.subtests && pkg.subtests.length > 1 && pkg.isMultiSubjectSequential)
  );

  const sessions: ExamSubjectSessionSchedule[] = useMemo(() => {
    if (pkg.sessionSchedules && pkg.sessionSchedules.length > 0) {
      return pkg.sessionSchedules;
    }
    if (pkg.isMultiSubjectSequential && pkg.subtests && pkg.subtests.length > 1) {
      const subtestsCount = pkg.subtests.length || 1;
      return pkg.subtests.map((sub, idx) => ({
        sessionNumber: idx + 1,
        subtestId: sub.id,
        subjectName: sub.name,
        customTitle: `Jam Ke-${idx + 1}: ${sub.name}`,
        durationMinutes: sub.durationMinutes || Math.round((pkg.durationMinutes || 60) / subtestsCount),
        questionCount: sub.questionCount || Math.ceil((pkg.questions?.length || 10) / subtestsCount),
        category: sub.category,
        breakAfterMinutes: 1,
        allowEarlyFinish: true,
        isLockedAfterFinish: true,
      }));
    }
    return [];
  }, [pkg]);

  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [lockedSessionIndices, setLockedSessionIndices] = useState<number[]>([]);
  const [isSessionTransitionModalOpen, setIsSessionTransitionModalOpen] = useState(false);
  const [isConfirmEarlySessionFinishOpen, setIsConfirmEarlySessionFinishOpen] = useState(false);
  const [transitionCountdown, setTransitionCountdown] = useState(10);

  const questions: Question[] = (pkg?.questions && pkg.questions.length > 0) ? pkg.questions : ALL_MOCK_QUESTIONS;

  // Calculate question range per session
  const sessionQuestionRanges = useMemo(() => {
    if (!isMultiSubject || sessions.length === 0) return [];
    
    let currentStart = 0;
    return sessions.map((sess, idx) => {
      const matchingCount = questions.filter(
        q => q.subtestId === sess.subtestId || (q.subject && sess.subjectName.toLowerCase().includes(q.subject.toLowerCase()))
      ).length;
      
      const count = matchingCount > 0 ? matchingCount : sess.questionCount;
      const range = {
        sessionIndex: idx,
        sessionNumber: sess.sessionNumber,
        subjectName: sess.subjectName,
        customTitle: sess.customTitle || `Jam Ke-${sess.sessionNumber}: ${sess.subjectName}`,
        durationMinutes: sess.durationMinutes,
        startIndex: currentStart,
        endIndex: Math.min(questions.length - 1, currentStart + count - 1),
        count,
      };
      currentStart += count;
      return range;
    });
  }, [isMultiSubject, sessions, questions]);

  const currentQuestionSession = isMultiSubject
    ? sessionQuestionRanges.find(r => currentIndex >= r.startIndex && currentIndex <= r.endIndex) || null
    : null;

  const isCurrentQuestionLocked = !isFreeMode && isMultiSubject && pkg.strictSessionLocking !== false && currentQuestionSession
    ? lockedSessionIndices.includes(currentQuestionSession.sessionIndex)
    : false;

  const initialDuration = isMultiSubject && sessions[0]
    ? sessions[0].durationMinutes * 60
    : (pkg.durationMinutes || 30) * 60;

  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const startTimeRef = useRef<number>(Date.now());
  const questionStartTimeRef = useRef<number>(Date.now());

  const currentQuestion: Question = questions[currentIndex] || questions[0] || {
    id: 'placeholder',
    subtestId: 'tps',
    subtestName: 'Simulasi Ujian',
    category: 'TPS',
    type: 'multiple_choice',
    questionText: 'Memuat butir soal...',
    options: [{ id: 'A', label: 'A', text: 'Pilihan A' }],
    correctAnswer: 'A',
    explanation: {
      summary: 'Penjelasan umum',
      steps: ['Analisis soal'],
      concept: 'Konsep dasar',
    },
    difficulty: 'Sedang',
    irtWeight: 80,
    topic: 'Umum',
  };

  // Initialize or record answer visit
  useEffect(() => {
    setAnswers(prev => {
      const existing = prev[currentQuestion.id];
      return {
        ...prev,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          selectedOption: existing?.selectedOption,
          complexAnswers: existing?.complexAnswers || {},
          numericAnswer: existing?.numericAnswer || '',
          isDoubtful: existing?.isDoubtful || false,
          timeSpentSeconds: existing?.timeSpentSeconds || 0,
          visited: true,
          lastUpdated: Date.now(),
        },
      };
    });
    questionStartTimeRef.current = Date.now();
  }, [currentIndex, currentQuestion.id]);

  // When activeSessionIndex changes, reset session timer
  useEffect(() => {
    if (isMultiSubject && sessions[activeSessionIndex]) {
      setTimeLeft(sessions[activeSessionIndex].durationMinutes * 60);
    }
  }, [activeSessionIndex, isMultiSubject, sessions]);

  // Main countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isMultiSubject, activeSessionIndex, sessions.length]);

  const [hasRestoredSession, setHasRestoredSession] = useState(false);

  // Restore saved offline session if available on mount. IndexedDB is async so
  // hydration never blocks the exam UI thread.
  useEffect(() => {
    let cancelled = false;
    if (!hasRestoredSession) {
      loadActiveExamSession(pkg.id).then(savedSession => {
        if (cancelled) return;
        if (savedSession) {
        if (savedSession.answers && Object.keys(savedSession.answers).length > 0) {
          setAnswers(savedSession.answers);
        }
        if (typeof savedSession.currentIndex === 'number' && savedSession.currentIndex >= 0 && savedSession.currentIndex < questions.length) {
          setCurrentIndex(savedSession.currentIndex);
        }
        if (savedSession.eliminatedOptions) {
          setEliminatedOptions(savedSession.eliminatedOptions);
        }
        if (savedSession.scratchpadText) {
          setScratchpadText(savedSession.scratchpadText);
        }
        if (typeof savedSession.timeLeftSeconds === 'number' && savedSession.timeLeftSeconds > 0) {
          setTimeLeft(savedSession.timeLeftSeconds);
        }
        if (typeof savedSession.activeSessionIndex === 'number') {
          setActiveSessionIndex(savedSession.activeSessionIndex);
        }
        if (savedSession.lockedSessionIndices) {
          setLockedSessionIndices(savedSession.lockedSessionIndices);
        }
        }
        setHasRestoredSession(true);
      });
    }
    return () => { cancelled = true; };
  }, [pkg.id, questions.length, hasRestoredSession]);

  // Keep the latest exam state in refs. This prevents timer-driven React renders
  // from serializing the complete answer object on every second.
  const examStateRef = useRef({ currentIndex, answers, timeLeft, eliminatedOptions, scratchpadText, activeSessionIndex, lockedSessionIndices });
  useEffect(() => {
    examStateRef.current = { currentIndex, answers, timeLeft, eliminatedOptions, scratchpadText, activeSessionIndex, lockedSessionIndices };
  }, [currentIndex, answers, timeLeft, eliminatedOptions, scratchpadText, activeSessionIndex, lockedSessionIndices]);

  const persistExamState = () => {
    if (!hasRestoredSession) return;
    const state = examStateRef.current;
    void saveActiveExamSession({
      packageId: pkg.id,
      packageName: pkg.title,
      studentProfile,
      currentIndex: state.currentIndex,
      answers: state.answers,
      timeLeftSeconds: state.timeLeft,
      startTime: startTimeRef.current,
      lastSavedAt: Date.now(),
      eliminatedOptions: state.eliminatedOptions,
      scratchpadText: state.scratchpadText,
      activeSessionIndex: state.activeSessionIndex,
      lockedSessionIndices: state.lockedSessionIndices,
    });
  };

  // Throttled autosave: once every 5 seconds, independent of the 1-second timer.
  useEffect(() => {
    if (!hasRestoredSession) return;
    persistExamState();
    const interval = window.setInterval(persistExamState, 5000);
    const onPageHide = () => persistExamState();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [hasRestoredSession, pkg.id, pkg.title, studentProfile]);

  const handleTimeExpire = () => {
    if (isMultiSubject && activeSessionIndex < sessions.length - 1) {
      setLockedSessionIndices(prev => Array.from(new Set([...prev, activeSessionIndex])));
      setTransitionCountdown(pkg.breakBetweenSessionsMinutes ? pkg.breakBetweenSessionsMinutes * 60 : 10);
      setIsSessionTransitionModalOpen(true);
    } else {
      handleAutoSubmit();
    }
  };

  const handleAdvanceToNextSession = () => {
    if (!isMultiSubject || activeSessionIndex >= sessions.length - 1) return;
    recordCurrentQuestionTime();
    
    setLockedSessionIndices(prev => Array.from(new Set([...prev, activeSessionIndex])));
    
    const nextIdx = activeSessionIndex + 1;
    setActiveSessionIndex(nextIdx);
    setIsSessionTransitionModalOpen(false);
    setIsConfirmEarlySessionFinishOpen(false);

    const nextRange = sessionQuestionRanges[nextIdx];
    if (nextRange && nextRange.startIndex < questions.length) {
      setCurrentIndex(nextRange.startIndex);
    }
  };

  // Transition countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isSessionTransitionModalOpen && transitionCountdown > 0) {
      interval = setInterval(() => {
        setTransitionCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAdvanceToNextSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionTransitionModalOpen, transitionCountdown, activeSessionIndex]);

  // Update time spent on current question when leaving
  const recordCurrentQuestionTime = () => {
    const now = Date.now();
    const elapsed = Math.round((now - questionStartTimeRef.current) / 1000);
    setAnswers(prev => {
      const current = prev[currentQuestion.id];
      if (!current) return prev;
      return {
        ...prev,
        [currentQuestion.id]: {
          ...current,
          timeSpentSeconds: (current.timeSpentSeconds || 0) + elapsed,
        },
      };
    });
    questionStartTimeRef.current = now;
  };

  const handleSelectOption = (optionLabel: string) => {
    if (isCurrentQuestionLocked) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        questionId: currentQuestion.id,
        selectedOption: optionLabel,
        visited: true,
        lastUpdated: Date.now(),
      },
    }));
  };

  const handleToggleMultiOption = (optionLabel: string) => {
    if (isCurrentQuestionLocked) return;
    setAnswers(prev => {
      const currentSelected = prev[currentQuestion.id]?.selectedOptions || [];
      const exists = currentSelected.includes(optionLabel);
      const nextSelected = exists
        ? currentSelected.filter(id => id !== optionLabel)
        : [...currentSelected, optionLabel];

      return {
        ...prev,
        [currentQuestion.id]: {
          ...prev[currentQuestion.id],
          questionId: currentQuestion.id,
          selectedOptions: nextSelected,
          visited: true,
          lastUpdated: Date.now(),
        },
      };
    });
  };

  const handleNumericInput = (val: string) => {
    if (isCurrentQuestionLocked) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        questionId: currentQuestion.id,
        numericAnswer: val,
        visited: true,
        lastUpdated: Date.now(),
      },
    }));
  };

  const handleComplexToggle = (statementId: string, value: boolean) => {
    if (isCurrentQuestionLocked) return;
    setAnswers(prev => {
      const existingMap = prev[currentQuestion.id]?.complexAnswers || {};
      return {
        ...prev,
        [currentQuestion.id]: {
          ...prev[currentQuestion.id],
          questionId: currentQuestion.id,
          complexAnswers: {
            ...existingMap,
            [statementId]: value,
          },
          visited: true,
          lastUpdated: Date.now(),
        },
      };
    });
  };

  const handleToggleDoubtful = () => {
    if (isCurrentQuestionLocked) return;
    setAnswers(prev => {
      const existing = prev[currentQuestion.id];
      return {
        ...prev,
        [currentQuestion.id]: {
          ...existing,
          questionId: currentQuestion.id,
          isDoubtful: !existing?.isDoubtful,
          visited: true,
        },
      };
    });
  };

  const goToQuestion = (index: number) => {
    recordCurrentQuestionTime();
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  };

  const handleAutoSubmit = () => {
    recordCurrentQuestionTime();
    clearActiveExamSession();
    if (studentProfile?.nis) {
      terminateActiveExamSession(studentProfile.nis);
    }
    const proctoringSummary = buildProctoringSummary();
    onFinishExam(answers, startTimeRef.current, proctoringSummary);
  };

  const handleManualSubmit = () => {
    recordCurrentQuestionTime();
    clearActiveExamSession();
    if (studentProfile?.nis) {
      terminateActiveExamSession(studentProfile.nis);
    }
    const proctoringSummary = buildProctoringSummary();
    onFinishExam(answers, startTimeRef.current, proctoringSummary);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Format time remaining
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Counts of answered, doubtful, blank
  const { answeredCount, doubtfulCount, blankCount } = useMemo(() => {
    let answered = 0;
    let doubtful = 0;
    for (const q of questions) {
      const a = answers[q.id];
      if (a?.isDoubtful) doubtful++;
      if (!a) continue;
      if (a.selectedOption !== undefined ||
          (a.selectedOptions && a.selectedOptions.length > 0) ||
          (a.numericAnswer && a.numericAnswer.trim() !== '') ||
          (a.complexAnswers && Object.keys(a.complexAnswers).length === (q.complexStatements?.length || 0))) {
        answered++;
      }
    }
    return { answeredCount: answered, doubtfulCount: doubtful, blankCount: questions.length - answered };
  }, [questions, answers]);

  const currentRecord = answers[currentQuestion.id];
  const totalViolationsCount = proctoringLogs.length;
  const currentEliminated = eliminatedOptions[currentQuestion.id] || [];

  // Toggle option strike-through / elimination
  const handleToggleElimination = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEliminatedOptions(prev => {
      const list = prev[currentQuestion.id] || [];
      const exists = list.includes(optionId);
      const updated = exists ? list.filter(id => id !== optionId) : [...list, optionId];
      return {
        ...prev,
        [currentQuestion.id]: updated,
      };
    });
  };

  // Open AI Hint Handler
  const handleOpenAiHint = () => {
    setIsAiHintOpen(true);
    setAiHintLoading(true);
    setAiHintText('');
    setTimeout(() => {
      setAiHintText(
        currentQuestion.explanation?.concept ||
        `Petunjuk Konsep: Soal ini menguji pemahaman Anda mengenai "${currentQuestion.topic}". Cobalah telaah pola atau eliminasi kemungkinan yang kontradiktif terlebih dahulu.`
      );
      setAiHintLoading(false);
    }, 500);
  };

  return (
    <div className="h-screen max-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none relative overflow-hidden">
      {/* Real-time Proctoring Warning Toast (Only if displaySettings.showProctoringAlerts is true) */}
      {displaySettings.showProctoringAlerts && warningToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-full animate-bounce">
          <div className="p-4 rounded-2xl bg-rose-950/95 border-2 border-rose-500 shadow-2xl backdrop-blur-md text-white space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                    Peringatan Pengawas CBT
                  </h4>
                  <p className="font-bold text-sm text-white">{warningToast.title}</p>
                </div>
              </div>
              <button
                onClick={() => setWarningToast(null)}
                className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-rose-100/90 leading-relaxed pl-10">
              {warningToast.description}
            </p>
            <div className="pl-10 pt-1 flex items-center justify-between text-[11px] font-semibold text-rose-300">
              <span>Durasi: {warningToast.durationSeconds} Detik</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-900/80 border border-rose-600/50">
                Tercatat di Lembar Hasil
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Joki / Photo Watermark Overlay */}
      {displaySettings.showWatermark && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden opacity-[0.05] select-none rotate-[-22deg]">
          <div className="text-center space-y-4">
            <div className="text-3xl sm:text-5xl font-black font-mono tracking-widest text-white uppercase">
              {studentProfile?.fullName || 'SISWA CBT EDU'} • {studentProfile?.nis || 'NIS-VERIFIED'}
            </div>
            <div className="text-lg sm:text-2xl font-mono text-white">
              {studentProfile?.studentClass || 'KELAS 12'} • {pkg.title} • {new Date().toLocaleDateString('id-ID')}
            </div>
          </div>
        </div>
      )}

      {/* Top CBT Header (Clean, focused, standardized CBT exam bar) */}
      <header className="sticky top-0 z-30 min-h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5 shadow-md shrink-0 select-none">
        {/* Left Side: Kembali ke Daftar Ujian & Server Ujian Siap */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            type="button"
            id="btn-cbt-back-to-schedule"
            onClick={() => setIsConfirmQuitOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
            title="Kembali ke Daftar Ujian"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Kembali ke Daftar Ujian</span>
            <span className="sm:hidden">Daftar Ujian</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <CheckCircle2 className="w-3.5 h-3.5 hidden xs:inline" />
            <span>Server Ujian Siap</span>
          </span>
        </div>

        {/* Center: Identitas Siswa */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs shadow-inner max-w-full">
          <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
            <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-[200px]">
              {studentProfile?.fullName || 'Peserta Ujian'}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
            <span className="text-slate-500">NIS:</span>
            <span className="font-bold text-amber-300">{studentProfile?.nis || '-'}</span>
          </div>
          {studentProfile?.studentClass && (
            <>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <div className="hidden sm:flex items-center gap-1 text-slate-300">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{studentProfile.studentClass}</span>
              </div>
            </>
          )}
          {(studentProfile?.schoolName || schoolInfo?.schoolName || pkg.schoolName) && (
            <>
              <span className="text-slate-700 hidden md:inline">|</span>
              <div className="hidden md:flex items-center gap-1 text-slate-400 text-[11px] truncate max-w-[150px]">
                <School className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{studentProfile?.schoolName || schoolInfo?.schoolName || pkg.schoolName}</span>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Timer & Soal Navigator */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Offline / Online Network Indicator Badge */}
          {!isOnline && (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold shadow-sm"
              title="Mode Offline: Ujian berjalan mandiri di perangkat. Jawaban tersimpan otomatis."
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden md:inline">Offline</span>
            </div>
          )}

          {/* Timer Display (Stationary & Prominently Visible - Hidden in Mode Bebas) */}
          {!isFreeMode && displaySettings.showTimer && (
            <div
              id="cbt-timer-container"
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-sm transition-all shrink-0 ${
                timeLeft < 180
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : timeLeft < 600
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors hidden sm:block cursor-pointer"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Grid Toggle on Mobile & Desktop */}
          <button
            id="btn-toggle-grid"
            onClick={() => setIsGridOpen(!isGridOpen)}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1 cursor-pointer transition-colors"
            title="Daftar Nomor Soal"
          >
            <ListOrdered className="w-4 h-4" />
            <span className="hidden sm:inline">Daftar Soal</span>
          </button>
        </div>
      </header>

      {/* Multi-Subject Sequential Exam Stepper Timeline Bar */}
      {isMultiSubject && sessions.length > 0 && (
        <div className="bg-slate-950 border-b border-slate-800 px-3 sm:px-6 py-2.5 shrink-0 select-none overflow-x-auto shadow-inner">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 min-w-max sm:min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/40 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>Ujian Terpadu ({sessions.length} Mapel)</span>
              </span>
            </div>

            {/* Stepper sequence items */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center max-w-3xl">
              {sessions.map((sess, idx) => {
                const isActive = idx === activeSessionIndex;
                const isCompleted = lockedSessionIndices.includes(idx);
                const isUpcoming = idx > activeSessionIndex && !isCompleted;
                const range = sessionQuestionRanges[idx];

                return (
                  <React.Fragment key={sess.sessionNumber}>
                    {idx > 0 && (
                      <div className={`h-0.5 w-3 sm:w-6 rounded ${isCompleted || isActive ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                    )}
                    <button
                      type="button"
                      disabled={isUpcoming}
                      onClick={() => {
                        if (range && range.startIndex < questions.length) {
                          goToQuestion(range.startIndex);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-950/80 ring-2 ring-indigo-400/40 font-bold'
                          : isCompleted
                          ? 'bg-slate-900 text-emerald-300 border-emerald-500/40 hover:bg-slate-850 cursor-pointer'
                          : 'bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                      }`}
                      title={
                        isActive
                          ? `Sedang Dikerjakan: Jam Ke-${sess.sessionNumber} (${sess.subjectName}) - Durasi ${sess.durationMinutes} Menit`
                          : isCompleted
                          ? `Selesai & Terkunci: Jam Ke-${sess.sessionNumber} (${sess.subjectName})`
                          : `Belum Dimulai: Jam Ke-${sess.sessionNumber} (${sess.subjectName})`
                      }
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : isActive ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      ) : isFreeMode ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                      )}
                      <span className="truncate max-w-[90px] sm:max-w-[130px]">
                        Jam {sess.sessionNumber}: {sess.subjectName}
                      </span>
                      {!isFreeMode && isActive && (
                        <span className="font-mono text-[11px] bg-slate-950/60 px-1.5 py-0.2 rounded text-amber-300">
                          {formatTime(timeLeft)}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Quick Mapel Switch info */}
            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <span>Jam Ke-{activeSessionIndex + 1} dari {sessions.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Screen Area (Scrolls independently inside while header & footer remain stationary) */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Left Side: Question Passage & Stimulus */}
        <div
          className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 ${
            currentQuestion.stimulus ? 'lg:w-1/2 border-r border-slate-800/80' : 'w-full max-w-4xl mx-auto'
          }`}
        >
          {/* Locked Question Banner (for completed sessions - Hidden in Mode Bebas) */}
          {!isFreeMode && isCurrentQuestionLocked && (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between text-xs text-amber-200 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Sesi Jam Ini Telah Terkunci:</strong> Alokasi waktu untuk mata pelajaran {currentQuestionSession?.subjectName} telah selesai. Jawaban tersimpan dan tidak dapat diubah lagi.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 font-bold border border-amber-500/40 text-[10px] shrink-0">
                🔒 Hanya Baca
              </span>
            </div>
          )}

          {/* Stimulus / Reading Passage if present */}
          {(currentQuestion.stimulus || currentQuestion.stimulusImage || currentQuestion.stimulusAudio) && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>{currentQuestion.stimulusTitle || 'Wacana / Teks Pendukung'}</span>
              </div>

              {currentQuestion.stimulus && (
                <div
                  className={`text-slate-300 leading-relaxed font-serif whitespace-pre-wrap ${
                    fontSize === 'xlarge'
                      ? 'text-lg leading-loose'
                      : fontSize === 'large'
                      ? 'text-base leading-relaxed'
                      : 'text-sm leading-relaxed'
                  }`}
                >
                  {currentQuestion.stimulus}
                </div>
              )}

              {/* Stimulus Image */}
              {currentQuestion.stimulusImage && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/80 p-2 flex justify-center">
                  <img
                    src={currentQuestion.stimulusImage}
                    alt="Stimulus / Wacana"
                    className="max-h-72 w-auto object-contain rounded-lg shadow"
                  />
                </div>
              )}

              {/* Stimulus Audio Player */}
              {currentQuestion.stimulusAudio && (
                <div className="pt-1">
                  <AudioPlayerBadge
                    src={currentQuestion.stimulusAudio}
                    title="Audio Wacana / Teks Pendukung"
                  />
                </div>
              )}
            </div>
          )}

          {/* Question Text Prompt & Media */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pertanyaan No. {currentIndex + 1}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {currentQuestion.type === 'multiple_choice'
                  ? 'Pilihan Ganda'
                  : currentQuestion.type === 'multi_select_choice'
                  ? 'PG Jawaban Banyak (Kotak Centang)'
                  : currentQuestion.type === 'complex_multiple_choice'
                  ? 'Pilihan Ganda Kompleks'
                  : currentQuestion.type === 'short_numeric'
                  ? 'Isian Singkat Angka'
                  : currentQuestion.type === 'long_essay'
                  ? 'Isian Panjang (Esai)'
                  : 'Sebab Akibat'}
              </span>
            </div>

            <p
              className={`font-semibold text-white leading-relaxed break-words ${
                fontSize === 'xlarge' ? 'text-xl' : fontSize === 'large' ? 'text-lg' : 'text-base'
              }`}
            >
              {currentQuestion.questionText}
            </p>

            {/* Question Image / Diagram */}
            {currentQuestion.questionImage && (
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/80 p-2 flex justify-center">
                <img
                  src={currentQuestion.questionImage}
                  alt="Gambar Pertanyaan"
                  className="max-h-64 w-auto object-contain rounded-lg shadow"
                />
              </div>
            )}

            {/* Question Audio / Listening */}
            {currentQuestion.questionAudio && (
              <div className="pt-1">
                <AudioPlayerBadge
                  src={currentQuestion.questionAudio}
                  title="Audio Pertanyaan / Listening"
                />
              </div>
            )}
          </div>

          {/* Interactive Answer Input Form */}
          <div className="space-y-3">
            {/* TYPE 1 & 4: Multiple Choice & Cause Reason */}
            {(currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'cause_reason') &&
              currentQuestion.options?.map(opt => {
                const isSelected = currentRecord?.selectedOption === opt.id;
                const isEliminated = currentEliminated.includes(opt.id);

                return (
                  <div
                    key={opt.id}
                    id={`option-${opt.id}`}
                    onClick={() => {
                      if (!isEliminated) handleSelectOption(opt.id);
                    }}
                    className={`p-4 rounded-xl border transition-all flex flex-col gap-2 group relative ${
                      isEliminated
                        ? 'opacity-40 line-through bg-slate-950/60 border-slate-800 text-slate-500'
                        : isSelected
                        ? 'bg-indigo-600/20 border-indigo-400 ring-2 ring-indigo-500/80 shadow-lg shadow-indigo-950/60 text-white cursor-pointer'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                        {displaySettings.showOptionLetters && (
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                              isEliminated
                                ? 'bg-slate-900 text-slate-600 border border-slate-800'
                                : isSelected
                                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/60 font-black'
                                : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                            }`}
                          >
                            {opt.label}
                          </div>
                        )}
                        <span
                          className={`pt-0.5 leading-relaxed flex-1 break-words ${
                            fontSize === 'xlarge' ? 'text-base' : 'text-sm'
                          }`}
                        >
                          {opt.text}
                        </span>
                      </div>

                      {/* Right Action & Selection Indicator Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected && !isEliminated && (
                          <span
                            id={`selected-badge-${opt.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-indigo-600 text-white shadow-md border border-indigo-300/40 animate-in zoom-in-90 duration-150"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Terpilih</span>
                          </span>
                        )}

                        {/* Option Elimination Strikethrough Button */}
                        {displaySettings.showOptionElimination && (
                          <button
                            type="button"
                            onClick={e => handleToggleElimination(opt.id, e)}
                            className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                              isEliminated
                                ? 'bg-rose-900/60 text-rose-300 hover:bg-rose-800'
                                : 'opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 hover:bg-slate-800'
                            }`}
                            title={isEliminated ? 'Batalkan Coret Opsi' : 'Coret Opsi Ini (Eliminasi)'}
                          >
                            <Strikethrough className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Option Attached Media (Image / Audio) */}
                    {(opt.image || opt.audio) && (
                      <div className="pl-10 flex flex-wrap items-center gap-3 pt-1">
                        {opt.image && (
                          <img
                            src={opt.image}
                            alt={`Opsi ${opt.label}`}
                            className="max-h-28 rounded-lg border border-slate-700 bg-slate-950 p-1 object-contain"
                          />
                        )}
                        {opt.audio && (
                          <AudioPlayerBadge
                            src={opt.audio}
                            title={`Audio Opsi ${opt.label}`}
                            size="sm"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* TYPE: Multi-Select Choice (Pilihan Ganda Jawaban Banyak) */}
            {currentQuestion.type === 'multi_select_choice' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                    Pilihlah lebih dari satu jawaban yang benar (Klik kotak centang pilihan Anda)
                  </span>
                  <span className="font-bold text-indigo-300 shrink-0">
                    Terpilih: {currentRecord?.selectedOptions?.length || 0}
                  </span>
                </div>

                {currentQuestion.options?.map(opt => {
                  const isChecked = currentRecord?.selectedOptions?.includes(opt.id);
                  const isEliminated = currentEliminated.includes(opt.id);

                  return (
                    <div
                      key={opt.id}
                      id={`multi-option-${opt.id}`}
                      onClick={() => {
                        if (!isEliminated) handleToggleMultiOption(opt.id);
                      }}
                      className={`p-4 rounded-xl border transition-all flex flex-col gap-2 group select-none ${
                        isEliminated
                          ? 'opacity-40 line-through bg-slate-950/60 border-slate-800 text-slate-500'
                          : isChecked
                          ? 'bg-indigo-600/25 border-indigo-400 ring-2 ring-indigo-500/80 shadow-lg shadow-indigo-950/50 text-white cursor-pointer'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 w-full">
                        <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                          {displaySettings.showOptionLetters ? (
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all border ${
                                isChecked
                                  ? 'bg-indigo-600 border-indigo-300 text-white shadow-md ring-2 ring-indigo-400/60 font-black'
                                  : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:border-slate-600 group-hover:text-slate-200'
                              }`}
                            >
                              {isChecked ? <Check className="w-4 h-4 text-white stroke-[3]" /> : opt.label}
                            </div>
                          ) : (
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center border mt-0.5 shrink-0 transition-all ${
                                isChecked
                                  ? 'bg-indigo-600 border-indigo-300 text-white shadow ring-1 ring-indigo-400'
                                  : 'border-slate-700 bg-slate-800'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </div>
                          )}
                          <span
                            className={`pt-0.5 leading-relaxed flex-1 break-words ${
                              fontSize === 'xlarge' ? 'text-base' : 'text-sm'
                            }`}
                          >
                            {opt.text}
                          </span>
                        </div>

                        {/* Right Action & Selection Indicator Badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isChecked && !isEliminated && (
                            <span
                              id={`multi-selected-badge-${opt.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-indigo-600 text-white shadow-md border border-indigo-300/40 animate-in zoom-in-90 duration-150"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Terpilih</span>
                            </span>
                          )}

                          {displaySettings.showOptionElimination && (
                            <button
                              type="button"
                              onClick={e => handleToggleElimination(opt.id, e)}
                              className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                                isEliminated
                                  ? 'bg-rose-900/60 text-rose-300 hover:bg-rose-800'
                                  : 'opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 hover:bg-slate-800'
                              }`}
                              title={isEliminated ? 'Batalkan Coret' : 'Coret Opsi'}
                            >
                              <Strikethrough className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Multi Option Attached Media (Image / Audio) */}
                      {(opt.image || opt.audio) && (
                        <div className="pl-10 flex flex-wrap items-center gap-3 pt-1">
                          {opt.image && (
                            <img
                              src={opt.image}
                              alt={`Opsi ${opt.label}`}
                              className="max-h-28 rounded-lg border border-slate-700 bg-slate-950 p-1 object-contain"
                            />
                          )}
                          {opt.audio && (
                            <AudioPlayerBadge
                              src={opt.audio}
                              title={`Audio Opsi ${opt.label}`}
                              size="sm"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TYPE 2: Complex Multiple Choice (Table with True/False per statement) */}
            {currentQuestion.type === 'complex_multiple_choice' && (
              <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-900/60">
                <table className="w-full min-w-[340px] text-left text-xs sm:text-sm">
                  <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="p-3 sm:p-4">Pernyataan</th>
                      <th className="p-3 text-center w-28">Benar</th>
                      <th className="p-3 text-center w-28">Salah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {currentQuestion.complexStatements?.map(stmt => {
                      const val = currentRecord?.complexAnswers?.[stmt.id];
                      return (
                        <tr key={stmt.id} className={`transition-colors ${val !== undefined ? 'bg-indigo-950/20' : 'hover:bg-slate-800/30'}`}>
                          <td className="p-3 sm:p-4 text-slate-200">
                            <div className="flex items-center gap-2">
                              <span>{stmt.text}</span>
                              {val === true && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shrink-0">
                                  <Check className="w-3 h-3 stroke-[3]" /> Benar
                                </span>
                              )}
                              {val === false && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 shrink-0">
                                  <Check className="w-3 h-3 stroke-[3]" /> Salah
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleComplexToggle(stmt.id, true)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                                val === true
                                  ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900 font-black'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {val === true && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              <span>B (Benar)</span>
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleComplexToggle(stmt.id, false)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                                val === false
                                  ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400 ring-offset-1 ring-offset-slate-900 font-black'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {val === false && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              <span>S (Salah)</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TYPE 3: Short Numeric / Long Essay Entry */}
            {(currentQuestion.type === 'short_numeric' || currentQuestion.type === 'long_essay') && (() => {
              const currentAnswerText = currentRecord?.numericAnswer || '';
              const wordCount = currentAnswerText.trim() ? currentAnswerText.trim().split(/\s+/).filter(Boolean).length : 0;
              const minTarget = currentQuestion.minWordCount || 0;
              const hasMinConstraint = minTarget > 0;
              const isTargetMet = !hasMinConstraint || wordCount >= minTarget;
              const isLongEssay = currentQuestion.type === 'long_essay';

              return (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      {isLongEssay
                        ? 'Ketikkan Jawaban Esai / Uraian Komprehensif Anda:'
                        : hasMinConstraint
                        ? 'Ketikkan Jawaban / Uraian Anda:'
                        : 'Ketikkan Jawaban Akhir (Angka / Isian Singkat):'}
                    </label>
                    {(hasMinConstraint || isLongEssay) && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                            isTargetMet
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                          }`}
                        >
                          📝 {wordCount} {hasMinConstraint ? `/ ${minTarget} Kata` : 'Kata'}{' '}
                          {hasMinConstraint ? (isTargetMet ? '✓ Target Tercapai' : `(Kurang ${minTarget - wordCount} kata)`) : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {(hasMinConstraint || isLongEssay) ? (
                    <div className="space-y-2">
                      <textarea
                        rows={isLongEssay ? 7 : 4}
                        placeholder={
                          isLongEssay
                            ? hasMinConstraint
                              ? `Tuliskan uraian esai lengkap Anda di sini (wajib mencapai minimal ${minTarget} kata)...`
                              : 'Tuliskan uraian esai lengkap dan mendalam Anda di sini...'
                            : `Ketikkan penjelasan lengkap Anda di sini (wajib mencapai minimal ${minTarget} kata)...`
                        }
                        value={currentAnswerText}
                        onChange={e => handleNumericInput(e.target.value)}
                        className={`w-full p-4 bg-slate-950 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 shadow-inner transition-colors leading-relaxed ${
                          isTargetMet
                            ? 'border-emerald-500/60 focus:ring-emerald-500'
                            : 'border-amber-500/50 focus:ring-amber-500'
                        }`}
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          {hasMinConstraint ? (
                            isTargetMet ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Batasan minimal {minTarget} kata telah terpenuhi.
                              </span>
                            ) : (
                              <span className="text-amber-400 font-medium">
                                Harap lengkapi jawaban hingga minimal {minTarget} kata.
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">
                              Isian uraian panjang tanpa batasan minimal kata.
                            </span>
                          )}
                        </span>
                        {currentAnswerText && (
                          <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Tersimpan</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          placeholder="Contoh: 42 atau 15.5 atau Fotosintesis"
                          value={currentAnswerText}
                          onChange={e => handleNumericInput(e.target.value)}
                          className="px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base focus:outline-none focus:border-indigo-500 w-full max-w-md shadow-inner"
                        />
                        {currentAnswerText && (
                          <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Tersimpan</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Gunakan tanda titik (.) untuk bilangan pecahan desimal jika diperlukan.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Side: Question Navigation Grid (Desktop Sidebar & Mobile Drawer) */}
        {displaySettings.showQuestionGrid && (
          <div
            className={`w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col z-20 shrink-0 transition-transform ${
              isGridOpen
                ? 'fixed inset-y-16 right-0 translate-x-0 shadow-2xl'
                : 'hidden lg:flex'
            }`}
          >
            {/* Grid Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <ListOrdered className="w-4 h-4 text-indigo-400" />
                <span>Navigasi Soal</span>
              </h3>
              <span className="text-xs font-medium text-slate-400">
                {answeredCount}/{questions.length} Dijawab
              </span>
            </div>

            {/* Status Legend */}
            <div className="p-3 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block shrink-0"></span>
                <span className="text-slate-300">Sudah Dijawab ({answeredCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block shrink-0"></span>
                <span className="text-slate-300">Ragu-Ragu ({doubtfulCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-700 inline-block shrink-0"></span>
                <span className="text-slate-300">Belum Dijawab ({blankCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded border-2 border-indigo-400 inline-block shrink-0"></span>
                <span className="text-slate-300">Soal Aktif</span>
              </div>
            </div>

            {/* Number Grid Buttons */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isMultiSubject && sessionQuestionRanges.length > 0 ? (
                sessionQuestionRanges.map((sRange) => {
                  const isCurSession = sRange.sessionIndex === activeSessionIndex;
                  const isLockedSession = lockedSessionIndices.includes(sRange.sessionIndex);
                  const rangeQuestions = questions.slice(sRange.startIndex, sRange.endIndex + 1);

                  return (
                    <div key={sRange.sessionNumber} className="space-y-2">
                      <div className="flex items-center justify-between px-1 text-[11px] font-semibold">
                        <div className="flex items-center gap-1.5">
                          {!isFreeMode && isLockedSession ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : !isFreeMode && isCurSession ? (
                            <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          ) : isFreeMode ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span className={isCurSession ? 'text-indigo-300 font-bold' : (!isFreeMode && isLockedSession) ? 'text-emerald-400' : 'text-slate-400'}>
                            Jam {sRange.sessionNumber}: {sRange.subjectName}
                          </span>
                        </div>
                        {!isFreeMode && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {sRange.durationMinutes} mnt
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        {rangeQuestions.map((q, qSubIdx) => {
                          const idx = sRange.startIndex + qSubIdx;
                          const rec = answers[q.id];
                          const isCurrent = idx === currentIndex;
                          const isDoubt = rec?.isDoubtful;
                          const isAnswered =
                            rec &&
                            (rec.selectedOption !== undefined ||
                              (rec.selectedOptions && rec.selectedOptions.length > 0) ||
                              (rec.numericAnswer && rec.numericAnswer.trim() !== '') ||
                              (rec.complexAnswers && Object.keys(rec.complexAnswers).length > 0));

                          let colorClasses = 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700';

                          if (isDoubt) {
                            colorClasses = 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm';
                          } else if (isAnswered) {
                            colorClasses = 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-sm';
                          }

                          if (isCurrent) {
                            colorClasses += ' ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900';
                          }

                          return (
                            <button
                              key={q.id}
                              id={`grid-num-${idx + 1}`}
                              onClick={() => {
                                goToQuestion(idx);
                                setIsGridOpen(false);
                              }}
                              className={`h-10 rounded-xl flex items-center justify-center text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${colorClasses}`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid grid-cols-5 gap-2.5">
                  {questions.map((q, idx) => {
                    const rec = answers[q.id];
                    const isCurrent = idx === currentIndex;
                    const isDoubt = rec?.isDoubtful;
                    const isAnswered =
                      rec &&
                      (rec.selectedOption !== undefined ||
                        (rec.selectedOptions && rec.selectedOptions.length > 0) ||
                        (rec.numericAnswer && rec.numericAnswer.trim() !== '') ||
                        (rec.complexAnswers && Object.keys(rec.complexAnswers).length > 0));

                    let colorClasses = 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700';

                    if (isDoubt) {
                      colorClasses = 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm';
                    } else if (isAnswered) {
                      colorClasses = 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-sm';
                    }

                    if (isCurrent) {
                      colorClasses += ' ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900';
                    }

                    return (
                      <button
                        key={q.id}
                        id={`grid-num-${idx + 1}`}
                        onClick={() => {
                          goToQuestion(idx);
                          setIsGridOpen(false);
                        }}
                        className={`h-11 rounded-xl flex items-center justify-center text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${colorClasses}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Submit or Next Session Button from Sidebar */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-2">
              {isMultiSubject && activeSessionIndex < sessions.length - 1 ? (
                <button
                  id="btn-advance-session-sidebar"
                  onClick={() => setIsConfirmEarlySessionFinishOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Selesai Jam {activeSessionIndex + 1} & Lanjut Jam {activeSessionIndex + 2}</span>
                </button>
              ) : (
                <button
                  id="btn-finish-exam-sidebar"
                  onClick={() => setIsConfirmFinishOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Selesaikan & Kumpulkan Ujian</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Scratchpad / Calculation Notes Drawer */}
      {isScratchpadOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-40 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 animate-fade-in backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <Edit3 className="w-4 h-4" />
              <span>Papan Coretan & Catatan Rumus</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setScratchpadText('')}
                className="p-1 text-slate-400 hover:text-rose-300 rounded cursor-pointer"
                title="Hapus Catatan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsScratchpadOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <textarea
            value={scratchpadText}
            onChange={e => setScratchpadText(e.target.value)}
            placeholder="Coretan rumus / hitungan angka Anda di sini..."
            rows={5}
            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono resize-none focus:outline-none focus:border-cyan-500"
          />
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>Tersimpan sementara selama ujian</span>
            <span>{scratchpadText.length} karakter</span>
          </div>
        </div>
      )}

      {/* AI Tutor Guidance Hint Modal */}
      {isAiHintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Petunjuk Konsep AI Tutor</h3>
                  <p className="text-[11px] text-slate-400">Panduan berpikir mandiri (Socratic Guide)</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiHintOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed min-h-[100px] flex items-center">
              {aiHintLoading ? (
                <div className="flex items-center justify-center gap-2 w-full text-indigo-400">
                  <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Merangkum petunjuk konsep...</span>
                </div>
              ) : (
                <p>{aiHintText}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsAiHintOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow cursor-pointer"
              >
                Paham, Lanjutkan Soal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CBT Bottom Action Bar (STATIONARY / FIXED at bottom, never scrolls) */}
      <footer className="sticky bottom-0 z-30 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-lg select-none">
        {/* Left Action: Previous */}
        <button
          id="btn-prev-question"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="h-10 sm:h-11 px-3 sm:px-4 min-w-[110px] sm:min-w-[130px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-95 flex items-center justify-center space-x-1 sm:space-x-1.5"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          <span>Sebelumnya</span>
        </button>

        {/* Center Action: Doubtful Flag Toggle (if enabled) */}
        {displaySettings.showDoubtfulButton ? (
          <button
            id="btn-toggle-doubtful"
            onClick={handleToggleDoubtful}
            className={`h-10 sm:h-11 px-3 sm:px-4 min-w-[110px] sm:min-w-[140px] rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center space-x-1.5 sm:space-x-2 ${
              currentRecord?.isDoubtful
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950/40 font-bold'
                : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-amber-300 hover:border-amber-500/50'
            }`}
          >
            <Bookmark
              className={`w-4 h-4 shrink-0 ${currentRecord?.isDoubtful ? 'fill-slate-950' : 'fill-transparent'}`}
            />
            <span className="hidden sm:inline">
              {currentRecord?.isDoubtful ? 'Ragu-Ragu (Ditandai)' : 'Tandai Ragu-Ragu'}
            </span>
            <span className="sm:hidden">
              {currentRecord?.isDoubtful ? 'Ragu' : 'Tandai Ragu'}
            </span>
          </button>
        ) : (
          <div />
        )}

        {/* Right Action: Next / Advance Session / Finish */}
        <div className="flex items-center gap-2">
          {isMultiSubject && activeSessionIndex < sessions.length - 1 && (
            <button
              id="btn-finish-current-session"
              onClick={() => setIsConfirmEarlySessionFinishOpen(true)}
              className="hidden sm:flex items-center justify-center space-x-1.5 h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-xs sm:text-sm font-semibold border border-amber-500/40 transition-all active:scale-95 cursor-pointer"
              title={`Selesaikan Jam Ke-${activeSessionIndex + 1} (${sessions[activeSessionIndex]?.subjectName}) Lebih Awal`}
            >
              <ArrowRight className="w-4 h-4 text-amber-300" />
              <span>Selesai Jam {activeSessionIndex + 1} ➔ Jam {activeSessionIndex + 2}</span>
            </button>
          )}

          {currentIndex < questions.length - 1 ? (
            <button
              id="btn-next-question"
              onClick={handleNext}
              className="h-10 sm:h-11 px-4 sm:px-5 min-w-[120px] sm:min-w-[140px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-900/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1 sm:space-x-1.5"
            >
              <span>Simpan & Lanjut</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <button
              id="btn-finish-exam-bottom"
              onClick={() => setIsConfirmFinishOpen(true)}
              className="h-10 sm:h-11 px-4 sm:px-5 min-w-[120px] sm:min-w-[140px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95 animate-bounce cursor-pointer flex items-center justify-center space-x-1.5 sm:space-x-2"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Kumpulkan Ujian</span>
            </button>
          )}
        </div>
      </footer>

      {/* Confirm Finish Modal */}
      {isConfirmFinishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div
            id="confirm-finish-modal"
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Konfirmasi Pengumpulan Ujian</h3>
                <p className="text-xs text-slate-400">
                  Apakah Anda yakin ingin mengakhiri sesi pengerjaan ujian sekarang?
                </p>
              </div>
            </div>

            {/* Answer Summary Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Soal:</span>
                <strong className="text-white">{questions.length} butir</strong>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Sudah Dijawab:</span>
                <strong>{answeredCount} butir</strong>
              </div>
              {displaySettings.showDoubtfulButton && (
                <div className="flex justify-between text-amber-400">
                  <span>Masih Ragu-Ragu:</span>
                  <strong>{doubtfulCount} butir</strong>
                </div>
              )}
              <div className="flex justify-between text-rose-400">
                <span>Belum Dijawab:</span>
                <strong>{blankCount} butir</strong>
              </div>
              {!isFreeMode && displaySettings.showTimer && (
                <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                  <span>Sisa Waktu:</span>
                  <span className="font-mono font-bold text-white">{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>

            {/* Proctoring Activity Summary Banner */}
            {displaySettings.showProctoringAlerts && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  totalViolationsCount === 0
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {totalViolationsCount === 0 ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>
                    {totalViolationsCount === 0
                      ? 'Integritas Ujian: Sangat Tertib (0 Pelanggaran)'
                      : `Integritas Ujian: ${totalViolationsCount} Catatan Pengawas`}
                  </span>
                </div>
                <span className="font-mono font-bold text-[11px]">
                  {proctoringLogs.reduce((acc, l) => acc + l.durationSeconds, 0)} dtk di luar
                </span>
              </div>
            )}

            {blankCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Masih ada <strong>{blankCount} soal kosong</strong>. Jawaban kosong bernilai 0.
                </span>
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsConfirmFinishOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Lanjutkan Mengerjakan
              </button>
              <button
                id="btn-confirm-submit-final"
                onClick={() => {
                  setIsConfirmFinishOpen(false);
                  handleManualSubmit();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
              >
                Kumpulkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Subject Session Intermission Modal (Automatic / Expired Time) */}
      {isSessionTransitionModalOpen && isMultiSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto shadow-inner">
              <Clock className="w-8 h-8 animate-pulse text-amber-400" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/30">
                Waktu Sesi Berakhir
              </span>
              <h3 className="font-extrabold text-xl text-white pt-2">
                Jam Ke-{sessions[activeSessionIndex]?.sessionNumber}: {sessions[activeSessionIndex]?.subjectName} Selesai
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Jawaban Anda pada mata pelajaran ini telah tersimpan secara otomatis dan sesi ini sekarang dikunci.
              </p>
            </div>

            {/* Next subject card preview */}
            {sessions[activeSessionIndex + 1] && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2">
                <div className="text-[11px] text-slate-400 font-medium">Mata Pelajaran Berikutnya:</div>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-indigo-300">
                    Jam Ke-{sessions[activeSessionIndex + 1].sessionNumber}: {sessions[activeSessionIndex + 1].subjectName}
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/30">
                    {sessions[activeSessionIndex + 1].durationMinutes} Menit
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Jumlah: {sessions[activeSessionIndex + 1].questionCount} Butir Soal</span>
                </div>
              </div>
            )}

            {/* Intermission Countdown */}
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center gap-2 text-xs text-indigo-300">
              <span>Otomatis berpindah dalam:</span>
              <strong className="font-mono text-base text-amber-300 font-bold">{transitionCountdown} detik</strong>
            </div>

            <button
              onClick={handleAdvanceToNextSession}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-indigo-950/60 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>Mulai Jam Ke-{sessions[activeSessionIndex + 1]?.sessionNumber || activeSessionIndex + 2} Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm Early Session Finish Modal (Manual Advance by Student) */}
      {isConfirmEarlySessionFinishOpen && isMultiSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  Selesaikan Jam Ke-{sessions[activeSessionIndex]?.sessionNumber}?
                </h3>
                <p className="text-xs text-slate-400">
                  Lanjut ke mata pelajaran {sessions[activeSessionIndex + 1]?.subjectName}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="text-amber-200">
                {isFreeMode
                  ? `Lanjutkan mengerjakan mata pelajaran berikutnya: ${sessions[activeSessionIndex + 1]?.subjectName}.`
                  : `⚠️ Perhatian: Setelah melanjutkan ke Jam Ke-${activeSessionIndex + 2}, sesi mata pelajaran saat ini (${sessions[activeSessionIndex]?.subjectName}) akan dikunci dan waktu pengerjaan untuk mata pelajaran berikutnya akan langsung berjalan.`}
              </p>
              {!isFreeMode && (
                <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-400">
                  <span>Sisa waktu jam ini:</span>
                  <span className="font-mono text-white font-bold">{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsConfirmEarlySessionFinishOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Lanjutkan Mengerjakan
              </button>
              <button
                onClick={() => {
                  handleAdvanceToNextSession();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
              >
                Ya, Masuk Jam Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Quit / Return to Schedule List Modal */}
      {isConfirmQuitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Kembali ke Daftar Ujian?</h3>
                <p className="text-xs text-slate-400">Kembali ke beranda Jadwal Ujianku</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Jawaban yang sudah Anda pilih tersimpan secara otomatis di sistem.</span>
              </p>
              <p className="text-slate-400">
                Waktu ujian akan tetap berjalan selama sesi ujian berlangsung. Anda dapat masuk kembali sebelum batas waktu pengerjaan berakhir.
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmQuitOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Lanjut Mengerjakan
              </button>
              <button
                type="button"
                id="btn-confirm-return-to-schedule"
                onClick={() => {
                  recordCurrentQuestionTime();
                  setIsConfirmQuitOpen(false);
                  onQuitExam();
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
              >
                Ya, Kembali ke Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
