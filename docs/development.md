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

## Development Environment

### PostgreSQL

The project uses PostgreSQL as its database. For local development you can run a standalone PostgreSQL instance whose data lives entirely inside the repository (ignored by git).

A helper script in `development/run-postgres.ts` handles finding `initdb`/`postgres` binaries, initializing the data directory, and starting the server:

```bash
cd development
pnpm run postgres
```

The script will automatically locate PostgreSQL executables on your PATH cross-platform. If they are not on your PATH, specify the bin directory explicitly:

```bash
cd development
pnpm run postgres -- --pg-bin "E:\Application\PostgreSQL\18\bin"
```

**Script options**

| Flag | Description |
| --- | --- |
| `--pg-bin <path>` | Explicit path to the PostgreSQL `bin` directory |
| `--init-only` | Initialize the data directory without starting the server |

## Tips

### Keep dev data out of version control

The `.gitignore` already ignores `.private/` directories. The `run-postgres.ts` script stores the PostgreSQL data directory at:

```
development/.private/postgres/
```

This means the database files never get committed. If you create other local-only files (env overrides, scratch scripts, etc.), place them under `development/.private/` as well, so they stay out of git.
