# Use an official Node runtime as a parent image
FROM node:20-alpine

# Install Chromium dependencies for whatsapp-web.js (Puppeteer) and build tools for native addons
RUN apk update && apk add --no-cache \
    ca-certificates \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    git \
    g++ \
    make \
    python3 \
    postgresql-client \
    tar

# Tell Puppeteer to skip installing Chrome/Chromium and use the system one.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first for caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Save a copy of the built-in assets INSIDE the image.
# At runtime, the volume mount will overwrite /app/storage,
# but /app/seed-assets will remain intact inside the image.
# The entrypoint script copies these into the volume if missing.
RUN cp -r /app/storage/Assets /app/seed-assets

# Make the entrypoint script executable
RUN chmod +x /app/docker-entrypoint.sh

# Expose the application port
EXPOSE 3000

# Use entrypoint to seed assets into the volume, then start the app
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]
