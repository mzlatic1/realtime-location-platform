FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY apps apps
COPY packages packages
COPY scripts scripts
RUN pnpm install --no-frozen-lockfile && pnpm build
CMD ["pnpm","--filter","@realtime/ingestion-api","start"]
