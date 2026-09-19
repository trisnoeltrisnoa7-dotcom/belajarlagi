import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { safeLocalStorage, safeSessionStorage } from './utils/safeStorage';
import './index.css';

// Versi aplikasi PWA (Sinkron dengan CACHE_NAME di public/sw.js)
const APP_VERSION = 'cbt-sman19-offline-v6';

// Global error telemetry to prevent silent "Script error."
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Log meaningful information for debugging
    if (event.error) {
      console.warn('[CBT Diagnostic Error]:', event.message, event.filename, event.lineno, event.error);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[CBT Diagnostic Unhandled Promise]:', event.reason);
  });
}

// Service Worker & Cache Management
try {
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isDev = Boolean((import.meta as any).env?.DEV);

  if ('serviceWorker' in navigator) {
    if (isInIframe || isDev) {
      // In development mode or inside an iframe (like AI Studio preview):
      // Cleanly unregister any active service worker so it doesn't intercept or cache hot modules,
      // and do NOT register sw.js or force reload the window.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister().catch(() => {}));
      }).catch(() => {});
    } else {
      // Production standalone browser environment:
      try {
        const storedVersion = safeLocalStorage.getItem('cbt_app_version');
        if (storedVersion !== APP_VERSION) {
          safeLocalStorage.removeItem('exam_token_global_required');
          safeLocalStorage.removeItem('exam_token_last_verified_ts');
          safeLocalStorage.setItem('cbt_app_version', APP_VERSION);
        }
      } catch (e) {
        console.warn('Storage sync check:', e);
      }

      window.addEventListener('load', () => {
        let refreshing = false;

        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            registration.update().catch(() => {});

            // Do not force a worker update while the exam page may be active.

            registration.onupdatefound = () => {
              const installing = registration.installing;
              if (installing) {
                installing.onstatechange = () => {
                  // Waiting worker is activated on a safe navigation/reload, not mid-exam.
                };
              }
            };
          })
          .catch((err) => {
            console.log('SW registration note:', err);
          });
      });
    }
  }
} catch (e) {
  console.warn('Service worker lifecycle initialization ignored:', e);
}

// Mount the React Application
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
