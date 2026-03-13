import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signInWithEmail, signUpWithEmail, signInAnonymously, isLoading, isConfigured } =
    useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 如果 Supabase 未配置，跳转到主应用
  if (!isConfigured) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      await signInAnonymously();
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="clay-card max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl text-[var(--text-primary)] mb-2">
            {t('app.name', '词汇学习')}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {mode === 'login' ? t('auth.loginDesc', '登录以同步学习进度') : t('auth.registerDesc', '创建账户开始学习')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t('auth.email', '邮箱')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="clay-input w-full pl-10"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t('auth.password', '密码')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="clay-input w-full pl-10"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="clay-btn clay-btn-primary w-full flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' ? t('auth.login', '登录') : t('auth.register', '注册')}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-[var(--accent)] hover:underline text-sm"
          >
            {mode === 'login'
              ? t('auth.noAccount', '没有账户？注册')
              : t('auth.hasAccount', '已有账户？登录')}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
          <button
            onClick={handleAnonymousLogin}
            className="clay-btn w-full flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <User className="w-4 h-4" />
            {t('auth.tryFirst', '先体验，稍后注册')}
          </button>
          <p className="text-xs text-[var(--text-tertiary)] mt-2 text-center">
            {t('auth.anonymousHint', '匿名登录后可随时绑定邮箱保存进度')}
          </p>
        </div>
      </div>
    </div>
  );
}
