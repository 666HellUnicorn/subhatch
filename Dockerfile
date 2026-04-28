FROM node:20-alpine

WORKDIR /app

COPY package.json .
COPY src/ ./src/
COPY adapters/node.js ./adapters/

# Data directory for persistent JSON store
RUN mkdir -p /data

ENV DATA_FILE=/data/data.json
ENV PORT=3000

# ADMIN_PASSWORD and SUB_TOKEN must be passed at runtime:
#   docker run -e ADMIN_PASSWORD=secret -e SUB_TOKEN=mytoken ...

EXPOSE 3000

CMD ["node", "adapters/node.js"]
