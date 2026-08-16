FROM node:22-slim
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY blockchain/testnet/genesis.json /app/blockchain/testnet/genesis.json
RUN corepack enable pnpm && pnpm install --frozen-lockfile=false
RUN pnpm --filter @nexastream/blockchain run build
EXPOSE 9001 9002 9003
ENTRYPOINT ["node", "packages/blockchain/dist/node/node.js"]
