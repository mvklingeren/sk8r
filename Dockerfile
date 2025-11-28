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
COPY --from=builder /app/build .
COPY --from=builder /app/node_modules ./node_modules

# Set the PORT environment variable
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Define the command to start the server
CMD ["node", "index.js"]
