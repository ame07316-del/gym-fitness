# Security policy

FitZone Pro is a portfolio/demo project. The local payment layer is a sandbox and must not be used to collect real card data or real money.

## Before production

- Set a long, randomly generated `ADMIN_API_TOKEN` as a server-only environment variable. Use a real authenticated admin service for anything beyond a demo.
- Keep `PAYMENT_SECRET` server-only. Never prefix it with `NEXT_PUBLIC_` and never commit `.env.local`.
- Connect a real payment provider through a backend. Tokenize card data with the provider; do not log or persist PAN, CVV, or OTP values.
- Recalculate plans, add-ons, coupons, tax, and totals in the backend and use an idempotency key for every order/payment.
- Replace the in-memory stores with a database and add retention/deletion rules for customer data.
- Put rate limiting and bot protection at the CDN/WAF layer. The in-process limiter in this demo is only a safety net and is not shared across serverless instances.
- Use HTTPS, authenticated admin sessions, CSRF protection for authenticated browser actions, monitoring, backups, and alerts.
- Test the deployed URL in an incognito window and confirm that deployment protection, CORS, `robots.txt`, and `sitemap.xml` match the intended access policy.

## Reporting a vulnerability

Do not post sensitive details in a public issue. Use GitHub's private vulnerability reporting for the repository, or contact the repository owner privately with reproduction steps and the affected route/commit.
