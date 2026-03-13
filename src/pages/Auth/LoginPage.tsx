import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, ArrowRight, BookOpen, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signInWithEmail, signUpWithEmail, signInAnonymously, isLoading, isConfigured } =
    useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  // 如果 Supabase 未配置，跳转到主应用
  if (!isConfigured) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 注册时验证密码是否一致
    if (mode === 'register' && password !== confirmPassword) {
      setError(t('auth.passwordMismatch', '两次输入的密码不一致'));
      return;
    }

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
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[var(--accent)]/5 rounded-full blur-3xl" />
      </div>

      <div className="clay-card max-w-md w-full p-8 relative">
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] shadow-lg mb-4">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-heading text-3xl text-[var(--text-primary)] mb-2">
            {t('app.name', '3000词汇')}
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {mode === 'login'
              ? t('auth.loginDesc', '登录账户，同步你的学习进度')
              : t('auth.registerDesc', '创建账户，开启学习之旅')}
          </p>
        </div>

        {/* 切换标签 */}
        <div className="flex bg-[var(--bg-tertiary)] rounded-2xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              mode === 'login'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t('auth.login', '登录')}
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              mode === 'register'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t('auth.register', '注册')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 邮箱输入 */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {t('auth.email', '邮箱地址')}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                <Mail className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="clay-input w-full pl-16 pr-4 py-4 text-base"
                placeholder="example@email.com"
                required
              />
            </div>
          </div>

          {/* 密码输入 */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {t('auth.password', '密码')}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                <Lock className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="clay-input w-full pl-16 pr-14 py-4 text-base"
                placeholder={mode === 'register' ? '至少6位字符' : '输入密码'}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 确认密码输入 - 仅注册时显示 */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                {t('auth.confirmPassword', '确认密码')}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="clay-input w-full pl-16 pr-14 py-4 text-base"
                  placeholder="再次输入密码"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/30">
              <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-500 text-xs">!</span>
              </div>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            className="clay-btn clay-btn-primary w-full py-4 flex items-center justify-center gap-2 text-base font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' ? t('auth.loginBtn', '登录账户') : t('auth.registerBtn', '创建账户')}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* 分割线 */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
            {t('auth.or', '或者')}
          </span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        {/* 匿名登录 */}
        <button
          onClick={handleAnonymousLogin}
          className="clay-btn w-full py-4 flex items-center justify-center gap-3 group"
          disabled={isLoading}
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center group-hover:bg-[var(--accent)]/10 transition-colors">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div className="text-left">
            <p className="font-medium text-[var(--text-primary)]">
              {t('auth.tryFirst', '免登录体验')}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {t('auth.anonymousHint', '稍后可绑定邮箱同步数据')}
            </p>
          </div>
        </button>

        {/* 底部提示 */}
        <p className="text-xs text-[var(--text-tertiary)] text-center mt-6">
          {mode === 'register'
            ? t('auth.termsHint', '注册即表示同意我们的服务条款')
            : t('auth.secureHint', '你的数据将被安全加密存储')}
        </p>
      </div>
    </div>
  );
}
