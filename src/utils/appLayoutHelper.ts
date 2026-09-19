import { AppLayoutSettings } from '../types';

export const APP_LAYOUT_STORAGE_KEY = 'cbt_app_layout_settings_v1';
export const APP_LAYOUT_CHANGED_EVENT = 'cbt-app-layout-changed';

export const DEFAULT_APP_LAYOUT_SETTINGS: AppLayoutSettings = {
  floatingMenuPosition: 'left',
  themePreset: 'default',
  contentDensity: 'normal',
  cardRadius: 'xl',
  showFlowchartBreadcrumbs: true,
  highlightActiveFlow: true,
  accentColorHex: '#6366f1',
  enableHeaderShadow: true,
};

export function loadAppLayoutSettings(): AppLayoutSettings {
  try {
    const raw = localStorage.getItem(APP_LAYOUT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_LAYOUT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_APP_LAYOUT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_APP_LAYOUT_SETTINGS };
  }
}

export function saveAppLayoutSettings(settings: AppLayoutSettings): void {
  try {
    localStorage.setItem(APP_LAYOUT_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(APP_LAYOUT_CHANGED_EVENT, { detail: settings }));
  } catch (e) {
    console.error('Failed to save app layout settings:', e);
  }
}

export function applyAppLayoutCustomizationsToDom(settings: AppLayoutSettings): void {
  try {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Apply data attributes for styling
    root.setAttribute('data-app-theme', settings.themePreset || 'default');
    root.setAttribute('data-content-density', settings.contentDensity || 'normal');
    root.setAttribute('data-card-radius', settings.cardRadius || 'xl');

    // Accent color CSS variable
    if (settings.accentColorHex) {
      root.style.setProperty('--app-accent-color', settings.accentColorHex);
    }
  } catch (e) {
    console.error('Failed to apply app layout customizations to DOM:', e);
  }
}
