import { ExamResult, SubtestScoreSummary } from '../types';

export interface AiDiagnosticReport {
  overallSummary: string;
  strongestSubjects: string[];
  areasToImprove: string[];
  recommendedSchedule: string[];
  targetAdvice: string;
}

/**
 * Generate high-accuracy heuristic AI diagnostic report directly on client
 * Works seamlessly whether online or offline
 */
export function generateLocalAiDiagnostic(
  result: ExamResult,
  targetPtn: string = 'PTN Favorit',
  targetMajor: string = 'Program Studi Pilihan'
): AiDiagnosticReport {
  const accuracy = result.overallAccuracy || 0;
  const totalIrt = result.totalIrtScore || 500;
  const subtestEntries = Object.values(result.subtestSummaries || {}) as SubtestScoreSummary[];

  // Sort subtests by score
  const sorted = [...subtestEntries].sort((a, b) => (b.irtScore || 0) - (a.irtScore || 0));
  const strongest = sorted.slice(0, 2).map((s) => s.subtestName);
  const weakest = sorted.slice(-2).reverse().map((s) => s.subtestName);

  if (strongest.length === 0) strongest.push('Literasi Bahasa Indonesia', 'Penalaran Umum');
  if (weakest.length === 0) weakest.push('Pengetahuan Kuantitatif', 'Penalaran Matematika');

  let summary = '';
  if (accuracy >= 80) {
    summary = `Performa luar biasa pada paket ${result.packageTitle}! Anda meraih akurasi ${accuracy}% dengan total skor IRT ${totalIrt}. Penguasaan konsep sangat solid dan siap bersaing pada passing grade SNBT tertinggi.`;
  } else if (accuracy >= 60) {
    summary = `Hasil tryout ${result.packageTitle} menunjukkan fondasi yang kuat dengan total skor IRT ${totalIrt} (akurasi ${accuracy}%). Fokus perbaikan pada subtes berbobot tinggi akan mendongkrak peluang kelulusan secara signifikan.`;
  } else {
    summary = `Simulasi ${result.packageTitle} menjadi tolok ukur awal yang bernilai (skor IRT ${totalIrt}, akurasi ${accuracy}%). Dengan latihan soal terarah dan pembedahan materi HOTS, peningkatan skor 100+ poin sangat realistis dicapai.`;
  }

  return {
    overallSummary: summary,
    strongestSubjects: strongest,
    areasToImprove: weakest,
    recommendedSchedule: [
      `Senin - Rabu: Drill 25 butir soal fokus pada ${weakest[0] || 'Penalaran Matematika'} dan telaah kunci jawaban.`,
      `Kamis - Jumat: Latihan penguatan kecepatan membaca wacana pada ${weakest[1] || 'Literasi Bahasa'} dengan target 1.5 menit/soal.`,
      `Sabtu: Simulasi CBT Mandiri penuh (Full Tryout) dengan suasana ujian sesungguhnya.`,
      `Minggu: Evaluasi berkala lembar pengerjaan & review Bank Soal untuk mengunci pemahaman konsep.`,
    ],
    targetAdvice: `Untuk target ${targetMajor} di ${targetPtn}, pertahankan keunggulan di ${strongest[0]} dan tingkatkan skor ${weakest[0]} minimal 40-70 poin agar posisi Anda semakin aman di kuota SNBT.`,
  };
}

/**
 * Safely fetch AI diagnostic with timeout and offline fallback
 */
export async function fetchAiDiagnosticSafe(
  result: ExamResult,
  targetPtn: string,
  targetMajor: string
): Promise<AiDiagnosticReport> {
  const localFallback = generateLocalAiDiagnostic(result, targetPtn, targetMajor);

  // If offline, return local diagnostic immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return localFallback;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const subtestScores = (Object.values(result.subtestSummaries || {}) as SubtestScoreSummary[]).map((s) => ({
      name: s.subtestName,
      score: s.irtScore,
      accuracy: s.accuracyPercentage,
      weaknesses: s.weaknesses,
    }));

    const res = await fetch('/api/ai/analyze-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resultSummary: {
          packageTitle: result.packageTitle,
          totalIrtScore: result.totalIrtScore,
          totalCorrect: result.totalCorrect,
          totalIncorrect: result.totalIncorrect,
          totalBlank: result.totalBlank,
          accuracy: result.overallAccuracy,
          totalDurationMinutes: Math.round(result.totalDurationSeconds / 60),
          subtestScores,
        },
        targetPtn: targetPtn || 'Universitas Indonesia',
        targetMajor: targetMajor || 'Program Studi Impian',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.overallSummary) {
        return data;
      }
    }
  } catch {
    // Network unavailable, timeout, or dev fallback - return local fallback gracefully
  }

  return localFallback;
}
