# stillhour · Personal Study Tracker

A private, calm, and responsive study productivity app for desktop and Android mobile devices, built according to the Antigravity product specification.

## Core Design Principles
- **Aesthetic**: Warm beige and cream backgrounds, muted lilac highlights, espresso text, and soft sage accents. In dark mode: warm charcoal / deep brown surfaces with lavender accents.
- **Offline-First & PWA**: Installable Progressive Web App with service worker caching. Core tracking (timer, subjects, daily tasks, target progress, and analytics) operates locally via IndexedDB with automated sync queues.
- **Accuracy**: Session duration is calculated using timestamps and explicit session states, completely immune to background tab throttling or device sleep.
- **Clean Slate**: Subject list begins completely empty so that the user defines their own curriculum.
- **Data Integrity**: Historical targets are immutable; 30-day soft-delete recycle bin protects against accidental data loss; conflicts are surfaced for user choice without silent overwriting.

---

## Technical Stack
- **Frontend**: React 19, Vite, Tailwind CSS v3, Lucide React icons.
- **Testing**: Vitest automated test suite (28 unit & integration tests).
- **Offline Storage**: IndexedDB (`idb`) client cache with versioned stores and mutation queues.
- **Backend API**: Node.js + Express REST API (`/api/sync`, `/api/backup`, `/api/health`).
- **PWA**: Web App Manifest (`manifest.json`) and Service Worker (`sw.js`).

---

## Local Development & Commands

### 1. Requirements
- Node.js v18+ (tested on Node v22.14)
- npm v10+

### 2. Client Application
```bash
cd stillhour
npm install
npm run dev      # Runs dev server at http://localhost:5173/
npm run test     # Runs 28 Vitest automated tests
npm run build    # Compiles production bundle
```

### 3. Backend API Server
```bash
cd server
npm install
npm start        # Runs Express API on port 4000
```

---

## Environment Variables (.env.example)

`server/.env.example` provides configuration without secrets:
```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/stillhour?retryWrites=true&w=majority
FIREBASE_PROJECT_ID=stillhour-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@stillhour-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## Phased Build Sequence & Acceptance Verification

All 6 phases from the product specification have been implemented and verified:

1. **Phase 1: Foundation (Complete)**:
   - Responsive shell: Left sidebar for desktop, touch-friendly bottom navigation for mobile.
   - Design tokens: Warm cream, espresso, muted lilac, and charcoal.
   - Theme toggle: Light, Dark, and System persistence.
   - Clean slate empty states.

2. **Phase 2: Core Study Flow (Complete)**:
   - Timestamp-backed timer engine immune to background sleep.
   - Exact pause subtraction (`{ pausedAt, resumedAt }`).
   - Sleep/crash recovery modal asking user to resume verified time or credit offline study without silently inventing time.
   - Single timer rule with switch confirmation.
   - 60-second threshold filtering for total study time.
   - 15-minute session correction window.

3. **Phase 3: Planning & Consistency (Complete)**:
   - Daily target dynamically derived from active subject targets.
   - Historical target immutability: past dates retain target snapshots even if targets change in future.
   - Task single-counting guarantee: task-linked sessions contribute exactly once to overall time.
   - Planned rest days set in advance and excluded from streak calculations.
   - Unfinished tasks carry-forward prompts.
   - Reusable daily schedule templates.

4. **Phase 4: Analytics & Reports (Complete)**:
   - Planned vs. actual study time comparison.
   - Imbalance indicators: Understudied (<50%), On Track (50-150%), Overstudied (>150%).
   - 16-week interactive consistency heatmap with cell click filtering.
   - Weekly summary with percentage delta from prior week.
   - Target completion projections with disclaimer banner.
   - Auditable history with search and subject filters.
   - Filtered CSV download and full JSON dataset export.

5. **Phase 5: Persistence & Sync (Complete)**:
   - Versioned IndexedDB client database with offline mutation queue.
   - Express REST API with sync, backup, and healthcheck endpoints.
   - Conflict resolution dialog presenting side-by-side choices without silent overwrites.
   - 30-day soft-delete recycle bin with restore capability.
   - Guarded reset confirmation requiring backup acknowledgement.

6. **Phase 6: Quality & Release (Complete)**:
   - PWA manifest (`manifest.json`), icons (192px and 512px SVG), and service worker (`sw.js`).
   - Accessibility compliance: `prefers-reduced-motion` support, visible `:focus-visible` rings, high-contrast text.
   - Complete JSON migration & restore flow tested and verified.
   - 28/28 automated tests passing across 6 test suites.
