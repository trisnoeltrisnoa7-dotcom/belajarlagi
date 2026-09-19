import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Bot,
  Zap,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileText,
  Lightbulb,
  Lock,
} from 'lucide-react';
import { ExamPackage, ExamResult, Question, UserAnswerRecord, ExamDisplaySettings } from '../types';
import { isAnswerCorrect } from '../utils/scoringEngine';
import { AiTutorModal } from './AiTutorModal';
import { AudioPlayerBadge } from './AudioPlayerBadge';

interface ReviewSolutionsViewProps {
  pkg: ExamPackage;
  result: ExamResult;
  displaySettings?: ExamDisplaySettings;
  isAdmin?: boolean;
  onBackToResult: () => void;
}

export const ReviewSolutionsView: React.FC<ReviewSolutionsViewProps> = ({
  pkg,
  result,
  displaySettings,
  isAdmin = false,
  onBackToResult,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterMode, setFilterMode] = useState<'ALL' | 'INCORRECT' | 'CORRECT' | 'DOUBTFUL'>('ALL');
  const [selectedSubtestFilter, setSelectedSubtestFilter] = useState<string>('ALL');
  const [activeAiQuestion, setActiveAiQuestion] = useState<Question | null>(null);

  const isAllowed = isAdmin || (displaySettings?.showAnswerKeyAndExplanation ?? true);

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-white">
              Pembahasan & Kunci Jawaban Dinonaktifkan
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Kunci jawaban dan pembahasan soal untuk paket ujian ini dinonaktifkan pada Pengaturan Tampilan Ujian demi menjaga kerahasiaan soal.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToResult}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
          >
            Kembali ke Laporan Skor & Hasil
          </button>
        </div>
      </div>
    );
  }

  const questions: Question[] = pkg?.questions || [];

  // Filter questions according to student's status
  const filteredQuestions = questions.filter(q => {
    const record = result?.answers?.[q.id];
    const isCorrect = isAnswerCorrect(q, record);
    const isDoubt = record?.isDoubtful;
    const hasAnswer =
      record &&
      (record.selectedOption !== undefined ||
        (record.numericAnswer && record.numericAnswer.trim() !== '') ||
        (record.complexAnswers && Object.keys(record.complexAnswers).length > 0));

    if (selectedSubtestFilter !== 'ALL' && q.subtestId !== selectedSubtestFilter) {
      return false;
    }

    if (filterMode === 'INCORRECT') return !isCorrect;
    if (filterMode === 'CORRECT') return isCorrect;
    if (filterMode === 'DOUBTFUL') return isDoubt;
    return true;
  });

  const currentQuestion = filteredQuestions[currentIndex] || filteredQuestions[0] || questions[0];
  const currentRecord: UserAnswerRecord | undefined = result?.answers?.[currentQuestion?.id];
  const isCorrect = currentQuestion ? isAnswerCorrect(currentQuestion, currentRecord) : false;

  const formatUserAnswerDisplay = () => {
    if (!currentRecord) return 'Tidak dijawab (Kosong)';
    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'cause_reason') {
      return currentRecord.selectedOption ? `Opsi ${currentRecord.selectedOption}` : 'Tidak dijawab';
    }
    if (currentQuestion.type === 'multi_select_choice') {
      const opts = currentRecord.selectedOptions || (currentRecord.selectedOption ? [currentRecord.selectedOption] : []);
      return opts.length > 0 ? `Opsi [ ${opts.join(', ')} ]` : 'Tidak dijawab';
    }
    if (currentQuestion.type === 'short_numeric' || currentQuestion.type === 'long_essay') {
      return currentRecord.numericAnswer ? currentRecord.numericAnswer : 'Tidak diisi';
    }
    if (currentQuestion.type === 'complex_multiple_choice') {
      return 'Tabel Pernyataan (Lihat status per baris)';
    }
    return 'Belum terjawab';
  };

  const formatCorrectAnswerDisplay = () => {
    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'cause_reason') {
      return `Opsi ${currentQuestion.correctAnswer}`;
    }
    if (currentQuestion.type === 'multi_select_choice') {
      if (Array.isArray(currentQuestion.correctAnswer)) {
        return `Opsi [ ${currentQuestion.correctAnswer.join(', ')} ]`;
      }
      return `Opsi [ ${String(currentQuestion.correctAnswer)} ]`;
    }
    if (currentQuestion.type === 'short_numeric' || currentQuestion.type === 'long_essay') {
      return `${currentQuestion.correctAnswer}`;
    }
    if (currentQuestion.type === 'complex_multiple_choice') {
      return 'Kombinasi Benar/Salah Sesuai Kunci';
    }
    return String(currentQuestion.correctAnswer);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToResult}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Laporan Skor</span>
          </button>
          <div className="hidden sm:block">
            <h2 className="font-bold text-sm text-white">Pembahasan Soal & Kunci Jawaban</h2>
            <p className="text-xs text-slate-400">{pkg.title}</p>
          </div>
        </div>

        {/* Ask AI Tutor CTA Button */}
        <button
          id="btn-ask-ai-tutor-header"
          onClick={() => setActiveAiQuestion(currentQuestion)}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-950/50 transition-all active:scale-95 animate-pulse"
        >
          <Bot className="w-4 h-4 text-amber-300" />
          <span>Tanya Tutor AI Soal Ini</span>
        </button>
      </header>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <span className="text-slate-400 font-semibold flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Status:</span>
          </span>
          {(['ALL', 'INCORRECT', 'CORRECT', 'DOUBTFUL'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setFilterMode(mode);
                setCurrentIndex(0);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterMode === mode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'ALL'
                ? `Semua (${pkg.questions.length})`
                : mode === 'INCORRECT'
                ? `Salah/Kosong (${result.totalIncorrect + result.totalBlank})`
                : mode === 'CORRECT'
                ? `Benar (${result.totalCorrect})`
                : 'Ragu-Ragu'}
            </button>
          ))}
        </div>

        {/* Subtest Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400">Subtes:</span>
          <select
            value={selectedSubtestFilter}
            onChange={e => {
              setSelectedSubtestFilter(e.target.value);
              setCurrentIndex(0);
            }}
            className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Semua Subtes</option>
            {pkg.subtests.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Review Area */}
      <div className="flex-1 flex overflow-hidden">
        {filteredQuestions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
            <div>
              <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-sm">Tidak ada soal yang cocok dengan filter ini.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left/Main Column: Question & Explanation */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
              {/* Question Header & Status Indicator */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white ${
                      isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    {currentIndex + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      {currentQuestion.subtestName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Topik: {currentQuestion.topic} • {currentQuestion.difficulty}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isCorrect ? (
                    <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Jawaban Benar</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                      <XCircle className="w-4 h-4" />
                      <span>Jawaban Salah / Kosong</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Passage Stimulus if any */}
              {(currentQuestion.stimulus || currentQuestion.stimulusImage || currentQuestion.stimulusAudio) && (
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <FileText className="w-4 h-4" />
                    <span>{currentQuestion.stimulusTitle || 'Wacana Teks Pendukung'}</span>
                  </div>

                  {currentQuestion.stimulus && (
                    <div className="text-sm text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
                      {currentQuestion.stimulus}
                    </div>
                  )}

                  {/* Stimulus Image */}
                  {currentQuestion.stimulusImage && (
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 flex justify-center">
                      <img
                        src={currentQuestion.stimulusImage}
                        alt="Wacana"
                        className="max-h-64 w-auto object-contain rounded-lg shadow"
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

              {/* Question Text & Media */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <p className="font-semibold text-white text-base leading-relaxed break-words">
                  {currentQuestion.questionText}
                </p>

                {/* Question Image */}
                {currentQuestion.questionImage && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 flex justify-center">
                    <img
                      src={currentQuestion.questionImage}
                      alt="Gambar Pertanyaan"
                      className="max-h-60 w-auto object-contain rounded-lg shadow"
                    />
                  </div>
                )}

                {/* Question Audio */}
                {currentQuestion.questionAudio && (
                  <div className="pt-1">
                    <AudioPlayerBadge
                      src={currentQuestion.questionAudio}
                      title="Audio Pertanyaan / Listening"
                    />
                  </div>
                )}
              </div>

              {/* Options with Visual Feedback */}
              <div className="space-y-2.5">
                {(currentQuestion.type === 'multiple_choice' ||
                  currentQuestion.type === 'cause_reason') &&
                  currentQuestion.options?.map(opt => {
                    const isUserChoice = currentRecord?.selectedOption === opt.id;
                    const isOfficialCorrect = currentQuestion.correctAnswer === opt.id;

                    let cardStyle = 'bg-slate-900/60 border-slate-800 text-slate-300';
                    if (isOfficialCorrect) {
                      cardStyle =
                        'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 shadow-sm';
                    } else if (isUserChoice && !isOfficialCorrect) {
                      cardStyle = 'bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-sm';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3.5 rounded-xl border flex flex-col gap-2 ${cardStyle}`}
                      >
                        <div className="flex items-start space-x-3 w-full">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isOfficialCorrect
                                ? 'bg-emerald-600 text-white'
                                : isUserChoice
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {opt.label}
                          </div>
                          <div className="flex-1 text-sm pt-0.5 break-words">
                            <span>{opt.text}</span>
                            {isOfficialCorrect && (
                              <span className="block text-xs font-semibold text-emerald-400 mt-1">
                                ✓ Kunci Jawaban Resmi
                              </span>
                            )}
                            {isUserChoice && !isOfficialCorrect && (
                              <span className="block text-xs font-semibold text-rose-400 mt-1">
                                ✗ Jawaban Pilihan Anda
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Option Media (Image / Audio) */}
                        {(opt.image || opt.audio) && (
                          <div className="pl-10 flex flex-wrap items-center gap-3 pt-1">
                            {opt.image && (
                              <img
                                src={opt.image}
                                alt={`Opsi ${opt.label}`}
                                className="max-h-24 rounded-lg border border-slate-700 bg-slate-950 p-1 object-contain"
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

                {/* TYPE: Multi-Select Choice Review */}
                {currentQuestion.type === 'multi_select_choice' && (
                  <div className="space-y-2.5">
                    <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 flex items-center justify-between">
                      <span className="font-semibold">Format: Pilihan Ganda Jawaban Banyak (Kotak Centang)</span>
                      <span className="text-slate-400">Pilihan Anda: {currentRecord?.selectedOptions?.join(', ') || 'Kosong'}</span>
                    </div>

                    {currentQuestion.options?.map(opt => {
                      const userChoices = currentRecord?.selectedOptions || [];
                      const isUserChosen = userChoices.includes(opt.id);

                      let correctArr: string[] = [];
                      if (Array.isArray(currentQuestion.correctAnswer)) {
                        correctArr = currentQuestion.correctAnswer;
                      } else if (typeof currentQuestion.correctAnswer === 'string') {
                        correctArr = currentQuestion.correctAnswer.split(/[,;\s]+/).map(s => s.trim());
                      }
                      const isOfficialKey = correctArr.includes(opt.id);

                      let cardStyle = 'bg-slate-900/60 border-slate-800 text-slate-300';
                      if (isOfficialKey && isUserChosen) {
                        // Correctly selected!
                        cardStyle = 'bg-emerald-950/50 border-emerald-500/70 text-emerald-100 shadow-sm';
                      } else if (isOfficialKey && !isUserChosen) {
                        // Official key but user missed it
                        cardStyle = 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200';
                      } else if (!isOfficialKey && isUserChosen) {
                        // User chose wrong option
                        cardStyle = 'bg-rose-950/50 border-rose-500/70 text-rose-100 shadow-sm';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${cardStyle}`}
                        >
                          <div className="flex items-start space-x-3 w-full">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isOfficialKey && isUserChosen
                                  ? 'bg-emerald-600 text-white'
                                  : isOfficialKey && !isUserChosen
                                  ? 'bg-cyan-700 text-white'
                                  : !isOfficialKey && isUserChosen
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {opt.label}
                            </div>
                            <div className="flex-1 text-sm pt-0.5 break-words">
                              <span>{opt.text}</span>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-semibold">
                                {isOfficialKey && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    ✓ Kunci Jawaban Benar
                                  </span>
                                )}
                                {isUserChosen && isOfficialKey && (
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                    ✓ Pilihan Anda (Tepat)
                                  </span>
                                )}
                                {isUserChosen && !isOfficialKey && (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                    ✗ Pilihan Anda (Salah)
                                  </span>
                                )}
                                {!isUserChosen && isOfficialKey && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    ⚠ Terlewatkan (Belum Anda Centang)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Multi Option Media (Image / Audio) */}
                          {(opt.image || opt.audio) && (
                            <div className="pl-10 flex flex-wrap items-center gap-3 pt-1">
                              {opt.image && (
                                <img
                                  src={opt.image}
                                  alt={`Opsi ${opt.label}`}
                                  className="max-h-24 rounded-lg border border-slate-700 bg-slate-950 p-1 object-contain"
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

                {/* Complex Multiple Choice Review Table */}
                {currentQuestion.type === 'complex_multiple_choice' && (
                  <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-900/60">
                    <table className="w-full min-w-[340px] text-left text-xs sm:text-sm">
                      <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
                        <tr>
                          <th className="p-3">Pernyataan</th>
                          <th className="p-3 text-center w-24">Jawaban Anda</th>
                          <th className="p-3 text-center w-24">Kunci Benar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {currentQuestion.complexStatements?.map(stmt => {
                          const userVal = currentRecord?.complexAnswers?.[stmt.id];
                          const correctVal = stmt.correctAnswer;
                          const isMatch = userVal === correctVal;
                          return (
                            <tr key={stmt.id} className="hover:bg-slate-800/30">
                              <td className="p-3 text-slate-200">{stmt.text}</td>
                              <td className="p-3 text-center font-bold">
                                <span
                                  className={
                                    isMatch
                                      ? 'text-emerald-400'
                                      : 'text-rose-400 underline decoration-rose-500'
                                  }
                                >
                                  {userVal === true ? 'Benar (B)' : userVal === false ? 'Salah (S)' : '-'}
                                </span>
                              </td>
                              <td className="p-3 text-center font-bold text-cyan-400">
                                {correctVal ? 'Benar (B)' : 'Salah (S)'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Short Numeric / Long Essay Review */}
                {(currentQuestion.type === 'short_numeric' || currentQuestion.type === 'long_essay') && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium">Jawaban Anda:</span>
                      <p className={`p-3 rounded-lg border leading-relaxed whitespace-pre-wrap ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      }`}>
                        {formatUserAnswerDisplay()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium">
                        {currentQuestion.type === 'long_essay' ? 'Model Jawaban / Rubrik Esai:' : 'Kunci Jawaban Resmi:'}
                      </span>
                      <p className="p-3 rounded-lg bg-slate-950 border border-cyan-500/40 text-cyan-200 leading-relaxed whitespace-pre-wrap">
                        {formatCorrectAnswerDisplay()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Comprehensive Step-by-Step Explanation Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-indigo-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Pembahasan Resmi & Konsep Materi</span>
                  </div>

                  <button
                    onClick={() => setActiveAiQuestion(currentQuestion)}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Diskusi dengan AI</span>
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {currentQuestion.explanation.summary}
                </p>

                {/* Steps */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                    Langkah Penyelesaian:
                  </span>
                  <div className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                    {currentQuestion.explanation.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fast Trick / Cara The King */}
                {currentQuestion.explanation.fastTrick && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                    <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Trik Kilat / Solusi Praktis (The King Method):</span>
                    </span>
                    <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                      {currentQuestion.explanation.fastTrick}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Mini List of Filtered Questions */}
            <div className="w-full lg:w-72 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 shrink-0 flex flex-col space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Daftar Soal ({filteredQuestions.length} Butir):
              </span>
              <div className="flex-1 overflow-y-auto grid grid-cols-5 lg:grid-cols-4 gap-2">
                {filteredQuestions.map((q, idx) => {
                  const rec = result.answers[q.id];
                  const right = isAnswerCorrect(q, rec);
                  const isCurrent = idx === currentIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${
                        isCurrent
                          ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900'
                          : ''
                      } ${
                        right
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                          : 'bg-rose-600/30 border-rose-500 text-rose-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <footer className="h-16 bg-slate-900 border-t border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <button
          onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Soal Sebelumnya</span>
        </button>

        <span className="text-xs text-slate-400 font-medium">
          Soal {currentIndex + 1} dari {filteredQuestions.length}
        </span>

        <button
          onClick={() =>
            currentIndex < filteredQuestions.length - 1 && setCurrentIndex(currentIndex + 1)
          }
          disabled={currentIndex >= filteredQuestions.length - 1}
          className="flex items-center space-x-1 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-900/30 transition-all disabled:opacity-40"
        >
          <span>Soal Berikutnya</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

      {/* Interactive AI Tutor Chat Drawer */}
      <AiTutorModal
        isOpen={activeAiQuestion !== null}
        onClose={() => setActiveAiQuestion(null)}
        question={activeAiQuestion}
        userAnswer={activeAiQuestion ? result.answers[activeAiQuestion.id] : undefined}
      />
    </div>
  );
};
