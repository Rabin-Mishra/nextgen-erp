# NextGen Interior & Waterproofing — ERP Documentation Suite

**Version:** 1.0  
**Business:** NextGen Interior And Waterproofing  
**PAN:** 122782202  
**Location:** Gauradaha Nagarpalika-02, Jhapa, Nepal  
**Last Updated:** June 2026

Welcome to the professional documentation suite for the **NextGen ERP platform**. This comprehensive repository of technical design sheets, system flows, dictionaries, operating manuals, and guides is compiled to assist business owners, system administrators, and future developers in running, securing, and extending the ERP system.

---

## Document Index

| Index | Document | Target Audience | Scope & Key Topics Covered |
|-------|----------|-----------------|-----------------------------|
| **01** | [System Architecture](./01-system-architecture.md) | Developers & Architects | Decoupled N-tier structure, 10 actual system modules, atomic sequence lifecycles, and cache strategies. |
| **02** | [Database Schema](./02-database-schema.md) | Database Admins & Developers | 4 detailed Mermaid ERDs, 30 precise DB tables, a comprehensive fields data dictionary, and immutability rules. |
| **03** | [API & Server Actions](./03-api-reference.md) | Software Engineers | Server Actions RPC validation mutations, REST endpoints catalog, state machines, and RBAC matrix. |
| **04** | [User Manual](./04-user-manual.md) | Business Owner & Store Staff | Step-by-step numbered visual operational guides for inventory, billing sales, returns, and projects. |
| **05** | [Operations Runbook](./05-operations-runbook.md) | Devops & System Admins | Production Vercel/Supabase topology, CI/CD pipeline, backup restores, monitoring metrics, and troubleshooting. |
| **06** | [Developer Guide](./06-developer-guide.md) | Core Engineering Team | Local dev setups, coding patterns, quotations feature extensions, git flows, and build checklists. |

---

## Quick Reference Navigation

### 1. For the Business Owner (Nischal Timsina)
- Start with the **[User Manual](./04-user-manual.md)**.
- For billing, retail checkout, and customer cash payments: **Section 6**.
- For generating Profit & Loss sheets or Trial Balances: **Section 11**.
- For adding employees and toggling role permissions: **Section 13**.
- For monthly hosting cost reviews and data ownership guarantees: **[Operations Runbook — Section 7](./05-operations-runbook.md#section-7-for-the-business-owner-non-technical)**.

### 2. For the Operations Administrator
- Start with the **[Operations Runbook](./05-operations-runbook.md)**.
- To execute pre-production staging deployments: **Section 2**.
- To restore the Supabase database during outages: **Section 4**.
- To troubleshoot connection refuses or Vercel logs: **Section 5**.
- To update tax rates or warehouse structures: **[User Manual — Section 12](./04-user-manual.md#section-12-settings)**.

### 3. For Future Developers & Maintainers
- Start with the **[Developer Onboarding Guide](./06-developer-guide.md)** for local cloning and database seeding.
- Refer to the **[System Architecture](./01-system-architecture.md)** for request sequence lifecycles.
- Refer to the **[Database Schema](./02-database-schema.md)** for the relational data dictionaries.
- Refer to the **[API & Server Actions](./03-api-reference.md)** to copy standard server actions code templates.

---

## System Specs At A Glance

| Operational Item | Specification Detail |
|------------------|----------------------|
| **Core Framework** | Next.js 16.0.0 (App Router Tiers) |
| **Static Language** | TypeScript 5.x (Strict compilation mode) |
| **Primary Database** | PostgreSQL 16 (Hosted on Supabase) |
| **Schema ORM** | Prisma ORM 7.8.0 |
| **Session Manager** | NextAuth.js v5 (JWT Token Signatures) |
| **Live Server Hosting** | Vercel Serverless Tiers |
| **Transactional Email** | Resend API Gateway |
| **Accounting Standard** | Localized Zero-Sum Double-Entry Ledger Bookkeeping |
| **Business Currency** | Nepalese Rupee (NPR - Lakhs `XX,XX,XXX` notation) |
| **Date Framework** | Gregorian (AD) internally, Bikram Sambat (BS) client-side |
| **VAT Enforcement** | 13% (Configurable standard tax rate) |
| **Active Roles (RBAC)** | 6 roles (SuperAdmin, Owner, Manager, Sales, Purchase, Viewer) |
| **Core Modules** | 10 high-level folders in `/src/modules` |
| **Database Tables** | 30 relational models in `schema.prisma` |
