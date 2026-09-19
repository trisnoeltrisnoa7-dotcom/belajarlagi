import {
  getMasterSubjects as getCentralMasterSubjects,
  getMasterClasses as getCentralMasterClasses,
  saveMasterSubjects as saveCentralMasterSubjects,
  saveMasterClasses as saveCentralMasterClasses,
  addMasterSubject,
  updateMasterSubject,
  addMasterClass,
  updateMasterClass,
  MasterSubject as CentralSubject,
  MasterClass as CentralClass,
  MASTER_DATA_CHANGED_EVENT as CENTRAL_EVENT,
  subscribeMasterSubjectClass,
} from '../utils/centralSubjectClassManager';

export interface MasterClass {
  id: string;
  name: string;
  grade: string;
  major: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MasterSubject {
  id: string;
  name: string;
  major: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  icon?: string;
  color?: string;
}

export const MASTER_DATA_CHANGED_EVENT = 'cbt-master-data-changed';

/**
 * Get active master classes synced directly from central manager
 */
export function getMasterClasses(): MasterClass[] {
  const central = getCentralMasterClasses();
  return central
    .filter(c => c.isActive !== false)
    .map(c => ({
      id: c.id,
      name: c.name,
      grade: c.gradeLevel,
      major: c.major,
      isActive: c.isActive !== false,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
}

/**
 * Get all master classes including inactive
 */
export function getAllMasterClasses(): MasterClass[] {
  return getCentralMasterClasses().map(c => ({
    id: c.id,
    name: c.name,
    grade: c.gradeLevel,
    major: c.major,
    isActive: c.isActive !== false,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

/**
 * Save master classes into central manager
 */
export function saveMasterClasses(v: MasterClass[]): void {
  const centralList: CentralClass[] = v.map((item, idx) => ({
    id: item.id || `class_${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name: item.name,
    gradeLevel: (item.grade as any) || '11',
    major: (item.major as any) || 'MIPA',
    isActive: item.isActive !== false,
    order: idx + 1,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  saveCentralMasterClasses(centralList, true);
}

/**
 * Upsert a master class with cascade synchronization
 */
export function upsertMasterClass(input: Omit<MasterClass, 'createdAt' | 'updatedAt'> & { id?: string }): MasterClass {
  const all = getCentralMasterClasses();
  const existing = all.find(c => c.id === input.id || c.name.trim().toLowerCase() === input.name.trim().toLowerCase());

  if (existing) {
    const { updatedClass } = updateMasterClass(existing.id, {
      name: input.name.trim(),
      gradeLevel: (input.grade as any) || existing.gradeLevel,
      major: (input.major as any) || existing.major,
      isActive: input.isActive,
    });
    return {
      id: updatedClass.id,
      name: updatedClass.name,
      grade: updatedClass.gradeLevel,
      major: updatedClass.major,
      isActive: updatedClass.isActive,
      createdAt: updatedClass.createdAt,
      updatedAt: updatedClass.updatedAt,
    };
  }

  const created = addMasterClass({
    name: input.name.trim(),
    gradeLevel: (input.grade as any) || '11',
    major: (input.major as any) || 'MIPA',
  });

  return {
    id: created.id,
    name: created.name,
    grade: created.gradeLevel,
    major: created.major,
    isActive: created.isActive,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

/**
 * Set active status on class
 */
export function setMasterClassActive(id: string, isActive: boolean): void {
  const all = getCentralMasterClasses();
  const target = all.find(c => c.id === id);
  if (target) {
    updateMasterClass(id, { isActive });
  }
}

/**
 * Get active master subjects synced directly from central manager
 */
export function getMasterSubjects(): MasterSubject[] {
  const central = getCentralMasterSubjects();
  return central
    .filter(s => s.isActive !== false)
    .map(s => ({
      id: s.id,
      name: s.name,
      major: s.category || 'Umum',
      isActive: s.isActive !== false,
      icon: s.icon || 'BookOpen',
      color: s.color || 'indigo',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
}

/**
 * Get all master subjects including inactive
 */
export function getAllMasterSubjects(): MasterSubject[] {
  return getCentralMasterSubjects().map(s => ({
    id: s.id,
    name: s.name,
    major: s.category || 'Umum',
    isActive: s.isActive !== false,
    icon: s.icon || 'BookOpen',
    color: s.color || 'indigo',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

/**
 * Save master subjects into central manager
 */
export function saveMasterSubjects(v: MasterSubject[]): void {
  const centralList: CentralSubject[] = v.map((item, idx) => ({
    id: item.id || `subject_${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name: item.name,
    category: (item.major as any) || 'Umum',
    icon: item.icon || 'BookOpen',
    color: item.color || 'indigo',
    isActive: item.isActive !== false,
    order: idx + 1,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  saveCentralMasterSubjects(centralList, true);
}

/**
 * Upsert a master subject with cascade synchronization
 */
export function upsertMasterSubject(input: Omit<MasterSubject, 'createdAt' | 'updatedAt'> & { id?: string }): MasterSubject {
  const all = getCentralMasterSubjects();
  const existing = all.find(s => s.id === input.id || s.name.trim().toLowerCase() === input.name.trim().toLowerCase());

  if (existing) {
    const { updatedSubject } = updateMasterSubject(existing.id, {
      name: input.name.trim(),
      category: (input.major as any) || existing.category,
      icon: input.icon || existing.icon,
      color: input.color || existing.color,
      isActive: input.isActive,
    });
    return {
      id: updatedSubject.id,
      name: updatedSubject.name,
      major: updatedSubject.category,
      icon: updatedSubject.icon,
      color: updatedSubject.color,
      isActive: updatedSubject.isActive,
      createdAt: updatedSubject.createdAt,
      updatedAt: updatedSubject.updatedAt,
    };
  }

  const created = addMasterSubject({
    name: input.name.trim(),
    category: (input.major as any) || 'Umum',
    icon: input.icon || 'BookOpen',
    color: input.color || 'indigo',
  });

  return {
    id: created.id,
    name: created.name,
    major: created.category,
    icon: created.icon,
    color: created.color,
    isActive: created.isActive,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

/**
 * Set active status on subject
 */
export function setMasterSubjectActive(id: string, isActive: boolean): void {
  const all = getCentralMasterSubjects();
  const target = all.find(s => s.id === id);
  if (target) {
    updateMasterSubject(id, { isActive });
  }
}

export { subscribeMasterSubjectClass };
