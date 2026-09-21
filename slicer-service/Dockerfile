# OrcaSlicer v2.3.0's Ubuntu 24.04 AppImage requires WebKitGTK 4.1 at
# runtime, so the base image must match the AppImage distribution.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

# System deps for OrcaSlicer AppImage + Xvfb
RUN apt-get update && apt-get install -y curl wget xvfb libgl1 libglu1-mesa libglib2.0-0 \
    libfuse2t64 fuse libdbus-1-3 libxkbcommon0 libwebkit2gtk-4.1-0 \
    libx11-6 libxcb1 libxi6 libxrender1 libxtst6 \
    unzip python3 \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# Download OrcaSlicer AppImage (Detects x86_64 for local testing or aarch64 for Oracle)
ARG ORCA_VERSION=V2.3.0
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
        DOWNLOAD_URL="https://github.com/OrcaSlicer/OrcaSlicer/releases/download/v2.3.0/OrcaSlicer_Linux_AppImage_Ubuntu2404_aarch64_${ORCA_VERSION}.AppImage"; \
    else \
        DOWNLOAD_URL="https://github.com/OrcaSlicer/OrcaSlicer/releases/download/v2.3.0/OrcaSlicer_Linux_AppImage_Ubuntu2404_${ORCA_VERSION}.AppImage"; \
    fi && \
    echo "Downloading OrcaSlicer from $DOWNLOAD_URL ..." && \
    wget -q "$DOWNLOAD_URL" \
    -O /tmp/orca-slicer.AppImage \
  && chmod +x /tmp/orca-slicer.AppImage \
  && cd /tmp \
  && ./orca-slicer.AppImage --appimage-extract > /dev/null 2>&1 \
  && mv squashfs-root /opt/orca-slicer \
  && ln -sf /opt/orca-slicer/AppRun /usr/local/bin/orca-slicer \
  && rm /tmp/orca-slicer.AppImage

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production || npm install --production
COPY src/ ./src/
COPY templates/ ./templates/

EXPOSE 8080
CMD ["node", "src/server.mjs"]
