# Timekeeper

A local-first time-keeping app built with React, TypeScript, Vite 8, Express, and SQLite. Track time for people and projects, use a persistent start/stop timer or manual entries, and see completed hours and GBP costs in a filterable dashboard.

## Requirements and setup

- Node.js **24 or newer** (uses the built-in `node:sqlite` module).
- npm.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies API requests to the local Express server on port 3001. Both ports must be available. The first launch creates an empty database; add a person and a project to begin.

### Production

```sh
npm run build
npm start
```

Open http://127.0.0.1:3001. Express serves the built React application and the API. Run commands from the project root. No external services, fonts, accounts, or database installations are required.

### Validation

```sh
npm test
npm run typecheck
npm run build
```

Vitest covers the actual SQLite-backed HTTP API, persistence across database reopening, rate snapshots and precedence, timer lifecycle, input validation, date filtering, rounding, and React management forms. `npm run test:watch` enables watch mode.

### Accessibility checks

The accessibility target is **WCAG 2.0 Level AA**, with additional checks for newer requirements such as control contrast, reflow and text spacing. WCAG does not specify a minimum font size; this app uses a 16px-equivalent base with supporting text no smaller than 14px at the default browser font setting. Font sizes use `rem` so browser text preferences are respected.

- Normal and supporting text use a minimum **4.5:1** contrast ratio; primary button text also meets 4.5:1. Input outlines and focus indicators meet **3:1** on their adjacent surfaces. Palette ratios are regression-tested.
- Project colours are decorative accents, never the only way to identify a project or read a value. Arbitrary existing project colours are preserved; names, hours, percentages and costs remain readable independently of them.
- Keyboard users have a skip-to-content link, visible focus indicators, page-heading focus on navigation, and labelled, keyboard-scrollable tables and charts.
- Dialogs have accessible names/descriptions, contained Tab/Shift+Tab navigation, Escape dismissal, and focus restoration. Errors and form hints are associated with the relevant date/rate controls. Required input instructions are visible.
- A daily data table provides a chart alternative. Saved changes and timer actions are announced through a status region; the updating elapsed timer does not announce every second.
- Responsive layouts accommodate enlarged text. Tables and charts scroll within their labelled regions rather than forcing page-wide horizontal scrolling.

Run the repeatable browser checks:

```sh
npx playwright install chromium
npm run test:a11y
```

The test builds the application, starts a loopback-only server on an ephemeral port with an in-memory SQLite database, and always closes the server and browser afterwards. It never touches your local data. It runs axe WCAG A/AA and best-practice checks across pages, empty/populated states, create/edit/delete dialogs, date validation, and a running timer. It also checks keyboard focus, 320px layouts, 200% text enlargement, custom text spacing, and the font-size floor.

To use an already installed Edge browser on Windows instead of downloading Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:a11y
```

Automated checks are a regression safety net, **not a certificate of full conformance**. Before claiming formal WCAG conformance, manually review the complete workflows with assistive technologies (for example NVDA with Edge and VoiceOver with Safari), browser zoom and text-only resizing, keyboard-only operation, high-contrast/forced-colour modes, and representative user data. The optional `PLAYWRIGHT_CHANNEL` can also select another locally installed Playwright-supported browser channel.

## Behaviour

- **People** have a required non-negative GBP hourly rate. Projects have an optional rate and client.
- A **project rate takes precedence** over the person's rate. A blank project rate falls back to the person; an explicit zero project rate means free work.
- Each entry snapshots its rate at creation (at timer start for timed work). Editing project or person rates never changes existing costs.
- Currency is stored as **integer pence**. Time is stored as UTC ISO timestamps and durations calculated in whole seconds. Each completed entry's cost is rounded to the nearest penny before summing.
- Only **one timer** runs across this local workspace. It survives page refreshes, browser closure, and API restarts. Stop it to include it in totals. Manual entries can be added while a timer runs.
- Manual entries require an end after the start, with no future end. Times in forms and reports use the browser's local timezone. Entries crossing midnight are attributed entirely to their start date, not split between days.
- The dashboard and entry list share inclusive date, project, and person filters. Weeks start on Monday. The activity chart shows up to seven calendar days ending at the selected period's end, restricted to the selected date range and filtered entries. Project and person directories show lifetime totals.
- Completed entries can be deleted with confirmation. People and projects can be added and edited; deletion of these records is intentionally not offered to preserve references in historical entries.
- No login, invoicing, VAT, or cloud sync. This is a trusted, single-computer workspace, **not an authenticated multi-user deployment**. Servers bind to loopback only.

## Storage and backup

The database is created at `data/timekeeper.sqlite`, relative to the project root, and is excluded from version control. SQLite uses WAL mode. Stop the application before copying the database for backup; if WAL/SHM companion files remain, retain them alongside the database. Restore by replacing the database while the app is stopped.

`TIMEKEEPER_DB` optionally selects an alternative SQLite file path (its parent directory must exist); `:memory:` is useful for disposable smoke tests. Normal operation uses the persistent file. Node may print a notice that its SQLite API is experimental.

## Architecture

```text
shared/                    Domain types and pure duration/cost functions
server/
  database.ts              SQLite schema and connection
  repository.ts            Repository interface and SQLite implementation
  service.ts               Time/rate rules; injected repository and clock
  app.ts                   HTTP routes, input validation and error boundary
  index.ts                 Composition root and local server lifecycle
src/
  lib/                     HTTP client, formatting and pure report helpers
  hooks/                   Data loading and mutation lifecycle
  components/
    atoms/                 Buttons, fields and icons
    molecules/             Stat cards and accessible modal shell
    organisms/             Timer, filters, tables and management forms
    templates/             Responsive app navigation and layout
  pages/                   Dashboard and person/project directories
  styles/                  Global reset and design tokens
```

The domain service depends on the small `TimeRepository` interface rather than SQLite, with the clock injected for deterministic tests. Database access, business rules, HTTP transport, state, presentation, and formatting remain separate. Components use CSS Modules with BEM class names (`block__element--modifier`); only reset rules and global design tokens are global. The interface uses a blue palette with shared primary colour tokens, while errors and destructive actions remain red. New projects default to blue; existing custom project colours are preserved. The UI includes native dialog focus management, labelled form controls, keyboard focus indicators, reduced-motion support, responsive layouts, and horizontally scrollable data tables.

The repository deliberately loads the small local workspace into memory for reporting. Large datasets, authentication, concurrent network users, invoicing, and server deployment would require a separate scaling and access-control design.
