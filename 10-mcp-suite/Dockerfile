FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY dist ./dist
COPY glama.json mcp.json smithery.yaml manifest.json README.md LICENSE ./

ENV NODE_ENV=production

CMD ["node", "dist/cli.js"]
