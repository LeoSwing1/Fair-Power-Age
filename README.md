# Fair Power Age Platform — Bharat Infotechs demo handoff

A responsive React/Vite public website and Express-backed admin workspace for Fair Power Age Private Limited. This build restores the leadership/founder showcase and adds graceful UI error recovery, API diagnostics, and consistent API-backed demo records.

## Start on Windows

1. Extract this ZIP to a normal folder (do not run it inside the ZIP preview).
2. Open the extracted `FairPowerAge-Platform` folder in VS Code.
3. Copy `server\.env.example` to `server\.env`. The default local demo password is `Fairpowerage`. Change it only if you also use that value when signing in.
4. Open a CMD terminal in the project root and run:

   ```bat
   npm install
   npm run dev
   ```

5. Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The API health endpoint is `http://localhost:4100/api/health`.
6. Click **Workspace** or open `http://localhost:5173/?view=admin`; sign in with `Fairpowerage` unless you changed `ADMIN_PASSWORD`.

If port 5173 is busy and Vite selects 5174, this build still supports that local origin. The frontend selects the API using the current hostname on port 4100; set `VITE_API_BASE_URL` in `client/.env` only when your API uses a different address.

## Important Vercel production configuration

The client and Express API are separate deployments. In the **client Vercel project**, add `VITE_API_BASE_URL` with the exact HTTPS origin of the deployed API (no trailing slash), for example `https://your-api-project.vercel.app`, then redeploy the client. Without this, login, enquiry submissions, career applications, payment details and live sync cannot reach the API.

In the **API/server deployment**, set `ADMIN_PASSWORD` to `Fairpowerage` if you want to use that demo password, and set `CLIENT_ORIGIN` to the exact public client URL (for example `https://fair-power-age.vercel.app`). Set both Production and Preview environments as needed. Never rely on the fallback password for a real production system. Restart/redeploy the API after changing environment variables. The frontend login now checks `/api/health` first and reports an API configuration problem separately from an incorrect password.

## Restored public website

- Homepage hero, searchable/filterable product catalogue, enquiry shortlist, solutions, brands, company overview and contact CTA.
- **Leadership & purpose section** showcasing Ambuj Agarwal as Founder & Director, with a draft leadership quote clearly marked for approval before publication.
- Careers page with application submission to the local API.
- Public payment-options page with UPI/bank detail display and click-to-copy controls. Bank details remain blank until the administrator saves verified details.
- Request-a-quote modal connected to the API; successful enquiries are stored and can appear in admin live sync.
- Responsive navigation with workspace access retained on mobile, toasts, and a React error boundary that shows a recovery panel instead of silently leaving a blank screen when a render error occurs.

## Admin panels

Overview, catalogue, leads/enquiries, quotations, orders, customers, payments, careers & hiring, website content, integrations, and settings/access. Previously missing `Integrations`, `ContentPanel`, and `SettingsPanel` components are now implemented so navigating to those panels no longer throws an undefined-component error. Overview lead/quote metrics and pipeline figures are based on current records rather than fake totals. Reset demo data clears demo enquiries, quotations, careers applications and notifications while preserving payment display settings.

## API-backed local demo flows

- `GET /api/health` and `GET /api/integrations/status` for diagnostics.
- `POST /api/admin/login` issues an 8-hour in-memory demo session token.
- `POST /api/enquiries` validates and persists enquiries to `server/data/store.json`.
- Server-sent events publish enquiry, quotation, career-application, payment-settings and reset updates to connected browser sessions.
- `GET /api/admin/state` and admin-protected enquiry/payment/reset endpoints synchronize the admin workspace.
- `POST /api/careers/applications` validates consent and stores candidate applications in the local demo store.
- `GET /api/payment-details` and `PUT /api/admin/payment-details` drive the public bank/UPI details display.
- Quotation creation is API-backed and new quotations are visible in the admin workspace.

## What is not yet a live external integration

This is a client demonstration and local integration starter—not a production deployment. The ZIP contains no real credentials. Email sending, WhatsApp Business messaging, payment-gateway checkout/webhooks, CRM, ERP/inventory, analytics, production database migrations, real orders/fulfilment, CV file storage, AI chat/calling, and production-grade identity/session security require provider accounts, server-side secrets, implementation, and end-to-end verification. The Integrations panel reports configuration signals, not proof of provider operation. The local JSON store is suitable only for this demo; do not use it as the production system of record.

The leadership quote is suggested copy, not a verified verbatim statement. Product images are illustrative remote images; confirm product specifications, brand authorization, company claims, contact details, vacancies and bank details with Fair Power Age before publication. Do not publish bank details until approved by the company.

## Quick troubleshooting

- **Enquiry says API unreachable:** confirm the API terminal says it is listening on port 4100; open `http://localhost:4100/api/health` in a browser; then retry.
- **CORS error on a different host:** set `CLIENT_ORIGIN` in `server/.env` to the exact frontend origin (for example `http://localhost:5174`) and restart the API.
- **Admin password fails:** confirm `ADMIN_PASSWORD` in `server/.env`, restart the API, and enter it exactly (case-sensitive).
- **Blank/failed panel:** refresh the browser and check DevTools Console. The app now catches render exceptions and presents a recovery screen rather than an unhandled blank view.
- **Reset demo data:** use the admin top-bar action; it clears enquiries, quotations, careers applications and notifications but intentionally preserves payment configuration.

## Project structure

```text
FairPowerAge-Platform/
  client/src/main.jsx       React storefront + admin panels
  client/src/styles.css    Responsive styles
  client/public/            Static visual assets
  server/src/index.js      Express API + local demo store
  server/.env.example      Server configuration template
  client/.env.example      Optional API URL override
  db/schema.sql            Proposed PostgreSQL schema (not wired into this local JSON demo)
  docs/                    Integration notes and previous concept
  START-WINDOWS-CMD.bat    Windows starter
  README.md                This guide
```

**Before sending to the client:** approve the director message, confirm all company facts and product imagery, configure verified bank details, test a quote and career submission from the public side, verify that both appear in the admin, check live-sync notifications in a second browser tab, and make clear that external provider integrations are not activated until configured and tested.

Designed & developed by **Bharat Infotechs**.
