FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

RUN apk add --no-cache git openssh-client tini

WORKDIR /app

ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    NUXT_NOTES_DIRECTORY=/repository/notes \
    MYNOTE_REPOSITORY_DIRECTORY=/repository

COPY --from=builder /app/.output ./.output
COPY docker/entrypoint.sh /usr/local/bin/mynote-entrypoint
RUN chmod +x /usr/local/bin/mynote-entrypoint

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/mynote-entrypoint"]
CMD ["node", ".output/server/index.mjs"]
