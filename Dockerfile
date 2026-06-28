# ---- deps: install production dependencies (with build tools for bcrypt) ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json .node-pg-migraterc ./
COPY src ./src
COPY migrations ./migrations
COPY seeds ./seeds
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
