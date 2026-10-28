# Fair Power Age demo QA checklist

## Verified by static inspection in this build
- [x] Founder/leadership section is present in the public homepage and header navigation.
- [x] Missing Integrations, Website Content, and Settings panels are implemented.
- [x] API base URL follows the browser hostname on port 4100 by default.
- [x] Enquiry errors now display the server/network error instead of always claiming the API is offline.
- [x] Admin overview pipeline counts are derived from current enquiry records rather than hard-coded mock totals.
- [x] Reset action clears demo enquiries, quotations, career applications and notifications; payment display settings are preserved.
- [x] Careers applications and payment display settings use API endpoints.
- [x] React render errors are caught and show a recovery screen rather than an unhandled blank panel.
- [x] `node --check server/src/index.js` passed.
- [ ] Full Vite production build and browser end-to-end test: not run in this environment because npm dependencies could not be installed before timeout.

## Must test on the target Windows machine before client handoff
1. Run `npm install`, then `npm run dev`.
2. Open `http://localhost:4100/api/health` and confirm `ok: true`.
3. Open the Vite URL printed by the terminal.
4. Submit a public quotation enquiry with a valid name, email, phone, and category.
5. Open Workspace in a second browser tab; confirm the new enquiry appears and a live notification arrives.
6. Submit a careers application and confirm it appears under Careers & hiring.
7. Save approved test bank details in admin Payments; open public Payments in a separate tab and verify copy buttons.
8. Reset demo data and verify enquiries, quotations, applications and notifications clear while payment display settings remain.
9. Visit every admin navigation item, including Integrations, Website content, and Settings & access; check DevTools Console for errors.
10. Verify the director's title and quote with Fair Power Age before using the site as a public-facing website.
