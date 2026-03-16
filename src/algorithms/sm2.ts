import type { WordProgress, ResponseQuality } from '../types';

/**
 * SM-2 Algorithm (Simplified)
 *
 * Based on SuperMemo's spaced repetition algorithm.
 * Calculates the next review interval based on user's response quality.
 */

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

// Quality to numeric score mapping
const qualityScore: Record<ResponseQuality, number> = {
  forgot: 0,
  hard: 2,
  good: 3,
  easy: 5,
};

/**
 * Calculate the next review interval and updated ease factor
 */
export function calculateNextReview(
  progress: WordProgress,
  quality: ResponseQuality
): Partial<WordProgress> {
  const score = qualityScore[quality];
  let { interval, easeFactor, consecutiveCorrect } = progress;
  const { reviewCount } = progress;

  // Update ease factor based on response
  easeFactor = easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02));
  easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor);

  // Calculate new interval
  if (score < 2) {
    // Forgot - reset to beginning
    interval = 1;
    consecutiveCorrect = 0;
  } else {
    consecutiveCorrect += 1;

    if (reviewCount === 0) {
      interval = 1;
    } else if (reviewCount === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Calculate next review date (set to start of day for consistent date comparison)
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  nextReviewDate.setHours(0, 0, 0, 0);

  // Calculate new review count BEFORE determining status
  const newReviewCount = reviewCount + 1;

  // Determine status based on NEW review count
  let status: WordProgress['status'] = 'learning';
  if (consecutiveCorrect >= 5 && interval >= 21) {
    status = 'mastered';
  } else if (newReviewCount > 0) {
    // After any review, status becomes 'reviewing'
    status = 'reviewing';
  }

  return {
    interval,
    easeFactor,
    consecutiveCorrect,
    reviewCount: newReviewCount,
    nextReviewDate: nextReviewDate.toISOString(),
    lastReviewDate: new Date().toISOString(),
    status,
  };
}

/**
 * Create initial progress for a new word
 */
export function createInitialProgress(wordId: string): WordProgress {
  return {
    wordId,
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    nextReviewDate: new Date().toISOString(),
    reviewCount: 0,
    consecutiveCorrect: 0,
    status: 'new',
  };
}

/**
 * Check if a word is due for review
 * Compares only the date part (ignoring time) to ensure words are available
 * for review at any time on or after the due date
 */
export function isDueForReview(progress: WordProgress): boolean {
  const now = new Date();
  const dueDate = new Date(progress.nextReviewDate);

  // Compare only year, month, and day (ignore time)
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  return nowDate >= dueDateOnly;
}

/**
 * Get words that are due for review today
 */
export function getWordsToReview(
  progressMap: Map<string, WordProgress>,
  limit: number = 50
): string[] {
  const dueWords: { wordId: string; dueDate: Date }[] = [];

  progressMap.forEach((progress, wordId) => {
    // Only include words that have been reviewed at least once
    // Exclude 'new' status and words with reviewCount === 0 (just started learning but not yet reviewed)
    if (isDueForReview(progress) && progress.status !== 'new' && progress.reviewCount > 0) {
      dueWords.push({
        wordId,
        dueDate: new Date(progress.nextReviewDate),
      });
    }
  });

  // Sort by due date (oldest first)
  dueWords.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return dueWords.slice(0, limit).map((w) => w.wordId);
}

/**
 * Get new words that haven't been learned yet
 * Also includes words that are in 'learning' status but haven't been reviewed yet
 * (started but not completed first learning session)
 */
export function getNewWords(
  allWordIds: string[],
  progressMap: Map<string, WordProgress>,
  limit: number = 20
): string[] {
  const newWords: string[] = [];
  const learningWords: string[] = [];

  for (const wordId of allWordIds) {
    const progress = progressMap.get(wordId);
    if (!progress) {
      // Completely new word
      newWords.push(wordId);
    } else if (progress.status === 'learning' && progress.reviewCount === 0) {
      // Started but not completed first learning (prioritize these)
      learningWords.push(wordId);
    }

    // Stop early if we have enough
    if (learningWords.length + newWords.length >= limit) break;
  }

  // Return learning words first (to continue where user left off), then new words
  const result = [...learningWords, ...newWords].slice(0, limit);
  return result;
}

/**
 * Calculate XP reward based on response quality
 */
export function calculateXP(quality: ResponseQuality, isReview: boolean): number {
  const baseXP: Record<ResponseQuality, number> = {
    forgot: 2,
    hard: 8,
    good: 10,
    easy: 15,
  };

  return isReview ? baseXP[quality] : baseXP[quality] * 1.5;
}
