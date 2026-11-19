# Deploying FasalShield on Vercel

Everything runs on **Vercel**, in one account, as two projects from the same GitHub repo:

| Vercel project | Root directory | What it is | Address |
|---|---|---|---|
| `fasal-api` | `api` | Express backend, database set-up, daily rain check (Vercel Cron) | `https://fasal-api.vercel.app` |
| `fasal-app` | `web` | Next.js farmer app | `https://fasal-app.vercel.app` |

The database is **Neon Postgres**, created from inside the Vercel dashboard.

This is a **demo deployment**: SMS, UPI, KYC and weather are simulated, the test SMS code is shown on screen,
and a strip at the top says "Demo · test data only, no real money". Do not put real farmers on it.

## Settings files

Two files on the developer's machine (never committed) hold the settings to paste:

- `.env.vercel-api`: for `fasal-api` (secrets were generated fresh; keep this file private)
- `.env.vercel-web`: for `fasal-app`

If Vercel gives your projects different addresses than `fasal-api.vercel.app` / `fasal-app.vercel.app`,
change `API_URL` (web) and `API_BASE_URL` / `CORS_ORIGINS` (api) to the real addresses.

## Steps

1. **Sign in.** Go to https://vercel.com and sign up / log in with GitHub. Allow Vercel to see the `Fasal-App` repo.
2. **Create the backend project.**
   - Add New → Project → import `Fasal-App`.
   - Project name: `fasal-api`. Root Directory: **Edit → `api`**. Framework preset: **Other**.
   - Environment Variables: paste the whole contents of `.env.vercel-api`.
   - Deploy. **The first build fails at "prisma migrate deploy"; that is expected**: there is no database yet.
3. **Create and connect the database.**
   - In `fasal-api`: Storage tab → Create Database → **Neon** (Serverless Postgres) → region **Mumbai (ap-south-1)** if offered, otherwise Singapore → Create.
   - Connect it to `fasal-api` for Production, Preview and Development. Vercel adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` itself.
4. **Put the backend near the database.** `fasal-api` → Settings → Functions → Function Region → **Mumbai (bom1)**.
5. **Redeploy the backend.** Deployments → the failed one → ⋯ → Redeploy. This build creates the tables and loads the crops, season and covers.
6. **Check it.** Open `https://fasal-api.vercel.app/health`. You should see `"status":"ok","db":"up"`.
7. **Create the web project.**
   - Add New → Project → import `Fasal-App` again.
   - Project name: `fasal-app`. Root Directory: **`web`**. Framework preset: **Next.js**.
   - Environment Variables: paste `.env.vercel-web`.
   - Deploy.
   - Settings → Functions → Function Region → **Mumbai (bom1)**, then redeploy once.
8. **Open the app.** `https://fasal-app.vercel.app` on your phone. Sign in with any 10-digit number starting 6–9; the test code shows on screen.
   On the field screen, real GPS works on phones; on a laptop you can tap the map to place the pin.

## After deploying

- **Daily rain check** runs by itself every day at 06:00 IST (Vercel Cron, set in `api/vercel.json`).
- **Simulate a dry spell** to see a payout (PowerShell; use the `ADMIN_API_KEY` from `.env.vercel-api`):

  ```powershell
  Invoke-RestMethod -Method Post -Uri https://fasal-api.vercel.app/api/v1/admin/simulator/scenarios `
    -Headers @{ 'x-admin-key' = '<ADMIN_API_KEY>' } -ContentType 'application/json' `
    -Body '{"districtCode":"MH-LATUR","from":"2026-11-01","to":"2026-11-19","pctOfNormal":40}'
  ```

- Every `git push` to `main` redeploys both projects automatically.

## If a build fails

| Message | Fix |
|---|---|
| `P1001` / can't reach database | Step 3 not done, or the database is not connected to `fasal-api` |
| `Invalid environment` / a variable name | A line from `.env.vercel-api` is missing; paste the file again |
| Node version error | Settings → General → Node.js Version → **22.x**, then redeploy |
| Web shows "This screen did not load" | `API_URL` in `fasal-app` does not match the backend address |
