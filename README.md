# Load

Load is a personal fitness tracker designed to prescribe the next workout target automatically
using progressive-overload rules.

## Stack

- Vue 3, Vite, and TypeScript
- Pinia and Vue Router
- Supabase Auth and PostgreSQL
- Zod validation
- Vitest

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a Supabase project, then copy `.env.example` to `.env` and replace its placeholders:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The publishable/anon key is intended for browser use. Never add a Supabase secret key,
service-role key, or database password to this application.

### 3. Link and migrate the database

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

The initial migration creates `public.profiles`, an automatic profile trigger, and Row Level
Security policies restricting every user to their own profile.

### 4. Run the app

```bash
npm run dev
```

## Quality checks

```bash
npm run type-check
npm run lint
npm test
npm run build
```

## Current milestone

Milestones 6 through 8 are complete. The app now provides:

- Registration, persistent sessions, protected routing, and profile preferences
- A private exercise library with search, editing, archiving, and restoring
- Workout-program creation, duplication, editing, archiving, and restoring
- Ordered exercise prescriptions with independently configurable set-level rep ranges, weights,
  and increments
- Transactional program replacement and Row Level Security on every application table
- Sequential active-workout logging with configurable rest between exercises
- Completed and cancelled workout history with set-level results
- Automatic double progression: add one rep after success, add weight and reset reps at the top
  of the range, or repeat the target after a miss or skip
- Workout summaries with a transparent preview of every next target
- Private fitness goals for weight, body fat, calories, protein, water, and steps
- One editable daily nutrition, hydration, activity, sleep, and notes log per date
- Weekly weight, body-fat, and body-measurement check-ins
- A dashboard with:
  - Today's calorie, protein, water, and step goal progress
  - A weight-trend chart with starting-weight and goal reference lines, plus the change since
    starting
  - Seven-day consistency (logged days, workouts, and today) and a daily-adherence strip
  - Recent strength gains derived from estimated one-rep-max across sessions
  - Recent workouts and a banner to resume an in-progress session
  - A weekly check-in reminder when seven days have passed since the last entry
- Installable PWA with an app-shell service worker for offline browsing, a global offline banner,
  and a per-workout "Synced" / "Saved locally" indicator with local draft persistence so a refresh
  mid-session never loses your entries
