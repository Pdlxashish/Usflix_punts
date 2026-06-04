FROM node:20-alpine AS builder

# Native build dependencies for sharp, heic-convert, and node-gyp.
RUN apk add --no-cache python3 make g++ vips-dev libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine

# Runtime dependencies for sharp and video processing.
RUN apk add --no-cache vips ffmpeg libc6-compat

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

RUN mkdir -p uploads

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
