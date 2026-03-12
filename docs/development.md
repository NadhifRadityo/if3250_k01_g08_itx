# Development Guide

## Preamble

Clone the repository:

```bash
git clone https://github.com/if3250_k01_g08_itx/if3250_k01_g08_itx.git
cd if3250_k01_g08_itx
```

## Setup

This project **strictly uses pnpm** as its package manager. Do not use `npm` or `yarn` — the repository includes a `pnpm-workspace.yaml` and a `packageManager` field in `package.json` that locks pnpm to a specific version. Using other package managers will produce incorrect lockfiles and break the monorepo workspace resolution.

### 1. Enable Corepack

Corepack ships with Node.js and manages the correct package manager version automatically.

```bash
npm i -g corepack
corepack prepare
```

`corepack prepare` reads the `packageManager` field in `package.json` and ensures the pinned pnpm version is available.

### 2. Install dependencies

```bash
pnpm i
```

This installs dependencies for all workspaces (`packages/backend`, `packages/frontend`, and `development`).

## Running the stack

### Development

From the repository root:

```bash
pnpm run dev
```

This starts the entire stack in development mode using Turborepo and dotenvx, which loads the `.env.development` files automatically:

- **PostgreSQL** — a local instance whose data lives at `development/.private/postgres/` (ignored by git)
- **Backend** — built and started in watch mode
- **Frontend** — Next.js dev server

### Build

```bash
pnpm run build
```

Builds all packages for production.

## Configuration

The development environment is configured through `.env.development` files. dotenvx loads these automatically when you run `pnpm run dev` or `pnpm run build` — no manual sourcing required.

### Root `.env.development`

Located at `.env.development` in the repository root. Controls shared dev infrastructure:

| Variable | Default | Description |
| --- | --- | --- |
| `APP_DEV_POSTGRES_BIN` | _(auto)_ | Path to the PostgreSQL `bin` directory. Leave empty to auto-detect from PATH. Set this if `initdb`/`postgres` are not on your PATH (common on Windows). |
| `APP_DEV_POSTGRES_PORT` | `5432` | Port for the local PostgreSQL instance |
| `APP_DEV_BACKEND_PORT` | `3250` | Port for the backend dev server |
| `APP_DEV_FRONTEND_PORT` | `3251` | Port for the frontend dev server |

### Package-level `.env.development`

Each package has its own `.env.development` for service-specific variables:

- `packages/backend/.env.development` — `DATABASE_URL` and other backend environment variables. Interpolates `APP_DEV_POSTGRES_PORT` from the root file.
- `packages/frontend/.env.development` — `NEXT_PUBLIC_*` variables and `BACKEND_API_ORIGIN`. Interpolates `APP_DEV_BACKEND_PORT` and `APP_DEV_FRONTEND_PORT` from the root file.

## Advanced: `turbo:*` scripts

For more granular control, each package exposes `turbo:*` scripts that can be invoked directly. These are the same scripts that `pnpm run dev` and `pnpm run build` invoke through Turborepo.

| Package | Script | Description |
| --- | --- | --- |
| `@if3250_k01_g08_itx/development` | `turbo:develop:postgres` | Start the local PostgreSQL instance |
| `@if3250_k01_g08_itx/backend` | `turbo:develop:build` | Watch and rebuild the backend |
| `@if3250_k01_g08_itx/backend` | `turbo:develop:start` | Start the built backend server |
| `@if3250_k01_g08_itx/backend` | `turbo:build` | Build the backend for production |
| `@if3250_k01_g08_itx/backend` | `turbo:clean` | Remove build artifacts |
| `@if3250_k01_g08_itx/frontend` | `turbo:develop:dev` | Start the Next.js dev server |
| `@if3250_k01_g08_itx/frontend` | `turbo:build` | Build the frontend for production |

Run them from the repository root with `pnpm --filter <package> run <script>`, for example:

```bash
pnpm --filter @if3250_k01_g08_itx/development run turbo:develop:postgres
```

## Tips

### Keep dev data out of version control

The `.gitignore` already ignores `.private/` directories. The `develop-postgres.ts` script stores the PostgreSQL data directory at:

```
development/.private/postgres/
```

This means the database files never get committed. If you create other local-only files (env overrides, scratch scripts, etc.), place them under `development/.private/` as well, so they stay out of git.
