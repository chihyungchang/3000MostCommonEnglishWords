/**
 * LocalStorage utilities with JSON serialization
 */

const STORAGE_PREFIX = 'vocab_';

/**
 * Debug function to inspect all app data in localStorage
 * Call from console: window.debugStorage()
 */
export function debugStorage(): void {
  console.group('=== Storage Debug ===');

  // Check all vocab_ prefixed items
  const vocabKeys = Object.keys(localStorage).filter(k => k.startsWith('vocab_'));
  console.log('Vocab keys:', vocabKeys);

  // Check word index cache
  const indexKeys = Object.keys(localStorage).filter(k => k.startsWith('word_index'));
  indexKeys.forEach(k => {
    try {
      const data = JSON.parse(localStorage.getItem(k) || '[]');
      console.log(`${k}: ${data.length} items`);
    } catch {
      console.log(`${k}: [parse error]`);
    }
  });

  // Check progress data
  const progressData = localStorage.getItem('vocab_word_progress');
  if (progressData) {
    try {
      const progress = JSON.parse(progressData);
      const keys = Object.keys(progress);
      const oldFormat = keys.filter(k => k.startsWith('word_')).length;
      const newFormat = keys.filter(k => k.match(/^[A-C][12]_/)).length;
      console.log('Progress:', {
        total: keys.length,
        oldFormat,
        newFormat,
        sample: keys.slice(0, 5),
      });
    } catch {
      console.log('Progress: [parse error]');
    }
  } else {
    console.log('Progress: [empty]');
  }

  // Check user stats
  const statsData = localStorage.getItem('vocab_user_stats');
  if (statsData) {
    try {
      const stats = JSON.parse(statsData);
      console.log('User Stats:', {
        totalWords: stats.totalWords,
        todayLearned: stats.todayLearned,
        lastActiveDate: stats.lastActiveDate,
      });
    } catch {
      console.log('User Stats: [parse error]');
    }
  } else {
    console.log('User Stats: [empty]');
  }

  // Check migration flags
  console.log('Migration flags:', {
    progressMigration: localStorage.getItem('progress_migration_v1'),
    statsRecovery: localStorage.getItem('stats_recovered_v1'),
  });

  console.groupEnd();
}

/**
 * Export user data (progress, stats) as JSON
 * Call from console: window.exportUserData()
 */
export function exportUserData(): string {
  const data = {
    exportedAt: new Date().toISOString(),
    progress: localStorage.getItem('vocab_word_progress'),
    stats: localStorage.getItem('vocab_user_stats'),
    tasks: localStorage.getItem('vocab_daily_tasks'),
  };
  const json = JSON.stringify(data, null, 2);
  console.log('=== Export Data ===');
  console.log(json);
  console.log('===================');
  console.log('Copy the JSON above to save your progress.');
  return json;
}

/**
 * Import user data from JSON
 * Call from console: window.importUserData('{"progress":...}')
 */
export function importUserData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.progress) {
      localStorage.setItem('vocab_word_progress', data.progress);
      console.log('Imported progress data');
    }
    if (data.stats) {
      localStorage.setItem('vocab_user_stats', data.stats);
      console.log('Imported stats data');
    }
    if (data.tasks) {
      localStorage.setItem('vocab_daily_tasks', data.tasks);
      console.log('Imported tasks data');
    }
    console.log('Import complete! Please refresh the page.');
    return true;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
}

/**
 * Clear only cache data (not progress/stats)
 * Call from console: window.clearCacheOnly()
 */
export function clearCacheOnly(): void {
  const cacheKeys = [
    'word_cache_v3', 'word_cache_v4', 'word_cache_v5',
    'word_index_v3', 'word_index_v4', 'word_index_v5',
    'vocab_learn_session',
    'tasks_date', // daily tasks date
    'progress_migration_v1', // migration flag
    'stats_recovered_v1', // stats recovery flag
  ];
  cacheKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`Cleared: ${key}`);
    }
  });
  console.log('Cache cleared! Progress data preserved. Please refresh the page.');
}

/**
 * Reset all migration flags (use if progress data seems corrupted)
 * Call from console: window.resetMigrationFlags()
 */
export function resetMigrationFlags(): void {
  localStorage.removeItem('progress_migration_v1');
  localStorage.removeItem('stats_recovered_v1');
  console.log('Migration flags reset. Progress will be re-migrated on next load.');
}

// Expose to window for console debugging
if (typeof window !== 'undefined') {
  const w = window as unknown as {
    debugStorage: typeof debugStorage;
    exportUserData: typeof exportUserData;
    importUserData: typeof importUserData;
    clearCacheOnly: typeof clearCacheOnly;
    resetMigrationFlags: typeof resetMigrationFlags;
  };
  w.debugStorage = debugStorage;
  w.exportUserData = exportUserData;
  w.importUserData = importUserData;
  w.clearCacheOnly = clearCacheOnly;
  w.resetMigrationFlags = resetMigrationFlags;
}

export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key);
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date string is today
 */
export function isToday(dateString: string): boolean {
  return dateString === getTodayString();
}

/**
 * Check if a date string is yesterday
 */
export function isYesterday(dateString: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateString === yesterday.toISOString().split('T')[0];
}

/**
 * Format a date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
