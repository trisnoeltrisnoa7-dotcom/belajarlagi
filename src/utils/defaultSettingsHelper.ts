import { SmaGrade, SmaMajor } from '../types';
import {
  getMasterSubjects,
  getMasterClasses,
  subscribeMasterSubjectClass,
} from './centralSubjectClassManager';

export const DEFAULT_SUBJECT_CLASS_EVENT = 'cbt-default-subject-class-changed';

export const DEFAULT_STORAGE_KEYS = {
  SUBJECT: 'cbt_default_subject',
  CLASS: 'cbt_default_class',
  GRADE: 'cbt_default_grade',
  MAJOR: 'cbt_default_major',
};

/**
 * Infer grade and major from a class name (e.g. "12 MIPA 1" -> grade "12", major "MIPA")
 */
export function inferGradeAndMajorFromClass(className: string): { grade: SmaGrade; major: SmaMajor } {
  const clean = (className || '').trim().toUpperCase();
  let grade: SmaGrade = '11';
  let major: SmaMajor = 'MIPA';

  if (clean.startsWith('10') || clean.startsWith('X ') || clean === 'X' || clean.startsWith('X-')) {
    grade = '10';
  } else if (clean.startsWith('12') || clean.startsWith('XII ') || clean === 'XII' || clean.startsWith('XII-')) {
    grade = '12';
  } else if (clean.startsWith('11') || clean.startsWith('XI ') || clean === 'XI' || clean.startsWith('XI-')) {
    grade = '11';
  }

  if (clean.includes('IPS') || clean.includes('SOSIAL')) {
    major = 'IPS';
  } else if (clean.includes('BAHASA')) {
    major = 'Bahasa';
  } else if (clean.includes('MIPA') || clean.includes('IPA')) {
    major = 'MIPA';
  } else {
    major = 'Umum';
  }

  return { grade, major };
}

/**
 * Get the currently first active master subject (no hardcoded fallback)
 */
export function getDefaultSubject(): string {
  const master = getMasterSubjects();
  if (master.length > 0) {
    return master[0].name;
  }
  return '';
}

/**
 * Get the currently first active master class (no hardcoded fallback)
 */
export function getDefaultClass(): string {
  const master = getMasterClasses();
  if (master.length > 0) {
    return master[0].name;
  }
  return '';
}

/**
 * Get the current grade level from master class
 */
export function getDefaultGrade(): SmaGrade {
  const currentClass = getDefaultClass();
  const inferred = inferGradeAndMajorFromClass(currentClass);
  return inferred.grade;
}

/**
 * Get the current major from master class
 */
export function getDefaultMajor(): SmaMajor {
  const currentClass = getDefaultClass();
  const inferred = inferGradeAndMajorFromClass(currentClass);
  return inferred.major;
}

/**
 * Check if a given subject is present in the centralized master subjects
 */
export function isDefaultSubject(subjectName?: string): boolean {
  if (!subjectName) return false;
  const target = subjectName.trim().toLowerCase();
  const master = getMasterSubjects();
  return master.some(s => s.name.toLowerCase() === target);
}

/**
 * Check if a given class is present in the centralized master classes
 */
export function isDefaultClass(className?: string): boolean {
  if (!className) return false;
  const target = className.trim().toLowerCase();
  const master = getMasterClasses();
  return master.some(c => c.name.toLowerCase() === target);
}

/**
 * Legacy setters maintained for backwards compatibility if called
 */
export function setDefaultSubject(subject: string): void {
  // Master subject is now managed via centralSubjectClassManager
}

export function setDefaultClass(studentClass: string): void {
  // Master class is now managed via centralSubjectClassManager
}

export function setDefaultSubjectAndClass(
  subject: string,
  studentClass: string,
  grade?: SmaGrade,
  major?: SmaMajor,
  _notify?: boolean
): void {
  // Master is managed via centralSubjectClassManager
}

/**
 * Subscribe to realtime changes from centralized master manager
 */
export function subscribeDefaultSubjectClass(
  callback: (config: {
    subject: string;
    studentClass: string;
    grade: SmaGrade;
    major: SmaMajor;
  }) => void
): () => void {
  return subscribeMasterSubjectClass(() => {
    callback({
      subject: getDefaultSubject(),
      studentClass: getDefaultClass(),
      grade: getDefaultGrade(),
      major: getDefaultMajor(),
    });
  });
}
