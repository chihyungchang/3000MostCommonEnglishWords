# Business map — 3000 Most Common English Words

A vocabulary learning app (React + Supabase). Flashcard learning with SM-2 spaced
repetition, progress stats, and settings. Auth is via Supabase (email/password or
anonymous); when a session exists the app is not login-gated.

## Auth
- [x] Log in — /login (anonymous "免登录体验" → fresh user + onboarding) — log-in-anonymously.spec.ts
  - Note: email/password login still uncovered (needs test credentials).

## Learning
- [x] Reveal word answer and respond — / (flip flashcard → grade recall) — reveal-word-answer-and-respond.spec.ts

## Progress
- [x] View learning stats — /stats (vocabulary total, CEFR levels, today's counts) — view-learning-stats.spec.ts

## Settings
- [x] Change daily goal — /settings (pick a daily word target, verified on Stats) — change-daily-goal.spec.ts
- [x] Cancel reset-data confirmation — /settings (open the destructive "clear all data" guard, cancel, data intact) — cancel-reset-data-confirmation.spec.ts

## Relationships
- Reveal word answer navigates-to View learning stats
- Change daily goal shares-state Reveal word answer
- Log in depends-on nothing

## Notes (not covered — by design)
- Onboarding (/): 3-step first-run wizard, gated by localStorage onboardingCompleted; not reachable once completed without a reset.
- Settings "Reset" (清除所有数据): destructive — clears localStorage and reloads. Not exercised to completion (open + cancel only).
- Language toggle (zh/en) in Settings: skipped to avoid mutating nav text that other specs ground against.
