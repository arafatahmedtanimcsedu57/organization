FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
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
