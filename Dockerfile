FROM node:24-alpine AS base

WORKDIR /app
RUN corepack enable

FROM base AS builder

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack prepare
RUN pnpm install --frozen-lockfile
COPY . .
RUN apk add --no-cache git
RUN pnpm run build

FROM base AS runner

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack prepare
RUN pnpm install --frozen-lockfile --prod

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S -g 1001 app \
	&& adduser -S -D -H -u 1001 -G app app
COPY --from=builder --chown=app:app /app .

USER app
EXPOSE 3000
CMD ["pnpm", "exec", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
