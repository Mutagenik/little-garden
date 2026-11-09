# Little Garden — project guide for AI assistants

Read this first. It explains **what** the app is, **why** it is built the way it is, **how** every
part works, and the **rules that must not be broken**. The human owner is not a programmer:
explain changes in plain English, make technical decisions yourself, and ask only about
irreversible or taste-dependent choices.

- Live app: https://mutagenik.github.io/little-garden/
- Repository: https://github.com/Mutagenik/little-garden (public, branch `main`)
- Local folder: `C:\AIwork\MyGarden` (Windows 11, PowerShell 5.1)

---

## 1. What the app is

A single-user, offline-first **habit tracker PWA** (installable web app). Each habit is a potted
houseplant; each **leaf is one calendar day**. The user names a habit, writes a success
condition, and picks a duration (4–15 days). The app generates a matching plant with **exactly
that many leaves**.

Leaf colours:
- **White** (thin outline) = not marked yet
- **Green** = habit done that day
- **Ochre** (muted caramel) = habit not done that day

There are no accounts, no server and no payments. All data lives in the browser's `localStorage`
on the phone. The UI is in English, with every string in one dictionary so Russian and Czech can
be added later.

### Screens and user flow
| Route (hash) | Screen | File |
|---|---|---|
| `#/room` (default) | **My Room**: cosy room scene (window + sill + wooden shelves) with all *active* plants. Tap a pot to open Daily Care. "Grow a new friend" button. Has an empty-state illustration. | `src/screens/RoomScreen.tsx` |
| `#/new` | **Create**: habit name (required), success condition (**optional**, may be empty; then no quote is shown anywhere), duration stepper/slider (4–15). | `src/screens/CreateScreen.tsx` |
| `#/new/preview` | **Meet your new friend**: the exact plant that will be planted (white leaves), "N leaves = N days", end date. **Try another plant** rerolls the plant type (keeps the pot colour). **Pot colour** swatches (6) change only the pot. **Let's grow!** creates the habit. **Edit habit** goes back to the form with all values kept (including plant and pot). | `src/screens/PreviewScreen.tsx` |
| `#/plant/:id` | **Daily Care**: large interactive plant. Tap a leaf → bottom sheet with its date and *Mark green / Mark ochre / Clear*. Future leaves show only a note. Also facts, day dots, Edit (name + condition), Delete. | `src/screens/CareScreen.tsx` |
| (overlay) | **Completion screen**: shown once per finished plant. All green → petals + congratulation; otherwise a neutral, kind message. Stats. | `src/screens/CompletionScreen.tsx` |
| `#/garden` | **My Garden**: greenhouse with *completed* plants. | `src/screens/GardenScreen.tsx` |
| `#/garden/:id` | Garden detail: read-only plant, stats, day-by-day list, **Grow again** (pre-fills Create), Delete. | `src/screens/GardenScreen.tsx` |
| `#/settings` | Language, Sounds on/off, Export JSON, Import JSON (validated + confirm), Reset (type RESET). | `src/screens/SettingsScreen.tsx` |
| `#/gallery` | **Dev-only** plant gallery: every style at 4/7/10/15 leaves, with day numbers and touch areas. Not in production builds. | `src/screens/GalleryScreen.tsx` |

The bottom tab bar (`src/components/TabBar.tsx`) has three tabs: My Room, My Garden, Settings.

**Brand logo:** the owner's logo ("Jesenika", lavender flower + wordmark) appears in the top-right
corner of the **My Room, My Garden and Settings** headers only, via `<BrandLogo/>`
(`src/components/BrandLogo.tsx`, header class `page__header--brand`). The original artwork is
`logo/Logo.png` (1250×1428, lavender on transparent). `src/assets/logo.png` is a trimmed 173×192
copy **recoloured to the button green `--sage` #7f9a73**, displayed 52 px wide. The logo is an
invisible link (no link styling) to **https://jesenika.cz/** (`BRAND_URL`), opening in a new
tab (`rel="noopener noreferrer"`). To replace or recolour it, regenerate the copy with `sharp`:
map each pixel's white→lavender blend onto white→target colour, keep alpha, trim, resize to
192 px tall, PNG palette.

---

## 2. Core rules (invariants) — never break these

1. **Exactly N interactive leaves.** `generatePlant(n, seed, style)` returns exactly `n` leaves,
   indexed `0…n-1`, and the plant SVG contains no other leaf-like shapes. Leaf `i` = day `i+1`.
2. **One leaf ↔ one date.** `habit.leaves[i].date === addDays(startDate, i)`. Day 1 = creation
   date. No date appears twice. `validateHabit` in `storage.ts` enforces this.
3. **Dates are plain `YYYY-MM-DD` strings**, never timestamps. "Today" = the calendar date in
   **Europe/Prague** via `Intl.DateTimeFormat`. All arithmetic goes through `src/lib/dates.ts`,
   which works on UTC-midnight values, so DST changes can't shift days.
4. **Never colour automatically.** Missed days stay white forever.
5. **Marking rules:** only *active* plants, and only today's or earlier leaves
   (`canMarkLeaf`). Future leaves cannot be marked. Completed plants are read-only.
6. **Completion:** a plant becomes `completed` when today > its last day (day N+1), whatever its
   marks. This is evaluated on app start, when the app returns to the foreground
   (`visibilitychange`/`focus`/`pageshow`) and every 30 s (`store.tsx`). Finishing the period and
   succeeding at the habit are different things.
7. **Determinism:** a plant's look depends only on stored `plantSeed` + `plantStyle` +
   `durationDays` + `potColor`, so it is identical after reload, export/import and in the garden.
   ⚠️ The SVG geometry is re-computed from the seed on every render. **Changing an existing
   style's layout code changes how existing users' plants look.** Small visual tweaks are OK.
   For big redesigns, add a new style rather than rewriting an old one.
8. **Data safety:** app updates must never wipe or corrupt data. Every stored-shape change needs
   a schema bump + migration (see §6). The service worker caches only app files and never
   touches `localStorage`.
9. **Touch targets:** leaf touch centres stay ≥ `MIN_HIT_SPACING` (22 SVG units ≈ 40 px on a
   phone) apart, and inside the canvas. A test checks this over thousands of generated plants.
10. **No dead UI:** no buttons that do nothing, no placeholders, no TODO stubs.
11. **Visual language:** calm, adult, botanical. No neon, no red warnings, no judgement, no
    emoji, no icon libraries, no raster art (plants and icons are hand-authored SVG).

---

## 3. Tech stack

- **React 19 + TypeScript 7 + Vite 8**, plain CSS (one stylesheet per component). No UI framework.
- **vite-plugin-pwa** (Workbox `generateSW`, `registerType: 'autoUpdate'`, `skipWaiting` +
  `clientsClaim`) for the manifest, service worker and offline support.
- **Vitest 5 + jsdom + React Testing Library** for tests.
- Fonts bundled locally via `@fontsource`: **Cormorant Garamond** (headings, serif) and **DM Sans**
  (body). Only `.woff2` files are precached. Cyrillic subsets are included for a future Russian UI.
- Hosting: **GitHub Pages**, deployed by GitHub Actions on every push to `main`.

---

## 4. Folder map

```
src/
  main.tsx              Entry: fonts, global CSS, render <App/>, storage.persist(), registers SW (prod only)
  App.tsx               Providers (Store → I18n), route switch, completion overlay queue, dev-only gallery (lazy)
  App.test.tsx          UI integration tests (create flow, reroll, marking, completion, garden, settings…)
  vite-env.d.ts         Declares __APP_VERSION__ (injected from package.json in vite.config.ts)

  lib/                  Pure logic — no React
    types.ts            Data model, PLANT_STYLES, POT_COLORS, MIN/MAX_DURATION_DAYS, SCHEMA_VERSION
    dates.ts            ALL date logic (Prague "today", injectable today, addDays, DST-safe formatting)
    habits.ts           createHabit, chooseLook, canMarkLeaf, setLeafStatus, refreshStatuses, habitStats, dayNumber…
    storage.ts          localStorage load/save, validation, versioned migrations, export/import, backups
    random.ts           FNV-1a hash (id → seed), Mulberry32 PRNG, createId()
    sound.ts            Web Audio synthesised UI sounds + on/off flag
    *.test.ts           Unit tests

  plant/                Procedural plant generator + renderer
    geometry.ts         Bézier helpers; buildLeaf() turns LeafParams → SVG path, vein, hit point, top
    generatePlant.ts    Six growth-style layouts, generatePlant(), nearestLeaf(), canvas constants
    skin.ts             "Soft botanical" leaf look: palettes, two-tone half, per-species markings
    pots.ts             Pot palette (6 colours), 3 matte pot shapes (classic/bowl/cylinder), speckles
    Plant.tsx / .css    <Plant/> React SVG renderer (statuses, today glow, future dashed, selection, tap handling)
    generatePlant.test.tsx

  state/
    store.tsx           React context + useReducer; all mutations; auto-save; "today" ticking; sound flag sync
    router.ts           Tiny hash router: useRoute, navigate, goBack, resetTo (history depth tracking)

  screens/              One file (+ .css) per screen, listed in §1
  components/           TabBar, Modal/ConfirmDialog (dialog + bottom sheet), HabitFacts (stats, day list),
                        Icons (hand-drawn line icons), RoomArt (window, watering can, books)
  i18n/
    en.ts               EVERY UI string (nested keys, {placeholders}); defines Dictionary type
    index.tsx           dictionaries registry, translate(), I18nProvider, useI18n() → { t, locale, language }
  styles/
    tokens.css          ALL colours, fonts, spacing, radii (CSS variables)
    global.css          Reset, buttons (.btn--primary/secondary/ghost/danger), fields, .page, .stat, .toast
  test/setup.ts         jest-dom, cleanup, clears localStorage, resets injected today and the URL hash

public/                 favicon.svg (source of all icons) + generated PNG icons
.github/workflows/deploy.yml   CI: npm ci → npm test → build (BASE_PATH=/<repo>/) → deploy to Pages
vite.config.ts          base path from BASE_PATH env, PWA manifest + Workbox config, Vitest config
pwa-assets.config.ts    Icon generation (npm run icons)
```

---

## 5. Data model (`src/lib/types.ts`)

```ts
AppData  = { schemaVersion: 2, habits: Habit[], settings: { language: 'en', sound: boolean } }

Habit = {
  id: string                 // random hex (createId)
  name: string               // editable
  successCondition: string   // editable, optional ('' allowed)
  durationDays: number       // 4–15, LOCKED after creation
  startDate: 'YYYY-MM-DD'    // creation date = day 1
  plantSeed: number          // hashString(id), FNV-1a, 32-bit
  plantStyle: PlantStyle     // 'upright'|'rosette'|'fern'|'bushy'|'slender'|'tropical'
  potColor: PotColor         // 'terracotta'|'dustyPink'|'mustard'|'softBlue'|'sage'|'cream'
  leaves: { date: 'YYYY-MM-DD', status: 'white'|'green'|'ochre' }[]   // length === durationDays
  status: 'active'|'completed'
  completionSeen: boolean    // completion screen shown yet?
  createdAt: ISO timestamp   // informational, also used for ordering
}
```

- Storage key: `little-garden:data`. Backups of pre-migration or corrupt data go to
  `little-garden:backup:<ISO time>`. Old keys checked once: `little-garden`, `littleGarden`,
  `little-garden-data`, `myGarden`.
- Export file: the same JSON, plus `exportedAt` and `app` fields (stripped on import).

### How a new plant's look is chosen
`createHabit` → `seedFromId(id)` → `chooseLook(seed, previousPlant)` picks a style and a pot
colour from the seed, skipping the most recently created plant's style and colour, so neighbours
differ. The id is **reserved on the preview screen** (`draft.id`), so the previewed plant is
exactly the planted one. **Try another plant** generates new ids until the style differs from the
one shown, then stores the new id in the draft together with the current pot colour
(`draft.potColor`), so the pot stays put. The **pot colour picker** sets `draft.potColor`, which
overrides the automatic choice in `createHabit`.

---

## 6. Persistence, schema versions and migrations (`src/lib/storage.ts`)

- `loadData()` reads → `migrate()` → `validateAppData()`. It never throws. Corrupt data is
  backed up (not deleted) and the app starts empty. When a migration ran, the upgraded data is
  saved and the original text kept as a backup.
- The store saves after **every** change (`useEffect` on `state.data`).
- `migrations` is a map `fromVersion → (data) => data at fromVersion+1`, applied step by step:
  - **0 → 1**: best-effort import of an unversioned prototype shape (`plants`/`habits`/`items`
    arrays, `title`/`goal`/`marks`…). This was defensive; no real prototype data ever existed.
  - **1 → 2**: added `settings.sound = true`.
- Data from a **newer** version is refused with an error (never downgraded).

**Recipe — changing the stored shape:**
1. Bump `SCHEMA_VERSION` in `types.ts` and update the TypeScript types.
2. Add `migrations[oldVersion]` in `storage.ts` that converts the old shape.
3. Update `validateHabit` / `validateAppData` and `emptyData()`.
4. Update test fixtures (`App.test.tsx`, `storage.test.ts` build `AppData` literals) and add a
   test that old-version data loads with nothing lost (see "upgrades version-1 data").

---

## 7. Dates (`src/lib/dates.ts`)

- `getToday()` returns the Prague date. Tests inject it with `setTodayProvider('2026-11-09')`
  (reset with `null`; `test/setup.ts` resets it after each test).
- `addDays`, `daysBetween` and `consecutiveDates` use `Date.UTC(y, m, d + n)`, which is DST-proof.
- Display formatting (`formatShortDate` → "Wed 11 Nov", `formatLongDate`, `formatWeekdayDate`)
  formats a UTC date in `timeZone: 'UTC'` so the day never shifts.
- Habit helpers: `dayNumber` ("Day X of N", clamped 1…N), `daysRemaining` (days *after* today),
  `isPeriodOver`, `leafState` (past/today/future).

---

## 8. The plant generator (`src/plant/`)

**Canvas:** 200 × 279 SVG units. Soil line `SOIL_Y = 216`. Pots (`pots.ts`) are drawn directly in
canvas units below the soil line. `<Plant crop>` trims empty space above the foliage
(`spec.top`) so short plants sit snugly on shelves.

**Look ("soft botanical", approved Option B):** the generator decides *where* leaves are. The skin
(`skin.ts`) decides *how they look*, inspired by a flat, muted houseplant illustration the owner
supplied:
- **Marked leaves** (green/ochre) are matte and two-tone: a lighter half on one side of the
  midrib (the `half` region, clipped to the leaf), one of 4 shade variants per leaf
  (`tone`, from seed + index), a faint hairline outline and a pale vein. No dark outlines.
- **Species markings** (strokes and dots, clipped inside the leaf, never leaf-shaped):
  upright = feathered calathea stripes, tropical = fine philodendron side veins,
  slender = snake-plant pale bands + cream margin on a deeper green palette (`SNAKE`),
  bushy = pilea radial veins + centre dot, rosette = pale succulent tip, fern = notches.
- **White/future leaves stay plain** (cream fill, sage-grey outline, future dashed), so a leaf
  visibly "comes alive" when marked.
- **Pots:** matte, rimless, lightly speckled planters (3 shapes; deterministic speckles from the
  seed), with a soft left-to-right gradient. Palette in `POT_PALETTE`.
- Plant.tsx renders each leaf as: `.leaf__blade` (fill, gets today's glow) → clipped
  `.leaf__decor` → `.leaf__vein` → `.leaf__outline` (selection/focus styling). Colours are inline
  styles; `Plant.css` handles transitions, glow, future dashes, selection and focus. SVG ids are
  per-instance (`useId`). Tests rely on exactly N `.leaf__blade` elements, so never give
  decorations that class.
- UI swatches/day dots use matching CSS tokens `--leaf-green|ochre|white` in `tokens.css`.
- A static design preview generator was used to choose this look (not part of the repo; the
  generated page lives in the git-ignored `design-preview/`).

**Pipeline:** `generatePlant(n, seed, style)` → `createRng(seed)` → one of six layout functions
returns stems (plain strokes) + `LeafParams[]` → `buildLeaf()` converts each into a smooth SVG path
(Catmull-Rom → cubic Béziers, pointed tip), a midrib vein, a **hit point** and a `top`.

**Leaf profiles** (`geometry.ts`): `lanceolate`, `ovate`, `succulent`, `blade`, `round` (disc),
`heart` (lobes via a "back" offset).

**Styles and their chronological order** (day 1 → day N; also documented in the code):
| Style | Look | Order of leaves | Pot |
|---|---|---|---|
| `upright` | single curved stem, alternating leaves, one top leaf | base → top | classic |
| `rosette` | succulent; leaves radiate from one centre on concentric rings | outer ring first (oldest), left → right, newest in the centre | bowl |
| `fern` | 2–4 arching fronds with alternating leaflets (arc-length spaced) | frond by frond left → right, each base → tip | classic |
| `bushy` | round coin leaves (pilea-like) on own stalks, dome of rings | inner ring first, each ring left → right | bowl |
| `slender` | long blades in 4 height tiers (pattern 0,2,1,3) | left → right | cylinder |
| `tropical` | heart leaves on long stalks, leaning to one side | inner ring first, each ring left → right | classic |

`ringSlots()` is shared by rosette, bushy and tropical. It places points on concentric arcs so
every pair is ≥ the spacing apart (ring gap includes jitter).

**Tapping** (`Plant.tsx`): a tap on a visible leaf selects that leaf. A tap on empty space selects
the **nearest hit point** within `HIT_RADIUS = 30` (`nearestLeaf`). Leaves are also keyboard
buttons with aria-labels. Daily Care also has numbered day dots as a precise fallback.

**Leaf visual states** (CSS classes on each `<g data-leaf-index>`): `leaf--white|green|ochre`,
`leaf--today` (soft pulsing glow, disabled with reduced motion), `leaf--future` (dashed outline),
`leaf--selected`.

**When editing the generator:** run `npm test`. The spacing/canvas tests sweep all styles × all
counts × many seeds and print the failing style/n/seed. Look at `#/gallery` in `npm run dev`
(toggle "Day numbers & touch areas"). Remember invariant 7.

**Adding a new style:** add it to `PLANT_STYLES` (types.ts), write a layout function, register it
in `LAYOUTS` and `POT_FOR_STYLE`, and keep the leaf order documented in the header comment.
The tests and the gallery pick it up automatically. New plants may then get it; existing plants
keep their stored style.

---

## 9. State, routing and screens

- **Store** (`state/store.tsx`): `useStore()` exposes `data`, `habits`, `today`, `draft`, and the
  actions `setDraft`, `createHabit`, `setLeaf`, `editHabit`, `deleteHabit`,
  `acknowledgeCompletion`, `replaceData` (import), `resetAll`, `setLanguage`, `setSound`,
  `refreshToday`. The reducer re-runs `refreshStatuses` on every `tick`. `StoreProvider` accepts
  a `storage` prop for tests.
- **Draft**: the Create → Preview hand-off (`HabitDraft` with optional reserved `id`). "Grow
  again" sets a draft without an id, so a new plant is generated.
- **Router** (`state/router.ts`): hash URLs work on any static host and in the installed app.
  `navigate(path, {replace})` stores a `depth` in `history.state`.
  `goBack(fallback)` uses the browser's Back when inside the app, otherwise the fallback.
  `resetTo('/room')` rewinds history after "Let's grow!" so Android Back doesn't reopen the form.
- **Completion overlay** (`App.tsx`): queue of `status === 'completed' && !completionSeen`,
  oldest first. "Move to my garden" sets `completionSeen`. After the last one, it navigates to
  `#/garden`. A Daily Care page of a completed plant redirects to its garden detail.

---

## 10. Sounds (`src/lib/sound.ts`, `src/lib/welcomeSound.ts`)

**Welcome chime:** the owner's recording `src/assets/sounds/welcome.mp3` (≈3 s; original in the
git-ignored `Improvements/` folder) plays once per app load from `LocalizedApp` in `App.tsx`, only
if `settings.sound` is on. It is fetched and decoded with **Web Audio** on the shared
`getAudioContext()` and played at `WELCOME_VOLUME` = 0.6.
- **Autoplay policy:** browsers allow sound without a touch only in some cases (installed app,
  frequently used site). Otherwise the context stays `suspended` and the chime plays on the first
  **user-activation** event, i.e. `click`, `pointerup`, `touchend` or `keydown`. **Not**
  `pointerdown`/`touchstart` from a finger: that was the original bug, so the chime never played on
  phones. It retries on every interaction until audio unlocks, within `WELCOME_GRACE_MS` (60 s),
  and only if sounds are still on.
- **Diagnostics:** `<html data-welcome="…">` shows `loading | played | waiting-for-tap |
  played-after-tap | skipped | unavailable`. Check it in the browser console on a device.
- mp3 files are precached for offline use (`vite.config.ts` globPatterns). Unit tests use a fake
  AudioContext that is locked except during a simulated gesture (`welcomeSound.test.ts`).

**UI sounds:**

Synthesised with the Web Audio API (no files, works offline): `plant` (rising arpeggio), `green`
(two-note chime), `ochre` (warm low tone, never an "error" buzzer), `clear` (tiny tick), `reroll`
(leafy rustle of filtered noise). They are triggered in `PreviewScreen` (grow, reroll) and
`CareScreen` (leaf menu). The on/off flag is stored in `settings.sound` and synced by the store.
Browsers allow audio only after a user tap, so sounds are only played from tap handlers. Missing
`AudioContext` → silent no-op. Loudness: `MASTER_VOLUME`, plus each note's `volume`.

---

## 11. Text, design and accessibility

- **Text:** add keys to `src/i18n/en.ts` and use `const { t } = useI18n(); t('section.key', { n: 3 })`.
  Never hard-code UI text in components (the dev gallery is the only exception).
- **Adding a language** (e.g. Czech): create `src/i18n/cs.ts` typed as `Dictionary`, register it in
  `dictionaries` (`i18n/index.tsx`), extend `LanguageCode` in `types.ts`, **and update
  `validateAppData`** in `storage.ts`, which currently accepts only `language === 'en'`. The
  Settings language list builds itself from `dictionaries`. Dates use `meta.locale`.
- **Design tokens:** all colours and spacing are in `src/styles/tokens.css`: milk/cream
  background, sage accents and primary buttons, natural green leaves, ochre dry leaves, pot
  palette in `plant/pots.ts`.
- **Mobile first**, 360–430 px wide, max content width 560 px. Fixed bottom tab bar
  (`--tabbar-height`), safe-area insets, `touch-action: manipulation`.
- Respects `prefers-reduced-motion` (glow, petals, sheet animations). Dialogs have focus
  handling and Esc. Leaves and day dots have descriptive aria-labels.

---

## 12. Testing

`npm test` runs 83 tests (Vitest + jsdom):
- `plant/generatePlant.test.tsx`: exactly N leaves (data and rendered DOM) for every style and
  N = 4…15, determinism, touch spacing ≥ 22, hit points inside the canvas, nearest-leaf
  selection, upright order.
- `lib/dates.test.ts`: Prague today, DST periods (2026-03-25 and 2026-10-21, 10 days), leap years.
- `lib/habits.test.ts`: consecutive dates, marking yesterday/today, future refused, Day X of N
  after days closed, several plants, completion on N+1, read-only, stats.
- `lib/storage.test.ts`: reload round-trip, export → import, invalid files, corrupt-data backup,
  legacy migration, v1 → v2 migration.
- `lib/sound.test.ts`: fake AudioContext; on/off; no-audio environments.
- `App.test.tsx`: full UI flows (create + preview + edit, reroll, marking, edit/delete,
  completion screens, garden + grow again, foreground date change, reset, import, sound switch).

Use `setTodayProvider(...)` to simulate dates. For UI tests, seed `localStorage` with `saveData`
and set the hash before rendering `<App/>` (see `startApp` in `App.test.tsx`).

---

## 13. Environment and commands (this Windows PC)

Node.js is **portable** in `C:\AIwork\Node` (v26) and Git is in `C:\AIwork\Git`. Neither is on the
system PATH, so prefix every PowerShell session:

```powershell
$env:Path = "C:\AIwork\Node;C:\AIwork\Git\cmd;" + $env:Path
npm run dev        # dev server (http://localhost:5173), gallery at #/gallery
npm test           # all tests
npm run typecheck  # TypeScript only
npm run build      # production build into dist/ (also type-checks)
npm run preview    # serve dist/ (use it to test offline mode)
npm run icons      # regenerate PNG icons from public/favicon.svg
```

- `.claude/launch.json` (git-ignored) has preview configs `little-garden-dev` and
  `little-garden-prod-preview` that call `C:\AIwork\Node\node.exe` directly.
- Git identity for this repo: `Mutagenik <Mutagenik@users.noreply.github.com>` (keeps the real email private).
- **PowerShell 5.1 gotcha:** a commit message with double quotes passed via `-m` breaks the
  argument. Write the message to a file and use `git commit -F <file>`.
- **Pushing:** credentials are stored by Git Credential Manager after the first sign-in. If a
  push asks to sign in again, run it in the user's interactive terminal (a non-interactive shell
  can't show the sign-in prompt).
- CRLF warnings on commit are harmless.

## 14. Deployment

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) runs `npm ci`, `npm test` and
`npm run build` with `BASE_PATH=/little-garden/`, then deploys `dist/` to GitHub Pages. A failing
test blocks the deploy. Check status at
https://github.com/Mutagenik/little-garden/actions (or the public API:
`https://api.github.com/repos/Mutagenik/little-garden/actions/runs?per_page=1`).

The installed app updates itself: the new service worker activates immediately (autoUpdate)
and replaces only cached app files. Plants in `localStorage` are untouched. Users should still
export a JSON backup regularly (Settings), because data exists only on their phone.

---

## 15. Decisions and why

| Decision | Why |
|---|---|
| localStorage, not IndexedDB | Tiny data (≤ a few KB per plant), synchronous, simple. `navigator.storage.persist()` reduces eviction risk. |
| Hash router, no library | Works on GitHub Pages sub-paths and offline without server rewrites. Four lines of history logic handle Android Back. |
| Plant geometry generated at render time from a stored seed | Small data, exports stay tiny, identical everywhere. Trade-off: generator code changes affect old plants (invariant 7). |
| Nearest-hit-point tapping plus measured spacing | Leaves can overlap visually and still be tapped reliably. The rule is verified by tests, not by eye. |
| Synthesised sounds | No audio files to download or cache, works offline, easy to tune. |
| Style/pot avoid the previous plant's | Neighbouring plants in the room always look different. |
| Duration locked after creation | Leaves are bound to dates; changing N would break the leaf ↔ date mapping. |
| Completion on day N+1 regardless of marks | Finishing the period ≠ succeeding; avoids plants stuck forever. |

## 16. Ideas already discussed (not built)

Daily reminder notifications · Russian and Czech translations · a backup reminder after two weeks
without export · notes on a day's leaf · garden-wide statistics.
