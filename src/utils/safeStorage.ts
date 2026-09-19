// Safe Storage utility with fallback for iframes, private browsing, and restricted environments

const memoryStorage = new Map<string, string>();

function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const storage = window[type];
    if (!storage) return false;
    const testKey = '__cbt_test_storage__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (isStorageAvailable('localStorage')) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fall back to memory
    }
    return memoryStorage.get(`local_${key}`) || null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (isStorageAvailable('localStorage')) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fall back to memory
    }
    memoryStorage.set(`local_${key}`, String(value));
  },

  removeItem: (key: string): void => {
    try {
      if (isStorageAvailable('localStorage')) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
    memoryStorage.delete(`local_${key}`);
  },

  clear: (): void => {
    try {
      if (isStorageAvailable('localStorage')) {
        window.localStorage.clear();
      }
    } catch {
      // Ignore
    }
    for (const k of memoryStorage.keys()) {
      if (k.startsWith('local_')) {
        memoryStorage.delete(k);
      }
    }
  },
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (isStorageAvailable('sessionStorage')) {
        return window.sessionStorage.getItem(key);
      }
    } catch {
      // Fall back to memory
    }
    return memoryStorage.get(`session_${key}`) || null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (isStorageAvailable('sessionStorage')) {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fall back to memory
    }
    memoryStorage.set(`session_${key}`, String(value));
  },

  removeItem: (key: string): void => {
    try {
      if (isStorageAvailable('sessionStorage')) {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
    memoryStorage.delete(`session_${key}`);
  },

  clear: (): void => {
    try {
      if (isStorageAvailable('sessionStorage')) {
        window.sessionStorage.clear();
      }
    } catch {
      // Ignore
    }
    for (const k of memoryStorage.keys()) {
      if (k.startsWith('session_')) {
        memoryStorage.delete(k);
      }
    }
  },
};
