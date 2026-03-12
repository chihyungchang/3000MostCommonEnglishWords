# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A vocabulary learning application for the 3000 most common English words, built with React + TypeScript + Tailwind CSS + Vite.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Build Tool**: Vite 7
- **State Management**: Zustand
- **Routing**: React Router DOM
- **i18n**: react-i18next
- **Icons**: Lucide React

## Design System - Claymorphism

### Visual Style

The app uses **Claymorphism** design style with the following characteristics:

- **Soft 3D appearance**: Elements look like soft clay or toys
- **Thick borders**: 3px solid borders on cards and buttons
- **Large border radius**: 16-24px for rounded, bubbly feel
- **Double shadows**: Outer shadow + subtle inner highlight
- **Playful pastels**: Soft, candy-like color palette

### CSS Classes

| Class | Usage |
|-------|-------|
| `.clay-card` | Card containers (3px border, 20px radius, double shadow) |
| `.clay-btn` | Buttons with press effect |
| `.clay-btn-primary` | Primary accent button |
| `.clay-btn-success/warning/error/info` | Status buttons |
| `.clay-badge` | Tags and chips |
| `.clay-progress` | Progress bar container |
| `.clay-progress-bar` | Progress bar fill |
| `.clay-float` | Floating containers (sidebar, bottom nav) |
| `.clay-nav-item` | Navigation items |
| `.clay-input` | Form inputs |

### Typography

```css
/* Google Fonts Import */
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@300;400;500;600;700&display=swap');

/* Font Family */
font-family: {
  heading: ['Fredoka', 'sans-serif'],  /* Rounded, playful headings */
  body: ['Nunito', 'sans-serif']       /* Friendly, readable body text */
}
```

### Theme Colors

#### Light Theme (Default)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#FDF6F0` | Page background (warm cream) |
| `--bg-secondary` | `#FFFFFF` | Card backgrounds |
| `--bg-tertiary` | `#FEF3EC` | Subtle highlights |
| `--text-primary` | `#2D3748` | Main text |
| `--text-secondary` | `#4A5568` | Secondary text |
| `--text-tertiary` | `#718096` | Muted text |
| `--border-color` | `#E8DDD5` | Card borders |
| `--accent` | `#0D9488` | Primary teal accent |
| `--accent-hover` | `#0F766E` | Accent hover state |

**Pastel Accents:**
- Mint: `#98FF98`
- Peach: `#FDBCB4`
- Blue: `#ADD8E6`
- Lilac: `#E6E6FA`
- Yellow: `#FFF3B0`

**Status Colors:**
- Success: `#22C55E`
- Warning: `#F59E0B`
- Error: `#EF4444`
- Info: `#3B82F6`

#### Dark Theme

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#1A1D29` | Page background |
| `--bg-secondary` | `#252836` | Card backgrounds |
| `--bg-tertiary` | `#2D3143` | Subtle highlights |
| `--text-primary` | `#F9FAFB` | Main text |
| `--text-secondary` | `#E2E8F0` | Secondary text |
| `--text-tertiary` | `#A0AEC0` | Muted text |
| `--border-color` | `#3D4155` | Card borders |
| `--accent` | `#2DD4BF` | Primary teal accent (brighter) |
| `--accent-hover` | `#5EEAD4` | Accent hover state |

#### Eye Care Theme (Green)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#F0F7F0` | Page background (soft green) |
| `--bg-secondary` | `#FAFDF9` | Card backgrounds |
| `--bg-tertiary` | `#E8F5E8` | Subtle highlights |
| `--text-primary` | `#1B5E20` | Main text (dark green) |
| `--text-secondary` | `#2E7D32` | Secondary text |
| `--text-tertiary` | `#558B2F` | Muted text |
| `--border-color` | `#C8E6C9` | Card borders |
| `--accent` | `#43A047` | Primary green accent |
| `--accent-hover` | `#388E3C` | Accent hover state |

### Shadow System

```css
/* Light Mode Shadows */
--shadow-clay: 6px 6px 0px rgba(0,0,0,0.08),
               -2px -2px 8px rgba(255,255,255,0.9);
--shadow-clay-hover: 4px 4px 0px rgba(0,0,0,0.12),
                     -1px -1px 6px rgba(255,255,255,0.9);
--shadow-clay-active: 2px 2px 0px rgba(0,0,0,0.1),
                      inset 2px 2px 4px rgba(0,0,0,0.05);
--shadow-clay-card: 8px 8px 0px rgba(0,0,0,0.06),
                    -3px -3px 10px rgba(255,255,255,0.95);
--shadow-clay-float: 12px 12px 0px rgba(0,0,0,0.08),
                     -4px -4px 12px rgba(255,255,255,0.95);
```

### Animation Guidelines

- **Transitions**: Use `200-300ms ease-out` for smooth interactions
- **Hover states**: Subtle lift (`translateY(-2px)`) + shadow change
- **Active states**: Press down (`translateY(1px)`) + inset shadow
- **Respect `prefers-reduced-motion`**: Disable animations when requested

### Accessibility

- Maintain 4.5:1 contrast ratio for text
- All interactive elements have `cursor-pointer`
- Focus states are visible
- Support for reduced motion preferences

## Project Structure

```
/
├── src/
│   ├── components/    # Reusable UI components
│   ├── pages/         # Route pages (Learn, Stats, Settings)
│   ├── stores/        # Zustand state stores
│   ├── hooks/         # Custom React hooks
│   ├── algorithms/    # SM-2 spaced repetition
│   ├── i18n/          # Internationalization (zh/en)
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── public/            # Static assets
├── scripts/           # Build scripts
└── words_3000_structured.json  # Word data
```

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## License

Apache License 2.0
