# Chatbot Generator Monorepo

Nx monorepo for a WhatsApp commerce chatbot platform built with:

- NestJS + Fastify backend
- TanStack Start dashboard
- GoWa gateway integration layer
- PostgreSQL + Prisma
- OpenAI-ready orchestration

## Workspace Layout

- `apps/api`: NestJS Fastify backend
- `apps/dashboard`: TanStack Start dashboard
- `packages/database`: Prisma v7 schema, config, generated client output, and database tooling
- `packages/shared-types`: shared app contracts and types

## Getting Started

1. Install dependencies with `pnpm install`
2. Copy `packages/database/.env.example` to `packages/database/.env`
3. Copy `apps/api/.env.example` to `apps/api/.env` and add your LLM credentials
4. Copy `apps/dashboard/.env.example` to `apps/dashboard/.env` if needed
5. Run `pnpm prisma:generate`
6. Start the API with `pnpm dev:api`
7. Start the dashboard with `pnpm dev:dashboard`

## Sumopod LLM

The backend is configured for an OpenAI-compatible provider through these API env vars:

- `LLM_PROVIDER`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `LLM_API_KEY`

The default setup targets Sumopod with `gemini/gemini-2.5-flash-lite`.

For a quick backend test:

- `GET /llm/config`
- `POST /llm/chat` with `{ "message": "Say hello in a creative way" }`

## Prisma v7 Notes

- The workspace uses `prisma-client`, not the deprecated `prisma-client-js` generator.
- Generated client code is written to `packages/database/generated/prisma`.
- Prisma CLI configuration lives in `packages/database/prisma.config.ts`.
- Prisma v7 no longer auto-loads `.env` files for CLI usage, so `prisma.config.ts` explicitly imports `dotenv/config`.
- PostgreSQL connections use `@prisma/adapter-pg`.

## Nx Targets

- `pnpm nx dev api`
- `pnpm nx build api`
- `pnpm nx dev dashboard`
- `pnpm nx build dashboard`
