FROM node:20-alpine AS builder

WORKDIR /app

# Install ffprobe for duration detection
RUN apk add --no-cache ffmpeg

# Copy package files and install ALL dependencies (dev + prod)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install ffprobe runtime dependency
RUN apk add --no-cache ffmpeg

# Copy package files
COPY package*.json ./

# Install all dependencies (drizzle-kit needed for migrations)
RUN npm ci

# Copy built application from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

ENV NODE_ENV=production

COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared ./shared

CMD ["sh", "-c", "npm run db:push && node dist/index.cjs"]
