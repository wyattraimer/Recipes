# Recipe Collector

## TO-DOs

- Recipe ratings (1–5): helps choose between similar recipes and improves random-pick quality.
- Prep-time + cook-time + servings fields: makes planning easier than title/notes alone.
- Tag system (beyond categories): e.g., quick, kid-friendly, meal-prep, high-protein, holiday.
- Ingredient search mode: “show recipes containing chicken + garlic” for practical use at mealtime.
- Shopping list builder: select multiple recipes and auto-combine ingredients into a checklist.
- Recently viewed / cooked history: quick “what did we make last week?” memory aid.

## Production Deployment (Subfolder)

This app can be deployed under a subfolder like `https://your-domain.com/recipecollector/`.

### Build settings

Set `VITE_API_BASE` when building:

- `VITE_API_BASE=/recipecollector/api` (or `/api` if your host proxies API at the domain root)

Example build command:

```bash
VITE_API_BASE=/recipecollector/api npm run build
```

Upload `dist/` contents to your web root folder for the app path (for example, `F:\public_html\recipecollector`).

### API requirements

URL import uses an Express API (`server/index.js`) and requires a running Node process.

- If your host supports Node apps: run the API continuously and reverse proxy `/recipecollector/api` (or `/api`) to port `8787`.
- If your host is static-only: host the API elsewhere (VPS, container, serverless function), then set `VITE_API_BASE` to that API base URL.

### Pre-live checklist

- Enable HTTPS (required for reliable service worker and install behavior).
- Confirm API proxy route works for `POST /api/recipes/extract`.
- Add API rate limiting and request logging.
- Validate blocked-host protections still work in production.
- Verify PWA install, offline page, and icon set on mobile + desktop.
- Keep cache version bumps in `public/sw.js` when app-shell assets change.
