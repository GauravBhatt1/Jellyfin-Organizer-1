FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
