# ---------------BUILD STAGE -----------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------------LOCAL-PROXY STAGE (Docker Compose, /api proxy) ---------
FROM nginx:alpine AS local-proxy

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.local-proxy.conf.template /etc/nginx/templates/default.conf.template

ENV BACKEND_UPSTREAM_HOST=itassetpulse-backend-service

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ---------------CLOUD-STATIC STAGE (ECS/ALB, static SPA only) ----------
# Default target: a `docker build` without --target builds this last stage,
# so the existing publish-images.yml (issue #177) needs no change.
FROM nginx:alpine AS cloud-static

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.cloud-static.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]