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

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/index.cjs"]
