# Pinned because the mounted compatibility patches target this exact Presenton build.
FROM ghcr.io/presenton/presenton@sha256:443d0362cba98cb9ac6e1bc5d68400cdcda0474eb52ee83a577ff2de304a3d62

USER root

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_BIN=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        chromium \
        fonts-liberation \
        fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*
