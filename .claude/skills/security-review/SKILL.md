---
name: security-review
description: Security review checklist — OWASP Top 10, Supabase RLS, Next.js security. Load for code review and security audit tasks.
---
# Security review — Rasa

## OWASP Top 10 quick-check
- A01 Broken Access Control: anon_id validation on every route; RLS on all tables; admin client server-side only
- A02 Cryptographic Failures: no plaintext secrets in code; HTTPS enforced by Vercel; SERVICE_ROLE_KEY server-only
- A03 Injection: Supabase SDK parameterizes queries when used correctly; zero raw SQL string concatenation
- A04 Insecure Design: validate all inputs at API boundary; don't trust client-provided data beyond anon_id
- A05 Misconfiguration: SERVICE_ROLE_KEY never in NEXT_PUBLIC_ vars; no debug mode in prod
- A07 Auth Failures: pre-auth model — no passwords to manage; anon_id is low-risk identity token
- A09 Logging Failures: anon_id only in logs; NO PII (name, email) ever logged

## Supabase-specific checks
- RLS enabled on ALL user tables (verify: select tablename, rowsecurity from pg_tables where schemaname='public')
- Anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY): minimal read-only permissions on public data
- Service role key (SUPABASE_SERVICE_ROLE_KEY): server-side only, never in client bundle
- Admin client (lib/supabase/admin.ts): only imported in app/api/ route handlers

## Next.js 14 specific
- No secrets in any file with 'use client' directive
- No secrets in NEXT_PUBLIC_ environment variables
- API routes return { error, code } — no DB error messages, no stack traces to client
- .env.local excluded by .gitignore — verify before first push

## Rasa pre-auth specific
- anon_id is an anonymous identifier stored in localStorage — not a security credential
- No user accounts, no passwords, no sessions to protect
- Main risk: cross-user data access via anon_id guessing — mitigated by UUIDs
- Data sensitivity is LOW (meal plans are not PII) — proportionate security measures apply
