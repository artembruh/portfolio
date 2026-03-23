# =============================================================================
# Multi-stage Dockerfile for artembratchenko.com portfolio
# Targets: nginx (React SPA via Nginx) and backend (NestJS API)
# Usage:
#   docker build --target nginx -t portfolio-nginx .
#   docker build --target backend -t portfolio-backend .
# =============================================================================

# Stage 1: Install all dependencies (hoisted to root via Yarn Classic)
FROM node:22-alpine AS deps
WORKDIR /app
# Copy all package manifests + lockfile FIRST for layer cache
# Yarn Classic hoists all workspace deps to root node_modules — all manifests must be present
COPY package.json yarn.lock ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN yarn install --frozen-lockfile

# Stage 2: Build frontend (React + Vite)
FROM node:22-alpine AS build-frontend
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Vite is not hoisted — lives in frontend/node_modules (symlink from root .bin)
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
ENV PATH="/app/node_modules/.bin:$PATH"
COPY frontend ./frontend
# tsconfig.base.json must be copied — frontend/tsconfig.json extends it
COPY package.json tsconfig.base.json ./
# Run build directly — yarn workspace rewrites PATH to frontend/node_modules/.bin which
# doesn't exist with Yarn Classic hoisting (all bins are in root node_modules/.bin)
WORKDIR /app/frontend
RUN tsc -p tsconfig.json && vite build
WORKDIR /app
# Output: /app/frontend/dist/

# Stage 3: Build backend (NestJS)
FROM node:22-alpine AS build-backend
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Some backend deps (e.g. @solana/kit) are not hoisted — copy workspace node_modules too
COPY --from=deps /app/backend/node_modules ./backend/node_modules
ENV PATH="/app/node_modules/.bin:$PATH"
COPY backend ./backend
# tsconfig.base.json must be copied — backend/tsconfig.json extends it
COPY package.json tsconfig.base.json ./
WORKDIR /app/backend
RUN nest build
WORKDIR /app
# Output: /app/backend/dist/

# Stage 4 (final): nginx target — serves React SPA via Nginx
FROM nginx:1.27-alpine AS nginx
COPY --from=build-frontend /app/frontend/dist /usr/share/nginx/html
# Replace default.conf (not nginx.conf) to avoid conflicts with included defaults
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Stage 5 (final): backend target — runs NestJS API as non-root user
FROM node:22-alpine AS backend
# curl required for docker healthcheck (alpine has no curl by default)
RUN apk add --no-cache curl
WORKDIR /app
# Create non-root user for security (D-06)
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs
COPY --chown=nestjs:nodejs --from=deps /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs --from=build-backend /app/backend/dist ./backend/dist
COPY --chown=nestjs:nodejs backend/package.json ./backend/
USER nestjs
EXPOSE 3000
CMD ["node", "backend/dist/main"]
