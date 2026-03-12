FROM node:24.14.0-alpine AS base
WORKDIR /app
RUN apk update
RUN apk add --no-cache libc6-compat

FROM base AS prepare
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune @if3250_k01_g08_itx/frontend --docker

FROM base AS builder
RUN apk add --no-cache git
RUN npm install -g corepack
COPY --from=prepare /app/out/json/ .
RUN corepack prepare && pnpm install
COPY --from=prepare /app/out/full/ .
COPY --from=prepare /app/tsconfig.json ./tsconfig.json
COPY .git .git
RUN pnpm run turbo turbo:build

FROM base AS runner
RUN addgroup --system --gid 1001 app
RUN adduser --system --uid 1001 app
USER app
COPY --from=builder --chown=app:app /app/packages/frontend/.next/standalone .
COPY --from=builder --chown=app:app /app/packages/frontend/.next/static ./static
COPY --from=builder --chown=app:app /app/packages/frontend/public ./public
ENTRYPOINT []
CMD ["node", "/app/packages/frontend/server.js"]
