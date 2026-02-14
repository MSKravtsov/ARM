# Supabase Setup Guide for ARM

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "New Project"
3. Choose your organization (or create one)
4. Fill in project details:
   - **Name**: `abitur-risk-monitor` (or your preferred name)
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: Choose the closest to Germany (e.g., `eu-central-1`)
5. Click "Create new project" and wait 2-3 minutes for provisioning

## Step 2: Get API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)
   - **service_role key** (DO NOT expose this publicly!)

## Step 3: Configure Environment Variables

1. In the ARMv1 directory, copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and replace the placeholder values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
   ```

## Step 4: Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press Cmd+Enter)
6. You should see "Success. No rows returned"

## Step 5: Verify Database Setup

1. Go to **Table Editor** in the sidebar
2. You should see 4 new tables:
   - `profiles`
   - `subjects`
   - `risk_calculations`
   - `state_rules`
3. Click on `state_rules` → should see 8 seed rows (General, NRW, Bavaria rules)

## Step 6: Configure Authentication

1. Go to **Authentication** → **Providers**
2. **Email** provider should be enabled by default
3. (Optional) Enable additional providers:
   - Google OAuth
   - Apple OAuth
4. Go to **Authentication** → **URL Configuration**
5. Add redirect URL: `http://localhost:3000/auth/callback` (for development)

## Step 7: Test Connection

Run the development server to verify Supabase connection:
```bash
npm run dev
```

Open `http://localhost:3000` and check the browser console for any Supabase connection errors.

## Troubleshooting

### "Invalid API key" error
- Verify you copied the **anon key**, not the service_role key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check for trailing spaces in `.env.local`

### RLS policy errors
- Make sure you ran the entire migration SQL
- Check **Authentication** → **Policies** to see if RLS policies are active

### Connection timeout
- Verify the Project URL is correct
- Check your internet connection
- Ensure the Supabase project is not paused (free tier pauses after inactivity)

## Next Steps

Once Supabase is configured:
- Proceed to **Phase 1: Database & Auth Foundation**
- We'll implement authentication flow and test user signup
