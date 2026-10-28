# Vercel deployment checklist — Fair Power Age

## Client project
- Root directory: `client`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://<your-deployed-api-origin>` (HTTPS origin only; no trailing slash)
- Redeploy after changing environment variables.
- `client/vercel.json` keeps SPA navigation routes on `index.html`.

## API project
- Deploy the Express server as a persistent Node service or adapt it to the platform's serverless execution model. The current Express API uses in-memory sessions and server-sent events plus a local JSON file store; these are not reliable across serverless instances and are not production-grade persistence.
- Set `ADMIN_PASSWORD` to a unique strong value. `Fairpowerage` is only the demo default.
- Set `CLIENT_ORIGIN` to the exact public client origin.
- Check `GET /api/health` from a browser. The client sign-in screen now checks this endpoint before attempting login.
- Confirm `POST /api/admin/login`, then submit a test enquiry and careers application from the public website and verify the records appear in admin.

## External integrations that need provider setup
Email, WhatsApp Business API, online payment gateway, CRM, ERP/inventory, analytics/search console, durable database, private CV storage, and actual order/shipment integrations are not activated just because the UI exists. Add server-side credentials, implement the provider adapters and webhooks, then test each integration with approved test accounts before claiming production readiness.
