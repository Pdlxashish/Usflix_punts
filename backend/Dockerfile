# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install build dependencies for native modules (sharp, heic-convert, node-gyp)
RUN apk add --no-cache python3 make g++ vips-dev libc6-compat

WORKDIR /app

# Copy package files and install ALL deps (devDeps needed for tsc + native builds)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript → dist/
COPY . .
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine

# Install runtime-only native deps + ffmpeg (vips needed by sharp at runtime)
RUN apk add --no-cache vips ffmpeg libc6-compat

WORKDIR /app

# Copy compiled output and pre-built node_modules from builder
# (avoids re-running npm ci without build tools in production stage)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check — wait up to 60s for DB connection on cold start
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run node directly (no npm wrapper)
CMD ["node", "dist/index.js"]
