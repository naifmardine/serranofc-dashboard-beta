# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

##
Rules: ALWAYS before making any change. search on the web for the newest documentation. only implement if you are 100% sure it will work

## Commands

```bash
npm run dev        # Start dev server (Next.js + Turbopack)
npm run build      # prisma generate + next build
npm run lint       # ESLint
```

No test suite exists — manual testing only.

## Environment Setup

Requires `.env.local` with:
```
DATABASE_URL="postgresql://user:password@host:5432/serranofc"
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
```

Default credentials (after seed):
- Admin: `admin@serrano.com` / `admin@2025`
- Client: `cliente@serrano.com` / `cliente@2025`

## Architecture

**Stack:** Next.js 16 App Router, Prisma + PostgreSQL, Tailwind CSS 4, JWT auth via httpOnly cookies.

### Authentication Flow

1. `POST /api/auth/login` → validates credentials, issues JWT as httpOnly cookie
2. `AuthContext` (`/auth/AuthContext.tsx`) calls `/api/auth/me` on boot to hydrate user state and auto-refresh token
3. Next.js middleware (`middleware.ts`) protects all routes except `/` and `/login`
4. Role-based: `ADMIN` can access `/admin/*`; `CLIENT` cannot

### Data Layer

- Prisma singleton in `lib/prisma.ts` (global cache pattern for dev hot-reload)
- All API routes set `export const dynamic = "force-dynamic"`
- Key models: `User`, `Player` (40+ fields including JSON columns for `statsPorTemporada`, `instagramPosts`, `clausulas`), `Club` (with geo fields), `Transferencia` (with `dedupeKey` for CSV import deduplication)

### Page/Component Structure

- `app/layout.tsx` → wraps everything in `<AuthProvider>` + `<AppShell>`
- `components/AppShell.tsx` → client component that renders `<Sidebar>` + page content
- Pages are in `app/` (Next.js App Router); reusable components in `components/`; small primitives in `components/Atoms/`
- Data fetching is client-side (`useEffect` + `fetch`) — no server components fetch data

### Key Features

- **Players (`/jogadores`)**: list with advanced filter drawer (position, club, agency, age range, value, foot, height, CPF, passport, selecao), grid/list view toggle, PDF export via `jspdf` + `html-to-image`
- **Dashboard**: KPI row + customizable widgets including a Brazil geo-map (`@vnedyalk0v/react19-simple-maps`)
- **Transfers (`/admin/transferencias`)**: CSV import with dedup via `papaparse`; `dedupeKey` prevents duplicates on re-import
- **Image uploads**: Cloudinary via `/api/cloudinary/sign` (signed upload)
- **AI**: `/admin/serrano-ai` page with `/api/chatbot/chat` endpoint

### TypeScript

`strict: false` in `tsconfig.json`. Path alias `@/*` maps to root. Types for the Player entity live in `type/jogador.tsx`.