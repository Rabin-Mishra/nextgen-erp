# GitHub Secrets Setup Guide

## For Repository Owner / Fork Users

Go to: GitHub Repo → Settings → Secrets and variables 
→ Actions → New repository secret

Add these secrets one by one:

### Required for the app to run:
DATABASE_URL
Value: postgresql://user:password@host:5432/dbname

NEXTAUTH_SECRET  
Value: (generate with: openssl rand -base64 32)

NEXTAUTH_URL
Value: https://your-production-domain.com

RESEND_API_KEY
Value: re_your_resend_api_key

NEXT_PUBLIC_APP_NAME
Value: Your Business Name

NEXT_PUBLIC_PAN
Value: Your PAN Number

NEXT_PUBLIC_PHONE
Value: Your Phone Number

NEXT_PUBLIC_ADDRESS
Value: Your Business Address

### Required for Vercel auto-deployment:
VERCEL_TOKEN
How to get: vercel.com → Account Settings → Tokens → Create

VERCEL_ORG_ID
How to get: vercel.com → Settings → General → Team ID

VERCEL_PROJECT_ID
How to get: vercel.com → Your Project → Settings → General

### For staging environment (optional):
STAGING_DATABASE_URL
STAGING_NEXTAUTH_SECRET
STAGING_NEXTAUTH_URL

## Setting up Environments in GitHub

Go to: GitHub Repo → Settings → Environments

Create two environments:
1. production — for main branch deployments
2. staging — for staging branch deployments

Add environment-specific secrets to each.
