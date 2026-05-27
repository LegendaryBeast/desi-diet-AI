# Frontend Setup Guide

This guide covers installation, configuration, development, and production deployment of the Pusti AI React frontend.

---

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 18 |
| npm | 9 |

---

## Installation

```bash
cd DesiDiet/frontend
npm install
```

---

## Environment Configuration

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
```

For production, set this to the deployed backend URL:

```env
VITE_API_URL=https://desi-diet-backend.onrender.com
```

Vite only exposes variables prefixed with `VITE_` to the browser bundle. The value is inlined at build time, so the production build must be rebuilt if the backend URL changes.

---

## Development Server

```bash
npm run dev
```

The app runs at `http://localhost:5173` with hot module replacement enabled.

---

## Production Build

```bash
npm run build
```

Output is written to `frontend/dist/`. This directory contains:
- `index.html` — the SPA shell (895 bytes)
- `assets/index-*.css` — compiled Tailwind CSS (~75 KB, ~12 KB gzipped)
- `assets/index-*.js` — bundled JavaScript (~1.1 MB, ~310 KB gzipped)

The dist directory is fully static. No Node.js server is required at runtime.

To preview the production build locally:

```bash
npm run preview
```

---

## Project Structure

```
frontend/src/
├── App.tsx                  # Root component: router, auth guards, layout wrappers
├── main.tsx                 # React DOM render entry point
├── index.css                # Global Tailwind CSS directives
├── vite-env.d.ts            # Vite environment type declarations
│
├── pages/                   # One file per route
│   ├── Home.tsx             # Public landing page
│   ├── About.tsx            # About page
│   ├── AuthPage.tsx         # Login and registration forms
│   ├── Dashboard.tsx        # Main authenticated dashboard
│   ├── MealPlan.tsx         # Daily and weekly meal plan view
│   ├── Chat.tsx             # AI nutrition chat interface
│   ├── Profile.tsx          # User profile management
│   ├── HealthLog.tsx        # Health metric logging
│   ├── FoodsPage.tsx        # Food database browser
│   ├── Conditions.tsx       # Medical conditions and dietary rules
│   ├── Micronutrients.tsx   # Micronutrient tracking and targets
│   ├── MedicinePage.tsx     # Medicine reminder management
│   └── ReportPage.tsx       # Health and nutrition reports
│
├── components/
│   ├── layout/
│   │   ├── Nav.tsx          # Top navigation bar (public pages only)
│   │   └── Footer.tsx       # Footer (public pages only)
│   ├── chat/
│   │   └── ChatWindow.tsx   # SSE streaming chat UI
│   ├── home/                # Landing page sections
│   ├── about/               # About page sections
│   ├── meal/
│   │   └── MealLogSection.tsx  # Meal log display within dashboard
│   ├── profile/             # Profile form components
│   └── ui/
│       └── PageLoader.tsx   # Animated loading screen on app init
│
├── contexts/
│   ├── AuthContext.tsx      # Auth state: isLoggedIn, user, login, logout
│   └── SubscriptionContext.tsx  # Subscription/plan state
│
├── hooks/                   # Custom React hooks
│
├── lib/
│   └── api.ts               # Typed API client for all backend endpoints
│
└── types/                   # Shared TypeScript interfaces and types
```

---

## Routing

Routes are defined in `App.tsx` using React Router v6.

**Public routes** (accessible without authentication):
- `/` — Home / landing page
- `/about` — About page
- `/conditions` — Medical conditions and dietary rules explorer
- `/auth` — Login and registration

**Protected routes** (redirect to `/auth` if not logged in):
- `/dashboard` — Main dashboard
- `/chat` — AI nutrition chat
- `/meal-plan` — Meal plan view and editor
- `/health-log` — Health metric logging
- `/profile` — Profile setup and editing
- `/foods` — Food database search
- `/medicine` — Medicine reminders
- `/report` — Health and nutrition reports
- `/micronutrients` — Micronutrient tracking

The navigation bar and footer are hidden on all protected route paths. Protected pages render their own full-screen layout.

---

## Authentication Context

`AuthContext` (`src/contexts/AuthContext.tsx`) manages global auth state. It exposes:

- `isLoggedIn` — boolean
- `isLoading` — boolean (true while verifying stored token on mount)
- `user` — the authenticated user object from `GET /auth/me`
- `login(tokens)` — stores tokens and loads user
- `logout()` — clears tokens and resets state

On mount, the context checks `localStorage` for an existing access token and calls `GET /auth/me` to verify it. If the token is expired, it attempts a refresh automatically via the API client.

The `ProtectedRoute` wrapper in `App.tsx` reads `isLoggedIn` and redirects unauthenticated users to `/auth`.

---

## API Client

`src/lib/api.ts` is the single source of truth for all backend communication. It exports typed functions organized by feature domain:

| Export | Covers |
|---|---|
| `authApi` | register, login, refresh, me |
| `profileApi` | get, create, update |
| `healthLogApi` | create, list, trends |
| `mealPlanApi` | getDaily, getWeekly, getHistory, submitFeedback, markSlotComplete, editPlan |
| `chatApi` | history, stream (SSE), dietPlanStream (SSE), realtimeSession, transcribe |
| `foodsApi` | search, safeFoods, detail, justify, searchWithInsight |
| `mealTrackingApi` | log, logFromImage, today, delete |
| `medicineApi` | add, list, delete |
| `reportsApi` | nutrition, conditions, sendEmail, healthSummary |

All requests use the `apiFetch` helper which:
1. Attaches the Bearer token from `localStorage`
2. Handles 401 responses with an automatic refresh-and-retry cycle
3. Dispatches a global `auth:logout` event on refresh failure
4. Throws typed `ApiError` instances on non-2xx responses

SSE streaming endpoints use the Fetch API with a `ReadableStream` reader rather than `EventSource`, because `EventSource` does not support POST requests.

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `framer-motion` | Page transitions and micro-animations |
| `tailwindcss` | Utility-first CSS framework |
| `tailwind-merge` | Merge Tailwind class names without conflicts |
| `lucide-react` | Icon library |
| `react-icons` | Additional icon sets |
| `recharts` | Charts for dashboard and report pages |
| `i18next` + `react-i18next` | Internationalization (Bengali / English) |
| `i18next-browser-languagedetector` | Auto-detect browser language |
| `clsx` | Conditional className utility |

---

## Deployment to Vercel

The frontend is configured for Vercel with `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This rewrites all routes to `index.html`, which is required for React Router's client-side navigation to work on direct URL access or page refresh.

### Deploy steps

1. Push the repository to GitHub.
2. Import the project in the Vercel dashboard.
3. Set the root directory to `frontend/`.
4. Add the environment variable `VITE_API_URL` pointing to your backend URL.
5. Vercel will automatically run `npm run build` and deploy `dist/`.

For subsequent deploys, pushing to the main branch triggers an automatic redeploy.

### Manual deploy via CLI

```bash
cd frontend
npx vercel --prod
```

---

## TypeScript Configuration

The project uses two `tsconfig` files:

- `tsconfig.json` — main app config targeting `ES2020`, strict mode enabled, JSX set to `react-jsx`
- `tsconfig.node.json` — config for Vite config file itself (`vite.config.ts`)

---

## Linting

```bash
npm run lint
```

ESLint is configured with React and TypeScript rules. The `--max-warnings 0` flag in the lint script treats all warnings as errors.
