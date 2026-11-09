# Little Garden

A cosy habit tracker: every habit is a potted houseplant, every leaf is one day.
Green = done, ochre = not done, white = not marked yet.

## Run it on this computer

Node.js lives in `C:\AIwork\Node` (portable). In PowerShell, from this folder:

```powershell
$env:Path = "C:\AIwork\Node;C:\AIwork\Git\cmd;" + $env:Path
npm install        # first time only
npm run dev        # opens on http://localhost:5173
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs all automated tests |
| `npm run build` | Builds the installable app into `dist/` |
| `npm run preview` | Serves the built app (to try offline mode) |
| `npm run icons` | Regenerates app icons from `public/favicon.svg` |

Developer-only plant gallery (every style at 4, 7, 10 and 15 leaves): `http://localhost:5173/#/gallery`
(not included in the published app).

## Where things are

| Path | Contents |
| --- | --- |
| `src/i18n/en.ts` | Every piece of UI text (copy it to add Russian or Czech) |
| `src/styles/tokens.css` | All colours, fonts and spacing |
| `src/lib/types.ts` | Data model and the 4–15 day limit (`MIN_DURATION_DAYS`, `MAX_DURATION_DAYS`) |
| `src/lib/dates.ts` | All date logic (Europe/Prague calendar days, DST-safe) |
| `src/lib/habits.ts` | Creating plants, marking leaves, completion, statistics |
| `src/lib/storage.ts` | Saving, schema versions, migration, export/import |
| `src/plant/generatePlant.ts` | Procedural plant generator (six growth styles) |

## Publishing

Every push to the `main` branch on GitHub runs the tests, builds the app and publishes it to
GitHub Pages (`.github/workflows/deploy.yml`). Updates replace only the app files; plants saved
on the phone stay untouched.
