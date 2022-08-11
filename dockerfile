# Install node v16
FROM node:16.14.2

# Set the workdir /usr/src/app
WORKDIR /usr/src/app
# Copy the package.json to workdir
COPY package*.json ./

# Run npm install - install the npm dependencies
RUN npm install

# Copy application source
COPY . .

# Expose application ports 
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start"]