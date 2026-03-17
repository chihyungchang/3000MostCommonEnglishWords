<p align="center">
  <img src="Screenshot/1.png" alt="3000 Most Common English Words" width="600">
</p>

<h1 align="center">3000 Most Common English Words</h1>

<p align="center">
  <strong>A modern vocabulary learning app with spaced repetition, AI tutoring, and beautiful claymorphism design</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Vite-7.0-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-Apache_2.0-blue?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/CEFR-A1_to_C2-FF6B6B?style=flat-square" alt="CEFR Levels">
  <img src="https://img.shields.io/badge/Words-3000+-22C55E?style=flat-square" alt="Words">
  <img src="https://img.shields.io/badge/i18n-EN_|_中文-F59E0B?style=flat-square" alt="i18n">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Youdao-Dictionary_API-E53935?style=flat-square" alt="Youdao">
  <img src="https://img.shields.io/badge/Cloudflare-Workers_AI-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare">
  <img src="https://img.shields.io/badge/LLaMA-3.2-7C3AED?style=flat-square&logo=meta&logoColor=white" alt="LLaMA">
  <img src="https://img.shields.io/badge/MeloTTS-Speech-10B981?style=flat-square" alt="MeloTTS">
</p>

---

## Features

| Feature | Description |
|---------|-------------|
| **Spaced Repetition (SM-2)** | Scientifically proven algorithm to optimize your learning retention |
| **CEFR Level Tracking** | Track progress across A1, A2, B1, B2, C1, C2 levels with visual progress bars |
| **Cloud Sync** | Sync your progress across devices with Supabase backend |
| **AI Tutor** | Ask questions about any word powered by LLaMA 3.2 |
| **Youdao Dictionary** | Accurate Chinese definitions from Youdao Dictionary API |
| **Text-to-Speech** | Native pronunciation with AI-powered TTS (MeloTTS) |
| **Bilingual Interface** | Supports Chinese (中文) and English |
| **Theme Options** | Light, Dark, and Eye Care (green) themes |
| **Progress Tracking** | Visual statistics and learning journey analytics |
| **Offline Ready** | All word data cached locally for offline access |
| **Responsive Design** | Beautiful experience on desktop and mobile |

---

## Tech Stack

<table>
  <tr>
    <td align="center" width="96">
      <img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
      <br>React 19
    </td>
    <td align="center" width="96">
      <img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
      <br>TypeScript
    </td>
    <td align="center" width="96">
      <img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
      <br>Tailwind 4
    </td>
    <td align="center" width="96">
      <img src="https://skillicons.dev/icons?i=vite" width="48" height="48" alt="Vite" />
      <br>Vite 7
    </td>
    <td align="center" width="96">
      <img src="https://skillicons.dev/icons?i=supabase" width="48" height="48" alt="Supabase" />
      <br>Supabase
    </td>
    <td align="center" width="96">
      <img src="https://skillicons.dev/icons?i=cloudflare" width="48" height="48" alt="Cloudflare" />
      <br>Workers AI
    </td>
  </tr>
</table>

| Category | Technology |
|----------|------------|
| **Frontend** | React 19 + TypeScript + Vite 7 |
| **Styling** | Tailwind CSS 4 with Claymorphism design |
| **State** | Zustand |
| **Routing** | React Router DOM |
| **Backend** | Supabase (Auth + Database + Sync) |
| **Dictionary** | Youdao Dictionary API (accurate Chinese definitions) |
| **AI** | Cloudflare Workers AI (LLaMA 3.2 + MeloTTS) |
| **i18n** | react-i18next |
| **Icons** | Lucide React |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/3000MostCommonEnglishWords.git
cd 3000MostCommonEnglishWords

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file:

```env
# Supabase (required for cloud sync)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Cloudflare Workers AI (optional, for AI features)
VITE_AI_WORKER_URL=https://your-worker.workers.dev
```

### Cloudflare Worker Setup

To enable AI features (TTS, chat, dictionary lookup):

```bash
cd cloudflare-worker
npm install

# Add secrets
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put YOUDAO_APP_KEY      # from ai.youdao.com
wrangler secret put YOUDAO_APP_SECRET   # from ai.youdao.com

# Deploy
npm run deploy
```

> **Note:** Get your Youdao API credentials from [有道智云](https://ai.youdao.com/)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  React 19 + TypeScript + Tailwind CSS + Zustand             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Worker                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   /lookup   │  │    /tts     │  │    /chat    │         │
│  │  Youdao API │  │   MeloTTS   │  │  LLaMA 3.2  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Supabase     │  │   R2 Storage    │  │  Youdao API     │
│  (definitions)  │  │  (TTS cache)    │  │  (dictionary)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Project Structure

```
├── src/
│   ├── components/     # UI components
│   ├── pages/          # Route pages (Learn, Stats, Settings)
│   ├── stores/         # Zustand state stores
│   ├── hooks/          # Custom React hooks
│   ├── algorithms/     # SM-2 spaced repetition
│   ├── services/       # Supabase & API services
│   ├── i18n/           # Internationalization (zh/en)
│   └── types/          # TypeScript types
├── public/
│   └── data/           # Word data by CEFR level (A1-C2)
├── cloudflare-worker/  # AI backend (TTS + Chat + Dictionary)
└── Screenshot/         # App screenshots
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Design System

The app uses **Claymorphism** design style featuring:

- **Soft 3D appearance** with playful, toy-like aesthetics
- **Thick borders** (3px) and large border radius (16-24px)
- **Double shadows** for depth and dimension
- **Pastel color palette** with warm cream backgrounds
- **Custom typography** using Fredoka & Nunito fonts

### Themes

| Theme | Description |
|-------|-------------|
| **Light** | Warm cream background with soft pastels |
| **Dark** | Deep purple-gray with vibrant accents |
| **Eye Care** | Soft green tones for reduced eye strain |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/lookup` | POST | Get word definition (Youdao) + phonetic/POS/example (LLaMA) |
| `/tts` | POST | Text-to-speech pronunciation (MeloTTS) |
| `/chat` | POST | AI tutor chat (LLaMA 3.2) |
| `/health` | GET | Health check |

---

## License

<p>
  <img src="https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge" alt="License">
</p>

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with <img src="https://img.shields.io/badge/Love-FF6B6B?style=flat-square&logo=heart&logoColor=white" alt="Love"> and <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
</p>
