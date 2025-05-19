FROM node:14-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Expose API and P2P ports
EXPOSE 3000
EXPOSE 6001

# Start the application
CMD [ "node", "server.js" ]