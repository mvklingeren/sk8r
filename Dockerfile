# Use a Node.js base image
FROM node:22-alpine as builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the SvelteKit application
RUN npm run build


# Create a smaller production image
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy the build output from the builder stage
COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json .
COPY --from=builder --chown=node:node /app/server.js .
COPY --from=builder --chown=node:node /app/websocket.js .

# Run as non-root user
USER node

# Set the PORT environment variable
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Define the command to start the server
CMD ["node", "server.js"]
