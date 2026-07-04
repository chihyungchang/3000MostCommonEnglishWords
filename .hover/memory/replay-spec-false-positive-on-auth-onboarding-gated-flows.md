---
name: replay-spec-false-positive-on-auth-onboarding-gated-flows
description: replay_spec false-positive on auth/onboarding gated flows
type: expected-behavior
---

This app gates entry behind a Supabase guest session ("免登录体验" on the LoginPage) and a one-time onboarding wizard (settings.onboardingCompleted). Both persist in the debug Chrome's localStorage. So specs that begin by walking login + onboarding will show replay_spec breaking at the FIRST step ("免登录体验 稍后可绑定邮箱同步数据") on any browser that already has that state — this is a persisted-state false positive, NOT app drift. To judge real drift for these flows, run the spec with a fresh Playwright context (`npx playwright test <slug>`), which starts unauthenticated and un-onboarded. The Hover tools cannot clear the debug browser's storage.
