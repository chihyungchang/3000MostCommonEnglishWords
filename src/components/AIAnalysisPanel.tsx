import { useTranslation } from 'react-i18next';
import {
  Lightbulb,
  BookOpen,
  ArrowLeftRight,
  MessageCircle,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import type { WordAnalysis } from '../services/aiService';

interface AIAnalysisPanelProps {
  analysis: WordAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export function AIAnalysisPanel({ analysis, isLoading, error, onClose }: AIAnalysisPanelProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="clay-card p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
          <span className="text-theme-secondary font-medium">
            {t('ai.analyzing', 'AI 正在分析...')}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="clay-card p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
          <button onClick={onClose} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  // If we got raw text (parsing failed), show it as-is
  if (analysis.raw) {
    return (
      <div className="clay-card p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-theme-primary">
              {t('ai.analysis', 'AI 解析')}
            </h3>
          </div>
          <button onClick={onClose} className="text-theme-tertiary hover:text-theme-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-theme-secondary whitespace-pre-wrap">{analysis.raw}</p>
      </div>
    );
  }

  return (
    <div className="clay-card p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-theme-primary">
            {t('ai.analysis', 'AI 解析')}
          </h3>
        </div>
        <button onClick={onClose} className="text-theme-tertiary hover:text-theme-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Etymology */}
        {analysis.etymology && (
          <div className="clay-card p-3 bg-white/50 dark:bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-theme-secondary">
                {t('ai.etymology', '词源')}
              </span>
            </div>
            <p className="text-theme-primary text-sm">{analysis.etymology}</p>
          </div>
        )}

        {/* Memory Tip */}
        {analysis.memory_tip && (
          <div className="clay-card p-3 bg-yellow-50/50 dark:bg-yellow-900/10">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-semibold text-theme-secondary">
                {t('ai.memoryTip', '记忆技巧')}
              </span>
            </div>
            <p className="text-theme-primary text-sm">{analysis.memory_tip}</p>
          </div>
        )}

        {/* Synonyms & Antonyms */}
        {(analysis.synonyms?.length || analysis.antonyms?.length) && (
          <div className="clay-card p-3 bg-white/50 dark:bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowLeftRight className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-theme-secondary">
                {t('ai.synonymsAntonyms', '近义词 / 反义词')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.synonyms?.map((s, i) => (
                <span
                  key={`syn-${i}`}
                  className="clay-badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs"
                >
                  {s}
                </span>
              ))}
              {analysis.antonyms?.map((a, i) => (
                <span
                  key={`ant-${i}`}
                  className="clay-badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Collocations */}
        {analysis.collocations?.length && (
          <div className="clay-card p-3 bg-white/50 dark:bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-teal-500" />
              <span className="text-sm font-semibold text-theme-secondary">
                {t('ai.collocations', '常见搭配')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.collocations.map((c, i) => (
                <span
                  key={`col-${i}`}
                  className="clay-badge text-xs"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Example Sentences */}
        {analysis.example_sentences?.length && (
          <div className="clay-card p-3 bg-white/50 dark:bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-theme-secondary">
                {t('ai.exampleSentences', 'AI 例句')}
              </span>
            </div>
            <ul className="space-y-1">
              {analysis.example_sentences.map((ex, i) => (
                <li key={`ex-${i}`} className="text-theme-primary text-sm italic">
                  "{ex}"
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Usage Notes */}
        {analysis.usage_notes && (
          <div className="clay-card p-3 bg-orange-50/50 dark:bg-orange-900/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-theme-secondary">
                {t('ai.usageNotes', '用法注意')}
              </span>
            </div>
            <p className="text-theme-primary text-sm">{analysis.usage_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
