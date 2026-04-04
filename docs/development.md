## Development Notes

This document explains how to run the project locally on Windows, Linux, and macOS.

Important:

- Use `pnpm` only.
- Do not use `npm` or `yarn` in this repository.
- PostgreSQL startup scripts such as `dbinit.bat` and `dbstart.bat` are not project-provided scripts. Use your own local PostgreSQL installation/service.

## Stack Requirements

- Git
- Node.js 20+ (latest LTS recommended)
- Corepack
- pnpm (project is pinned to `pnpm@10.30.3`)
- PostgreSQL (with `initdb`, `postgres`, and `psql` available)

## Quick Start (Windows)

If this is your first time running the project:

```powershell
git clone <repository-url>
cd if3250_k01_g08_itx

corepack enable
corepack prepare
pnpm install
```

Then continue with the PostgreSQL and runtime steps below.

## Quick Start (Linux/macOS)

If this is your first time running the project:

```bash
git clone <repository-url>
cd if3250_k01_g08_itx

corepack enable
corepack prepare
pnpm install
```

Then continue with the PostgreSQL and runtime steps below.

## Environment Variables

The repository includes `.env.development` for local development.

At minimum, verify these values are correct for your machine:

- `PAYLOAD_SECRET`
- `PAYLOAD_POSTGRES` (for example `postgres://localhost:5432/if3250_k01_g08_itx`)

Recommended:

- Set `PROJECT_WEB_ORIGIN` to match your local app origin (for example `http://localhost:3000`), because Payload uses it for server URL configuration.

## PostgreSQL Setup (Windows)

You can either:

- Use an existing PostgreSQL service you already run locally, or
- Run PostgreSQL directly from binaries.

### Option A: Existing PostgreSQL Service

If PostgreSQL is already installed as a Windows service, just ensure it is running and create the database.

```powershell
& "C:\Path\To\PostgreSQL\bin\psql.exe" postgres://localhost/postgres
```

Inside `psql`:

```sql
CREATE DATABASE if3250_k01_g08_itx;
```

If the database already exists, PostgreSQL will return an error, which is safe to ignore.

Exit `psql` with:

```sql
\q
```

### Option B: Run PostgreSQL Directly (No Service)

Use this if you want a local data directory inside the repo (or another folder you control).

Terminal 1:

```powershell
# One-time initialization
& "C:\Path\To\PostgreSQL\bin\initdb.exe" -D .\postgres

# Start server (leave this terminal running)
& "C:\Path\To\PostgreSQL\bin\postgres.exe" -D .\postgres
```

Terminal 2:

```powershell
& "C:\Path\To\PostgreSQL\bin\psql.exe" postgres://localhost/postgres
```

Inside `psql`:

```sql
CREATE DATABASE if3250_k01_g08_itx;
\q
```

## PostgreSQL Setup (Linux/macOS)

You can either:

- Use an existing PostgreSQL service you already run locally, or
- Run PostgreSQL directly from binaries.

### Option A: Existing PostgreSQL Service

Start PostgreSQL with your OS service manager, then create the database.

Examples:

```bash
# macOS (Homebrew)
brew services start postgresql@17

# Ubuntu/Debian (systemd)
sudo systemctl start postgresql
```

Create database:

```bash
psql postgres://localhost/postgres
```

Inside `psql`:

```sql
CREATE DATABASE if3250_k01_g08_itx;
\q
```

### Option B: Run PostgreSQL Directly (No Service)

Terminal 1:

```bash
# One-time initialization
initdb -D ./postgres

# Start server (leave this terminal running)
postgres -D ./postgres
```

Terminal 2:

```bash
psql postgres://localhost/postgres
```

Inside `psql`:

```sql
CREATE DATABASE if3250_k01_g08_itx;
\q
```

## Run The App

Terminal 2 (or a new terminal in project root):

```powershell
pnpm run dev
```

App URL:

- `http://localhost:3000`

## Seed Initial Data

Terminal 3 (project root), while PostgreSQL and dev server are running:

```powershell
pnpm run seed:admin
pnpm run seed:example
```

Seed scripts are idempotent. They always attempt to converge data to their expected final state.

## Reset Database

If you need to reset local data:

```powershell
pnpm run db:reset
```

Then seed again:

```powershell
pnpm run seed:admin
pnpm run seed:example
```

## Recommended Terminal Layout

- Terminal 1: PostgreSQL process (if running manually)
- Terminal 2: `pnpm run dev`
- Terminal 3: seed/reset commands

## Common Issues

### `pnpm` not found

Run:

```powershell
corepack enable
corepack prepare
```

### Database connection errors

- Verify PostgreSQL is running.
- Verify `PAYLOAD_POSTGRES` in `.env.development`.
- Confirm the database `if3250_k01_g08_itx` exists.

### Port conflicts

- If port `3000` is busy, stop the conflicting process or run Next.js on another port.
- If port `5432` is busy, reconfigure PostgreSQL port and update `PAYLOAD_POSTGRES` accordingly.

