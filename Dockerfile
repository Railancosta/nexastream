FROM node:22-alpine
RUN apk add --no-cache bash curl ffmpeg
WORKDIR /opt/nexastream
COPY . .
EXPOSE 3002 3004 3008 3009 3010 3011 3012 3013 3014 3015 3016 3017 3018
CMD ["bash", "scripts/node-entry.sh"]
