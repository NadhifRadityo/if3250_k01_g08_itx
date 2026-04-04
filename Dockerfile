FROM node:24-alpine AS base

WORKDIR /home/node
RUN corepack enable

FROM base AS builder

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack prepare
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM base AS runner

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack prepare
RUN pnpm install --frozen-lockfile --prod

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /home/node .

USER node
EXPOSE 3000
CMD ["pnpm", "exec", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
