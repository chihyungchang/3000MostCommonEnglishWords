import { useTranslation } from 'react-i18next';
import { XCircle, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import type { ResponseQuality } from '../types';

interface ResponseButtonsProps {
  onResponse: (quality: ResponseQuality) => void;
  disabled?: boolean;
}

export function ResponseButtons({ onResponse, disabled }: ResponseButtonsProps) {
  const { t } = useTranslation();

  const buttons: {
    quality: ResponseQuality;
    labelKey: string;
    icon: typeof XCircle;
    colors: {
      bg: string;
      border: string;
      hover: string;
    };
  }[] = [
    {
      quality: 'forgot',
      labelKey: 'response.forgot',
      icon: XCircle,
      colors: { bg: '#ef4444', border: '#dc2626', hover: '#dc2626' },
    },
    {
      quality: 'hard',
      labelKey: 'response.hard',
      icon: AlertCircle,
      colors: { bg: '#eab308', border: '#ca8a04', hover: '#ca8a04' },
    },
    {
      quality: 'good',
      labelKey: 'response.good',
      icon: CheckCircle,
      colors: { bg: '#22c55e', border: '#16a34a', hover: '#16a34a' },
    },
    {
      quality: 'easy',
      labelKey: 'response.easy',
      icon: Zap,
      colors: { bg: '#3b82f6', border: '#2563eb', hover: '#2563eb' },
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 w-full max-w-lg mx-auto">
      {buttons.map(({ quality, labelKey, icon: Icon, colors }) => (
        <button
          key={quality}
          onClick={() => onResponse(quality)}
          disabled={disabled}
          className="rounded-2xl py-3 px-2 font-semibold text-white transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: colors.bg,
            border: `3px solid ${colors.border}`,
            boxShadow: '4px 4px 0px rgba(0,0,0,0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.hover;
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.bg;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Icon className="w-5 h-5" />
          <span className="text-xs sm:text-sm">{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
