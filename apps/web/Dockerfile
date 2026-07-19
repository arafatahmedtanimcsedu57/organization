FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace=@org-chart/domain --workspace=@org-chart/web --include-workspace-root

COPY packages/domain packages/domain
COPY apps/web apps/web

WORKDIR /app/apps/web

ENV NODE_ENV=production

CMD ["npm", "run", "start"]
