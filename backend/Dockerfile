# Backend Dockerfile
FROM node:20-alpine

# Install build dependencies for native modules (sharp, heic-convert) + ffmpeg
RUN apk add --no-cache python3 make g++ vips-dev ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDeps — needed for tsc build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript → dist/
RUN npm run build

# Remove devDependencies after build to keep image lean
RUN npm prune --production

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
