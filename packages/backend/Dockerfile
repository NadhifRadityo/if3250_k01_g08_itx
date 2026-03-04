ARG NODE_VERSION=24.14.0

FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app

FROM base AS prepare
RUN pnpm install -g turbo
COPY . .
RUN turbo prune backend --docker

FROM base AS builder
RUN pnpm install -g corepack
COPY --from=prepare /app/out/json/ .
RUN corepack prepare && pnpm install
COPY --from=prepare /app/out/full/ .
RUN pnpm run turbo build

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 app
RUN adduser --system --uid 1001 app
USER app
COPY --from=builder --chown=app:app /app/packages/web ./
CMD pnpm run start
