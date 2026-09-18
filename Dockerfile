FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json tsconfig.json ./

# Install all dependencies including tsx
RUN npm install

# Copy source code for shared and server
COPY shared/ ./shared/
COPY server/ ./server/

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npx", "tsx", "server/src/index.ts"]
