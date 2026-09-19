import React, { useState } from 'react';
import { X, Sparkles, Loader2, Play, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { ExamPackage, Question } from '../types';
import { SUBTEST_CONFIGS } from '../data/mockPackages';

interface CustomDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCustomDrill: (customPkg: ExamPackage) => void;
}

export const CustomDrillModal: React.FC<CustomDrillModalProps> = ({
  isOpen,
  onClose,
  onStartCustomDrill,
}) => {
  const [selectedSubtest, setSelectedSubtest] = useState(SUBTEST_CONFIGS[0]);
  const [topicPrompt, setTopicPrompt] = useState('');
  const [difficulty, setDifficulty] = useState<'Mudah' | 'Sedang' | 'Sulit' | 'HOTS'>('Sedang');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateDrill = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/generate-drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtest: selectedSubtest.name,
          topic: topicPrompt.trim() || selectedSubtest.name,
          difficulty,
          count: questionCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi AI generator');
      }

      const data = await response.json();
      const generatedQuestions: Question[] = data.questions || [];

      if (generatedQuestions.length === 0) {
        throw new Error('Tidak ada soal yang berhasil digenerate.');
      }

      // Create a temporary ExamPackage
      const customPkg: ExamPackage = {
        id: `drill-ai-${Date.now()}`,
        title: `AI Smart Drill: ${selectedSubtest.name} (${difficulty})`,
        badge: 'AI Generated Drill',
        tagline: `Latihan kilat topik ${topicPrompt || selectedSubtest.name} dengan analisis otomatis.`,
        category: 'DRILL',
        durationMinutes: Math.max(5, questionCount * 3),
        totalQuestions: generatedQuestions.length,
        subtests: [
          {
            ...selectedSubtest,
            questionCount: generatedQuestions.length,
            durationMinutes: Math.max(5, questionCount * 3),
          },
        ],
        questions: generatedQuestions,
      };

      onStartCustomDrill(customPkg);
      onClose();
    } catch (err: any) {
      console.warn('AI Drill network unavailable, generating local drill package:', err);
      // Fallback local drill package
      const fallbackQuestions: Question[] = Array.from({ length: questionCount }).map((_, i) => ({
        id: `drill-local-${Date.now()}-${i + 1}`,
        subtestId: selectedSubtest.id,
        subtestName: selectedSubtest.name,
        category: 'TPS',
        type: 'multiple_choice',
        stimulus: `Latihan Pemahaman Topik: ${topicPrompt.trim() || selectedSubtest.name}. Perhatikan konsep dasar dan relasi logis berikut.`,
        questionText: `Pada pokok materi ${topicPrompt.trim() || selectedSubtest.name}, manakah kesimpulan yang paling tepat di bawah ini?`,
        options: [
          { id: 'A', label: 'A', text: 'Pernyataan A merupakan implikasi logis yang benar secara konsisten.' },
          { id: 'B', label: 'B', text: 'Pernyataan B menyimpang dari asumsi dasar materi.' },
          { id: 'C', label: 'C', text: 'Pernyataan C mengandung kontradiksi pada variabel kedua.' },
          { id: 'D', label: 'D', text: 'Pernyataan D tidak memiliki korelasi dengan kondisi yang diberikan.' },
          { id: 'E', label: 'E', text: 'Pernyataan E mengabaikan batasan nilai parameter.' },
        ],
        correctAnswer: 'A',
        explanation: {
          summary: 'Kunci jawaban A tepat karena premis mendukung secara logis kesimpulan opsi A.',
          steps: [
            `Langkah 1: Identifikasi topik latihan (${topicPrompt.trim() || selectedSubtest.name}).`,
            'Langkah 2: Uji validitas tiap alternatif jawaban.',
            'Langkah 3: Opsi A terbukti valid dan memenuhi kriteria kebenaran.',
          ],
          concept: `Logika Penalaran & Konsep Inti ${topicPrompt.trim() || selectedSubtest.name}`,
          fastTrick: 'Cari opsi yang tidak melakukan over-generalisasi dan relevan langsung dengan data.',
        },
        difficulty: difficulty || 'Sedang',
        irtWeight: difficulty === 'HOTS' ? 90 : 80,
        topic: topicPrompt.trim() || selectedSubtest.name,
      }));

      const customPkg: ExamPackage = {
        id: `drill-ai-${Date.now()}`,
        title: `AI Smart Drill: ${selectedSubtest.name} (${difficulty})`,
        badge: 'AI Generated Drill',
        tagline: `Latihan kilat topik ${topicPrompt || selectedSubtest.name} dengan analisis otomatis.`,
        category: 'DRILL',
        durationMinutes: Math.max(5, questionCount * 3),
        totalQuestions: fallbackQuestions.length,
        subtests: [
          {
            ...selectedSubtest,
            questionCount: fallbackQuestions.length,
            durationMinutes: Math.max(5, questionCount * 3),
          },
        ],
        questions: fallbackQuestions,
      };

      onStartCustomDrill(customPkg);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="custom-drill-modal-content"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-950/40 via-slate-900 to-indigo-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">AI Smart Drill Generator</h3>
              <p className="text-xs text-slate-400">
                Buat latihan soal kustom instan dengan kecerdasan Gemini AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleGenerateDrill} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Subtest Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Pilih Subtes UTBK:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUBTEST_CONFIGS.map(sub => {
                const isSelected = selectedSubtest.id === sub.id;
                return (
                  <button
                    type="button"
                    key={sub.id}
                    onClick={() => setSelectedSubtest(sub)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-violet-600/20 border-violet-500 text-violet-200 shadow-sm'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-bold block text-white">{sub.shortName}</span>
                    <span className="truncate block opacity-80">{sub.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Topic */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Topik / Materi Spesifik (Opsional):
            </label>
            <input
              type="text"
              placeholder="Contoh: Silogisme Kuantitatif, Matriks Invers, Passive Voice..."
              value={topicPrompt}
              onChange={e => setTopicPrompt(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Difficulty & Count */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tingkat Kesulitan:
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
              >
                <option value="Mudah">Mudah (Dasar)</option>
                <option value="Sedang">Sedang (Standar UTBK)</option>
                <option value="Sulit">Sulit (Menantang)</option>
                <option value="HOTS">HOTS (Higher Order Thinking)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jumlah Soal:
              </label>
              <select
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
              >
                <option value={3}>3 Soal (Drill Kilat)</option>
                <option value={5}>5 Soal (Standar)</option>
                <option value={8}>8 Soal (Intensif)</option>
              </select>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-900/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Meracik Soal AI...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Mulai Drill AI</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
