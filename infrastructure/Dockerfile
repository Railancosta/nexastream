FROM node:22-alpine AS base
WORKDIR /app

# P2P toolchain
RUN apk add --no-cache rust cargo ffmpeg python3

# Copia tudo
COPY . /app
RUN cd services/videos && npm i --omit=dev 2>/dev/null || true

# Expõe portas de todos os serviços
EXPOSE 3001 3002 3008 3009 3012 3013 3014 3015 3016 3018

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3002/api/health || exit 1

CMD ["sh","-c","node services/videos/index.js"]
