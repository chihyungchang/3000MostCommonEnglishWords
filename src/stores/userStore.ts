import { create } from 'zustand';
import type { UserStats, DailyTask, Achievement } from '../types';
import { getItem, setItem, getTodayString, isYesterday, isToday } from '../utils/storage';
import { syncService } from '../services/syncService';

const STATS_KEY = 'user_stats';
const TASKS_KEY = 'daily_tasks';

// Achievement definitions
const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_word',
    name: '初学者',
    description: '学习第一个单词',
    icon: '🌱',
    condition: (stats) => stats.totalWords >= 1,
  },
  {
    id: 'words_50',
    name: '词汇入门',
    description: '学习50个单词',
    icon: '📚',
    condition: (stats) => stats.totalWords >= 50,
  },
  {
    id: 'words_100',
    name: '百词斩',
    description: '学习100个单词',
    icon: '💯',
    condition: (stats) => stats.totalWords >= 100,
  },
  {
    id: 'words_500',
    name: '词汇达人',
    description: '学习500个单词',
    icon: '🎯',
    condition: (stats) => stats.totalWords >= 500,
  },
  {
    id: 'words_1000',
    name: '千词成就',
    description: '学习1000个单词',
    icon: '🏆',
    condition: (stats) => stats.totalWords >= 1000,
  },
  {
    id: 'streak_3',
    name: '三日连胜',
    description: '连续学习3天',
    icon: '🔥',
    condition: (stats) => stats.streak >= 3,
  },
  {
    id: 'streak_7',
    name: '周冠军',
    description: '连续学习7天',
    icon: '⭐',
    condition: (stats) => stats.streak >= 7,
  },
  {
    id: 'streak_30',
    name: '月度霸主',
    description: '连续学习30天',
    icon: '👑',
    condition: (stats) => stats.streak >= 30,
  },
  {
    id: 'mastered_10',
    name: '记忆高手',
    description: '掌握10个单词',
    icon: '🧠',
    condition: (stats) => stats.masteredWords >= 10,
  },
  {
    id: 'level_5',
    name: '中级学者',
    description: '达到5级',
    icon: '📈',
    condition: (stats) => stats.level >= 5,
  },
];

// XP required for each level
const XP_PER_LEVEL = 100;

function createDefaultStats(): UserStats {
  return {
    streak: 0,
    longestStreak: 0,
    totalWords: 0,
    masteredWords: 0,
    todayLearned: 0,
    todayReviewed: 0,
    lastActiveDate: '',
    xp: 0,
    level: 1,
    achievements: [],
    dailyGoal: 20,
  };
}

function createDailyTasks(dailyGoal: number): DailyTask[] {
  return [
    {
      id: 'learn',
      name: '学习新词',
      target: dailyGoal,
      current: 0,
      xpReward: 50,
      completed: false,
    },
    {
      id: 'review',
      name: '复习单词',
      target: Math.ceil(dailyGoal * 1.5),
      current: 0,
      xpReward: 30,
      completed: false,
    },
    {
      id: 'streak',
      name: '保持连续',
      target: 1,
      current: 0,
      xpReward: 20,
      completed: false,
    },
  ];
}

interface UserState {
  stats: UserStats;
  dailyTasks: DailyTask[];
  isLoaded: boolean;

  // Actions
  loadUser: () => void;
  saveUser: () => void;
  addXP: (amount: number) => void;
  recordLearn: () => void;
  recordReview: () => void;
  recordMastered: () => void;
  checkStreak: () => void;
  checkAchievements: () => string[]; // Returns new achievement IDs
  setDailyGoal: (goal: number) => void;

  // Cloud sync actions
  setStatsFromCloud: (stats: UserStats) => void;

  // Queries
  getLevel: () => number;
  getXPProgress: () => { current: number; needed: number; percentage: number };
  getAllAchievements: () => (Achievement & { unlocked: boolean })[];
}

export const useUserStore = create<UserState>((set, get) => ({
  stats: createDefaultStats(),
  dailyTasks: [],
  isLoaded: false,

  loadUser: () => {
    const savedStats = getItem<UserStats>(STATS_KEY, createDefaultStats());
    const today = getTodayString();

    // Check if we need to reset daily stats
    if (savedStats.lastActiveDate !== today) {
      savedStats.todayLearned = 0;
      savedStats.todayReviewed = 0;
    }

    // Load or create daily tasks
    let dailyTasks = getItem<DailyTask[]>(TASKS_KEY, []);
    const savedTaskDate = getItem<string>('tasks_date', '');

    if (savedTaskDate !== today) {
      dailyTasks = createDailyTasks(savedStats.dailyGoal);
      setItem('tasks_date', today);
    }

    set({ stats: savedStats, dailyTasks, isLoaded: true });

    // Check streak on load
    get().checkStreak();
  },

  saveUser: () => {
    const { stats, dailyTasks } = get();
    setItem(STATS_KEY, stats);
    setItem(TASKS_KEY, dailyTasks);

    // Sync to cloud
    syncService.queueChange('stats', 'user', stats);
  },

  setStatsFromCloud: (cloudStats: UserStats) => {
    const today = getTodayString();

    // Reset daily stats if not today
    if (cloudStats.lastActiveDate !== today) {
      cloudStats.todayLearned = 0;
      cloudStats.todayReviewed = 0;
    }

    // Create fresh daily tasks based on cloud settings
    const dailyTasks = createDailyTasks(cloudStats.dailyGoal);
    setItem('tasks_date', today);

    set({ stats: cloudStats, dailyTasks, isLoaded: true });
    setItem(STATS_KEY, cloudStats);
    setItem(TASKS_KEY, dailyTasks);
  },

  addXP: (amount: number) => {
    const { stats, saveUser } = get();
    const newXP = stats.xp + amount;
    const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;

    set({
      stats: {
        ...stats,
        xp: newXP,
        level: newLevel,
      },
    });
    saveUser();
  },

  recordLearn: () => {
    const { stats, dailyTasks, saveUser } = get();
    const today = getTodayString();

    const newStats = {
      ...stats,
      totalWords: stats.totalWords + 1,
      todayLearned: stats.todayLearned + 1,
      lastActiveDate: today,
    };

    // Update daily task
    const newTasks = dailyTasks.map((task) => {
      if (task.id === 'learn' && !task.completed) {
        const newCurrent = task.current + 1;
        return {
          ...task,
          current: newCurrent,
          completed: newCurrent >= task.target,
        };
      }
      return task;
    });

    set({ stats: newStats, dailyTasks: newTasks });
    saveUser();
  },

  recordReview: () => {
    const { stats, dailyTasks, saveUser } = get();
    const today = getTodayString();

    const newStats = {
      ...stats,
      todayReviewed: stats.todayReviewed + 1,
      lastActiveDate: today,
    };

    // Update daily task
    const newTasks = dailyTasks.map((task) => {
      if (task.id === 'review' && !task.completed) {
        const newCurrent = task.current + 1;
        return {
          ...task,
          current: newCurrent,
          completed: newCurrent >= task.target,
        };
      }
      return task;
    });

    set({ stats: newStats, dailyTasks: newTasks });
    saveUser();
  },

  recordMastered: () => {
    const { stats, saveUser } = get();
    set({
      stats: {
        ...stats,
        masteredWords: stats.masteredWords + 1,
      },
    });
    saveUser();
  },

  checkStreak: () => {
    const { stats, dailyTasks, saveUser } = get();
    const today = getTodayString();
    let newStreak = stats.streak;

    if (stats.lastActiveDate === today) {
      // Already active today, check streak task
      const newTasks = dailyTasks.map((task) => {
        if (task.id === 'streak') {
          return { ...task, current: 1, completed: true };
        }
        return task;
      });
      set({ dailyTasks: newTasks });
    } else if (isYesterday(stats.lastActiveDate)) {
      // Consecutive day
      newStreak = stats.streak + 1;
    } else if (stats.lastActiveDate && !isToday(stats.lastActiveDate)) {
      // Streak broken
      newStreak = 0;
    }

    const newStats = {
      ...stats,
      streak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
    };

    set({ stats: newStats });
    saveUser();
  },

  checkAchievements: () => {
    const { stats, saveUser } = get();
    const newAchievements: string[] = [];

    ACHIEVEMENTS.forEach((achievement) => {
      if (
        !stats.achievements.includes(achievement.id) &&
        achievement.condition(stats)
      ) {
        newAchievements.push(achievement.id);
      }
    });

    if (newAchievements.length > 0) {
      set({
        stats: {
          ...stats,
          achievements: [...stats.achievements, ...newAchievements],
        },
      });
      saveUser();
    }

    return newAchievements;
  },

  setDailyGoal: (goal: number) => {
    const { stats, saveUser } = get();
    set({
      stats: { ...stats, dailyGoal: goal },
    });
    saveUser();
  },

  getLevel: () => {
    return get().stats.level;
  },

  getXPProgress: () => {
    const { stats } = get();
    const currentLevelXP = stats.xp % XP_PER_LEVEL;
    return {
      current: currentLevelXP,
      needed: XP_PER_LEVEL,
      percentage: (currentLevelXP / XP_PER_LEVEL) * 100,
    };
  },

  getAllAchievements: () => {
    const { stats } = get();
    return ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: stats.achievements.includes(a.id),
    }));
  },
}));
