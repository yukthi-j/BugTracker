# Bug Tracker App

This project is a Firebase-backed bug tracking system built with Next.js, TypeScript, Tailwind CSS, and a persistent light/dark theme.

## Current status: Phase 5 complete
- Phase 1 app shell and theme system
- Firebase client environment validation
- Strict bug domain model (status and priority unions)
- Status transition rules for the MVP workflow
- Firestore repository methods:
	- `createBug`
	- `listBugs`
	- `listBugsByStatus`
	- `updateBug`
	- `transitionStatus`
	- `deleteBug`
- Deterministic default ordering: `updatedAt desc`, then `createdAt desc`, then `id asc`
- Working prototype Kanban board with six status columns
- Create and edit forms with validation (required title, bounded description)
- Persisted status movement using allowed transition rules
- Loading, empty, and error states for board interactions
- Optimistic updates for create, edit, transition, and delete
- Rollback to last confirmed Firestore state on failed writes
- Search by title/description, status-chip filtering, and multiple sort modes
- Responsive horizontal board browsing for small screens
- Automated tests for transition rules, sorting, filtering, Firestore mapping, and board workflow
- Final quality gates verified with `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build`

## Phase 1 baseline included
- Next.js App Router scaffold created manually in-place
- Tailwind CSS baseline styling
- Responsive app shell with theme toggle
- Firebase client environment validation surface

## Local setup
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in the Firebase client values.
4. Start the dev server with `npm run dev`.
5. Open `http://localhost:3000` to view the demo page.

## Available scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:watch`

## Firebase environment variables
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

Until `.env.local` is configured, the app will show an in-app configuration status panel instead of silently failing.

## Quality gates
- Unit coverage for transition rules, sort logic, filter logic, and Firestore snapshot normalization
- Integration-like UI coverage for create -> move status -> verify board update
- Manual validation completed against the configured Firebase project for create, edit, and status movement flows

## Next phase
Potential follow-up work: drag-and-drop transitions, comments/history, attachments, and production deployment hardening.
