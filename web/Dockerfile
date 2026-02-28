FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV NEXT_PUBLIC_API_URL=http://localhost:8080
RUN pnpm build

# ━━━ Runtime ━━━
FROM node:20-alpine

WORKDIR /app
RUN corepack enable pnpm

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
