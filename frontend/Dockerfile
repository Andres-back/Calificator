FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:1.28-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236

COPY nginx/templates/default.conf.template /etc/nginx/templates/default.conf.template
COPY frontend/nginx-entrypoint.sh /usr/local/bin/xcalificator-nginx-entrypoint
COPY --from=frontend-build /app/dist /var/www/html

RUN chmod +x /usr/local/bin/xcalificator-nginx-entrypoint

ENTRYPOINT ["/usr/local/bin/xcalificator-nginx-entrypoint"]
CMD ["nginx", "-g", "daemon off;"]
