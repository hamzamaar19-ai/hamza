# Domain Availability Lab

A full-stack domain availability search engine with filters, price estimation, affiliate-ready purchase links, and an admin dashboard.

## Features
- **Domain generator:** control length, numbers, hyphens, and TLDs; supports random mode and status filtering.
- **Availability checker:** mock real-time statuses (available, taken, premium, marketplace) with easy swap to external APIs.
- **Price insights:** estimated value, rating badge, and keyword strength score per domain.
- **Affiliate commerce:** buy buttons for Namecheap, GoDaddy, Porkbun, and Cloudflare registrar links.
- **Productivity:** favorites (localStorage), recent views, CSV/JSON export, trending patterns, AI-style recommendations, and multilingual UI (English/Arabic) with dark mode.
- **Admin dashboard:** manage affiliate links, API provider endpoints, and view analytics counters.

## Tech stack
- Vanilla HTML/CSS/JS for the UI.
- Lightweight Node.js HTTP server (no external dependencies) for API endpoints and static hosting.
- JSON file storage for admin configuration (`data/config.json`).

## Getting started
1. **Install Node.js 18+**.
2. Install dependencies (none required):
   ```bash
   npm install
   ```
3. Run the server:
   ```bash
   npm start
   ```
4. Open http://localhost:3000 to use the app. Access the admin dashboard at http://localhost:3000/admin.html.

## API integration hints
- Update `data/config.json` or use the admin dashboard to set real endpoints and keys (e.g., Domainr, WhoisXML, GoDaddy Appraisal).
- In `src/server.js`, replace `availabilityStatus` and `priceEstimate` with live API calls using your provider SDK or fetch logic. Keep the response shape `{ domain, status, price, rating, keywordScore, registrarLinks }`.

## Deployment
- **Vercel/Netlify:** deploy as a Node serverless function using `src/server.js` as the entry. Ensure `data/config.json` is included or moved to environment variables.
- **cPanel/VPS:** upload the repo, run `npm start` with a process manager (pm2/systemd), and proxy port 3000 through Apache/Nginx.
- **Static CDN + API:** host `public/` on a CDN and point frontend `fetch` calls to a separately hosted instance of `src/server.js`.

## Monetization tips
- Swap affiliate URLs in the admin dashboard with your tracking codes.
- Add registrar-specific promo codes in query params when constructing buy links.
- Use the rating badge and keyword strength to highlight “high value” domains and pair them with prominent buy buttons.
- Export curated CSV lists to share with newsletters or landing pages that include your affiliate redirects.

## Project structure
```
public/
  index.html      # Main UI
  admin.html      # Admin dashboard
  styles.css
  app.js
  admin.js
src/
  server.js       # HTTP server + mock APIs
data/
  config.json     # Affiliate links, provider endpoints, analytics counters
```
