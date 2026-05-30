# NextGen Interior & Waterproofing — ERP System

A production-grade ERP for construction materials distributors built with Next.js 16, TypeScript, Prisma ORM, and PostgreSQL.

## Tech Stack
- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js v5 (JWT + RBAC)
- **Email**: Resend API
- **Deployment**: Vercel + Supabase (or Docker + VPS)

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
