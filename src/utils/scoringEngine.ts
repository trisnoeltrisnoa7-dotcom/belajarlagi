import {
  ExamPackage,
  ExamResult,
  ProctoringSummary,
  PtnTarget,
  Question,
  SeparatedSubjectScore,
  SubtestScoreSummary,
  UserAnswerRecord,
} from '../types';

export function isAnswerCorrect(question: Question, record?: UserAnswerRecord): boolean {
  if (!record) return false;

  if (question.type === 'multiple_choice' || question.type === 'cause_reason') {
    return record.selectedOption === question.correctAnswer;
  }

  if (question.type === 'multi_select_choice') {
    const userSelected = record.selectedOptions || (record.selectedOption ? [record.selectedOption] : []);
    if (userSelected.length === 0) return false;

    let correctList: string[] = [];
    if (Array.isArray(question.correctAnswer)) {
      correctList = question.correctAnswer.map(String);
    } else if (typeof question.correctAnswer === 'string') {
      correctList = question.correctAnswer
        .split(/[,;\s]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }

    if (correctList.length === 0) return false;

    const normalizedUser = [...userSelected].map(s => s.trim().toUpperCase()).sort();
    const normalizedCorrect = [...correctList].map(s => s.trim().toUpperCase()).sort();

    if (normalizedUser.length !== normalizedCorrect.length) return false;
    return normalizedUser.every((val, idx) => val === normalizedCorrect[idx]);
  }

  if (question.type === 'short_numeric') {
    if (!record.numericAnswer) return false;
    const cleanUser = record.numericAnswer.trim().replace(',', '.');
    const cleanCorrect = String(question.correctAnswer).trim().replace(',', '.');
    return cleanUser === cleanCorrect;
  }

  if (question.type === 'long_essay') {
    const rawAnswer = (record.essayAnswer || record.numericAnswer || '').trim();
    if (!rawAnswer) return false;
    const wordCount = rawAnswer.split(/\s+/).filter(Boolean).length;
    const minTarget = question.minWordCount || 0;
    // If word count constraint exists, require meeting target
    if (minTarget > 0 && wordCount < minTarget) {
      return false;
    }
    // Consider answered and substantial (at least 10 words or matching target)
    return wordCount >= Math.max(5, minTarget > 0 ? minTarget : 10);
  }

  if (question.type === 'complex_multiple_choice') {
    if (!record.complexAnswers || !question.complexStatements) return false;
    const correctMap = question.correctAnswer as Record<string, boolean>;
    for (const stmt of question.complexStatements) {
      if (record.complexAnswers[stmt.id] !== correctMap[stmt.id]) {
        return false;
      }
    }
    return true;
  }

  return false;
}

export function evaluateExamSubmission(
  pkg: ExamPackage,
  answers: Record<string, UserAnswerRecord>,
  startedAtTimestamp: number,
  submittedAtTimestamp: number,
  selectedTargets: PtnTarget[],
  proctoringSummary?: ProctoringSummary
): ExamResult {
  const totalDurationSeconds = Math.max(1, Math.round((submittedAtTimestamp - startedAtTimestamp) / 1000));
  const subtestSummaries: Record<string, SubtestScoreSummary> = {};
  const separatedSubjectScores: Record<string, SeparatedSubjectScore> = {};

  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalBlank = 0;
  let totalWeightedScore = 0;
  let totalPossibleWeight = 0;

  const isMultiSequential = Boolean(
    pkg.isMultiSubjectSequential ||
    (pkg.sessionSchedules && pkg.sessionSchedules.length > 1)
  );

  // Group questions by subtest / subject
  pkg.subtests.forEach((subtest, idx) => {
    const subtestQuestions = pkg.questions.filter(
      q => q.subtestId === subtest.id || (q.subject && subtest.name.toLowerCase().includes(q.subject.toLowerCase()))
    );
    
    // Fallback if matching questions by subtestId didn't capture all
    const questionsToScore = subtestQuestions.length > 0
      ? subtestQuestions
      : pkg.questions.filter(q => q.subtestId === subtest.id);

    let correctCount = 0;
    let incorrectCount = 0;
    let blankCount = 0;
    let subtestTimeSpent = 0;
    let subtestWeightedPoints = 0;
    let subtestMaxWeight = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const q of questionsToScore) {
      const record = answers[q.id];
      const hasAnswered =
        record &&
        (record.selectedOption !== undefined ||
          (record.selectedOptions && record.selectedOptions.length > 0) ||
          (record.numericAnswer && record.numericAnswer.trim() !== '') ||
          (record.complexAnswers && Object.keys(record.complexAnswers).length > 0));

      const timeSpent = record?.timeSpentSeconds || 0;
      subtestTimeSpent += timeSpent;

      const itemWeight = q.irtWeight || 80;
      subtestMaxWeight += itemWeight;

      if (!hasAnswered) {
        blankCount++;
        totalBlank++;
        if (!weaknesses.includes(q.topic)) weaknesses.push(q.topic);
      } else {
        const correct = isAnswerCorrect(q, record);
        if (correct) {
          correctCount++;
          totalCorrect++;
          subtestWeightedPoints += itemWeight;
          if (!strengths.includes(q.topic)) strengths.push(q.topic);
        } else {
          incorrectCount++;
          totalIncorrect++;
          if (!weaknesses.includes(q.topic)) weaknesses.push(q.topic);
        }
      }
    }

    totalWeightedScore += subtestWeightedPoints;
    totalPossibleWeight += subtestMaxWeight;

    const totalQuestions = questionsToScore.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    // Scale IRT between 200 (floor) and 1000 (ceiling)
    const weightedRatio = subtestMaxWeight > 0 ? subtestWeightedPoints / subtestMaxWeight : 0;
    const irtScore = Math.round(200 + weightedRatio * 800);

    // Scale 0-100 standard school grading
    const score100 = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const avgTimePerQuestion =
      totalQuestions > 0 ? Math.round(subtestTimeSpent / totalQuestions) : 0;

    // Find custom session schedule if available
    const sessionSched = pkg.sessionSchedules?.find(
      s => s.subtestId === subtest.id || s.sessionNumber === idx + 1 || s.subjectName.toLowerCase().includes(subtest.name.toLowerCase())
    );

    const kkm = sessionSched?.kkmScore || pkg.kkmScore || 75;
    const isPassedKkm = score100 >= kkm;

    subtestSummaries[subtest.id] = {
      subtestId: subtest.id,
      subtestName: subtest.name,
      category: subtest.category,
      rawScore: correctCount,
      totalQuestions,
      correct: correctCount,
      incorrect: incorrectCount,
      blank: blankCount,
      accuracyPercentage: accuracy,
      irtScore,
      timeSpentSeconds: subtestTimeSpent,
      avgTimePerQuestionSeconds: avgTimePerQuestion,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
    };

    // Separated detailed score report for each of the 3 subjects
    separatedSubjectScores[subtest.id] = {
      sessionNumber: sessionSched?.sessionNumber || idx + 1,
      subtestId: subtest.id,
      subjectName: sessionSched?.subjectName || subtest.name,
      category: subtest.category,
      rawScore: correctCount,
      totalQuestions,
      correct: correctCount,
      incorrect: incorrectCount,
      blank: blankCount,
      score100,
      irtScore,
      kkmScore: kkm,
      isPassedKkm,
      accuracyPercentage: accuracy,
      timeSpentSeconds: subtestTimeSpent,
      avgTimePerQuestionSeconds: avgTimePerQuestion,
      strengths: strengths.slice(0, 4),
      weaknesses: weaknesses.slice(0, 4),
      isLockedFinished: true, // Marked finished and locked
      finishedAt: new Date(submittedAtTimestamp).toISOString(),
    };
  });

  const overallRatio = totalPossibleWeight > 0 ? totalWeightedScore / totalPossibleWeight : 0;
  const totalIrtScore = Math.round(200 + overallRatio * 800);
  const totalQuestions = pkg.questions.length;
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Evaluate PTN chances
  const targetPtnEvaluations = selectedTargets.map(ptn => {
    const diff = totalIrtScore - ptn.passingScoreEstimate;
    let chanceLabel: 'Sangat Tinggi' | 'Tinggi' | 'Peluang Bersaing' | 'Perlu Ditingkatkan';
    let chancePercentage = 50;

    if (diff >= 30) {
      chanceLabel = 'Sangat Tinggi';
      chancePercentage = Math.min(98, 85 + diff * 0.3);
    } else if (diff >= 0) {
      chanceLabel = 'Tinggi';
      chancePercentage = Math.min(84, 70 + diff * 0.5);
    } else if (diff >= -35) {
      chanceLabel = 'Peluang Bersaing';
      chancePercentage = Math.max(40, 60 + diff * 0.6);
    } else {
      chanceLabel = 'Perlu Ditingkatkan';
      chancePercentage = Math.max(15, 35 + diff * 0.4);
    }

    return {
      ptn,
      difference: diff,
      chanceLabel,
      chancePercentage: Math.round(chancePercentage),
    };
  });

  return {
    id: `result-${Date.now()}`,
    packageId: pkg.id,
    packageTitle: pkg.title,
    startedAt: new Date(startedAtTimestamp).toISOString(),
    submittedAt: new Date(submittedAtTimestamp).toISOString(),
    totalDurationSeconds,
    timeLimitSeconds: pkg.durationMinutes * 60,
    totalIrtScore,
    totalCorrect,
    totalIncorrect,
    totalBlank,
    totalQuestions,
    overallAccuracy,
    subtestSummaries,
    separatedSubjectScores,
    isMultiSubjectSequential: isMultiSequential,
    answers,
    targetPtnEvaluations,
    proctoringSummary,
    isExamLockedFinished: true,
  };
}
