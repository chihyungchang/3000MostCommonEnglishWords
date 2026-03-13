import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, BarChart3, Settings, GraduationCap, Sparkles, Zap, Github } from 'lucide-react';
import { useDevice } from '../hooks/useDevice';
import { useUserStore } from '../stores/userStore';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', icon: BookOpen, labelKey: 'nav.learn' },
  { to: '/challenge', icon: Zap, labelKey: 'nav.challenge' },
  { to: '/stats', icon: BarChart3, labelKey: 'nav.stats' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const { isDesktop } = useDevice();
  const { stats } = useUserStore();

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-theme-primary flex">
        {/* Desktop Sidebar - Claymorphism Style */}
        <aside className="w-72 clay-float fixed left-4 top-4 bottom-4 flex flex-col overflow-hidden">
          {/* Logo */}
          <div className="p-6 border-b-3 border-theme">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-theme-primary">{t('app.title')}</h1>
                <p className="text-xs text-theme-secondary leading-tight">{t('app.subtitle')}</p>
              </div>
              <a
                href="https://github.com/chihyungchang/3000MostCommonEnglishWords"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary transition-colors"
                title="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map(({ to, icon: Icon, labelKey }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'clay-nav-item active font-semibold'
                          : 'clay-nav-item text-theme-secondary hover:text-theme-primary'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span>{t(labelKey)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Stats Card */}
          <div className="p-4 border-t-3 border-theme">
            <div className="clay-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-warning" />
                <span className="text-sm font-semibold text-theme-primary">{t('stats.daily')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 text-center border-2 border-theme">
                  <p className="text-2xl font-bold text-info">
                    {stats.todayLearned}
                  </p>
                  <p className="text-xs text-theme-secondary mt-1">{t('stats.todayLearned')}</p>
                </div>
                <div className="rounded-xl p-3 text-center border-2 border-theme">
                  <p className="text-2xl font-bold text-success">
                    {stats.todayReviewed}
                  </p>
                  <p className="text-xs text-theme-secondary mt-1">{t('stats.todayReviewed')}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-80">{children}</main>
      </div>
    );
  }

  // Mobile/Tablet Layout
  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Mobile Header with GitHub */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-theme-primary/80 backdrop-blur-sm border-b border-theme safe-area-pt">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-theme-primary">{t('app.title')}</span>
          </div>
          <a
            href="https://github.com/chihyungchang/3000MostCommonEnglishWords"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary transition-colors"
            title="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </header>
      <div className="pt-14">
        {children}
      </div>
      {/* Bottom Navigation - Claymorphism Style */}
      <nav className="fixed bottom-4 left-4 right-4 clay-float safe-area-pb z-50">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {navItems.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-accent font-semibold'
                    : 'text-theme-secondary hover:text-theme-primary'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">{t(labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
