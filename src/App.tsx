import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Learn, Stats, Settings, Onboarding, Challenge } from './pages';
import { useWordStore } from './stores/wordStore';
import { useProgressStore } from './stores/progressStore';
import { useUserStore } from './stores/userStore';
import { useSettingsStore } from './stores/themeStore';
import './i18n';

function AppContent() {
  // Preload data
  const { loadWords } = useWordStore();
  const { loadProgress } = useProgressStore();
  const { loadUser } = useUserStore();
  const { settings, isLoaded, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadWords();
    loadProgress();
    loadUser();
    loadSettings();
  }, [loadWords, loadProgress, loadUser, loadSettings]);

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
        <Route path="/challenge" element={<Challenge />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
