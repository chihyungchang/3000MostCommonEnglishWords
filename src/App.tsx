import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Learn, Stats, Settings, Onboarding } from './pages';
import { LoginPage } from './pages/Auth/LoginPage';
import { useWordStore } from './stores/wordStore';
import { useProgressStore } from './stores/progressStore';
import { useUserStore } from './stores/userStore';
import { useSettingsStore } from './stores/themeStore';
import { AppProviders } from './providers/AppProviders';
import { useAuth } from './providers/AuthProvider';
import './i18n';

function AppContent() {
  const { isAuthenticated, isLoading: authLoading, isConfigured } = useAuth();

  // Preload data
  const { loadWords, isLoaded: wordsLoaded, isLoading: wordsLoading } = useWordStore();
  const { loadProgress } = useProgressStore();
  const { loadUser } = useUserStore();
  const { settings, isLoaded, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadWords();
    loadProgress();
    loadUser();
    loadSettings();
  }, [loadWords, loadProgress, loadUser, loadSettings]);

  // Show loading while auth is checking or words are loading
  if (authLoading || wordsLoading || !wordsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="clay-card p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // If Supabase is configured but user not authenticated, show login
  if (isConfigured && !isAuthenticated) {
    return <LoginPage />;
  }

  // Show nothing while loading settings
  if (!isLoaded) {
    return null;
  }

  // Show onboarding if not completed
  if (!settings.onboardingCompleted) {
    return <Onboarding />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Learn />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </BrowserRouter>
  );
}

export default App;
