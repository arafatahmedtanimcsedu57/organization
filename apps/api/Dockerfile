FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/domain/package.json packages/domain/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci --workspace=@org-chart/domain --workspace=@org-chart/api --include-workspace-root

COPY packages/domain packages/domain
COPY apps/api apps/api
COPY TryOutProgram TryOutProgram

WORKDIR /app/apps/api
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production

ENTRYPOINT ["./docker-entrypoint.sh"]
