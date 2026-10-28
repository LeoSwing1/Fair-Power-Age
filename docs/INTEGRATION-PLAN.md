# Integration plan — Fair Power Age

## Provider checklist

| System | Current package | Production requirement |
|---|---|---|
| Email | UI/status placeholder | Approved provider, verified sender/domain, templates, bounce tracking and retry queue |
| WhatsApp Business | UI/status placeholder | Meta Business account, app, approved templates, webhook verification, opt-in and human handoff |
| Payments | Informational/demo panel | Approved gateway account, server-side order/payment creation, signed webhook verification, idempotency, reconciliation and refund policy |
| CRM | Sample lead workflow | Decide source of truth, map fields/statuses, owner assignment, dedupe and retry handling |
| ERP/inventory | Sample order panel | Authorized API, SKU mapping, inventory/pricing sync cadence, conflict rules and reconciliation |
| Analytics | Dashboard mock metrics | GA4/consent setup where applicable, Search Console, conversion events and privacy review |
| Careers | Sample jobs table | Vacancy CMS, private CV storage, candidate consent, role restrictions, retention and deletion workflow |
| AI assistant/calling | Not implemented | Approved knowledge base, safe escalation, consent-aware outreach, call logging policy and vendor review |
| Authentication | Not implemented | Server-side authentication, secure sessions, MFA for privileged users, RBAC, rate limits and audit logs |
| Notifications | Toast-only local UI | Persistent notification records, transactional outbox, retries, delivery state and admin monitoring |

## Event delivery pattern

1. Persist the business action and an outbox event in one database transaction.
2. Worker leases pending events and delivers to the provider.
3. Save provider response, delivery identifier and attempt count.
4. Retry transient failures with backoff; do not retry permanent validation failures blindly.
5. Use an idempotency key to prevent duplicate messages/orders/payments.
6. Show pending, delivered, failed and retrying events in the operations panel.

## Security baseline

- Keep provider secrets on the server only.
- Validate request bodies and restrict payload size.
- Protect admin endpoints with authentication and role-based authorization.
- Add rate limiting and abuse controls to public forms.
- Verify webhook signatures and timestamps.
- Store uploaded documents privately; scan and restrict file types/size.
- Avoid logging passwords, access tokens, full payment credentials or unnecessary personal data.
- Maintain audit trails, backups, restore tests and a documented retention policy.
