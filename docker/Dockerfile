FROM node:20-alpine AS builder

WORKDIR /app

# Install ffprobe for duration detection
RUN apk add --no-cache ffmpeg

# Install all dependencies (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install ffprobe
RUN apk add --no-cache ffmpeg

# Copy built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

# Expose port
EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
