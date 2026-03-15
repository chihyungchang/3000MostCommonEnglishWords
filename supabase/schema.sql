-- ========================================
-- Vocabulary Learning App - Supabase Schema
-- 执行顺序已优化，请在 SQL Editor 中一次性执行
-- ========================================

-- 自动更新 updated_at 函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. 用户配置表 (User Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. 用户统计表 (User Stats) - 先创建，触发器需要引用
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_words INTEGER DEFAULT 0,
  mastered_words INTEGER DEFAULT 0,
  today_learned INTEGER DEFAULT 0,
  today_reviewed INTEGER DEFAULT 0,
  last_active_date DATE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  achievements JSONB DEFAULT '[]'::jsonb,
  daily_goal INTEGER DEFAULT 20,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own stats" ON public.user_stats;
CREATE POLICY "Users can manage own stats"
  ON public.user_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_stats_updated_at ON public.user_stats;
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. 用户设置表 (User Settings) - 先创建，触发器需要引用
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'eyecare')),
  language TEXT DEFAULT 'en' CHECK (language IN ('zh', 'en', 'ja', 'de', 'pt', 'es', 'ru', 'ar', 'ko', 'ms')),
  learn_order TEXT DEFAULT 'new-first' CHECK (learn_order IN ('new-first', 'review-first')),
  onboarding_completed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. 单词学习进度表 (Word Progress)
CREATE TABLE IF NOT EXISTS public.word_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL,

  interval INTEGER DEFAULT 0,
  ease_factor DECIMAL(4,2) DEFAULT 2.5,
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  review_count INTEGER DEFAULT 0,
  consecutive_correct INTEGER DEFAULT 0,
  last_review_date TIMESTAMPTZ,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'learning', 'reviewing', 'mastered')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_word_progress_user_id ON public.word_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_word_progress_next_review ON public.word_progress(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_word_progress_status ON public.word_progress(user_id, status);

ALTER TABLE public.word_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own word progress" ON public.word_progress;
CREATE POLICY "Users can manage own word progress"
  ON public.word_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_word_progress_updated_at ON public.word_progress;
CREATE TRIGGER update_word_progress_updated_at
  BEFORE UPDATE ON public.word_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. 每日任务表 (Daily Tasks)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,

  task_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  target INTEGER NOT NULL,
  current INTEGER DEFAULT 0,
  xp_reward INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, task_date, task_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON public.daily_tasks(user_id, task_date);

ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own daily tasks" ON public.daily_tasks;
CREATE POLICY "Users can manage own daily tasks"
  ON public.daily_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_daily_tasks_updated_at ON public.daily_tasks;
CREATE TRIGGER update_daily_tasks_updated_at
  BEFORE UPDATE ON public.daily_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. 自动创建用户数据的触发器 (最后创建，确保所有表都存在)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email, ''), '@', 1))
  );

  INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. 单词定义缓存表 (Word Definitions Cache)
CREATE TABLE IF NOT EXISTS public.word_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  word TEXT NOT NULL,
  target_lang TEXT NOT NULL DEFAULT 'zh',

  phonetic TEXT,
  pos TEXT[],
  definition TEXT NOT NULL,
  example TEXT,
  is_phrase BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0,

  UNIQUE (word, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_word_definitions_lookup
  ON public.word_definitions(word, target_lang);

DROP TRIGGER IF EXISTS update_word_definitions_updated_at ON public.word_definitions;
CREATE TRIGGER update_word_definitions_updated_at
  BEFORE UPDATE ON public.word_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.word_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read word definitions" ON public.word_definitions;
CREATE POLICY "Anyone can read word definitions"
  ON public.word_definitions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can insert definitions" ON public.word_definitions;
CREATE POLICY "Service role can insert definitions"
  ON public.word_definitions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update definitions" ON public.word_definitions;
CREATE POLICY "Service role can update definitions"
  ON public.word_definitions FOR UPDATE
  USING (true);

-- 8. 词汇表 (Vocabulary Words - 3000 Most Common English Words)
CREATE TABLE IF NOT EXISTS public.words (
  id TEXT PRIMARY KEY,  -- e.g., "A1_0", "A1_1", etc.
  word TEXT NOT NULL,
  pos TEXT[] NOT NULL DEFAULT '{}',
  level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  phonetic TEXT,
  definition TEXT,
  example TEXT,
  synonyms TEXT[] DEFAULT '{}',
  audio TEXT,
  zh TEXT,  -- Chinese translation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_words_level ON public.words(level);
CREATE INDEX IF NOT EXISTS idx_words_word ON public.words(word);

ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

-- Anyone can read words (public vocabulary)
DROP POLICY IF EXISTS "Anyone can read words" ON public.words;
CREATE POLICY "Anyone can read words"
  ON public.words FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_words_updated_at ON public.words;
CREATE TRIGGER update_words_updated_at
  BEFORE UPDATE ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
