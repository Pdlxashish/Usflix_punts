# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all deps (including devDeps needed for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .

# Leave empty when nginx proxies /api to the backend (same-origin cookies).
# Set to https://api.your-domain.com only for split-domain deployments.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine

# TanStack Start client assets (static shell for nginx; SSR uses Cloudflare Workers)
COPY --from=builder /app/dist/client /usr/share/nginx/html

# Nginx config: serve SPA, proxy /api and /uploads to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
