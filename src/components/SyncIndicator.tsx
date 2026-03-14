import { Cloud, CloudOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useSyncStore } from '../stores/syncStore';
import { useAuth } from '../providers/AuthProvider';
import { useTranslation } from 'react-i18next';

export function SyncIndicator() {
  const { t } = useTranslation();
  const { isAuthenticated, isConfigured } = useAuth();
  const { isSyncing, lastSyncTime, syncError, isOnline } = useSyncStore();

  // Don't show if not configured or not authenticated
  if (!isConfigured || !isAuthenticated) {
    return null;
  }

  // Offline state
  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-theme-tertiary text-sm">
        <CloudOff className="w-4 h-4" />
        <span>{t('sync.offline', 'Offline')}</span>
      </div>
    );
  }

  // Syncing state
  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-accent text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{t('sync.syncing', 'Syncing...')}</span>
      </div>
    );
  }

  // Error state
  if (syncError) {
    return (
      <div className="flex items-center gap-1.5 text-error text-sm" title={syncError}>
        <AlertCircle className="w-4 h-4" />
        <span>{t('sync.error', 'Sync failed')}</span>
      </div>
    );
  }

  // Synced state
  if (lastSyncTime) {
    const syncDate = new Date(lastSyncTime);
    const timeAgo = getTimeAgo(syncDate);

    return (
      <div className="flex items-center gap-1.5 text-success text-sm" title={syncDate.toLocaleString()}>
        <Check className="w-4 h-4" />
        <span>{timeAgo}</span>
      </div>
    );
  }

  // Default: connected but not synced yet
  return (
    <div className="flex items-center gap-1.5 text-theme-tertiary text-sm">
      <Cloud className="w-4 h-4" />
      <span>{t('sync.connected', 'Connected')}</span>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return 'Just synced';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  return date.toLocaleDateString();
}
