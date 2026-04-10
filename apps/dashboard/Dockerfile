# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types ./packages/shared-types
COPY apps/dashboard ./apps/dashboard

RUN pnpm install --frozen-lockfile

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN cd packages/shared-types && pnpm build
RUN cd apps/dashboard && pnpm build

# ─── Stage 2: Production runner ──────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/dashboard/.output ./.output

EXPOSE 3002

CMD ["node", ".output/server/index.mjs"]
