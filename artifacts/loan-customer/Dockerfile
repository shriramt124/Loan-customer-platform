# Build context is the repository root (it is a pnpm workspace).
FROM node:24-slim AS build
WORKDIR /repo
RUN npm i -g pnpm@10.34.6 && pnpm -v
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc tsconfig.base.json tsconfig.json ./
# The workspace pins native binaries for one platform; drop the per-arch pins so the container's own arch resolves.
RUN sed -i -E '/-(darwin|linux|win32|freebsd|android|openbsd|netbsd|sunos|aix|openharmony)/d' pnpm-workspace.yaml
COPY lib ./lib
COPY scripts/package.json ./scripts/package.json
COPY artifacts/loan-customer ./artifacts/loan-customer
RUN CI=true pnpm install --no-frozen-lockfile --filter @workspace/loan-customer...
# vite.config.ts requires PORT and BASE_PATH even for a build
RUN cd artifacts/loan-customer && PORT=3000 BASE_PATH=/ NODE_ENV=production node_modules/.bin/vite build --config vite.config.ts

FROM nginx:1.27-alpine
COPY artifacts/loan-customer/nginx/default.conf.template /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=host.docker.internal:8000
COPY --from=build /repo/artifacts/loan-customer/dist/public /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
