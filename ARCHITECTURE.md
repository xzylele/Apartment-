# Home Apartment Manager — Architecture

## Technology decision

The supplied Supabase credentials make Supabase the data, authentication, storage, and row-level-security platform for this build. The service-role credential is server-only; browser code uses only the publishable key.

## Layers

```text
Next.js App Router UI
  └─ Server Components / Route Handlers
       └─ feature services (authorization + business rules)
            └─ Supabase client
                 └─ PostgreSQL + Auth + Storage + RLS
```

## Folder structure

```text
src/
  app/                 routes, layouts, Route Handlers
  components/          reusable UI elements
  features/            domain-oriented screens and services
  lib/supabase/        browser, server, and admin clients
  types/               shared TypeScript domain types
supabase/
  migrations/          database schema, policies, and seed data
```

## Core data relationships

```text
profiles (user + role)
  ├─ leases ── rooms
  ├─ payments ── invoices ── meter_readings ── rooms
  └─ maintenance_requests ── rooms
rooms ── invoices / meter_readings / maintenance_requests
```

## Primary pages

`/login`, `/dashboard`, `/rooms`, `/tenants`, `/leases`, `/meters`, `/invoices`, `/payments`, `/expenses`, `/maintenance`, `/announcements`, `/reports`, `/settings`.

## Initial API endpoints

`/api/health`, `/api/rooms`, `/api/tenants`, `/api/invoices`, `/api/payments`, `/api/meter-readings`, `/api/maintenance`.

## Delivery phases

1. Foundation: Supabase clients, authentication, protected layout, schema, role policies.
2. Core management: rooms, tenants, leases.
3. Billing: readings, invoices, payments, receipts.
4. Operations: expenses, maintenance, announcements.
5. Reports, audit logs, exports, responsive and permission testing.
