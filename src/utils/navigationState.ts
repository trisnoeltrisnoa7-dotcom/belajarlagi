import { ExamViewMode } from '../types';

export interface NavigationState {
  view: ExamViewMode;
  activePackageId?: string;
  scheduleRole?: 'admin' | 'student';
  updatedAt: number;
}

export const NAVIGATION_STORAGE_KEY = 'cbt_navigation_state_v1';

export function loadNavigationState(): NavigationState | null {
  try {
    const raw = sessionStorage.getItem(NAVIGATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NavigationState;
    if (!parsed || typeof parsed.view !== 'string') return null;
    return parsed;
  } catch { return null; }
}

export function saveNavigationState(state: Omit<NavigationState, 'updatedAt'>) {
  try {
    sessionStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
  } catch { /* storage can be unavailable */ }
}

export function clearNavigationState() {
  try { sessionStorage.removeItem(NAVIGATION_STORAGE_KEY); } catch { /* noop */ }
}
