export type CategoryType = 'TPS' | 'TKA' | 'LITERASI' | 'SMA_MIPA' | 'SMA_IPS' | 'SMA_BAHASA' | 'SMA_UMUM';

export type QuestionFormat =
  | 'multiple_choice'            // Pilihan Ganda A-E (Satu Jawaban Benar)
  | 'multi_select_choice'        // Pilihan Ganda Kompleks Jawaban Banyak (Bisa Memilih Lebih dari 1 Opsi)
  | 'complex_multiple_choice'    // Pilihan Ganda Kompleks (Tabel Pernyataan Benar/Salah)
  | 'short_numeric'              // Isian Angka Singkat / Teks Singkat
  | 'long_essay'                 // Isian Panjang / Soal Uraian Komprehensif
  | 'cause_reason';              // Sebab Akibat / Pernyataan (1) & (2)

export type DifficultyLevel = 'Mudah' | 'Sedang' | 'Sulit' | 'HOTS';

export type SmaGrade = '10' | '11' | '12' | 'Semua Kelas';

export type SmaMajor = 'MIPA' | 'IPS' | 'Bahasa' | 'Umum';

export type SmaExamType = 
  | 'Penilaian Harian (UH)' 
  | 'Sumatif Tengah Semester (STS / PTS)' 
  | 'Sumatif Akhir Semester (SAS / PAS)' 
  | 'Ujian Sekolah (US / Asesmen Akhir)' 
  | 'Latihan Topik Mandiri';

export type AiProvider = 'gemini' | 'deepseek_v3' | 'deepseek_r1';

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
  image?: string; // URL / Base64 image data
  audio?: string; // URL / Base64 audio data
}

export interface ComplexStatement {
  id: string;
  text: string;
  image?: string;
  audio?: string;
  correctAnswer: boolean; // true = Benar, false = Salah
}

export interface QuestionExplanation {
  summary: string;
  steps: string[];
  concept: string;
  fastTrick?: string;
}

export interface Question {
  id: string;
  subtestId: string;
  subtestName: string;
  category: CategoryType;
  type: QuestionFormat;
  stimulus?: string; // Teks bacaan wacana / tabel / rumus
  stimulusTitle?: string;
  stimulusImage?: string; // Gambar wacana / stimulus
  stimulusAudio?: string; // Audio listening / wacana audio
  questionText: string;
  questionImage?: string; // Gambar pertanyaan / diagram
  questionAudio?: string; // Audio pertanyaan / listening
  options?: QuestionOption[];
  complexStatements?: ComplexStatement[];
  correctAnswer: string | string[] | number | Record<string, boolean>; // 'A', ['A', 'C'], 42, { 's1': true, 's2': false }
  explanation: QuestionExplanation;
  difficulty: DifficultyLevel;
  irtWeight: number; // IRT item weight (e.g. 500 - 1000 base factor)
  topic: string;
  // SMA Subject Extensions
  grade?: SmaGrade;
  major?: SmaMajor;
  subject?: string;
  chapter?: string;
  examType?: SmaExamType;
  minWordCount?: number; // Batasan minimal kata yang harus dicapai (untuk isian singkat / esai, e.g. 10, 20, 50 kata)
  aiEngine?: AiProvider; // Mesin AI yang membuat soal (Gemini 3.7, DeepSeek V3, DeepSeek R1)
  subtestCategory?: string; // Kategori subtes untuk export/import
  correctOptionIndex?: number; // Indeks opsi benar (0=A, 1=B, dst)
  createdAt?: string;
  updatedAt?: string;
  isUserCreated?: boolean;
}

export interface SubtestConfig {
  id: string;
  name: string;
  shortName: string;
  category: CategoryType;
  description: string;
  durationMinutes: number;
  questionCount: number;
  iconName: string;
  color: string;
}

export interface ExamSubjectSessionSchedule {
  sessionNumber: number;        // 1, 2, 3... (Jam Ke-1, Jam Ke-2, Jam Ke-3)
  subtestId: string;            // ID Subtes/Mapel (e.g. 'sma_matematika', 'sma_fisika', 'sma_ekonomi')
  subjectName: string;          // Nama Mapel (e.g. 'Matematika Wajib', 'Fisika', 'Ekonomi')
  customTitle?: string;         // e.g. 'Jam Ke-1: Matematika (30 Menit)'
  durationMinutes: number;      // Durasi waktu khusus untuk mapel ini (menit)
  questionCount: number;        // Jumlah butir soal mapel ini
  category?: CategoryType;      // Kategori subtes
  breakAfterMinutes?: number;   // Jeda istirahat setelah sesi ini selesai (menit)
  allowEarlyFinish?: boolean;   // Boleh selesaikan sesi ini lebih cepat
  isLockedAfterFinish?: boolean;// Kunci otomatis sesi ini setelah waktu habis / selesai
  instructions?: string;        // Petunjuk khusus pengerjaan mapel
  kkmScore?: number;            // KKM spesifik untuk mapel ini (e.g. 75)
  scheduledStartTime?: string;  // Waktu mulai spesifik untuk sesi ini jika terjadwal terpisah
}

export interface ExamPackage {
  id: string;
  title: string;
  badge: string;
  tagline: string;
  category: 'FULL' | 'TPS' | 'TKA_SAINTEK' | 'TKA_SOSHUM' | 'DRILL' | 'SMA_MIPA' | 'SMA_IPS' | 'SMA_BAHASA' | 'SMA_UMUM';
  durationMinutes: number;
  totalQuestions: number;
  subtests: SubtestConfig[];
  questions: Question[];
  // SMA specifics
  grade?: SmaGrade;
  major?: SmaMajor;
  subject?: string;
  examType?: SmaExamType;
  kkmScore?: number; // Nilai KKM standar SMA (e.g. 75)
  schoolName?: string; // Nama Resmi Sekolah
  schoolAddress?: string; // Alamat Lengkap Sekolah
  schoolLogo?: string; // URL / Base64 Logo Sekolah
  isCustomCreated?: boolean;
  createdAt?: string;
  // Multi-Subject Sequential Scheduling (1 Link untuk Berbagai Mapel Berwaktu)
  isMultiSubjectSequential?: boolean;           // Apakah ujian ini menggunakan format jam mapel berurutan
  sessionSchedules?: ExamSubjectSessionSchedule[]; // Daftar jadwal sesi per jam pelajaran
  breakBetweenSessionsMinutes?: number;        // Jeda istirahat otomatis antar sesi (menit, default 1-2m)
  strictSessionLocking?: boolean;              // Apakah sesi sebelumnya terkunci otomatis dan tidak bisa diubah lagi
  // Waktu Buka Ujian & Penguncian Jadwal (Hanya bisa dibuka jika sudah waktunya)
  scheduledStartTime?: string;                 // e.g. "2026-08-22T08:00:00" atau waktu jam tertentu
  scheduledEndTime?: string;                   // e.g. "2026-08-22T12:00:00"
  isScheduleLocked?: boolean;                  // Jika true, tombol mulai terkunci sampai waktu tiba
  allowEarlyBypassBySupervisor?: boolean;      // Pengawas bisa bypass waktu
  token?: string;                              // Token ujian khusus paket
}

export interface UserAnswerRecord {
  questionId: string;
  selectedOption?: string;               // For multiple_choice & cause_reason (e.g. 'A')
  selectedOptions?: string[];            // For multi_select_choice (e.g. ['A', 'C'])
  complexAnswers?: Record<string, boolean>; // For complex_multiple_choice (e.g. { stmt1: true, stmt2: false })
  numericAnswer?: string;                // For short_numeric (e.g. '24')
  essayAnswer?: string;                  // For long_essay (e.g. 'Uraian lengkap...')
  isDoubtful: boolean;                   // Ragu-ragu checkbox flag
  timeSpentSeconds: number;              // Time spent on this specific question
  visited: boolean;                      // Visited at least once
  lastUpdated: number;
}

export interface SubtestScoreSummary {
  subtestId: string;
  subtestName: string;
  category: CategoryType;
  rawScore: number;                      // correct count
  totalQuestions: number;
  correct: number;
  incorrect: number;
  blank: number;
  accuracyPercentage: number;
  irtScore: number;                      // Scaled 200 - 1000
  timeSpentSeconds: number;
  avgTimePerQuestionSeconds: number;
  strengths: string[];
  weaknesses: string[];
}

export interface PtnTarget {
  id: string;
  ptnName: string;
  universityName?: string;
  majorName: string;
  city: string;
  passingScoreEstimate: number;
  category: 'SAINTEK' | 'SOSHUM' | 'CAMPURAN';
  quota: number;
  competitiveness: string;
}

export interface StudentProfile {
  fullName: string;
  studentClass: string;
  nis: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolLogo?: string;
  examToken?: string;
}

export type ProctoringEventType =
  | 'tab_switch_or_blur'     // Keluar aplikasi / pindah tab / minimize browser
  | 'split_or_resize'        // Split layar / memperkecil jendela di bawah ukuran wajar
  | 'fullscreen_exit';       // Keluar dari mode layar penuh

export interface ProctoringLogEntry {
  id: string;
  timestamp: number;
  formattedTime: string;      // e.g. "14:32:05"
  type: ProctoringEventType;
  title: string;              // "Meninggalkan Layar Ujian (Pindah Tab/Aplikasi)" | "Split Layar / Jendela Diperkecil"
  durationSeconds: number;    // Durasi detik berada di luar / split layar
  details: string;            // Deskripsi detail
  questionNumber?: number;    // Nomor butir soal yang sedang dibuka saat kejadian
}

export interface ProctoringSummary {
  totalViolations: number;
  exitAppCount: number;
  splitResizeCount: number;
  totalOutOfExamDurationSeconds: number;
  integrityScore: number;     // 100 - penalti, min 0
  integrityStatus: 'Sangat Tertib / Bersih' | 'Peringatan Ringan' | 'Indikasi Pelanggaran' | 'Pelanggaran Berat';
  logs: ProctoringLogEntry[];
}

export interface SeparatedSubjectScore {
  sessionNumber?: number;
  subtestId: string;
  subjectName: string;
  category: CategoryType;
  rawScore: number;                      // Jumlah Benar
  totalQuestions: number;
  correct: number;
  incorrect: number;
  blank: number;
  score100: number;                      // Nilai skala 0-100 (Skor Rapor)
  irtScore: number;                      // Nilai skala UTBK 200-1000
  kkmScore: number;                      // KKM (default 75)
  isPassedKkm: boolean;                  // Apakah tuntas KKM
  accuracyPercentage: number;
  timeSpentSeconds: number;
  avgTimePerQuestionSeconds: number;
  strengths: string[];
  weaknesses: string[];
  isLockedFinished: boolean;             // Tanda status selesai & terkunci
  finishedAt?: string;
}

export interface ExamResult {
  id: string;
  packageId: string;
  packageTitle: string;
  startedAt: string;
  submittedAt: string;
  totalDurationSeconds: number;
  timeLimitSeconds: number;
  totalIrtScore: number;                 // Weighted overall score (e.g., 685)
  totalCorrect: number;
  totalIncorrect: number;
  totalBlank: number;
  totalQuestions: number;
  overallAccuracy: number;
  subtestSummaries: Record<string, SubtestScoreSummary>;
  separatedSubjectScores?: Record<string, SeparatedSubjectScore>; // Rapor Nilai Terpisah Masing-Masing Mapel
  isMultiSubjectSequential?: boolean;    // Menandai ujian 3 mapel terpadu
  answers: Record<string, UserAnswerRecord>;
  targetPtnEvaluations: {
    ptn: PtnTarget;
    difference: number;
    chanceLabel: 'Sangat Tinggi' | 'Tinggi' | 'Peluang Bersaing' | 'Perlu Ditingkatkan';
    chancePercentage: number;
  }[];
  aiDiagnostic?: {
    overallSummary: string;
    strongestSubjects: string[];
    areasToImprove: string[];
    recommendedSchedule: string[];
    targetAdvice: string;
  };
  studentProfile?: StudentProfile;
  proctoringSummary?: ProctoringSummary;
  isExamLockedFinished?: boolean;        // Tanda bukti selesai dan terkunci permanen
  packageName?: string;
  totalScore?: number;
  completedAt?: number;
  score?: number;
}

export interface ExamDisplaySettings {
  // 1. Tampilan Header & Info Soal
  showTimer: boolean;                  // Menampilkan jam & hitung mundur waktu
  showStudentIdentity: boolean;        // Menampilkan nama, kelas, NIS di header
  showQuestionCounter: boolean;        // Menampilkan nomor butir soal & total
  showSubtestBadge: boolean;           // Menampilkan nama subtes & kategori
  showDifficultyBadge: boolean;        // Menampilkan tingkat kesulitan (Mudah/Sedang/Sulit/HOTS)
  showTopicTag: boolean;               // Menampilkan tag bab/topik materi soal

  // 2. Alat Bantu & Interaktivitas Pengerjaan
  showQuestionGrid: boolean;           // Menampilkan navigasi daftar grid nomor soal
  showDoubtfulButton: boolean;         // Menampilkan tombol tandai 'Ragu-Ragu'
  showOptionElimination: boolean;      // Menampilkan fitur coret/eliminasi opsi salah
  showAiTutorHelper: boolean;          // Menampilkan bantuan AI Tutor saat ujian
  showFontSizeControls: boolean;       // Menampilkan pengatur ukuran font teks (A / A+ / A++)
  showScratchpad: boolean;             // Menampilkan papan coretan / catatan hitung virtual
  showOptionLetters: boolean;          // Menampilkan huruf pilihan (A, B, C, D, E)

  // 3. Keamanan & Integritas Siswa
  showProctoringAlerts: boolean;       // Menampilkan status pengawas & peringatan anti-curang
  showWatermark: boolean;              // Menampilkan watermark anti-joki di latar belakang soal
  forceFullscreen: boolean;            // Mengaktifkan mode layar penuh saat pengerjaan

  // 4. Pasca Ujian (Hasil & Pembahasan untuk Siswa)
  showImmediateScore: boolean;         // Menampilkan skor/nilai langsung setelah ujian selesai
  showAnswerKeyAndExplanation: boolean;// Menampilkan kunci jawaban & pembahasan lengkap
  showIrtAnalytics: boolean;           // Menampilkan grafik radar & analisis IRT/PTN
}

export const DEFAULT_EXAM_DISPLAY_SETTINGS: ExamDisplaySettings = {
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
};

// ==========================================
// PENGATURAN MODE NIS & SESI TUNGGAL (ANTI DUAL-LOGIN)
// ==========================================

export const MAX_ROSTER_STUDENTS = 400; // Batas kuota maksimum 400 NIS terdaftar

export type NisValidationMode = 'registered_only' | 'open';

export interface StudentRosterEntry {
  id: string;
  nis: string;
  fullName: string;
  name?: string; // Kompatibilitas alias untuk fullName
  studentClass: string;
  className?: string; // Kompatibilitas alias untuk studentClass
  schoolName?: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
}

export interface NisSecuritySettings {
  validationMode: NisValidationMode; // 'registered_only' (Strict Whitelist) or 'open' (Mode Bebas)
  enforceSingleSession: boolean;     // Cegah ujian secara bersamaan dengan NIS yang sama
  sessionTimeoutMinutes: number;     // Batas waktu sesi aktif tanpa heartbeat (menit)
  allowSupervisorUnlock: boolean;    // Izinkan guru mereset / membuka sesi dengan PIN Pengawas
  enableSupervisorPin?: boolean;     // Status aktif / nonaktif proteksi PIN Guru (bisa dinonaktifkan)
  supervisorPin: string;             // PIN Pengawas untuk membuka/mereset sesi terkunci
  autoFillClassAndName: boolean;     // Otomatis kunci & isi nama/kelas jika NIS cocok
  isTokenRequired?: boolean;         // Status aktif / nonaktif validasi token ujian siswa secara global
  logoTapCount?: number;             // Jumlah ketukan logo sekolah untuk kembali ke mode pengawas (default: 3)
  defaultSubject?: string;           // Mata pelajaran default / bawaan sistem
  defaultClass?: string;             // Kelas / rombel default / bawaan sistem
  defaultGrade?: SmaGrade;           // Tingkat kelas default (10/11/12)
  defaultMajor?: SmaMajor;           // Jurusan default (MIPA/IPS/Bahasa/Umum)
}

export const DEFAULT_NIS_SECURITY_SETTINGS: NisSecuritySettings = {
  validationMode: 'open', // Mode Terbuka sebagai default
  enforceSingleSession: true,
  sessionTimeoutMinutes: 60,
  allowSupervisorUnlock: true,
  enableSupervisorPin: true, // Proteksi PIN Mode Guru aktif secara default (dapat dinonaktifkan)
  supervisorPin: '1234',
  autoFillClassAndName: true,
  isTokenRequired: false, // Default: Token ujian opsional (bebas tanpa token)
  logoTapCount: 3,       // Default 3 kali ketukan logo untuk kembali ke mode pengawas
};

export interface ActiveExamSession {
  sessionId: string;
  nis: string;
  fullName: string;
  studentClass: string;
  packageId: string;
  packageTitle: string;
  startedAt: number;
  lastHeartbeat: number;
  deviceId: string;
  deviceInfo?: string;
  status: 'in_progress' | 'completed' | 'terminated';
}

export interface SchoolInfo {
  schoolName: string;
  schoolAddress: string;
  schoolLogo?: string;
  academicYear?: string;
  headmasterName?: string;
  headmasterNip?: string;
  schoolNpsn?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolWebsite?: string;
}

export const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  schoolName: 'SMAN 19 BANDUNG',
  schoolAddress: 'Jl. Dago Pojok No. 87, Dago, Kec. Coblong, Kota Bandung, Jawa Barat 40135 | Telp: (022) 2504245 | sman19bandung.sch.id',
  schoolLogo: '/logo-sman19.svg',
  academicYear: 'Tahun Ajaran 2025/2026',
  headmasterName: 'Drs. H. Bambang Sujarwo, M.Pd.',
  headmasterNip: 'NIP. 19740512 199903 1 002',
  schoolNpsn: 'NPSN: 20219245',
  schoolPhone: '(022) 2504245',
  schoolEmail: 'info@sman19bandung.sch.id',
  schoolWebsite: 'sman19bandung.sch.id',
};

export interface ExamScheduleItem {
  id: string;
  packageId: string;
  subjectName: string;
  dayName: string; // 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu'
  dateDisplay: string; // 'Senin, 24 Agustus 2026'
  dateIso: string; // '2026-08-24'
  startTime: string; // '07:30'
  endTime: string; // '09:00'
  targetClass: string; // 'Kelas XII MIPA & IPS'
  grade?: SmaGrade;
  major?: SmaMajor;
  durationMinutes: number;
  totalQuestions: number;
  kkmScore: number;
  sessionNumber: number; // 1, 2, 3
  roomName?: string;
  supervisorName?: string;
  token?: string; // Token ujian khusus mata pelajaran (dapat diubah/diacak kapan saja jika diperlukan)
  isTokenRequired?: boolean; // Apakah token ujian wajib dimasukkan siswa untuk mapel ini (bila tidak diset, mengikuti pengaturan global)
  isCustomized?: boolean;
  isVisibleToStudents?: boolean; // Apakah mapel/sesi ini tampil di halaman ujian siswa (default true)
}

export type ExamViewMode = 
  | 'dashboard' 
  | 'exam_schedule_list'
  | 'exam_schedule_management'
  | 'sma_hub' 
  | 'question_bank_input' 
  | 'google_drive_hub' 
  | 'google_calendar_hub' 
  | 'student_gate' 
  | 'exam_cbt' 
  | 'result_analysis' 
  | 'review_solutions' 
  | 'custom_drill' 
  | 'locked_status' 
  | 'exam_exit'
  | 'app_layout_editor';

export interface AppLayoutSettings {
  floatingMenuPosition: 'left' | 'center' | 'right' | 'hidden';
  themePreset: 'default' | 'ocean' | 'emerald' | 'amber' | 'crimson';
  contentDensity: 'compact' | 'normal' | 'spacious';
  cardRadius: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showFlowchartBreadcrumbs: boolean;
  highlightActiveFlow: boolean;
  accentColorHex?: string;
  enableHeaderShadow?: boolean;
}


