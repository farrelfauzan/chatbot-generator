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

# Generate Prisma client (dummy URL — no DB connection needed for generate)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm --filter @chatbot-generator/database prisma:generate

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
# Install prisma globally (needed for migrate deploy at startup)
RUN npm install -g tsx prisma

# Symlink global prisma into database package so prisma.config.ts can resolve "prisma/config"
RUN ln -s $(npm root -g)/prisma /app/packages/database/node_modules/prisma

# Copy compiled API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/openapi.yaml ./apps/api/openapi.yaml

# Copy built shared-types
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

# Copy database package source + Prisma schema + config + pre-generated Prisma client
COPY --from=builder /app/packages/database/src ./packages/database/src
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/database/prisma.config.ts ./packages/database/prisma.config.ts
COPY --from=builder /app/packages/database/generated ./packages/database/generated

EXPOSE 3001

# Ensure node user owns the app directory for Prisma cache writes
RUN chown -R node:node /app

USER node

# Run migrations then start the app
CMD ["sh", "-c", "cd packages/database && prisma migrate deploy && cd /app && tsx apps/api/dist/src/main.js"]
