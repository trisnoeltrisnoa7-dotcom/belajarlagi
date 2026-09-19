import { ExamPackage, Question, ExamScheduleItem, StudentRosterEntry, SmaMajor } from '../types';
import { generateSubjectExamToken } from './tokenSecurity';

export interface MasterSubject {
  id: string;
  name: string;
  code?: string;
  category: 'Umum' | 'MIPA' | 'IPS' | 'Kejuruan' | 'Muatan Lokal' | 'Lainnya';
  color?: string;
  icon?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterClass {
  id: string;
  name: string;
  gradeLevel: '10' | '11' | '12' | 'Semua Kelas' | string;
  major: 'MIPA' | 'IPS' | 'Bahasa' | 'Kejuruan' | 'Umum' | string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CascadeSummary {
  questionsUpdated: number;
  questionsDeleted: number;
  packagesUpdated: number;
  packagesDeleted: number;
  schedulesUpdated: number;
  schedulesDeleted: number;
  studentsUpdated: number;
}

const STORAGE_KEYS = {
  MASTER_SUBJECTS: 'cbt_central_master_subjects_v1',
  MASTER_CLASSES: 'cbt_central_master_classes_v1',
  LEGACY_SUBJECTS: 'cbt_master_subjects_v1',
  LEGACY_CLASSES: 'cbt_master_classes_v1',
  QUESTION_BANK: 'cbt_question_bank_questions_v1',
  SMA_PACKAGES: 'cbt_sma_packages_v1',
  SCHEDULE_ITEMS: 'cbt_exam_schedules_v1',
  STUDENT_ROSTER: 'cbt_student_roster_v1',
  CACHED_PACKAGES: 'cbt_cached_exam_packages_list',
  EXAM_HISTORY: 'cbt_exam_history_v1',
  ACTIVE_SESSIONS: 'cbt_active_exam_sessions_v1',
  DEFAULT_SUBJECT: 'cbt_default_subject',
  DEFAULT_CLASS: 'cbt_default_class',
};

export const MASTER_DATA_CHANGED_EVENT = 'cbt_master_subject_class_changed';

// Initial baseline subjects if storage is uninitialized
const INITIAL_BASELINE_SUBJECTS: MasterSubject[] = [
  { id: 'sub-matematika', name: 'Matematika Wajib', code: 'MTK', category: 'MIPA', color: 'emerald', icon: 'Calculator' },
  { id: 'sub-fisika', name: 'Fisika', code: 'FIS', category: 'MIPA', color: 'cyan', icon: 'Atom' },
  { id: 'sub-kimia', name: 'Kimia', code: 'KIM', category: 'MIPA', color: 'violet', icon: 'FlaskConical' },
  { id: 'sub-biologi', name: 'Biologi', code: 'BIO', category: 'MIPA', color: 'green', icon: 'Dna' },
  { id: 'sub-ekonomi', name: 'Ekonomi', code: 'EKO', category: 'IPS', color: 'amber', icon: 'TrendingUp' },
  { id: 'sub-sosiologi', name: 'Sosiologi', code: 'SOS', category: 'IPS', color: 'rose', icon: 'Users' },
  { id: 'sub-geografi', name: 'Geografi', code: 'GEO', category: 'IPS', color: 'blue', icon: 'Globe2' },
  { id: 'sub-sejarah', name: 'Sejarah Indonesia', code: 'SEJ', category: 'IPS', color: 'orange', icon: 'Landmark' },
  { id: 'sub-bindonesia', name: 'Bahasa Indonesia', code: 'BIN', category: 'Umum', color: 'indigo', icon: 'BookOpen' },
  { id: 'sub-binggris', name: 'Bahasa Inggris', code: 'BIG', category: 'Umum', color: 'sky', icon: 'Languages' },
  { id: 'sub-informatika', name: 'Informatika & TIK', code: 'INF', category: 'Umum', color: 'purple', icon: 'Cpu' },
  { id: 'sub-ppkn', name: 'Pendidikan Pancasila (PPKn)', code: 'PKN', category: 'Umum', color: 'red', icon: 'ShieldCheck' },
  { id: 'sub-pkwu', name: 'PKWU', code: 'PKW', category: 'Umum', color: 'yellow', icon: 'Briefcase' },
];

// Initial baseline classes if storage is uninitialized
const INITIAL_BASELINE_CLASSES: MasterClass[] = [
  { id: 'cls-10-mipa-1', name: '10 MIPA 1', gradeLevel: '10', major: 'MIPA' },
  { id: 'cls-10-mipa-2', name: '10 MIPA 2', gradeLevel: '10', major: 'MIPA' },
  { id: 'cls-10-ips-1', name: '10 IPS 1', gradeLevel: '10', major: 'IPS' },
  { id: 'cls-11-mipa-1', name: '11 MIPA 1', gradeLevel: '11', major: 'MIPA' },
  { id: 'cls-11-mipa-2', name: '11 MIPA 2', gradeLevel: '11', major: 'MIPA' },
  { id: 'cls-11-ips-1', name: '11 IPS 1', gradeLevel: '11', major: 'IPS' },
  { id: 'cls-12-mipa-1', name: '12 MIPA 1', gradeLevel: '12', major: 'MIPA' },
  { id: 'cls-12-mipa-2', name: '12 MIPA 2', gradeLevel: '12', major: 'MIPA' },
  { id: 'cls-12-ips-1', name: '12 IPS 1', gradeLevel: '12', major: 'IPS' },
];

/**
 * Infer grade level and major from any class name string
 */
export function inferClassDetails(className: string): { gradeLevel: string; major: string } {
  const clean = className.trim().toUpperCase();
  let gradeLevel = '11';
  let major = 'Umum';

  if (clean.startsWith('10') || clean.startsWith('X ') || clean === 'X' || clean.startsWith('X-')) {
    gradeLevel = '10';
  } else if (clean.startsWith('12') || clean.startsWith('XII ') || clean === 'XII' || clean.startsWith('XII-')) {
    gradeLevel = '12';
  } else if (clean.startsWith('11') || clean.startsWith('XI ') || clean === 'XI' || clean.startsWith('XI-')) {
    gradeLevel = '11';
  } else if (clean.startsWith('9')) {
    gradeLevel = '9';
  } else if (clean.startsWith('8')) {
    gradeLevel = '8';
  } else if (clean.startsWith('7')) {
    gradeLevel = '7';
  }

  if (clean.includes('IPS') || clean.includes('SOSIAL')) {
    major = 'IPS';
  } else if (clean.includes('BAHASA')) {
    major = 'Bahasa';
  } else if (clean.includes('MIPA') || clean.includes('IPA') || clean.includes('SAINS')) {
    major = 'MIPA';
  } else if (clean.includes('SMK') || clean.includes('KEJURUAN') || clean.includes('TKJ') || clean.includes('RPL')) {
    major = 'Kejuruan';
  }

  return { gradeLevel, major };
}

/**
 * Fetch all centralized master subjects
 */
export function getMasterSubjects(): MasterSubject[] {
  if (typeof window === 'undefined') return INITIAL_BASELINE_SUBJECTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MASTER_SUBJECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading master subjects:', e);
  }
  // Initialize baseline
  saveMasterSubjects(INITIAL_BASELINE_SUBJECTS);
  return INITIAL_BASELINE_SUBJECTS;
}

/**
 * Save centralized master subjects
 */
export function saveMasterSubjects(subjects: MasterSubject[], notify = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.MASTER_SUBJECTS, JSON.stringify(subjects));
    // Mirror to legacy key for full backward compatibility
    const legacy = subjects.map(s => ({
      id: s.id,
      name: s.name,
      major: s.category,
      icon: s.icon || 'BookOpen',
      color: s.color || 'indigo',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    localStorage.setItem(STORAGE_KEYS.LEGACY_SUBJECTS, JSON.stringify(legacy));

    if (notify) {
      notifyMasterDataChanged({ type: 'subjects', data: subjects });
    }
  } catch (e) {
    console.error('Error saving master subjects:', e);
  }
}

/**
 * Fetch all centralized master classes
 */
export function getMasterClasses(): MasterClass[] {
  if (typeof window === 'undefined') return INITIAL_BASELINE_CLASSES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MASTER_CLASSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading master classes:', e);
  }
  // Initialize baseline
  saveMasterClasses(INITIAL_BASELINE_CLASSES);
  return INITIAL_BASELINE_CLASSES;
}

/**
 * Save centralized master classes
 */
export function saveMasterClasses(classes: MasterClass[], notify = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.MASTER_CLASSES, JSON.stringify(classes));
    // Mirror to legacy key for full backward compatibility
    const legacy = classes.map(c => ({
      id: c.id,
      name: c.name,
      grade: c.gradeLevel,
      major: c.major,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    localStorage.setItem(STORAGE_KEYS.LEGACY_CLASSES, JSON.stringify(legacy));

    if (notify) {
      notifyMasterDataChanged({ type: 'classes', data: classes });
    }
  } catch (e) {
    console.error('Error saving master classes:', e);
  }
}

/**
 * Add a new master subject
 */
export function addMasterSubject(item: Omit<MasterSubject, 'id'>): MasterSubject {
  const current = getMasterSubjects();
  const cleanName = item.name.trim();
  const existing = current.find(s => s.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    throw new Error(`Mata pelajaran "${cleanName}" sudah terdaftar.`);
  }

  const newSubject: MasterSubject = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    code: item.code?.trim() || cleanName.substring(0, 3).toUpperCase(),
    category: item.category || 'Umum',
    color: item.color || 'indigo',
    icon: item.icon || 'BookOpen',
  };

  const updated = [...current, newSubject];
  saveMasterSubjects(updated);
  return newSubject;
}

/**
 * Edit / Rename a master subject with CASCADE across questions, packages, schedules, and history
 */
export function updateMasterSubject(
  idOrOldName: string,
  updatedFields: Partial<Omit<MasterSubject, 'id'>>
): { updatedSubject: MasterSubject; cascade: CascadeSummary } {
  const current = getMasterSubjects();
  const targetIndex = current.findIndex(
    s => s.id === idOrOldName || s.name.toLowerCase() === idOrOldName.toLowerCase()
  );

  if (targetIndex === -1) {
    throw new Error(`Mata pelajaran "${idOrOldName}" tidak ditemukan.`);
  }

  const oldSubject = current[targetIndex];
  const oldName = oldSubject.name;
  const newName = updatedFields.name ? updatedFields.name.trim() : oldName;

  const isNameChanged = newName.toLowerCase() !== oldName.toLowerCase();

  // If renaming, check for collision with another subject
  if (isNameChanged) {
    const collision = current.find(
      (s, idx) => idx !== targetIndex && s.name.toLowerCase() === newName.toLowerCase()
    );
    if (collision) {
      throw new Error(`Mata pelajaran dengan nama "${newName}" sudah ada.`);
    }
  }

  const updatedSubject: MasterSubject = {
    ...oldSubject,
    ...updatedFields,
    name: newName,
  };

  current[targetIndex] = updatedSubject;
  saveMasterSubjects(current, false);

  const cascade: CascadeSummary = {
    questionsUpdated: 0,
    questionsDeleted: 0,
    packagesUpdated: 0,
    packagesDeleted: 0,
    schedulesUpdated: 0,
    schedulesDeleted: 0,
    studentsUpdated: 0,
  };

  if (isNameChanged) {
    // 1. Cascade update in Question Bank
    try {
      const qRaw = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
      if (qRaw) {
        const questions: Question[] = JSON.parse(qRaw);
        let changed = false;
        const updatedQuestions = questions.map(q => {
          if (q.subject && q.subject.trim().toLowerCase() === oldName.toLowerCase()) {
            cascade.questionsUpdated++;
            changed = true;
            return { ...q, subject: newName };
          }
          return q;
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(updatedQuestions));
        }
      }
    } catch (e) {}

    // 2. Cascade update in Exam Packages
    try {
      const pkgRaw = localStorage.getItem(STORAGE_KEYS.SMA_PACKAGES);
      if (pkgRaw) {
        const pkgs: ExamPackage[] = JSON.parse(pkgRaw);
        let changed = false;
        const updatedPkgs = pkgs.map(pkg => {
          let pkgChanged = false;
          let newSubject = pkg.subject;
          let newTitle = pkg.title;

          if (pkg.subject && pkg.subject.trim().toLowerCase() === oldName.toLowerCase()) {
            newSubject = newName;
            pkgChanged = true;
          }
          if (pkg.title.toLowerCase().includes(oldName.toLowerCase())) {
            newTitle = pkg.title.replace(new RegExp(oldName, 'gi'), newName);
            pkgChanged = true;
          }

          const updatedQuestions = (pkg.questions || []).map(q => {
            if (q.subject && q.subject.trim().toLowerCase() === oldName.toLowerCase()) {
              pkgChanged = true;
              return { ...q, subject: newName };
            }
            return q;
          });

          if (pkgChanged) {
            cascade.packagesUpdated++;
            changed = true;
            return {
              ...pkg,
              subject: newSubject,
              title: newTitle,
              questions: updatedQuestions,
            };
          }
          return pkg;
        });

        if (changed) {
          localStorage.setItem(STORAGE_KEYS.SMA_PACKAGES, JSON.stringify(updatedPkgs));
        }
      }
    } catch (e) {}

    // 3. Cascade update in Exam Schedules
    try {
      const schedRaw = localStorage.getItem(STORAGE_KEYS.SCHEDULE_ITEMS);
      if (schedRaw) {
        const schedules: ExamScheduleItem[] = JSON.parse(schedRaw);
        let changed = false;
        const updatedSchedules = schedules.map(s => {
          if (s.subjectName && s.subjectName.trim().toLowerCase() === oldName.toLowerCase()) {
            cascade.schedulesUpdated++;
            changed = true;
            return {
              ...s,
              subjectName: newName,
              token: generateSubjectExamToken(newName),
            };
          }
          return s;
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updatedSchedules));
        }
      }
    } catch (e) {}

    // 4. Cascade update in Exam History & Results
    try {
      const hRaw = localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY);
      if (hRaw) {
        const history = JSON.parse(hRaw);
        if (Array.isArray(history)) {
          let changed = false;
          const updatedHistory = history.map((item: any) => {
            let itemChanged = false;
            let itemSubject = item.subject || item.subjectName;
            if (itemSubject && itemSubject.trim().toLowerCase() === oldName.toLowerCase()) {
              itemSubject = newName;
              itemChanged = true;
            }
            let examTitle = item.examTitle || item.title;
            if (examTitle && examTitle.toLowerCase().includes(oldName.toLowerCase())) {
              examTitle = examTitle.replace(new RegExp(oldName, 'gi'), newName);
              itemChanged = true;
            }
            if (itemChanged) {
              changed = true;
              return { ...item, subject: itemSubject, subjectName: itemSubject, examTitle: examTitle, title: examTitle };
            }
            return item;
          });
          if (changed) {
            localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(updatedHistory));
          }
        }
      }
    } catch (e) {}

    // 5. Cascade update default subject setting
    try {
      const defSub = localStorage.getItem(STORAGE_KEYS.DEFAULT_SUBJECT);
      if (defSub && defSub.trim().toLowerCase() === oldName.toLowerCase()) {
        localStorage.setItem(STORAGE_KEYS.DEFAULT_SUBJECT, newName);
      }
    } catch (e) {}
  }

  notifyMasterDataChanged({ type: 'subjects', data: current, cascade });
  return { updatedSubject, cascade };
}

/**
 * Delete a master subject with CASCADE to guarantee nothing keeps non-existent subjects
 */
export function deleteMasterSubject(idOrName: string): { cascade: CascadeSummary } {
  const current = getMasterSubjects();
  const target = current.find(
    s => s.id === idOrName || s.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!target) {
    throw new Error(`Mata pelajaran "${idOrName}" tidak ditemukan.`);
  }

  const subjectName = target.name;
  const filtered = current.filter(s => s.id !== target.id);
  saveMasterSubjects(filtered, false);

  const cascade: CascadeSummary = {
    questionsUpdated: 0,
    questionsDeleted: 0,
    packagesUpdated: 0,
    packagesDeleted: 0,
    schedulesUpdated: 0,
    schedulesDeleted: 0,
    studentsUpdated: 0,
  };

  // 1. Purge questions belonging to the deleted subject from Question Bank
  try {
    const qRaw = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
    if (qRaw) {
      const questions: Question[] = JSON.parse(qRaw);
      const remainingQuestions = questions.filter(q => {
        const match = q.subject && q.subject.trim().toLowerCase() === subjectName.toLowerCase();
        if (match) cascade.questionsDeleted++;
        return !match;
      });
      if (cascade.questionsDeleted > 0) {
        localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(remainingQuestions));
      }
    }
  } catch (e) {}

  // 2. Purge or sanitize packages referencing the deleted subject
  try {
    const pkgRaw = localStorage.getItem(STORAGE_KEYS.SMA_PACKAGES);
    if (pkgRaw) {
      const pkgs: ExamPackage[] = JSON.parse(pkgRaw);
      const remainingPkgs = pkgs.filter(pkg => {
        const match =
          (pkg.subject && pkg.subject.trim().toLowerCase() === subjectName.toLowerCase()) ||
          pkg.title.toLowerCase().includes(subjectName.toLowerCase());
        if (match) cascade.packagesDeleted++;
        return !match;
      });
      if (cascade.packagesDeleted > 0) {
        localStorage.setItem(STORAGE_KEYS.SMA_PACKAGES, JSON.stringify(remainingPkgs));
      }
    }
  } catch (e) {}

  // 3. Purge schedules for the deleted subject
  try {
    const schedRaw = localStorage.getItem(STORAGE_KEYS.SCHEDULE_ITEMS);
    if (schedRaw) {
      const schedules: ExamScheduleItem[] = JSON.parse(schedRaw);
      const remainingSchedules = schedules.filter(s => {
        const match =
          s.subjectName && s.subjectName.trim().toLowerCase() === subjectName.toLowerCase();
        if (match) cascade.schedulesDeleted++;
        return !match;
      });
      if (cascade.schedulesDeleted > 0) {
        localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(remainingSchedules));
      }
    }
  } catch (e) {}

  notifyMasterDataChanged({ type: 'subjects', data: filtered, cascade });
  return { cascade };
}

/**
 * Add a new master class
 */
export function addMasterClass(item: Omit<MasterClass, 'id'>): MasterClass {
  const current = getMasterClasses();
  const cleanName = item.name.trim();
  const existing = current.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    throw new Error(`Kelas "${cleanName}" sudah terdaftar.`);
  }

  const inferred = inferClassDetails(cleanName);
  const newClass: MasterClass = {
    id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    gradeLevel: item.gradeLevel || inferred.gradeLevel,
    major: item.major || inferred.major,
  };

  const updated = [...current, newClass];
  saveMasterClasses(updated);
  return newClass;
}

/**
 * Add multiple classes at once (Bulk add)
 */
export function addMasterClassesBulk(classNames: string[]): { added: MasterClass[]; skipped: string[] } {
  const current = getMasterClasses();
  const added: MasterClass[] = [];
  const skipped: string[] = [];

  for (const raw of classNames) {
    const clean = raw.trim();
    if (!clean) continue;
    const exists = current.some(c => c.name.toLowerCase() === clean.toLowerCase()) ||
                   added.some(c => c.name.toLowerCase() === clean.toLowerCase());
    if (exists) {
      skipped.push(clean);
      continue;
    }

    const inferred = inferClassDetails(clean);
    const newClass: MasterClass = {
      id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: clean,
      gradeLevel: inferred.gradeLevel,
      major: inferred.major,
    };
    added.push(newClass);
  }

  if (added.length > 0) {
    const updated = [...current, ...added];
    saveMasterClasses(updated);
  }

  return { added, skipped };
}

/**
 * Edit / Rename a master class with CASCADE across student roster, schedules, and questions
 */
export function updateMasterClass(
  idOrOldName: string,
  updatedFields: Partial<Omit<MasterClass, 'id'>>
): { updatedClass: MasterClass; cascade: CascadeSummary } {
  const current = getMasterClasses();
  const targetIndex = current.findIndex(
    c => c.id === idOrOldName || c.name.toLowerCase() === idOrOldName.toLowerCase()
  );

  if (targetIndex === -1) {
    throw new Error(`Kelas "${idOrOldName}" tidak ditemukan.`);
  }

  const oldClass = current[targetIndex];
  const oldName = oldClass.name;
  const newName = updatedFields.name ? updatedFields.name.trim() : oldName;

  const isNameChanged = newName.toLowerCase() !== oldName.toLowerCase();

  if (isNameChanged) {
    const collision = current.find(
      (c, idx) => idx !== targetIndex && c.name.toLowerCase() === newName.toLowerCase()
    );
    if (collision) {
      throw new Error(`Kelas dengan nama "${newName}" sudah ada.`);
    }
  }

  const inferred = inferClassDetails(newName);
  const updatedClass: MasterClass = {
    ...oldClass,
    ...updatedFields,
    name: newName,
    gradeLevel: updatedFields.gradeLevel || inferred.gradeLevel,
    major: updatedFields.major || inferred.major,
  };

  current[targetIndex] = updatedClass;
  saveMasterClasses(current, false);

  const cascade: CascadeSummary = {
    questionsUpdated: 0,
    questionsDeleted: 0,
    packagesUpdated: 0,
    packagesDeleted: 0,
    schedulesUpdated: 0,
    schedulesDeleted: 0,
    studentsUpdated: 0,
  };

  if (isNameChanged) {
    // 1. Cascade update in Student Roster
    try {
      const rRaw = localStorage.getItem(STORAGE_KEYS.STUDENT_ROSTER);
      if (rRaw) {
        const roster: StudentRosterEntry[] = JSON.parse(rRaw);
        let changed = false;
        const updatedRoster = roster.map(st => {
          if (st.studentClass && st.studentClass.trim().toLowerCase() === oldName.toLowerCase()) {
            cascade.studentsUpdated++;
            changed = true;
            return { ...st, studentClass: newName };
          }
          return st;
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.STUDENT_ROSTER, JSON.stringify(updatedRoster));
        }
      }
    } catch (e) {}

    // 2. Cascade update in Exam Schedules targetClass
    try {
      const schedRaw = localStorage.getItem(STORAGE_KEYS.SCHEDULE_ITEMS);
      if (schedRaw) {
        const schedules: ExamScheduleItem[] = JSON.parse(schedRaw);
        let changed = false;
        const updatedSchedules = schedules.map(s => {
          if (s.targetClass && s.targetClass.toLowerCase().includes(oldName.toLowerCase())) {
            cascade.schedulesUpdated++;
            changed = true;
            return {
              ...s,
              targetClass: s.targetClass.replace(new RegExp(oldName, 'gi'), newName),
            };
          }
          return s;
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updatedSchedules));
        }
      }
    } catch (e) {}

    // 3. Update student gate local class selection if matches old
    try {
      const savedStudentClass = localStorage.getItem('cbt_student_class');
      if (savedStudentClass && savedStudentClass.toLowerCase() === oldName.toLowerCase()) {
        localStorage.setItem('cbt_student_class', newName);
      }
    } catch (e) {}

    // 4. Cascade update in Exam History & Results
    try {
      const hRaw = localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY);
      if (hRaw) {
        const history = JSON.parse(hRaw);
        if (Array.isArray(history)) {
          let changed = false;
          const updatedHistory = history.map((item: any) => {
            if (item.studentClass && item.studentClass.trim().toLowerCase() === oldName.toLowerCase()) {
              changed = true;
              return { ...item, studentClass: newName };
            }
            return item;
          });
          if (changed) {
            localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(updatedHistory));
          }
        }
      }
    } catch (e) {}

    // 5. Cascade update active sessions
    try {
      const sRaw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);
      if (sRaw) {
        const sessions = JSON.parse(sRaw);
        if (Array.isArray(sessions)) {
          let changed = false;
          const updatedSessions = sessions.map((sess: any) => {
            if (sess.studentClass && sess.studentClass.trim().toLowerCase() === oldName.toLowerCase()) {
              changed = true;
              return { ...sess, studentClass: newName };
            }
            return sess;
          });
          if (changed) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(updatedSessions));
          }
        }
      }
    } catch (e) {}

    // 6. Cascade update default class setting
    try {
      const defCls = localStorage.getItem(STORAGE_KEYS.DEFAULT_CLASS);
      if (defCls && defCls.trim().toLowerCase() === oldName.toLowerCase()) {
        localStorage.setItem(STORAGE_KEYS.DEFAULT_CLASS, newName);
      }
    } catch (e) {}
  }

  notifyMasterDataChanged({ type: 'classes', data: current, cascade });
  return { updatedClass, cascade };
}

/**
 * Delete a master class with CASCADE so no student or schedule keeps non-existent classes
 */
export function deleteMasterClass(idOrName: string): { cascade: CascadeSummary } {
  const current = getMasterClasses();
  const target = current.find(
    c => c.id === idOrName || c.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!target) {
    throw new Error(`Kelas "${idOrName}" tidak ditemukan.`);
  }

  const className = target.name;
  const filtered = current.filter(c => c.id !== target.id);
  saveMasterClasses(filtered, false);

  const fallbackClass = filtered[0]?.name || 'Kelas Umum';

  const cascade: CascadeSummary = {
    questionsUpdated: 0,
    questionsDeleted: 0,
    packagesUpdated: 0,
    packagesDeleted: 0,
    schedulesUpdated: 0,
    schedulesDeleted: 0,
    studentsUpdated: 0,
  };

  // 1. Reassign students from deleted class to the first remaining valid class
  try {
    const rRaw = localStorage.getItem(STORAGE_KEYS.STUDENT_ROSTER);
    if (rRaw) {
      const roster: StudentRosterEntry[] = JSON.parse(rRaw);
      let changed = false;
      const updatedRoster = roster.map(st => {
        if (st.studentClass && st.studentClass.trim().toLowerCase() === className.toLowerCase()) {
          cascade.studentsUpdated++;
          changed = true;
          return { ...st, studentClass: fallbackClass };
        }
        return st;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.STUDENT_ROSTER, JSON.stringify(updatedRoster));
      }
    }
  } catch (e) {}

  // 2. Clean or update schedules targetClass
  try {
    const schedRaw = localStorage.getItem(STORAGE_KEYS.SCHEDULE_ITEMS);
    if (schedRaw) {
      const schedules: ExamScheduleItem[] = JSON.parse(schedRaw);
      let changed = false;
      const updatedSchedules = schedules.map(s => {
        if (s.targetClass && s.targetClass.toLowerCase() === className.toLowerCase()) {
          cascade.schedulesUpdated++;
          changed = true;
          return { ...s, targetClass: fallbackClass };
        }
        return s;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(updatedSchedules));
      }
    }
  } catch (e) {}

  // 3. Clear local student class selection if deleted
  try {
    const savedStudentClass = localStorage.getItem('cbt_student_class');
    if (savedStudentClass && savedStudentClass.toLowerCase() === className.toLowerCase()) {
      localStorage.setItem('cbt_student_class', fallbackClass);
    }
  } catch (e) {}

  notifyMasterDataChanged({ type: 'classes', data: filtered, cascade });
  return { cascade };
}

/**
 * Reconcile all entities (questions, packages, schedules, students) with centralized master lists.
 * This guarantees: "tidak ada yg menyimpan mata pelajaran dan kelas yg tidak ada dalam fitur edit tersebut"
 */
export function reconcileAllEntitiesWithMaster(): {
  cleanedQuestions: number;
  cleanedPackages: number;
  cleanedSchedules: number;
  cleanedStudents: number;
} {
  const masterSubjects = getMasterSubjects();
  const masterClasses = getMasterClasses();

  const validSubjectNames = new Set(masterSubjects.map(s => s.name.trim().toLowerCase()));
  const validClassNames = new Set(masterClasses.map(c => c.name.trim().toLowerCase()));

  const fallbackSubject = masterSubjects[0]?.name || 'Mata Pelajaran Umum';
  const fallbackClass = masterClasses[0]?.name || 'Kelas Umum';

  let cleanedQuestions = 0;
  let cleanedPackages = 0;
  let cleanedSchedules = 0;
  let cleanedStudents = 0;

  // 1. Reconcile questions in Question Bank
  try {
    const qRaw = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
    if (qRaw) {
      const questions: Question[] = JSON.parse(qRaw);
      let changed = false;
      const reconciledQuestions = questions.map(q => {
        const sub = (q.subject || '').trim().toLowerCase();
        if (sub && !validSubjectNames.has(sub)) {
          cleanedQuestions++;
          changed = true;
          return { ...q, subject: fallbackSubject };
        }
        return q;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(reconciledQuestions));
      }
    }
  } catch (e) {}

  // 2. Reconcile packages in SMA Packages
  try {
    const pkgRaw = localStorage.getItem(STORAGE_KEYS.SMA_PACKAGES);
    if (pkgRaw) {
      const pkgs: ExamPackage[] = JSON.parse(pkgRaw);
      let changed = false;
      const reconciledPkgs = pkgs.map(pkg => {
        const sub = (pkg.subject || '').trim().toLowerCase();
        if (sub && !validSubjectNames.has(sub)) {
          cleanedPackages++;
          changed = true;
          return { ...pkg, subject: fallbackSubject };
        }
        return pkg;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.SMA_PACKAGES, JSON.stringify(reconciledPkgs));
      }
    }
  } catch (e) {}

  // 3. Reconcile schedules
  try {
    const schedRaw = localStorage.getItem(STORAGE_KEYS.SCHEDULE_ITEMS);
    if (schedRaw) {
      const schedules: ExamScheduleItem[] = JSON.parse(schedRaw);
      let changed = false;
      const reconciledSchedules = schedules.map(s => {
        let modified = false;
        let nextSub = s.subjectName;
        let nextClass = s.targetClass;

        if (s.subjectName && !validSubjectNames.has(s.subjectName.trim().toLowerCase())) {
          nextSub = fallbackSubject;
          modified = true;
        }

        const exactMatch = validClassNames.has((s.targetClass || '').trim().toLowerCase());
        const isAllClass = (s.targetClass || '').toLowerCase().includes('semua kelas');
        if (!exactMatch && !isAllClass && s.targetClass) {
          nextClass = fallbackClass;
          modified = true;
        }

        if (modified) {
          cleanedSchedules++;
          changed = true;
          return {
            ...s,
            subjectName: nextSub,
            targetClass: nextClass,
            token: generateSubjectExamToken(nextSub),
          };
        }
        return s;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.SCHEDULE_ITEMS, JSON.stringify(reconciledSchedules));
      }
    }
  } catch (e) {}

  // 4. Reconcile students in Roster
  try {
    const rRaw = localStorage.getItem(STORAGE_KEYS.STUDENT_ROSTER);
    if (rRaw) {
      const roster: StudentRosterEntry[] = JSON.parse(rRaw);
      let changed = false;
      const reconciledRoster = roster.map(st => {
        const cName = (st.studentClass || '').trim().toLowerCase();
        if (cName && !validClassNames.has(cName)) {
          cleanedStudents++;
          changed = true;
          return { ...st, studentClass: fallbackClass };
        }
        return st;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.STUDENT_ROSTER, JSON.stringify(reconciledRoster));
      }
    }
  } catch (e) {}

  return {
    cleanedQuestions,
    cleanedPackages,
    cleanedSchedules,
    cleanedStudents,
  };
}

/**
 * Event notification for reactive UI updates
 */
function notifyMasterDataChanged(detail: any): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MASTER_DATA_CHANGED_EVENT, { detail }));
    window.dispatchEvent(new CustomEvent('cbt-master-data-changed', { detail }));
    window.dispatchEvent(new CustomEvent('cbt-default-subject-class-changed', { detail }));
    window.dispatchEvent(new Event('storage'));
  }
}

/**
 * Subscribe to master subject and class changes
 */
export function subscribeMasterSubjectClass(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(MASTER_DATA_CHANGED_EVENT, handler);
  window.addEventListener('cbt-master-data-changed', handler);
  window.addEventListener('cbt-default-subject-class-changed', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(MASTER_DATA_CHANGED_EVENT, handler);
    window.removeEventListener('cbt-master-data-changed', handler);
    window.removeEventListener('cbt-default-subject-class-changed', handler);
    window.removeEventListener('storage', handler);
  };
}
