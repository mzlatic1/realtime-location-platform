FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY apps apps
COPY packages packages
COPY scripts scripts
RUN pnpm install --no-frozen-lockfile
# Next.js inlines NEXT_PUBLIC_* at build time, so the basemap key must be a build arg.
# It is a browser-visible CARTO usage key, not a secret; it stays out of Git via .env.
ARG NEXT_PUBLIC_CARTO_API_KEY=
ENV NEXT_PUBLIC_CARTO_API_KEY=$NEXT_PUBLIC_CARTO_API_KEY
RUN pnpm build
CMD ["pnpm","--filter","@realtime/ingestion-api","start"]
