FROM node:20-alpine AS node

# Strip npm and corepack — zero-deps project doesn't need them
RUN rm -rf /usr/local/lib/node_modules

FROM alpine:3.21 AS runtime

# Install runtime dependencies for Node.js
RUN apk add --no-cache libstdc++ libgcc

COPY --from=node /usr/local/bin/node /usr/local/bin/
COPY --from=node /usr/local/lib /usr/local/lib
COPY --from=node /etc/ssl /etc/ssl

WORKDIR /app

COPY src/ ./src/
COPY api/node.js ./api/

RUN mkdir -p /data

ENV DATA_FILE=/data/data.json
ENV PORT=3000

EXPOSE 3000

CMD ["node", "api/node.js"]
