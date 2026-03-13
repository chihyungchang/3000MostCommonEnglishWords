import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Bot, User, Loader2, Sparkles, MessageCircle } from 'lucide-react';
import { useDevice } from '../hooks/useDevice';
import type { Word } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatDialogProps {
  word: Word | null;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string, context: string) => Promise<string>;
  isLoading: boolean;
}

export function AIChatDialog({ word, isOpen, onClose, onSendMessage, isLoading }: AIChatDialogProps) {
  const { t } = useTranslation();
  const { isMobile } = useDevice();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset messages when word changes
  useEffect(() => {
    if (word) {
      setMessages([]);
    }
  }, [word?.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !word) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const context = `当前学习的单词: ${word.word}\n定义: ${word.definition || ''}\n例句: ${word.example || ''}`;
      const response = await onSendMessage(userMessage, context);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('ai.error', '抱歉，出现了错误，请重试。') },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    t('ai.quickQ1', '这个词怎么记？'),
    t('ai.quickQ2', '给我造个句子'),
    t('ai.quickQ3', '有哪些近义词？'),
    t('ai.quickQ4', '词根是什么？'),
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => handleSend(), 0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/30 z-99"
          onClick={onClose}
        />
      )}

      {/* Chat Panel */}
      <div className={`
        fixed flex flex-col z-100
        ${isMobile
          ? 'inset-0 bg-theme-primary safe-area-pt safe-area-pb'
          : 'inset-y-4 right-4 w-96 clay-float'
        }
      `}>
        {/* Header */}
        <div className={`
          flex items-center justify-between p-4 border-b-3 border-theme
          ${isMobile ? 'bg-theme-secondary' : ''}
        `}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-accent to-teal-600 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-theme-primary">
                {t('ai.chatTitle', 'AI 助教')}
              </h3>
              {word && (
                <p className="text-xs text-theme-tertiary">
                  {t('ai.learning', '正在学习')}: <span className="font-medium text-accent">{word.word}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="clay-btn w-10 h-10 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isMobile ? 'bg-theme-primary' : ''}`}>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center border-3 border-accent/20">
                <MessageCircle className="w-8 h-8 text-accent" />
              </div>
              <p className="text-theme-secondary mb-6 text-sm">
                {t('ai.welcomeMessage', '有什么关于这个单词的问题吗？')}
              </p>
              {/* Quick Questions - Grid layout for better alignment */}
              <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(q)}
                    className="clay-btn py-2.5 px-3 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-accent'
                      : 'bg-linear-to-br from-accent to-teal-600'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`clay-card p-3 max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-accent text-white border-accent'
                      : 'bg-theme-tertiary'
                  }`}
                >
                  <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user' ? 'text-white' : 'text-theme-primary'
                  }`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-accent to-teal-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="clay-card p-3 bg-theme-tertiary">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-sm text-theme-tertiary">
                    {t('ai.thinking', '思考中...')}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={`p-4 border-t-3 border-theme ${isMobile ? 'bg-theme-secondary safe-area-pb' : ''}`}>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ai.inputPlaceholder', '输入你的问题...')}
              className="clay-input flex-1 py-3 px-4"
              disabled={isLoading || !word}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !word}
              className="clay-btn clay-btn-primary w-12 h-12 flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
