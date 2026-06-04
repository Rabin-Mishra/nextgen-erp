# NextGen Interior & Waterproofing — ERP System

A production-grade ERP for construction materials distributors built with Next.js 16, TypeScript, Prisma ORM, and PostgreSQL.

## Tech Stack & Technologies

### 1. Languages
- **TypeScript & JavaScript**: Used for frontend component logic, backend API routes, type-safety, and database seeding/reset scripts.
- **SQL (via Prisma Schema)**: Declarative schema modeling for the PostgreSQL database.
- **HTML & CSS**: Structuring templates and styling components.

### 2. Core Framework (Frontend & Backend)
- **Next.js 16 (App Router)**: A full-stack React framework. 
  - **Frontend**: Next.js React Server Components (RSC) and Client Components with React 19.
  - **Backend**: Next.js Route Handlers (API endpoints) and Server Actions serving as the backend layer.
  - **Build engine**: Next.js Turbopack is configured for extremely fast development and build compilations.

### 3. Database & ORM
- **Prisma ORM (v7.8)**: Database abstraction layer (ORM) to read/write data with full TypeScript safety.
- **PostgreSQL (Supabase)**: Relational database.
- **PgBouncer (Supabase Pooler)**: Used for database connection pooling to handle high-frequency serverless connection request environments.

### 4. Authentication & Security
- **Auth.js / NextAuth.js (v5 Beta)**: Standard authentication library managing user sessions, JWT tokens, cookies, and role-based access control (RBAC).
- **bcryptjs**: Securely hashes and salts user passwords before storing them in the database.

### 5. Styling & UI Components
- **Tailwind CSS (v4)**: Modern utility-first CSS framework for layout, colors, grids, responsive design, and transitions.
- **Radix UI**: Accessible, headless primitive components (modals, drop-downs, dialogs) that serve as the foundation of the UI.
- **Shadcn UI**: Design system components built on top of Radix UI and Tailwind CSS.
- **Lucide React**: Vector icons used across the entire application interface.
- **Recharts**: Data visualization library used for charts and business performance dashboards.
- **Sonner**: Toast library for modern, interactive user notifications (success, error, warning popups).

### 6. Key Libraries & Utilities
- **Zod**: Declarative schema validation library used for verifying API inputs, forms, and environment variables.
- **@react-pdf/renderer**: Used for generating, previewing, and downloading PDF documents on the client-side (such as invoices and credit notes).
- **xlsx**: Library to parse and generate Excel spreadsheets (used to export inventory and report datasets).
- **nepali-date-converter**: Converts standard Gregorian calendar dates (AD) to Nepalese Bikram Sambat (BS) calendar dates for local invoicing and reporting.
- **decimal.js**: High-precision arithmetic library for currency, tax, and inventory calculations (preventing standard floating-point binary issues in JavaScript).

### 7. Tooling & Testing
- **Vitest**: Vite-native unit testing framework for running unit tests.
- **ESLint**: Linter to enforce clean coding guidelines.
- **Docker**: Configured using local scripts (`docker-start.sh`) for containerizing the Postgres database during local development.


## Modules
- Dashboard — Real-time KPIs and business overview
- Inventory — Multi-vendor pricing, stock management
- Purchase — PO lifecycle, vendor management
- Sales — Retail, Wholesale, Project invoicing
- Projects — Job costing, material tracking
- Ledger — Double-entry accounting
- Cash Book — Daily cash tracking
- Reports — P&L, Balance Sheet, Trading Account
- Expenses — Operating expense tracking
- Users — Role-based access control

## Getting Started (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/nextgen-erp.git
cd nextgen-erp

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Run automated setup
npm run setup
# This installs deps, generates Prisma client, 
# pushes schema, and seeds database

# Start development server
npm run dev
```

Open http://localhost:3000

Default login: admin@nextgen.com / Admin@2026
**Change password immediately after first login**

## Docker Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with production values

# Start with Docker
npm run docker:start

# Stop
npm run docker:stop
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| NEXTAUTH_SECRET | Random 32-char string | Yes |
| NEXTAUTH_URL | App URL (e.g. https://yourdomain.com) | Yes |
| RESEND_API_KEY | Resend.com API key for emails | Yes |
| NEXT_PUBLIC_APP_NAME | Business name shown in UI | Yes |

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## CI/CD Pipeline

This project uses GitHub Actions:

| Workflow | Trigger | Action |
|----------|---------|--------|
| CI | Every push/PR | TypeScript check + Build |
| Deploy Production | Push to `main` | Deploy to Vercel |
| Deploy Staging | Push to `staging` | Deploy to Vercel preview |

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — auto-deploys |
| `staging` | UAT testing — auto-deploys to preview |
| `develop` | Active development |
| `feature/*` | New features |
| `fix/*` | Bug fixes |

## Deployment for Fork Users

If you forked this repository:

1. Create accounts on:
   - Vercel (vercel.com)
   - Supabase (supabase.com)
   - Resend (resend.com)

2. Add GitHub Secrets in your repo:
   Settings → Secrets → Actions → New secret
   
   Required secrets:
   - DATABASE_URL
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL
   - RESEND_API_KEY
   - VERCEL_TOKEN
   - VERCEL_ORG_ID
   - VERCEL_PROJECT_ID
   - NEXT_PUBLIC_APP_NAME
   - NEXT_PUBLIC_PAN
   - NEXT_PUBLIC_PHONE
   - NEXT_PUBLIC_ADDRESS

3. Push to main — GitHub Actions deploys automatically

## Database Management

```bash
# View database
npm run db:studio

# Push schema changes
npm run db:push

# Seed with sample data
npm run db:seed

# Reset all data (keeps admin + warehouses)
npm run db:reset

# Backup database
npm run backup
```

## License
Private — All rights reserved
NextGen Interior And WaterProofing, Jhapa, Nepal
