# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm test && npm run build -- --configuration production

# ---- Runtime (archivos estáticos) ----
FROM nginx:1.27-alpine
ENV API_UPSTREAM=http://backend:5000
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/eventos-saas-web/browser /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
