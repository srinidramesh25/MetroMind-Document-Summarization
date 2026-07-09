FROM node:18-alpine

WORKDIR /app

# Install dependencies first (for docker layer caching)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]
