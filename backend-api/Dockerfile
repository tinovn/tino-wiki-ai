# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

# Install build dependencies for bcrypt native module + OpenSSL for Prisma engine detection
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy prisma schemas and generate clients
COPY prisma ./prisma
RUN npx prisma generate --schema=prisma/schema.prisma && \
    npx prisma generate --schema=prisma/tenant-schema.prisma

# Copy source and build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

# OpenSSL needed by Prisma query engine (libssl.so.3)
RUN apk add --no-cache tini openssl

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Copy prisma files (needed at runtime for tenant provisioning: npx prisma db push)
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=30s \
  CMD node -e "const http=require('http');const req=http.get('http://localhost:3000/api/v1/health',(r)=>{process.exit(r.statusCode===200?0:1)});req.on('error',()=>process.exit(1))"

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/main.js"]
