---
name: anonymous-login-creates-a-fresh-user-and-shows-onboarding
description: Anonymous login creates a fresh user and shows onboarding
type: expected-behavior
line: Log in
---

Using the "免登录体验" (anonymous / try-without-login) button on the login page always creates a brand-new anonymous Supabase user with no synced settings. Because that new user has no completed onboarding, the app immediately shows the first-run onboarding wizard (step 0 "Get Started"). The login page itself is reachable at /login and renders the full login form whenever Supabase is configured, even if a session already exists.
