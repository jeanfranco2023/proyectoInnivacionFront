FROM node:22-alpine AS builder

WORKDIR /app

# Use pnpm in the builder stage. If you add a pnpm-lock.yaml it will be used automatically.
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@8.8.0 && pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/proyectoInnovacion/browser /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
