# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:24-alpine AS deps

RUN corepack enable

WORKDIR /app

# Copy workspace & package manifests (for layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json ./packages/database/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM deps AS builder

COPY . .

# Build shared-types (Zod schemas → dist/)
RUN pnpm --filter @chatbot-generator/shared-types build

# Generate Prisma client
RUN pnpm --filter @chatbot-generator/database prisma:generate

# Build API with SWC (decorator metadata support)
RUN cd apps/api && npx nest build

# ─── Stage 3: Production runner ──────────────────────────────────────────────
FROM node:24-alpine AS runner

RUN corepack enable

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace config for pnpm workspace resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/database/package.json ./packages/database/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Install tsx globally (needed to load database package's raw .ts + Prisma ESM)
RUN npm install -g tsx

# Copy compiled API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/openapi.yaml ./apps/api/openapi.yaml

# Copy built shared-types
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# Copy database package source + Prisma schema (generated client built at runtime)
COPY --from=builder /app/packages/database/src ./packages/database/src
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/database/prisma.config.ts ./packages/database/prisma.config.ts

# Generate Prisma client inside the production image
RUN cd packages/database && npx prisma generate

EXPOSE 3001

USER node

CMD ["tsx", "apps/api/dist/main.js"]
