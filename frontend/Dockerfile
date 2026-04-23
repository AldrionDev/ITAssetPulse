# ============================================
# DEVELOPMENT STAGE - Build application
# ============================================
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# ============================================
# PRODUCTION STAGE - Serve with nginx
# ============================================
FROM nginx:alpine AS production

# Copy built assets
COPY --from=development /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]