import { useState } from 'react';
import type { Word } from '../types';

interface AIPracticeProps {
  word: Word;
  onClose: () => void;
}

interface Feedback {
  correct: boolean;
  score: number;
  corrections: string[];
  betterVersion?: string;
  encouragement: string;
}

export function AIPractice({ word, onClose }: AIPracticeProps) {
  const [sentence, setSentence] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!sentence.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Note: This requires a backend API endpoint
      // For demo, we'll use a mock response
      // In production, call your API: POST /api/ai/check-sentence

      const mockFeedback: Feedback = {
        correct: sentence.toLowerCase().includes(word.word.toLowerCase()),
        score: sentence.toLowerCase().includes(word.word.toLowerCase()) ? 85 : 40,
        corrections: sentence.toLowerCase().includes(word.word.toLowerCase())
          ? ['句子结构正确', '单词使用恰当']
          : ['请确保在句子中使用目标单词'],
        betterVersion: `Here is a better example: ${word.example || `I ${word.word} every day.`}`,
        encouragement: sentence.toLowerCase().includes(word.word.toLowerCase())
          ? '做得很好！继续保持！'
          : '别灰心，再试一次！',
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFeedback(mockFeedback);

    } catch (err) {
      setError('AI 服务暂时不可用，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">AI 造句练习</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-500 mt-1">
            请用 <span className="font-bold text-blue-600">{word.word}</span> 造一个句子
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Word info */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="font-bold text-blue-800 text-xl">{word.word}</p>
            {word.phonetic && <p className="text-blue-600 text-sm">{word.phonetic}</p>}
            {word.definition && <p className="text-blue-700 mt-2">{word.definition}</p>}
          </div>

          {/* Input */}
          <div>
            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder={`用 ${word.word} 写一个句子...`}
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Submit button */}
          {!feedback && (
            <button
              onClick={handleSubmit}
              disabled={loading || !sentence.trim()}
              className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  AI 正在批改...
                </>
              ) : (
                '提交给 AI 批改'
              )}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl">
              {error}
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div className="space-y-4">
              {/* Score */}
              <div className={`p-4 rounded-xl ${feedback.correct ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`text-4xl font-bold ${feedback.correct ? 'text-green-600' : 'text-yellow-600'}`}>
                    {feedback.score}
                  </div>
                  <div>
                    <p className={`font-medium ${feedback.correct ? 'text-green-800' : 'text-yellow-800'}`}>
                      {feedback.correct ? '正确！' : '需要改进'}
                    </p>
                    <p className={`text-sm ${feedback.correct ? 'text-green-600' : 'text-yellow-600'}`}>
                      {feedback.encouragement}
                    </p>
                  </div>
                </div>
              </div>

              {/* Corrections */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-2">反馈</p>
                <ul className="space-y-1">
                  {feedback.corrections.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-500">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Better version */}
              {feedback.betterVersion && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600 mb-1">参考句子</p>
                  <p className="text-blue-800 italic">{feedback.betterVersion}</p>
                </div>
              )}

              {/* Try again */}
              <button
                onClick={() => {
                  setFeedback(null);
                  setSentence('');
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                再试一次
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
